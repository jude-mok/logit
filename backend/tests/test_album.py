"""Integration tests for /album endpoints."""

import time
from datetime import datetime

from tests.conftest import make_moment


def _ts_for(year, month, day=15) -> int:
    """Return a Unix timestamp for a given date at noon UTC."""
    return int(datetime(year, month, day, 12, 0, 0).timestamp())


# ---------------------------------------------------------------------------
# GET /album/
# ---------------------------------------------------------------------------

class TestGetAlbums:
    def test_returns_empty_list_when_no_moments(self, client, auth_headers):
        res = client.get("/album/", headers=auth_headers)
        assert res.status_code == 200
        assert res.json() == []

    def test_groups_moments_by_month(self, client, test_user, db, auth_headers):
        make_moment(db, test_user.id, created_at=_ts_for(2025, 1))
        make_moment(db, test_user.id, created_at=_ts_for(2025, 1))  # same month
        make_moment(db, test_user.id, created_at=_ts_for(2025, 2))

        res = client.get("/album/", headers=auth_headers)
        assert res.status_code == 200
        albums = res.json()
        assert len(albums) == 2

        counts = {f"{a['year']}-{a['month']:02d}": a["count"] for a in albums}
        assert counts["2025-01"] == 2
        assert counts["2025-02"] == 1

    def test_albums_sorted_newest_first(self, client, test_user, db, auth_headers):
        make_moment(db, test_user.id, created_at=_ts_for(2024, 6))
        make_moment(db, test_user.id, created_at=_ts_for(2025, 3))

        albums = client.get("/album/", headers=auth_headers).json()
        years_months = [(a["year"], a["month"]) for a in albums]
        assert years_months == sorted(years_months, reverse=True)

    def test_only_returns_own_moments(self, client, test_user, second_user, db,
                                      auth_headers):
        make_moment(db, test_user.id, created_at=_ts_for(2025, 1))
        make_moment(db, second_user.id, created_at=_ts_for(2025, 1))

        albums = client.get("/album/", headers=auth_headers).json()
        assert len(albums) == 1
        assert albums[0]["count"] == 1

    def test_unauthenticated_returns_401(self, client):
        res = client.get("/album/")
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# GET /album/{year}/{month}
# ---------------------------------------------------------------------------

class TestGetAlbumMoments:
    def test_returns_moments_for_month(self, client, test_user, db, auth_headers):
        make_moment(db, test_user.id, comment="jan", created_at=_ts_for(2025, 1))
        make_moment(db, test_user.id, comment="feb", created_at=_ts_for(2025, 2))

        res = client.get("/album/2025/1", headers=auth_headers)
        assert res.status_code == 200
        items = res.json()
        assert len(items) == 1
        assert items[0]["comment"] == "jan"

    def test_returns_empty_list_for_month_with_no_moments(self, client, auth_headers):
        res = client.get("/album/2020/1", headers=auth_headers)
        assert res.status_code == 200
        assert res.json() == []

    def test_sorted_newest_first(self, client, test_user, db, auth_headers):
        make_moment(db, test_user.id, created_at=_ts_for(2025, 3, 1))
        make_moment(db, test_user.id, created_at=_ts_for(2025, 3, 20))

        items = client.get("/album/2025/3", headers=auth_headers).json()
        assert len(items) == 2
        assert items[0]["created_at"] > items[1]["created_at"]


# ---------------------------------------------------------------------------
# GET /album/calendar/{year}/{month}
# ---------------------------------------------------------------------------

class TestGetCalendar:
    def test_returns_dates_for_month(self, client, test_user, db, auth_headers):
        make_moment(db, test_user.id, created_at=_ts_for(2025, 5, 10))
        make_moment(db, test_user.id, created_at=_ts_for(2025, 5, 20))
        make_moment(db, test_user.id, created_at=_ts_for(2025, 6, 1))

        res = client.get("/album/calendar/2025/5", headers=auth_headers)
        assert res.status_code == 200
        entries = res.json()
        assert len(entries) == 2

        dates = {e["date"] for e in entries}
        assert "2025-05-10" in dates
        assert "2025-05-20" in dates

    def test_returns_empty_for_month_with_no_moments(self, client, auth_headers):
        res = client.get("/album/calendar/2020/1", headers=auth_headers)
        assert res.status_code == 200
        assert res.json() == []

    def test_calendar_entries_contain_moment_id(self, client, test_user, db, auth_headers):
        m = make_moment(db, test_user.id, created_at=_ts_for(2025, 7, 4))
        entries = client.get("/album/calendar/2025/7", headers=auth_headers).json()
        assert len(entries) == 1
        assert entries[0]["moment_id"] == m.id

    def test_only_own_moments_in_calendar(self, client, test_user, second_user, db,
                                          auth_headers):
        make_moment(db, test_user.id, created_at=_ts_for(2025, 8, 1))
        make_moment(db, second_user.id, created_at=_ts_for(2025, 8, 2))

        entries = client.get("/album/calendar/2025/8", headers=auth_headers).json()
        assert len(entries) == 1
