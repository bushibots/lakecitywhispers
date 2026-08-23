import random
from app import app, db
from models import User, DatingProfile
from werkzeug.security import generate_password_hash

FAKE_PROFILES = [
    {"bio": "Looking for someone to study with!", "gender": "female", "looking_for": "male", "age": 20, "image_url": "https://i.pravatar.cc/300?img=1"},
    {"bio": "Coffee addict, CS major.", "gender": "male", "looking_for": "female", "age": 21, "image_url": "https://i.pravatar.cc/300?img=11"},
    {"bio": "Just here for fun.", "gender": "non_binary", "looking_for": "everyone", "age": 19, "image_url": "https://i.pravatar.cc/300?img=12"},
    {"bio": "Dog lover and weekend hiker.", "gender": "female", "looking_for": "everyone", "age": 22, "image_url": "https://i.pravatar.cc/300?img=5"},
    {"bio": "Late night coder.", "gender": "male", "looking_for": "female", "age": 20, "image_url": "https://i.pravatar.cc/300?img=8"},
]

with app.app_context():
    print("Inserting fake profiles...")
    for i, profile_data in enumerate(FAKE_PROFILES):
        # 1. Create fake user
        username = f"fake_user_{random.randint(10000, 99999)}_{i}"
        user = User(
            username=username,
            display_name=f"Guest_{random.randint(1000, 9999)}",
            password_hash=generate_password_hash("password123"),
            avatar="?"
        )
        db.session.add(user)
        db.session.flush() # get user.id
        
        # 2. Create dating profile
        dating = DatingProfile(
            user_id=user.id,
            bio=profile_data["bio"],
            gender=profile_data["gender"],
            looking_for=profile_data["looking_for"],
            age=profile_data["age"],
            image_url=profile_data["image_url"],
            is_active=True
        )
        db.session.add(dating)
        
    db.session.commit()
    print(f"Successfully inserted {len(FAKE_PROFILES)} fake dating profiles!")
