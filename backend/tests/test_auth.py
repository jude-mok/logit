"""Integration tests for /auth endpoints."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# POST /auth/sign_up
# ---------------------------------------------------------------------------

class TestSignUp:
    def test_signup_returns_tokens(self, client):
        res = client.post("/auth/sign_up", json={
            "email": "new@example.com",
            "password": "secret123",
            "user_name": "newuser",
        })
        assert res.status_code == 200
        body = res.json()
        assert "access_token" in body
        assert "refresh_token" in body
        assert body["token_type"] == "bearer"

    def test_signup_duplicate_email_returns_409(self, client):
        payload = {
            "email": "dup@example.com",
            "password": "secret123",
            "user_name": "user1",
        }
        client.post("/auth/sign_up", json=payload)

        payload["user_name"] = "user2"  # different name, same email
        res = client.post("/auth/sign_up", json=payload)
        assert res.status_code == 409
        assert "already taken" in res.json()["detail"]

    def test_signup_creates_user_with_email_provider(self, client, db):
        from app.models.user import User

        client.post("/auth/sign_up", json={
            "email": "check@example.com",
            "password": "secret123",
            "user_name": "checkuser",
        })
        user = db.query(User).filter(User.email == "check@example.com").first()
        assert user is not None
        assert user.provider == "email"


# ---------------------------------------------------------------------------
# POST /auth/signin
# ---------------------------------------------------------------------------

class TestSignIn:
    def test_signin_returns_tokens(self, client, test_user):
        res = client.post("/auth/signin", json={
            "user_name": "testuser",
            "password": "password123",
        })
        assert res.status_code == 200
        body = res.json()
        assert "access_token" in body
        assert "refresh_token" in body

    def test_signin_wrong_username_returns_401(self, client, test_user):
        res = client.post("/auth/signin", json={
            "user_name": "doesnotexist",
            "password": "password123",
        })
        assert res.status_code == 401

    def test_signin_wrong_password_returns_401(self, client, test_user):
        res = client.post("/auth/signin", json={
            "user_name": "testuser",
            "password": "wrongpassword",
        })
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# POST /auth/google
# ---------------------------------------------------------------------------

class TestGoogleAuth:
    def _mock_google(self, status_code, userinfo=None):
        """Return a context manager that patches httpx.AsyncClient."""
        mock_response = MagicMock()           # sync MagicMock — httpx .json() is synchronous
        mock_response.status_code = status_code
        mock_response.json.return_value = userinfo or {}

        mock_cls = MagicMock()
        mock_cls.return_value.__aenter__ = AsyncMock(
            return_value=MagicMock(get=AsyncMock(return_value=mock_response))
        )
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        return patch("app.routers.auth.httpx.AsyncClient", mock_cls)

    def test_google_invalid_token_returns_401(self, client):
        """When Google rejects the token we should return 401."""
        with self._mock_google(401):
            res = client.post("/auth/google", json={"access_token": "bad-token"})
        assert res.status_code == 401

    def test_google_new_user_is_created(self, client, db):
        """Valid Google token for an unknown user → new account created, tokens returned."""
        from app.models.user import User

        userinfo = {"sub": "google-uid-123", "email": "googleuser@gmail.com", "name": "Google User"}
        with self._mock_google(200, userinfo):
            res = client.post("/auth/google", json={"access_token": "valid-google-token"})

        assert res.status_code == 200
        assert "access_token" in res.json()

        user = db.query(User).filter(User.email == "googleuser@gmail.com").first()
        assert user is not None
        assert user.provider == "google"

    def test_google_existing_email_with_password_returns_409(self, client, test_user):
        """Google email that already exists as email/password account → 409."""
        userinfo = {"sub": "google-uid-456", "email": test_user.email, "name": "Test User"}
        with self._mock_google(200, userinfo):
            res = client.post("/auth/google", json={"access_token": "valid-token"})
        assert res.status_code == 409

    def test_google_returning_user_gets_tokens(self, client, db):
        """Existing Google user logs in again → tokens returned, no duplicate created."""
        from app.models.user import User
        import time

        existing = User(
            email="returning@gmail.com",
            password_hash=None,
            provider="google",
            provider_id="google-uid-789",
            user_name="Returning User",
            created_at=int(time.time()),
        )
        db.add(existing)
        db.commit()

        userinfo = {"sub": "google-uid-789", "email": "returning@gmail.com", "name": "Returning User"}
        with self._mock_google(200, userinfo):
            res = client.post("/auth/google", json={"access_token": "valid-token"})

        assert res.status_code == 200
        count = db.query(User).filter(User.email == "returning@gmail.com").count()
        assert count == 1  # no duplicate
