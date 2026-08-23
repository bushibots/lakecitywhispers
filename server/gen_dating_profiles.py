import random
from app import app, db
from models import User, DatingProfile
import uuid

NAMES = ["Alex", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Cameron", "Quinn", "Avery", "Skyler", "Rowan", "Reese", "Peyton", "Dakota", "Hayden"]
BIOS = [
    "Just looking for someone to grab coffee with.",
    "Dog lover. Hiking enthusiast. Let's explore the city.",
    "I make a mean lasagna. Swipe right if you're hungry.",
    "Music is my life. Tell me your favorite band.",
    "Student by day, gamer by night.",
    "Looking for a gym buddy or a Netflix partner.",
    "Avid reader and occasional writer.",
    "Let's go on a spontaneous road trip.",
    "I probably love your pet more than you do.",
    "Tacos and margaritas are the key to my heart."
]

def generate_profiles(n=10):
    with app.app_context():
        added_count = 0
        for i in range(n):
            gender = random.choice(['male', 'female', 'non-binary'])
            looking_for = random.choice(['male', 'female', 'everyone'])
            age = random.randint(18, 25)
            
            # Create user
            display_name = random.choice(NAMES)
            username = f"{display_name.lower()}{random.randint(100, 9999)}"
            
            user = User(
                username=username,
                display_name=display_name,
                is_registered=True,
                session_token=str(uuid.uuid4())
            )
            db.session.add(user)
            db.session.commit()
            
            # Generate external image URL (pravatar or randomusers)
            # Using pravatar for consistent random human faces
            image_url = f"https://i.pravatar.cc/400?u={user.id}"
            
            bio = random.choice(BIOS)
            
            profile = DatingProfile(
                user_id=user.id,
                bio=bio,
                gender=gender,
                looking_for=looking_for,
                age=age,
                image_url=image_url,
                is_active=True
            )
            
            db.session.add(profile)
            added_count += 1
            
        db.session.commit()
        print(f"Successfully added {added_count} dummy profiles using external image URLs!")

if __name__ == '__main__':
    generate_profiles(15)
