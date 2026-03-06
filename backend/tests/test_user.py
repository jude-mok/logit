"""Integration tests for /me endpoints."""

import time
import pytest
from datetime import datetime, timedelta

from tests.conftest import make_moment


# ---------------------------------------------------------------------------
# GET /me/
# ---------------------------------------------------------------------------

class TestGetMe:
    def test_returns_user_info(self, client, test_user, auth_headers):
        res = client.get("/me/", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["email"] == test_user.email
        assert body["user_name"] == test_user.user_name
        assert body["id"] == test_user.id
        assert body["provider"] == "email"

    def test_unauthenticated_returns_401(self, client):
        res = client.get("/me/")
        assert res.status_code == 401

    def test_invalid_token_returns_401(self, client):
        res = client.get("/me/", headers={"Authorization": "Bearer bad-token"})
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /me/update
# ---------------------------------------------------------------------------

class TestUpdateMe:
    def test_update_username(self, client, test_user, db, auth_headers):
        res = client.patch(
            "/me/update",
            json={"user_name": "newname"},
            headers=auth_headers,
        )
        assert res.status_code == 200
        assert res.json()["user_name"] == "newname"
        db.refresh(test_user)
        assert test_user.user_name == "newname"

    def test_update_username_taken_by_other_user_returns_409(
        self, client, test_user, second_user, auth_headers
    ):
        res = client.patch(
            "/me/update",
            json={"user_name": second_user.user_name},
            headers=auth_headers,
        )
        assert res.status_code == 409

    def test_update_username_to_own_name_succeeds(self, client, test_user, auth_headers):
        res = client.patch(
            "/me/update",
            json={"user_name": test_user.user_name},
            headers=auth_headers,
        )
        assert res.status_code == 200

    def test_update_password(self, client, test_user, db, auth_headers):
        res = client.patch(
            "/me/update",
            json={
                "current_password": "password123",
                "new_password": "newpassword456",
            },
            headers=auth_headers,
        )
        assert res.status_code == 200
        db.refresh(test_user)
        from app.services.auth import verify_password
        assert verify_password("newpassword456", test_user.password_hash)

    def test_update_password_wrong_current_returns_401(self, client, auth_headers):
        res = client.patch(
            "/me/update",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword456",
            },
            headers=auth_headers,
        )
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /me/delete
# ---------------------------------------------------------------------------

class TestDeleteMe:
    def test_delete_account(self, client, test_user, db, auth_headers):
        from app.models.user import User

        res = client.delete("/me/delete", headers=auth_headers)
        assert res.status_code == 200
        assert "deleted" in res.json()["message"]

        user = db.query(User).filter(User.id == test_user.id).first()
        assert user is None

    def test_unauthenticated_returns_401(self, client):
        res = client.delete("/me/delete")
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# GET /me/tree
# ---------------------------------------------------------------------------

class TestTreeStatus:
    def _add_moments(self, db, user_id, count, is_backdated=False):
        now = int(time.time())
        for i in range(count):
            make_moment(
                db, user_id,
                created_at=now - i * 86400,  # one per day going back
                is_backdated=is_backdated,
            )

    def test_stage_1_with_0_moments(self, client, auth_headers):
        res = client.get("/me/tree", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["stage"] == 1
        assert body["count"] == 0

    def test_stage_1_with_9_moments(self, client, test_user, db, auth_headers):
        self._add_moments(db, test_user.id, 9)
        res = client.get("/me/tree", headers=auth_headers)
        assert res.json()["stage"] == 1

    def test_stage_2_with_10_moments(self, client, test_user, db, auth_headers):
        self._add_moments(db, test_user.id, 10)
        res = client.get("/me/tree", headers=auth_headers)
        assert res.json()["stage"] == 2

    def test_stage_3_with_20_moments(self, client, test_user, db, auth_headers):
        self._add_moments(db, test_user.id, 20)
        res = client.get("/me/tree", headers=auth_headers)
        assert res.json()["stage"] == 3

    def test_stage_4_with_30_moments(self, client, test_user, db, auth_headers):
        self._add_moments(db, test_user.id, 30)
        res = client.get("/me/tree", headers=auth_headers)
        assert res.json()["stage"] == 4

    def test_stage_5_with_40_moments(self, client, test_user, db, auth_headers):
        self._add_moments(db, test_user.id, 40)
        res = client.get("/me/tree", headers=auth_headers)
        assert res.json()["stage"] == 5

    def test_stage_6_with_50_moments_and_recent_activity(
        self, client, test_user, db, auth_headers
    ):
        self._add_moments(db, test_user.id, 50)
        res = client.get("/me/tree", headers=auth_headers)
        body = res.json()
        assert body["stage"] == 6
        assert body["count"] == 50

    def test_dead_tree_after_7_days_inactive(self, client, test_user, db, auth_headers):
        """50+ moments but last one was 10 days ago → 'dead'."""
        now = int(time.time())
        ten_days_ago = now - 10 * 86400
        for i in range(50):
            make_moment(db, test_user.id, created_at=ten_days_ago - i * 86400)

        res = client.get("/me/tree", headers=auth_headers)
        body = res.json()
        assert body["stage"] == "dead"

    def test_backdated_moments_excluded_from_tree(self, client, test_user, db, auth_headers):
        """Backdated moments should not count toward tree stage."""
        self._add_moments(db, test_user.id, 5, is_backdated=False)
        self._add_moments(db, test_user.id, 20, is_backdated=True)

        res = client.get("/me/tree", headers=auth_headers)
        body = res.json()
        assert body["count"] == 5
        assert body["stage"] == 1

    def test_unauthenticated_returns_401(self, client):
        res = client.get("/me/tree")
        assert res.status_code == 401
