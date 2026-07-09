from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer
from .models import PasswordResetToken
import ssl
import urllib.request
import json

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def check_email(request):
    email = request.data.get('email', '')
    exists = User.objects.filter(email=email).exists()
    return Response({'exists': exists})


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get('email', '')
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'message': 'If this email exists, a reset link has been sent.'})

    PasswordResetToken.objects.filter(user=user).delete()
    token = PasswordResetToken.objects.create(user=user)
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{token.token}"

    try:
        payload = json.dumps({
            "personalizations": [{"to": [{"email": email}]}],
            "from": {
                "email": settings.DEFAULT_FROM_EMAIL,
                "name": "TaskBoard"
            },
            "subject": "Reset your TaskBoard password",
            "content": [{
                "type": "text/plain",
                "value": f"Hi {user.username},\n\nClick this link to reset your password:\n{reset_url}\n\nThis link expires in 24 hours.\n\nTaskBoard Team"
            }]
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
            print(f"SendGrid status: {response.status}")

    except Exception as e:
        print(f"Email error: {str(e)}")
        return Response({'error': f'Email sending failed: {str(e)}'}, status=500)

    return Response({'message': 'If this email exists, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    token_str = request.data.get('token', '')
    new_password = request.data.get('password', '')

    if len(new_password) < 8:
        return Response(
            {'error': 'Password must be at least 8 characters'},
            status=400
        )

    try:
        token = PasswordResetToken.objects.get(token=token_str, is_used=False)
    except PasswordResetToken.DoesNotExist:
        return Response(
            {'error': 'Invalid or expired reset link'},
            status=400
        )

    user = token.user
    user.set_password(new_password)
    user.save()

    token.is_used = True
    token.save()

    return Response({'message': 'Password reset successful. You can now login.'})