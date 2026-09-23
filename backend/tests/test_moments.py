"""Integration tests for /moments endpoints."""

import io
import time
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

from tests.conftest import make_moment


def _today_start_ts() -> int:
    now = datetime.now(timezone.utc)
    reset = now.replace(hour=8, minute=0, second=0, microsecond=0)
    if now < reset:
        reset -= timedelta(days=1)
    return int(reset.timestamp())


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def upload_moment(client, auth_headers, *, comment=None):
    """POST /moments/ with a fake image file."""
    with patch("app.routers.photos.save_image", new_callable=AsyncMock) as mock_save:
        mock_save.return_value = "uploads/fake.jpg"
        data = {}
        if comment:
            data["comment"] = comment
        res = client.post(
            "/moments/",
            files={"file": ("photo.jpg", b"\xff\xd8\xff", "image/jpeg")},
            data=data,
            headers=auth_headers,
        )
    return res


# ---------------------------------------------------------------------------
# GET /moments/can-upload
# ---------------------------------------------------------------------------

class TestCanUpload:
    def test_can_upload_with_no_moments(self, client, auth_headers):
        res = client.get("/moments/can-upload", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["can_upload"] is True

    def test_cannot_upload_after_posting_today(self, client, test_user, db, auth_headers):
        make_moment(db, test_user.id, created_at=_today_start_ts() + 60)
        res = client.get("/moments/can-upload", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["can_upload"] is False

    def test_can_upload_after_yesterday_moment(self, client, test_user, db, auth_headers):
        yesterday_ts = _today_start_ts() - 3600  # one hour before today
        make_moment(db, test_user.id, created_at=yesterday_ts)
        res = client.get("/moments/can-upload", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["can_upload"] is True

    def test_unauthenticated_returns_401(self, client):
        res = client.get("/moments/can-upload")
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# POST /moments/
# ---------------------------------------------------------------------------

class TestCreateMoment:
    def test_create_moment_returns_moment(self, client, auth_headers):
        res = upload_moment(client, auth_headers, comment="Hello world")
        assert res.status_code == 200
        body = res.json()
        assert body["comment"] == "Hello world"
        assert body["is_starred"] is False
        assert "id" in body

    def test_create_moment_without_comment(self, client, auth_headers):
        res = upload_moment(client, auth_headers)
        assert res.status_code == 200
        assert res.json()["comment"] is None

    def test_second_upload_same_day_returns_429(self, client, test_user, db, auth_headers):
        make_moment(db, test_user.id, created_at=_today_start_ts() + 60)
        res = upload_moment(client, auth_headers)
        assert res.status_code == 429

    def test_unauthenticated_returns_401(self, client):
        with patch("app.routers.photos.save_image", new_callable=AsyncMock):
            res = client.post(
                "/moments/",
                files={"file": ("photo.jpg", b"\xff\xd8\xff", "image/jpeg")},
            )
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# GET /moments/
# ---------------------------------------------------------------------------

class TestGetMoments:
    def test_returns_empty_list_when_no_moments(self, client, auth_headers):
        res = client.get("/moments/", headers=auth_headers)
        assert res.status_code == 200
        assert res.json() == []

    def test_chronological_order(self, client, test_user, db, auth_headers):
        now = int(time.time())
        make_moment(db, test_user.id, comment="older", created_at=now - 200)
        make_moment(db, test_user.id, comment="newer", created_at=now - 100, is_backdated=False)

        res = client.get("/moments/?order=chronological", headers=auth_headers)
        assert res.status_code == 200
        items = res.json()
        assert len(items) == 2
        assert items[0]["created_at"] > items[1]["created_at"]  # newest first

    def test_starred_filter(self, client, test_user, db, auth_headers):
        make_moment(db, test_user.id, comment="not starred")
        make_moment(db, test_user.id, comment="starred", is_starred=True)

        res = client.get("/moments/?order=starred", headers=auth_headers)
        assert res.status_code == 200
        items = res.json()
        assert len(items) == 1
        assert items[0]["comment"] == "starred"

    def test_random_order_limits_to_ten(self, client, test_user, db, auth_headers):
        now = int(time.time())
        for i in range(15):
            make_moment(db, test_user.id, created_at=now - i * 86400)

        res = client.get("/moments/", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.json()) <= 10

    def test_only_returns_own_moments(self, client, test_user, second_user, db,
                                     auth_headers, second_auth_headers):
        make_moment(db, test_user.id, comment="mine")
        make_moment(db, second_user.id, comment="theirs")

        res = client.get("/moments/?order=chronological", headers=auth_headers)
        items = res.json()
        assert len(items) == 1
        assert items[0]["comment"] == "mine"


# ---------------------------------------------------------------------------
# GET /moments/random
# ---------------------------------------------------------------------------

class TestGetRandomMoment:
    def test_returns_a_moment(self, client, test_user, db, auth_headers):
        make_moment(db, test_user.id, comment="random one")
        res = client.get("/moments/random", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["comment"] == "random one"

    def test_returns_none_when_empty(self, client, auth_headers):
        res = client.get("/moments/random", headers=auth_headers)
        assert res.status_code == 200
        assert res.json() is None


# ---------------------------------------------------------------------------
# PATCH /moments/{id}/star
# ---------------------------------------------------------------------------

class TestToggleStar:
    def test_star_moment(self, client, test_user, db, auth_headers):
        m = make_moment(db, test_user.id)
        res = client.patch(f"/moments/{m.id}/star", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["is_starred"] is True

    def test_unstar_moment(self, client, test_user, db, auth_headers):
        m = make_moment(db, test_user.id, is_starred=True)
        res = client.patch(f"/moments/{m.id}/star", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["is_starred"] is False

    def test_other_users_moment_returns_404(self, client, second_user, db, auth_headers):
        m = make_moment(db, second_user.id)
        res = client.patch(f"/moments/{m.id}/star", headers=auth_headers)
        assert res.status_code == 404

    def test_nonexistent_moment_returns_404(self, client, auth_headers):
        res = client.patch("/moments/999/star", headers=auth_headers)
        assert res.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /moments/{id}
# ---------------------------------------------------------------------------

class TestDeleteMoment:
    def test_delete_own_moment(self, client, test_user, db, auth_headers):
        m = make_moment(db, test_user.id)
        res = client.delete(f"/moments/{m.id}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["message"] == "deleted"

    def test_delete_other_users_moment_returns_404(self, client, second_user, db,
                                                    auth_headers):
        m = make_moment(db, second_user.id)
        res = client.delete(f"/moments/{m.id}", headers=auth_headers)
        assert res.status_code == 404

    def test_deleted_moment_no_longer_returned(self, client, test_user, db, auth_headers):
        from app.models.moment import Moment

        m = make_moment(db, test_user.id)
        client.delete(f"/moments/{m.id}", headers=auth_headers)

        remaining = db.query(Moment).filter(Moment.id == m.id).first()
        assert remaining is None


# ---------------------------------------------------------------------------
# PATCH /moments/{id}/edit
# ---------------------------------------------------------------------------

class TestEditMoment:
    def test_edit_comment(self, client, test_user, db, auth_headers):
        m = make_moment(db, test_user.id, comment="old")
        res = client.patch(
            f"/moments/{m.id}/edit",
            json={"new_comment": "updated"},
            headers=auth_headers,
        )
        assert res.status_code == 200
        assert res.json()["comment"] == "updated"

    def test_edit_other_users_moment_returns_404(self, client, second_user, db,
                                                  auth_headers):
        m = make_moment(db, second_user.id, comment="theirs")
        res = client.patch(
            f"/moments/{m.id}/edit",
            json={"new_comment": "hacked"},
            headers=auth_headers,
        )
        assert res.status_code == 404

    def test_edit_nonexistent_returns_404(self, client, auth_headers):
        res = client.patch(
            "/moments/999/edit",
            json={"new_comment": "nope"},
            headers=auth_headers,
        )
        assert res.status_code == 404
