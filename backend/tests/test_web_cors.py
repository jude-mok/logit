def test_web_upload_preflight(client):
    response = client.options('/moments/', headers={
        'Origin': 'http://127.0.0.1:5174',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
    })
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == 'http://127.0.0.1:5174'


def test_unknown_web_origin_is_not_allowed(client):
    response = client.options('/moments/', headers={
        'Origin': 'https://untrusted.example',
        'Access-Control-Request-Method': 'POST',
    })
    assert response.status_code == 400
    assert 'access-control-allow-origin' not in response.headers
