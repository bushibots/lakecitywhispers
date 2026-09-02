from app import app
from models import db, User, DatingProfile
from ai import generate_creative_identity
import random
import json
from datetime import datetime

def seed_dating_profiles():
    with app.app_context():
        print("Seeding dating profiles...")
        
        # 1. Create 5 fake users if we don't have enough bots
        bot_users = []
        for _ in range(5):
            display_name, username = generate_creative_identity()
            user = User(
                username=f"bot_{username}_{random.randint(100,999)}",
                display_name=display_name,
                avatar=display_name[0] if display_name else 'B',
                is_registered=True,
                last_active=datetime.utcnow()
            )
            user.set_password('password123')
            db.session.add(user)
            bot_users.append(user)
        
        db.session.commit()
        
        genders = ['male', 'female', 'non_binary']
        blocks = ['A', 'B', 'C', 'D', 'E']
        courses = ['BTech', 'BBA', 'BCA', 'BA', 'Law']
        interests_pool = ['Gaming', 'Music', 'Fitness', 'Reading', 'Movies', 'Travel', 'Art', 'Coffee', 'Photography']
        green_flags_pool = ['Good Listener', 'Funny', 'Respectful', 'Ambitious', 'Kind', 'Communicative']
        red_flags_pool = ['Rude to waiters', 'Late', 'Arrogant', 'Bad texter', 'Dishonest']
        love_languages_pool = ['Words of Affirmation', 'Quality Time', 'Receiving Gifts', 'Acts of Service', 'Physical Touch']
        
        for user in bot_users:
            profile = DatingProfile(
                user_id=user.id,
                bio=f"Hey I'm {user.display_name}. Just looking to meet cool people on campus!",
                gender=random.choice(genders),
                looking_for='everyone',
                age=random.randint(18, 24),
                block=random.choice(blocks),
                course=random.choice(courses),
                interests=json.dumps(random.sample(interests_pool, 3)),
                green_flags=json.dumps(random.sample(green_flags_pool, 2)),
                red_flags=json.dumps(random.sample(red_flags_pool, 2)),
                love_languages=json.dumps(random.sample(love_languages_pool, 2)),
                campus_spot="Library",
                is_active=True
            )
            db.session.add(profile)
            
        db.session.commit()
        print(f"Successfully seeded {len(bot_users)} dating profiles!")

if __name__ == '__main__':
    seed_dating_profiles()
