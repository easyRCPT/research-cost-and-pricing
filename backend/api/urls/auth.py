from django.urls import path

from api.views import auth

urlpatterns = [
    # Auth
    path("signup/", auth.SignupView.as_view(), name="signup"),
    path("login/", auth.LoginView.as_view(), name="login"),
    path(
        "admin-login/",
        auth.AdminLoginView.as_view(),
        name="admin-login",
    ),
    path("logout/", auth.LogoutView.as_view(), name="logout"),
    path("me/", auth.MeView.as_view(), name="me"),
    path("csrf/", auth.CsrfView.as_view(), name="csrf"),
]
