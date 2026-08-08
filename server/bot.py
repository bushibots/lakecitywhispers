from models import db, User, Post, SystemSetting
from ai import generate_with_retry, generate_creative_identity
import random
from datetime import datetime
import json

def get_setting(key, default=False):
    from app import app
    with app.app_context():
        s = SystemSetting.query.filter_by(key=key).first()
        if s:
            return s.value == 'true'
        return default

def get_setting_int(key, default=0):
    from app import app
    with app.app_context():
        s = SystemSetting.query.filter_by(key=key).first()
        if s:
            try:
                return int(s.value)
            except ValueError:
                pass
        return default

def run_ai_bots():
    print("AI Bot Scheduler triggered...")
    from app import app
    with app.app_context():
        # 1. Check if enabled
        if not get_setting('bots_enabled', False):
            return
            
        # 2. Check active hours (0-24)
        start_hour = get_setting_int('bot_active_start', 9)
        end_hour = get_setting_int('bot_active_end', 23)
        current_hour = datetime.utcnow().hour # Assume UTC or local depending on server. Simple check.
        # Handle wrap around if needed (e.g., 22 to 6)
        is_active = False
        if start_hour < end_hour:
            is_active = start_hour <= current_hour < end_hour
        else:
            is_active = current_hour >= start_hour or current_hour < end_hour
            
        if not is_active:
            print("Bots sleeping due to operating hours.")
            return

        # 3. Create or Pick a Bot Identity
        bot_users = User.query.filter(User.username.like('bot_%')).all()
        
        # 20% chance to create a fresh identity, otherwise use an existing bot identity
        if not bot_users or random.random() < 0.2:
            display_name, username = generate_creative_identity()
            bot_user = User(
                username=f"bot_{username}", # flag them internally
                display_name=display_name,
                avatar=display_name[0] if display_name else 'A',
                is_registered=False
            )
            db.session.add(bot_user)
            db.session.commit()
            print(f"Spawned new bot identity: {display_name}")
        else:
            bot_user = random.choice(bot_users)

        # 4. Pick an Action
        action = random.choices(['post', 'reply', 'upvote'], weights=[0.4, 0.4, 0.2])[0]
        
        if action == 'post':
            prompt = """You are a college student using an anonymous app. Write a short, engaging, and relatable post.
            Focus heavily on dating, romance, crushes, heartbreaks, or campus relationships.
            Keep it casual, use modern slang, and don't use hashtags.
            Output ONLY the post content, nothing else."""
            
            content = generate_with_retry(prompt, is_json=False)
            if content:
                new_post = Post(content=content, user_id=bot_user.id)
                db.session.add(new_post)
                db.session.commit()
                print(f"Bot posted: {content[:30]}...")
                
        elif action == 'reply':
            # Find a recent post to reply to
            recent_posts = Post.query.filter_by(parent_id=None, is_deleted=False).order_by(Post.created_at.desc()).limit(10).all()
            if recent_posts:
                target = random.choice(recent_posts)
                prompt = f"""You are a college student reading an anonymous app.
                Reply to this post: "{target.content}"
                Keep it casual, relatable, and focus on romance/dating advice or sympathy if applicable.
                Output ONLY the reply content, nothing else."""
                
                reply_content = generate_with_retry(prompt, is_json=False)
                if reply_content:
                    reply = Post(content=reply_content, user_id=bot_user.id, parent_id=target.id)
                    db.session.add(reply)
                    db.session.commit()
                    print(f"Bot replied to post {target.id}")
                    
        elif action == 'upvote':
            recent_posts = Post.query.filter_by(parent_id=None, is_deleted=False).order_by(Post.created_at.desc()).limit(10).all()
            if recent_posts:
                target = random.choice(recent_posts)
                target.upvotes += 1
                db.session.commit()
                print(f"Bot upvoted post {target.id}")
