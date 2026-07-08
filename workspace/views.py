from django.shortcuts import render

# Create your views here.
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Workspace, WorkspaceMember, Board, Column, Card, ActivityLog
from .serializers import (
    WorkspaceSerializer, BoardSerializer,
    ColumnSerializer, CardSerializer, ActivityLogSerializer,
    WorkspaceMemberSerializer
)

from .models import WorkspaceMember as WM
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

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
            # Auto-add creator as admin
            WorkspaceMember.objects.create(
                workspace=workspace, user=request.user, role='admin'
            )
            log_activity(workspace, request.user, f"{request.user.username} created workspace '{workspace.name}'")
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
            log_activity(workspace, request.user, f"{request.user.username} created board '{board.name}'")
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
        log_activity(workspace, request.user, f"{request.user.username} created card '{card.title}'")
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
            log_activity(workspace, request.user, f"{request.user.username} deleted card '{title}'")
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
from django.contrib.auth import get_user_model
from .serializers import InviteSerializer

User = get_user_model()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_member(request, workspace_id):
    try:
        workspace = Workspace.objects.get(pk=workspace_id, members=request.user)
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace not found'}, status=404)

    # Only admins can invite
    if not has_permission(workspace, request.user, ['admin']):
        return Response({'error': 'Only admins can invite members'}, status=403)

    serializer = InviteSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    email = serializer.validated_data['email']
    role = serializer.validated_data['role']

    try:
        user_to_invite = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'No user found with this email. They must register first.'}, status=404)

    if WorkspaceMember.objects.filter(workspace=workspace, user=user_to_invite).exists():
        return Response({'error': 'User is already a member'}, status=400)

    WorkspaceMember.objects.create(workspace=workspace, user=user_to_invite, role=role)
    log_activity(workspace, request.user, f"{request.user.username} added {user_to_invite.username} as {role}")

    return Response({'message': f'{user_to_invite.username} added as {role}'}, status=201)


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
        # Change role
        new_role = request.data.get('role')
        if new_role not in ['admin', 'member', 'viewer']:
            return Response({'error': 'Invalid role'}, status=400)
        target_member.role = new_role
        target_member.save()
        log_activity(workspace, request.user, f"{request.user.username} changed {target_member.user.username}'s role to {new_role}")
        return Response(WorkspaceMemberSerializer(target_member).data)

    if request.method == 'DELETE':
        if target_member.user == workspace.owner:
            return Response({'error': 'Cannot remove the workspace owner'}, status=400)
        username = target_member.user.username
        target_member.delete()
        log_activity(workspace, request.user, f"{request.user.username} removed {username} from workspace")
        return Response(status=204)