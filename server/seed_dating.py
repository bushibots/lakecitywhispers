import os
import random
import uuid
from app import app, db
from models import User, DatingProfile

females = [
    {"name": "Priya", "username": "priya_stu", "bio": "Coffee and code. Love traveling and trying new cafes in the city.", "course": "BCA", "block": "C"},
    {"name": "Aisha", "username": "aisha_99", "bio": "Art enthusiast, fashion lover. Looking for someone to explore museums with.", "course": "BBA", "block": "A"},
    {"name": "Sneha", "username": "sneha_music", "bio": "Singing, dancing, and late night drives. Let's make some memories.", "course": "B.Com", "block": "B"},
    {"name": "Riya", "username": "riya_reads", "bio": "Bookworm and introvert, but fun when you get to know me. Dog mom.", "course": "BA English", "block": "A"},
    {"name": "Kavya", "username": "kavya_tech", "bio": "Tech geek, gym rat. If you can beat me at Mario Kart, we'll get along.", "course": "B.Tech", "block": "C"}
]

males = [
    {"name": "Rahul", "username": "rahul_fit", "bio": "Gym, sports, and good food. Always down for an adventure.", "course": "BBA", "block": "B"},
    {"name": "Arjun", "username": "arjun_codes", "bio": "Software developer by day, gamer by night. Coffee addict.", "course": "B.Tech", "block": "C"},
    {"name": "Vikram", "username": "vikram_photo", "bio": "Photographer, traveler, foodie. Let me take you on a photowalk.", "course": "BCA", "block": "A"},
    {"name": "Karan", "username": "karan_music", "bio": "Guitarist in a local band. Looking for my muse.", "course": "BA Music", "block": "D"},
    {"name": "Aditya", "username": "aditya_finance", "bio": "Finance bro but the fun kind. Let's grab sushi and talk about life.", "course": "B.Com", "block": "B"}
]

with app.app_context():
    print("Seeding dating profiles...")
    
    # Females
    for i, p in enumerate(females):
        user = User.query.filter_by(username=p['username']).first()
        if not user:
            user = User(
                username=p['username'],
                display_name=p['name'],
                is_registered=True,
                role='user',
                session_token=str(uuid.uuid4())
            )
            db.session.add(user)
            db.session.commit()
            
            profile = DatingProfile(
                user_id=user.id,
                bio=p['bio'],
                gender='Female',
                looking_for='Male',
                age=random.randint(18, 23),
                block=p['block'],
                course=p['course'],
                image_url=f"/seeds/female_{i+1}.png"
            )
            db.session.add(profile)
            
    # Males
    for i, p in enumerate(males):
        user = User.query.filter_by(username=p['username']).first()
        if not user:
            user = User(
                username=p['username'],
                display_name=p['name'],
                is_registered=True,
                role='user',
                session_token=str(uuid.uuid4())
            )
            db.session.add(user)
            db.session.commit()
            
            profile = DatingProfile(
                user_id=user.id,
                bio=p['bio'],
                gender='Male',
                looking_for='Female',
                age=random.randint(18, 23),
                block=p['block'],
                course=p['course'],
                image_url=f"/seeds/male_{i+1}.png"
            )
            db.session.add(profile)
            
    db.session.commit()
    print("Successfully seeded 10 dating profiles!")
