from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.conf import settings
from .models import Workspace, WorkspaceMember, Board, Column, Card, ActivityLog, WorkspaceInvite
from .serializers import (
    WorkspaceSerializer, BoardSerializer,
    ColumnSerializer, CardSerializer, ActivityLogSerializer,
    WorkspaceMemberSerializer, InviteSerializer
)
from .models import WorkspaceMember as WM
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import os
import ssl
import urllib.request
import json

User = get_user_model()


# ─── HELPERS ──────────────────────────────────────────────

def broadcast_update(workspace_id, event_type, data):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'workspace_{workspace_id}',
        {
            'type': 'board_update',
            'data': {
                'event': event_type,
                'payload': data
            }
        }
    )

def get_user_role(workspace, user):
    try:
        return WM.objects.get(workspace=workspace, user=user).role
    except WM.DoesNotExist:
        return None

def has_permission(workspace, user, allowed_roles):
    role = get_user_role(workspace, user)
    return role in allowed_roles

def log_activity(workspace, user, message):
    ActivityLog.objects.create(workspace=workspace, user=user, message=message)

def send_email_sendgrid(to_email, subject, body):
    try:
        payload = json.dumps({
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {
                "email": settings.DEFAULT_FROM_EMAIL,
                "name": "TaskBoard"
            },
            "subject": subject,
            "content": [{"type": "text/plain", "value": body}]
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://api.sendgrid.com/v3/mail/send',
            data=payload,
            headers={
                'Authorization': f'Bearer {settings.SENDGRID_API_KEY}',
                'Content-Type': 'application/json'
            },
            method='POST'
        )

        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            print(f"Email sent: {response.status}")
        return True
    except Exception as e:
        print(f"Email error: {str(e)}")
        return False


# ─── WORKSPACE ────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def workspace_list(request):
    if request.method == 'GET':
        workspaces = Workspace.objects.filter(members=request.user)
        return Response(WorkspaceSerializer(workspaces, many=True).data)

    if request.method == 'POST':
        serializer = WorkspaceSerializer(data=request.data)
        if serializer.is_valid():
            workspace = serializer.save(owner=request.user)
            WorkspaceMember.objects.create(
                workspace=workspace, user=request.user, role='admin'
            )
            log_activity(
                workspace, request.user,
                f"{request.user.username} created workspace '{workspace.name}'"
            )
            return Response(WorkspaceSerializer(workspace).data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def workspace_detail(request, pk):
    try:
        workspace = Workspace.objects.get(pk=pk, members=request.user)
    except Workspace.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return Response(WorkspaceSerializer(workspace).data)

    member = WorkspaceMember.objects.get(workspace=workspace, user=request.user)
    if member.role != 'admin':
        return Response({'error': 'Only admins can do this'}, status=403)

    if request.method == 'PUT':
        serializer = WorkspaceSerializer(workspace, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        workspace.delete()
        return Response(status=204)


# ─── BOARD ────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def board_list(request, workspace_id):
    try:
        workspace = Workspace.objects.get(pk=workspace_id, members=request.user)
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace not found'}, status=404)

    if request.method == 'GET':
        boards = Board.objects.filter(workspace=workspace)
        return Response(BoardSerializer(boards, many=True).data)

    if request.method == 'POST':
        if not has_permission(workspace, request.user, ['admin', 'member']):
            return Response({'error': 'Viewers cannot create boards'}, status=403)

        data = request.data.copy()
        data['workspace'] = workspace.id
        serializer = BoardSerializer(data=data)
        if serializer.is_valid():
            board = serializer.save()
            Column.objects.create(board=board, name='To Do', order=0)
            Column.objects.create(board=board, name='In Progress', order=1)
            Column.objects.create(board=board, name='Done', order=2)
            log_activity(
                workspace, request.user,
                f"{request.user.username} created board '{board.name}'"
            )
            return Response(BoardSerializer(board).data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def board_detail(request, pk):
    try:
        board = Board.objects.get(pk=pk, workspace__members=request.user)
    except Board.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return Response(BoardSerializer(board).data)

    if request.method == 'PUT':
        serializer = BoardSerializer(board, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        board.delete()
        return Response(status=204)


# ─── COLUMN ───────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def column_create(request, board_id):
    try:
        board = Board.objects.get(pk=board_id, workspace__members=request.user)
    except Board.DoesNotExist:
        return Response({'error': 'Board not found'}, status=404)

    data = request.data.copy()
    data['board'] = board.id
    serializer = ColumnSerializer(data=data)
    if serializer.is_valid():
        column = serializer.save()
        return Response(ColumnSerializer(column).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def column_detail(request, pk):
    try:
        column = Column.objects.get(pk=pk, board__workspace__members=request.user)
    except Column.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if request.method == 'PUT':
        serializer = ColumnSerializer(column, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        column.delete()
        return Response(status=204)


# ─── CARD ─────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def card_create(request, column_id):
    try:
        column = Column.objects.get(pk=column_id, board__workspace__members=request.user)
    except Column.DoesNotExist:
        return Response({'error': 'Column not found'}, status=404)

    workspace = column.board.workspace
    if not has_permission(workspace, request.user, ['admin', 'member']):
        return Response({'error': 'Viewers cannot create cards'}, status=403)

    data = request.data.copy()
    data['column'] = column.id
    serializer = CardSerializer(data=data)
    if serializer.is_valid():
        card = serializer.save()
        log_activity(
            workspace, request.user,
            f"{request.user.username} created card '{card.title}'"
        )
        broadcast_update(workspace.id, 'card_created', CardSerializer(card).data)
        return Response(CardSerializer(card).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def card_detail(request, pk):
    try:
        card = Card.objects.get(pk=pk, column__board__workspace__members=request.user)
    except Card.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return Response(CardSerializer(card).data)

    if request.method == 'PUT':
        old_column = card.column.name
        serializer = CardSerializer(card, data=request.data, partial=True)
        if serializer.is_valid():
            updated_card = serializer.save()
            workspace = card.column.board.workspace
            if str(old_column) != str(updated_card.column.name):
                log_activity(
                    workspace, request.user,
                    f"{request.user.username} moved '{card.title}' to '{updated_card.column.name}'"
                )
            broadcast_update(workspace.id, 'card_updated', CardSerializer(updated_card).data)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        title = card.title
        card_id = card.id
        workspace = card.column.board.workspace
        card.delete()
        log_activity(
            workspace, request.user,
            f"{request.user.username} deleted card '{title}'"
        )
        broadcast_update(workspace.id, 'card_deleted', {'id': card_id})
        return Response(status=204)


# ─── ACTIVITY LOG ─────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_list(request, workspace_id):
    try:
        workspace = Workspace.objects.get(pk=workspace_id, members=request.user)
    except Workspace.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    logs = ActivityLog.objects.filter(workspace=workspace)[:30]
    return Response(ActivityLogSerializer(logs, many=True).data)


# ─── MEMBERS & INVITES ────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_member(request, workspace_id):
    try:
        workspace = Workspace.objects.get(pk=workspace_id, members=request.user)
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace not found'}, status=404)

    if not has_permission(workspace, request.user, ['admin']):
        return Response({'error': 'Only admins can invite members'}, status=403)

    email = request.data.get('email', '').strip()
    role = request.data.get('role', 'member')

    if not email:
        return Response({'error': 'Email is required'}, status=400)

    # Check if already a member
    existing_user = User.objects.filter(email=email).first()
    if existing_user and WorkspaceMember.objects.filter(
        workspace=workspace, user=existing_user
    ).exists():
        return Response({'error': 'User is already a member'}, status=400)

    # Delete old pending invite
    WorkspaceInvite.objects.filter(
        workspace=workspace, email=email, status='pending'
    ).delete()

    # Create new invite token
    invite = WorkspaceInvite.objects.create(
        workspace=workspace,
        email=email,
        role=role,
        invited_by=request.user
    )

    invite_url = f"{settings.FRONTEND_URL}/invite/accept/{invite.token}"

    # Send invite email
    send_email_sendgrid(
        to_email=email,
        subject=f"You're invited to join '{workspace.name}' on TaskBoard!",
        body=f"""Hi there!

{request.user.username} has invited you to join the workspace "{workspace.name}" as a {role}.

Click the link below to accept the invitation:
{invite_url}

If you don't have a TaskBoard account yet, you'll be asked to create one first.

TaskBoard Team"""
    )

    log_activity(
        workspace, request.user,
        f"{request.user.username} invited {email} as {role}"
    )

    return Response({
        'message': f'Invitation sent to {email}',
        'invite_url': invite_url
    }, status=201)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_invite_details(request, token):
    try:
        invite = WorkspaceInvite.objects.get(token=token, status='pending')
    except WorkspaceInvite.DoesNotExist:
        return Response({'error': 'Invalid or expired invitation'}, status=404)

    return Response({
        'workspace_name': invite.workspace.name,
        'invited_by': invite.invited_by.username,
        'role': invite.role,
        'email': invite.email,
        'token': str(invite.token)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_invite(request, token):
    try:
        invite = WorkspaceInvite.objects.get(token=token, status='pending')
    except WorkspaceInvite.DoesNotExist:
        return Response({'error': 'Invalid or expired invitation'}, status=404)

    user = request.user

    if WorkspaceMember.objects.filter(workspace=invite.workspace, user=user).exists():
        invite.status = 'accepted'
        invite.save()
        return Response({
            'message': 'You are already a member of this workspace',
            'workspace_id': invite.workspace.id
        })

    WorkspaceMember.objects.create(
        workspace=invite.workspace,
        user=user,
        role=invite.role
    )

    invite.status = 'accepted'
    invite.save()

    log_activity(
        invite.workspace, user,
        f"{user.username} joined as {invite.role}"
    )

    return Response({
        'message': f'Successfully joined {invite.workspace.name}!',
        'workspace_id': invite.workspace.id
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def member_list(request, workspace_id):
    try:
        workspace = Workspace.objects.get(pk=workspace_id, members=request.user)
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace not found'}, status=404)

    members = WorkspaceMember.objects.filter(workspace=workspace)
    return Response(WorkspaceMemberSerializer(members, many=True).data)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def member_detail(request, workspace_id, member_id):
    try:
        workspace = Workspace.objects.get(pk=workspace_id, members=request.user)
        target_member = WorkspaceMember.objects.get(pk=member_id, workspace=workspace)
    except (Workspace.DoesNotExist, WorkspaceMember.DoesNotExist):
        return Response({'error': 'Not found'}, status=404)

    if not has_permission(workspace, request.user, ['admin']):
        return Response({'error': 'Only admins can manage members'}, status=403)

    if request.method == 'PUT':
        new_role = request.data.get('role')
        if new_role not in ['admin', 'member', 'viewer']:
            return Response({'error': 'Invalid role'}, status=400)
        target_member.role = new_role
        target_member.save()
        log_activity(
            workspace, request.user,
            f"{request.user.username} changed {target_member.user.username}'s role to {new_role}"
        )
        return Response(WorkspaceMemberSerializer(target_member).data)

    if request.method == 'DELETE':
        if target_member.user == workspace.owner:
            return Response({'error': 'Cannot remove the workspace owner'}, status=400)
        username = target_member.user.username
        target_member.delete()
        log_activity(
            workspace, request.user,
            f"{request.user.username} removed {username} from workspace"
        )
        return Response(status=204)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_ai_cards(request, board_id):
    try:
        board = Board.objects.get(pk=board_id, workspace__members=request.user)
    except Board.DoesNotExist:
        return Response({'error': 'Board not found'}, status=404)

    prompt = request.data.get('prompt', '').strip()
    if not prompt:
        return Response({'error': 'Prompt is required'}, status=400)

    try:
        groq_key = os.environ.get('GROQ_API_KEY', '')
        print(f"GROQ KEY EXISTS: {bool(groq_key)}, LENGTH: {len(groq_key)}")

        payload = json.dumps({
           "model": "llama-3.1-8b-instant",
            "messages": [{
                "role": "user",
                "content": f"""You are a project management assistant. Generate 5-8 Kanban cards for this project.

Project: "{prompt}"

Respond ONLY with a valid JSON array, no markdown, no explanation:
[
  {{
    "title": "Task title here",
    "description": "Brief description",
    "priority": "high",
    "column": "To Do"
  }}
]

Rules:
- priority must be exactly: "low", "medium", or "high"
- column must be exactly: "To Do", "In Progress", or "Done"
- Most cards should go to "To Do"
- Make titles specific and actionable
- Keep descriptions under 100 characters"""
            }],
            "temperature": 0.7,
            "max_tokens": 1000
        }).encode('utf-8')

        import urllib.request
        import urllib.error
        import ssl

        ctx = ssl.create_default_context()
        req = urllib.request.Request(
            'https://api.groq.com/openai/v1/chat/completions',
            data=payload,
            headers={
                'Authorization': f'Bearer {groq_key}',
                'Content-Type': 'application/json',
                'User-Agent': 'TaskBoard/1.0'
            },
            method='POST'
        )

        with urllib.request.urlopen(req, context=ctx, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))

        text = result['choices'][0]['message']['content']
        clean = text.replace('```json', '').replace('```', '').strip()
        cards = json.loads(clean)
        return Response({'cards': cards})

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"HTTP Error {e.code}: {error_body}")
        return Response({'error': f'HTTP {e.code}: {error_body}'}, status=500)
    except urllib.error.URLError as e:
        print(f"URL Error: {str(e)}")
        return Response({'error': f'Connection failed: {str(e)}'}, status=500)
    except Exception as e:
        print(f"AI error: {str(e)}")
        return Response({'error': f'AI generation failed: {str(e)}'}, status=500)
    

from .models import CardComment
from .serializers import CardCommentSerializer

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def card_comments(request, card_id):
    try:
        card = Card.objects.get(pk=card_id, column__board__workspace__members=request.user)
    except Card.DoesNotExist:
        return Response({'error': 'Card not found'}, status=404)

    if request.method == 'GET':
        comments = CardComment.objects.filter(card=card)
        return Response(CardCommentSerializer(comments, many=True).data)

    if request.method == 'POST':
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Comment cannot be empty'}, status=400)

        comment = CardComment.objects.create(
            card=card,
            user=request.user,
            text=text
        )
        log_activity(
            card.column.board.workspace,
            request.user,
            f"{request.user.username} commented on '{card.title}'"
        )
        return Response(CardCommentSerializer(comment).data, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comment(request, comment_id):
    try:
        comment = CardComment.objects.get(
            pk=comment_id,
            card__column__board__workspace__members=request.user
        )
    except CardComment.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=404)

    if comment.user != request.user:
        return Response({'error': 'You can only delete your own comments'}, status=403)

    comment.delete()
    return Response(status=204)