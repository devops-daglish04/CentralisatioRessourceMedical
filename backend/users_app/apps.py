from django.apps import AppConfig


class UsersAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "backend.users_app"
    label = "users_app"
    verbose_name = "Users"


