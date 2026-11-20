def test_farm_lifecycle(client):
    # 1. Register a user
    r_reg = client.post("/api/v1/auth/register", json={
        "email": "farmer.farms@agripilot.bd",
        "password": "Password123!",
        "name": "Rahim Uddin",
        "districtId": "bogura",
        "areaUnit": "acre"
    })
    assert r_reg.status_code == 201
    token = r_reg.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create farm
    farm_data = {
        "name": "North Aman Plot",
        "crop": "rice",
        "districtId": "bogura",
        "areaAcres": 2.5,
        "plantingDate": "2026-07-15",
        "notes": "BRRI dhan49 transplanting"
    }
    r_create = client.post("/api/v1/farms", json=farm_data, headers=headers)
    assert r_create.status_code == 201
    farm = r_create.json()
    farm_id = farm["id"]
    assert farm["name"] == "North Aman Plot"
    assert farm["crop"] == "rice"
    assert farm["areaAcres"] == 2.5

    # 3. List farms
    r_list = client.get("/api/v1/farms", headers=headers)
    assert r_list.status_code == 200
    farms = r_list.json()
    assert any(f["id"] == farm_id for f in farms)

    # 4. Get specific farm
    r_get = client.get(f"/api/v1/farms/{farm_id}", headers=headers)
    assert r_get.status_code == 200
    assert r_get.json()["id"] == farm_id

    # 5. Patch farm
    r_patch = client.patch(f"/api/v1/farms/{farm_id}", json={"name": "North Aman Plot (Updated)"}, headers=headers)
    assert r_patch.status_code == 200
    assert r_patch.json()["name"] == "North Aman Plot (Updated)"

    # 6. Delete farm
    r_del = client.delete(f"/api/v1/farms/{farm_id}", headers=headers)
    assert r_del.status_code == 204
