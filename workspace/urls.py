from django.urls import path
from . import views

urlpatterns = [
    # Workspace
    path('', views.workspace_list, name='workspace-list'),
    path('<int:pk>/', views.workspace_detail, name='workspace-detail'),

    # Board
    path('<int:workspace_id>/boards/', views.board_list, name='board-list'),
    path('boards/<int:pk>/', views.board_detail, name='board-detail'),

    # Column
    path('boards/<int:board_id>/columns/', views.column_create, name='column-create'),
    path('columns/<int:pk>/', views.column_detail, name='column-detail'),

    # Card
    path('columns/<int:column_id>/cards/', views.card_create, name='card-create'),
    path('cards/<int:pk>/', views.card_detail, name='card-detail'),

    # Activity
    path('<int:workspace_id>/activity/', views.activity_list, name='activity-list'),
    # Members & Invites
    path('<int:workspace_id>/invite/', views.invite_member, name='invite-member'),
    path('<int:workspace_id>/members/', views.member_list, name='member-list'),
    path('<int:workspace_id>/members/<int:member_id>/', views.member_detail, name='member-detail'),
    path('invite/<str:token>/', views.get_invite_details, name='invite-details'),
    path('invite/<str:token>/accept/', views.accept_invite, name='accept-invite'),
    path('boards/<int:board_id>/ai-generate/', views.generate_ai_cards, name='ai-generate'),
    path('cards/<int:card_id>/comments/', views.card_comments, name='card-comments'),
    path('comments/<int:comment_id>/', views.delete_comment, name='delete-comment'),
]