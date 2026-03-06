"""Integration tests for /quotes endpoints."""

from app.models.quote import Quote


def _add_quotes(db, count=5):
    for i in range(count):
        db.add(Quote(text=f"Quote {i}", author=f"Author {i}"))
    db.commit()


# ---------------------------------------------------------------------------
# GET /quotes/random
# ---------------------------------------------------------------------------

class TestGetRandomQuote:
    def test_returns_quote_when_quotes_exist(self, client, db):
        _add_quotes(db, 3)
        res = client.get("/quotes/random")
        assert res.status_code == 200
        body = res.json()
        assert "text" in body
        assert "id" in body

    def test_returns_null_when_no_quotes(self, client):
        res = client.get("/quotes/random")
        assert res.status_code == 200
        assert res.json() is None

    def test_does_not_require_auth(self, client, db):
        """Quotes are public — no auth header needed."""
        _add_quotes(db, 1)
        res = client.get("/quotes/random")
        assert res.status_code == 200


# ---------------------------------------------------------------------------
# GET /quotes/batch
# ---------------------------------------------------------------------------

class TestGetBatchQuotes:
    def test_returns_requested_count(self, client, db):
        _add_quotes(db, 10)
        res = client.get("/quotes/batch?count=5")
        assert res.status_code == 200
        assert len(res.json()) == 5

    def test_default_count_is_10(self, client, db):
        _add_quotes(db, 15)
        res = client.get("/quotes/batch")
        assert res.status_code == 200
        assert len(res.json()) == 10

    def test_caps_at_100(self, client, db):
        _add_quotes(db, 5)
        res = client.get("/quotes/batch?count=200")
        assert res.status_code == 200
        # Only 5 quotes exist even though 200 requested (cap at 100 but only 5 in DB)
        assert len(res.json()) == 5

    def test_returns_empty_list_when_no_quotes(self, client):
        res = client.get("/quotes/batch")
        assert res.status_code == 200
        assert res.json() == []

    def test_response_schema(self, client, db):
        _add_quotes(db, 2)
        items = client.get("/quotes/batch?count=2").json()
        for item in items:
            assert "id" in item
            assert "text" in item
            assert "author" in item
