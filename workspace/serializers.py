from rest_framework import serializers
from .models import Workspace, WorkspaceMember, Board, Column, Card, ActivityLog
from users.serializers import UserSerializer


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ['id', 'user', 'role', 'joined_at']


class CardSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Card
        fields = ['id', 'title', 'description', 'priority', 'due_date',
                  'assigned_to', 'assigned_to_id', 'order', 'column', 'created_at']


class ColumnSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)

    class Meta:
        model = Column
        fields = ['id', 'name', 'order', 'board', 'cards']


class BoardSerializer(serializers.ModelSerializer):
    columns = ColumnSerializer(many=True, read_only=True)

    class Meta:
        model = Board
        fields = ['id', 'name', 'description', 'workspace', 'columns', 'created_at']


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members_detail = WorkspaceMemberSerializer(
        source='workspacemember_set', many=True, read_only=True
    )
    boards = BoardSerializer(many=True, read_only=True)

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'owner', 'members_detail', 'boards', 'created_at']


class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'message', 'created_at']


class InviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['admin', 'member', 'viewer'], default='member')

class CardCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CardComment
        fields = ['id', 'user', 'text', 'created_at']