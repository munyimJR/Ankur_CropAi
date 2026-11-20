def test_register_and_login(client):
    reg_payload = {
        "email": "testfarmer@agripilot.bd",
        "password": "SecretPassword123!",
        "name": "Kuddus Mia",
        "phone": "+8801712345678",
        "districtId": "bogura",
        "areaUnit": "acre"
    }
    r = client.post("/api/v1/auth/register", json=reg_payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert "accessToken" in data
    assert data["user"]["email"] == "testfarmer@agripilot.bd"
    assert data["user"]["profile"]["name"] == "Kuddus Mia"
    token = data["accessToken"]

    # Login
    login_payload = {
        "email": "testfarmer@agripilot.bd",
        "password": "SecretPassword123!"
    }
    r_login = client.post("/api/v1/auth/login", json=login_payload)
    assert r_login.status_code == 200
    assert "accessToken" in r_login.json()

    # Get /me with token
    r_me = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert r_me.status_code == 200
    assert r_me.json()["email"] == "testfarmer@agripilot.bd"

    # Duplicate registration should be rejected
    r_dup = client.post("/api/v1/auth/register", json=reg_payload)
    assert r_dup.status_code == 409
