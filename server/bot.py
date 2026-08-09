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

def spawn_manual_bots(count=1, topic=None):
    print(f"Manual AI Bot Spawning triggered for {count} actions, topic: {topic}")
    from app import app
    with app.app_context():
        results = []
        for _ in range(count):
            # 1. Create or Pick a Bot Identity
            bot_users = User.query.filter(User.username.like('bot_%') | User.username.like('permbot_%')).all()
            
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
                results.append(f"Spawned new bot: {display_name}")
            else:
                bot_user = random.choice(bot_users)

            # 2. Pick an Action
            action = random.choices(['post', 'reply', 'upvote'], weights=[0.5, 0.3, 0.2])[0]
            
            if action == 'post':
                base_prompt = "You are a college student using an anonymous app. Write a short, engaging, and relatable post."
                if topic:
                    prompt = f"{base_prompt}\nFocus specifically on this topic: {topic}\nKeep it casual, use modern slang, and don't use hashtags.\nOutput ONLY the post content, nothing else."
                else:
                    prompt = f"{base_prompt}\nFocus heavily on dating, romance, crushes, heartbreaks, or campus relationships.\nKeep it casual, use modern slang, and don't use hashtags.\nOutput ONLY the post content, nothing else."
                
                content = generate_with_retry(prompt, is_json=False)
                if content:
                    new_post = Post(content=content, user_id=bot_user.id)
                    db.session.add(new_post)
                    db.session.commit()
                    results.append(f"Bot posted: {content[:30]}...")
                    
            elif action == 'reply':
                # Find a recent post to reply to
                recent_posts = Post.query.filter_by(parent_id=None, is_deleted=False).order_by(Post.created_at.desc()).limit(10).all()
                if recent_posts:
                    target = random.choice(recent_posts)
                    base_prompt = f"You are a college student reading an anonymous app.\nReply to this post: \"{target.content}\""
                    if topic:
                        prompt = f"{base_prompt}\nKeep it casual and relatable, and try to weave in this topic: {topic}\nOutput ONLY the reply content, nothing else."
                    else:
                        prompt = f"{base_prompt}\nKeep it casual, relatable, and focus on romance/dating advice or sympathy if applicable.\nOutput ONLY the reply content, nothing else."
                    
                    reply_content = generate_with_retry(prompt, is_json=False)
                    if reply_content:
                        reply = Post(content=reply_content, user_id=bot_user.id, parent_id=target.id)
                        db.session.add(reply)
                        db.session.commit()
                        results.append(f"Bot replied to post {target.id}")
                        
            elif action == 'upvote':
                recent_posts = Post.query.filter_by(parent_id=None, is_deleted=False).order_by(Post.created_at.desc()).limit(10).all()
                if recent_posts:
                    target = random.choice(recent_posts)
                    target.upvotes += 1
                    db.session.commit()
                    results.append(f"Bot upvoted post {target.id}")
        return results
