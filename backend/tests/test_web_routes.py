def test_web_endpoints_do_not_redirect(client):
    for path in ['/moments', '/me', '/album']:
        response = client.get(path, follow_redirects=False)
        assert response.status_code == 401
        assert 'location' not in response.headers
    response = client.post('/moments?timezone=America%2FNew_York', follow_redirects=False)
    assert response.status_code == 401
    assert 'location' not in response.headers
