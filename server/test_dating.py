import requests
import random
import string

BASE_URL = "http://localhost:5000"

def get_session():
    # Load app to get a session
    res = requests.get(f"{BASE_URL}/")
    print("Health check:", res.json())

    # Create user 1
    res = requests.post(f"{BASE_URL}/api/users/session")
    token1 = res.json()["session_token"]
    
    # Create user 2
    res = requests.post(f"{BASE_URL}/api/users/session")
    token2 = res.json()["session_token"]
    
    return token1, token2

def test_dating():
    t1, t2 = get_session()
    
    h1 = {"Authorization": t1}
    h2 = {"Authorization": t2}
    
    print("Creating dating profiles...")
    requests.post(f"{BASE_URL}/api/dating/profile", json={"bio": "I am user 1", "gender": "male", "looking_for": "female"}, headers=h1)
    requests.post(f"{BASE_URL}/api/dating/profile", json={"bio": "I am user 2", "gender": "female", "looking_for": "male"}, headers=h2)
    
    print("User 1 discovers profiles...")
    res = requests.get(f"{BASE_URL}/api/dating/discover", headers=h1)
    profiles = res.json()
    print("User 1 discovered:", profiles)
    
    # User 1 likes User 2
    u2_id = None
    for p in profiles:
        u2_id = p["user_id"] # Just grab the first one
        break
        
    print(f"User 1 likes {u2_id}...")
    res = requests.post(f"{BASE_URL}/api/dating/swipe", json={"target_id": u2_id, "action": "like"}, headers=h1)
    print("User 1 swipe response:", res.json())
    
    # Find User 1's ID for User 2 to like back
    res = requests.get(f"{BASE_URL}/api/dating/discover", headers=h2)
    profiles = res.json()
    u1_id = None
    for p in profiles:
        u1_id = p["user_id"]
        break
        
    print(f"User 2 likes {u1_id}...")
    res = requests.post(f"{BASE_URL}/api/dating/swipe", json={"target_id": u1_id, "action": "like"}, headers=h2)
    print("User 2 swipe response (should be match=True):", res.json())
    
test_dating()
