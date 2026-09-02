import gevent.monkey
gevent.monkey.patch_all()

import os
import uuid
import random
import string
import requests
from io import BytesIO
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_migrate import Migrate
from flask_apscheduler import APScheduler
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from models import db, User, Post, Poll, PollOption, PollVote, Conversation, Message, SystemSetting, Block, Notification, PostView, DatingProfile, SwipeInteraction, Manager, BlockedWord
import json
import random
import string
from dotenv import load_dotenv
from ai import generate_creative_identity, generate_daily_prompt
from sqlalchemy.orm import joinedload

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="gevent")

_server_cache = {
    'daily_prompt': {'data': None, 'time': 0},
    'sidebar_stats': {'data': None, 'time': 0}
}

@socketio.on('join')
def on_join(data):
    user_id = data.get('user_id')
    if user_id:
        join_room(f"user_{user_id}")


# Configuration
basedir = os.path.abspath(os.path.dirname(__name__))
db_url = os.environ.get('DATABASE_URL')
if db_url:
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql+pg8000://', 1)
    elif db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+pg8000://', 1)
    elif db_url.startswith('postgresql+psycopg2://'):
        db_url = db_url.replace('postgresql+psycopg2://', 'postgresql+pg8000://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'jluwhisper.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 280,
}

UPLOAD_FOLDER = os.path.join(basedir, 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Cloudinary Client Initialization
import cloudinary
import cloudinary.uploader

CLOUDINARY_URL = os.environ.get('CLOUDINARY_URL')
cloudinary_enabled = CLOUDINARY_URL is not None
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # 16 MB max limit

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)

with app.app_context():
    db.create_all()
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    if 'post' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('post')]
        if 'handle' not in columns:
            try:
                db.session.execute(db.text("ALTER TABLE post ADD COLUMN handle VARCHAR(50) DEFAULT 'global'"))
            except: pass
        if 'is_announcement' not in columns:
            try:
                db.session.execute(db.text("ALTER TABLE post ADD COLUMN is_announcement BOOLEAN DEFAULT FALSE"))
            except: pass
        db.session.commit()

# Setup AI Bot Scheduler
class Config:
    SCHEDULER_API_ENABLED = True
app.config.from_object(Config())
scheduler = APScheduler()
scheduler.init_app(app)

from bot import spawn_manual_bots

def cleanup_old_bots():
    with app.app_context():
        # Delete bots older than 24 hours
        bot_users = User.query.filter(User.username.like('bot_%')).all()
        now = datetime.now(timezone.utc)
        deleted_count = 0
        for bot in bot_users:
            if not bot.created_at or (now - bot.created_at).total_seconds() > 86400:
                # Delete their posts first
                Post.query.filter_by(user_id=bot.id).delete()
                db.session.delete(bot)
                deleted_count += 1
        if deleted_count > 0:
            db.session.commit()
            print(f"Cleaned up {deleted_count} old AI bots.")

# The ai_bot_job has been removed so AI activity is only triggered manually by admins.
scheduler.add_job(id='cleanup_old_bots_job', func=cleanup_old_bots, trigger='interval', hours=1)
scheduler.start()

# Create tables
with app.app_context():
    db.create_all()
    # Safely increase avatar column length for Postgres production DB
    try:
        db.session.execute(db.text('ALTER TABLE "user" ALTER COLUMN avatar TYPE VARCHAR(255);'))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Safely add ip_address columns
    try:
        db.session.execute(db.text('ALTER TABLE "user" ADD COLUMN ip_address VARCHAR(45);'))
        db.session.commit()
    except Exception:
        db.session.rollback()
        
    try:
        db.session.execute(db.text('ALTER TABLE post ADD COLUMN ip_address VARCHAR(45);'))
        db.session.commit()
    except Exception:
        db.session.rollback()

    try:
        db.session.execute(db.text('ALTER TABLE dating_profile ADD COLUMN block VARCHAR(10);'))
        db.session.commit()
    except Exception:
        db.session.rollback()
        
    try:
        db.session.execute(db.text('ALTER TABLE dating_profile ADD COLUMN course VARCHAR(255);'))
        db.session.commit()
    except Exception:
        db.session.rollback()
        
    try:
        db.session.execute(db.text('ALTER TABLE dating_profile ALTER COLUMN course TYPE VARCHAR(255);'))
        db.session.commit()
    except Exception:
        db.session.rollback()
        
    try:
        db.session.execute(db.text('ALTER TABLE dating_profile ADD COLUMN image_url VARCHAR(255);'))
        db.session.commit()
    except Exception:
        db.session.rollback()

    try:
        db.session.execute(db.text('ALTER TABLE dating_profile ADD COLUMN images TEXT;'))
        db.session.commit()
    except Exception:
        db.session.rollback()

    try:
        db.session.execute(db.text('ALTER TABLE dating_profile ADD COLUMN insta_username VARCHAR(100);'))
        db.session.commit()
    except Exception:
        db.session.rollback()

    try:
        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS idx_message_conv_created ON message(conversation_id, created_at DESC);'))
        db.session.commit()
    except Exception:
        db.session.rollback()

    try:
        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS idx_swipe_swiper_action ON swipe_interaction(swiper_id, action, created_at DESC);'))
        db.session.execute(db.text('CREATE INDEX IF NOT EXISTS idx_swipe_target_swiper ON swipe_interaction(swiper_id, target_id);'))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Add read tracking columns to conversation
    try:
        db.session.execute(db.text('ALTER TABLE conversation ADD COLUMN user1_read_at TIMESTAMP;'))
        db.session.commit()
    except Exception:
        db.session.rollback()
    try:
        db.session.execute(db.text('ALTER TABLE conversation ADD COLUMN user2_read_at TIMESTAMP;'))
        db.session.commit()
    except Exception:
        db.session.rollback()
    try:
        db.session.execute(db.text('ALTER TABLE "user" ADD COLUMN secret_crushes TEXT;'))
        db.session.commit()
    except Exception:
        db.session.rollback()

@app.route('/')
def index():
    return jsonify({"message": "Welcome to jluWhisper API", "status": "Running"})

# --- CLI Management Commands ---
@app.cli.command("create_admin")
def create_admin_cmd():
    """Promote an existing user to admin."""
    import click
    username = click.prompt("Enter username to promote")
    
    with app.app_context():
        # Check if any admin exists
        existing_admin = User.query.filter_by(role='admin').first()
        if existing_admin:
            click.echo(f"Error: An administrator already exists ({existing_admin.username}). Only one admin allowed.")
            return

        user = User.query.filter_by(username=username).first()
        if not user:
            click.echo("Error: User not found.")
            return
            
        user.role = 'admin'
        db.session.commit()
        click.echo(f"Success: {username} is now the administrator.")

@app.cli.command("delete_user")
def delete_user_cmd():
    """Delete any user account."""
    import click
    username = click.prompt("Enter username to delete")
    
    with app.app_context():
        user = User.query.filter_by(username=username).first()
        if not user:
            click.echo("Error: User not found.")
            return
            
        db.session.delete(user)
        db.session.commit()
        click.echo(f"Success: {username} has been deleted.")

@app.cli.command("run_cleanup")
def run_cleanup_cmd():
    """Delete expired guest and registered accounts."""
    import click
    with app.app_context():
        now = datetime.now(timezone.utc)
        guest_threshold = now - timedelta(days=7)
        reg_threshold = now - timedelta(days=60)
        
        # 1. Delete inactive guests
        expired_guests = User.query.filter_by(is_registered=False).filter(User.last_active < guest_threshold).all()
        for g in expired_guests:
            db.session.delete(g)
            
        # 2. Delete inactive registered users
        expired_regs = User.query.filter_by(is_registered=True).filter(User.last_active < reg_threshold).all()
        for r in expired_regs:
            db.session.delete(r)
            
        db.session.commit()
        click.echo(f"Cleanup complete. Deleted {len(expired_guests)} guests and {len(expired_regs)} registered accounts.")

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_token = request.headers.get('Authorization')
        if not session_token:
            return jsonify({"error": "Unauthorized"}), 401
        user = User.query.filter_by(session_token=session_token).first()
        if not user or user.role != 'admin':
            return jsonify({"error": "Admin privileges required"}), 403
        return f(*args, **kwargs)
    return decorated_function

def contains_blocked_word(text):
    if not text: return False
    words = BlockedWord.query.all()
    text_lower = text.lower()
    for w in words:
        if w.word in text_lower:
            return True
    return False

# --- Authentication & Identity ---
import threading

def async_generate_identity(app_obj, user_id):
    with app_obj.app_context():
        from ai import generate_creative_identity
        from models import User, db
        try:
            display_name, new_username = generate_creative_identity()
            user = db.session.get(User, user_id)
            if user and not user.is_registered:
                user.display_name = display_name
                user.username = new_username
                user.avatar = display_name[0] if display_name else 'A'
                db.session.commit()
        except Exception as e:
            print("Failed to generate async identity:", e)

@app.route('/api/users/session', methods=['POST'])
def create_session():
    # Detect uptime bots / crawlers to prevent spam account creation
    user_agent = request.headers.get('User-Agent', '').lower()
    bot_keywords = ['uptimerobot', 'pingdom', 'uptime', 'monitor', 'headlesstransporter', 'bot', 'spider', 'crawler', 'curl', 'python-requests', 'go-http-client']
    if any(b in user_agent for b in bot_keywords):
        return jsonify({"message": "Bot detected, skipping guest creation", "is_bot": True}), 200

    # Provide an existing token to just log activity, or create a new guest
    req_token = request.headers.get('Authorization')
    if req_token:
        user = User.query.filter_by(session_token=req_token).first()
        if user:
            user.last_active = datetime.now(timezone.utc)
            db.session.commit()
            return jsonify({
                "session_token": user.session_token, 
                "display_name": user.display_name,
                "is_registered": user.is_registered,
                "is_admin": user.role == 'admin'
            }), 200

    # Create new Guest Identity quickly
    import random
    guest_num = random.randint(1000, 99999)
    display_name = f"Guest_{guest_num}"
    username = f"guest_{guest_num}_{random.randint(1000,9999)}"
    
    raw_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    client_ip = raw_ip.split(',')[0].strip() if raw_ip else None
    
    new_user = User(
        display_name=display_name,
        username=username,
        avatar=display_name[0],
        ip_address=client_ip
    )
    db.session.add(new_user)
    db.session.commit()
    
    # Trigger background AI generation
    thread = threading.Thread(target=async_generate_identity, args=(app, new_user.id))
    thread.daemon = True
    thread.start()
    return jsonify({
        "session_token": new_user.session_token, 
        "display_name": new_user.display_name,
        "is_registered": False,
        "is_admin": False
    }), 201

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    custom_alias = data.get('custom_alias')
    session_token = request.headers.get('Authorization')
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409
        
    user = User.query.filter_by(session_token=session_token).first() if session_token else None
    
    # Generate Recovery Key
    recovery_key = '-'.join([''.join(random.choices(string.ascii_uppercase + string.digits, k=4)) for _ in range(3)])
    
    if user and not user.is_registered:
        # Upgrade existing guest
        user.username = username
        user.password_hash = generate_password_hash(password)
        user.is_registered = True
        user.recovery_key_hash = generate_password_hash(recovery_key)
        if custom_alias and custom_alias.strip():
            user.display_name = custom_alias.strip()
            user.avatar = user.display_name[0]
        db.session.commit()
        return jsonify({"message": "Registration successful", "recovery_key": recovery_key}), 201
        
    # If no valid guest session, create a fresh registered user
    if custom_alias and custom_alias.strip():
        display_name = custom_alias.strip()
    else:
        display_name, _ = generate_creative_identity()
        
    new_user = User(
        username=username,
        password_hash=generate_password_hash(password),
        is_registered=True,
        recovery_key_hash=generate_password_hash(recovery_key),
        display_name=display_name,
        avatar=display_name[0] if display_name else 'A'
    )
    db.session.add(new_user)
        
    db.session.commit()
    return jsonify({
        "message": "Registration successful", 
        "session_token": user.session_token,
        "recovery_key": recovery_key,
        "is_admin": user.role == 'admin'
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    if user and user.password_hash and check_password_hash(user.password_hash, password):
        user.last_active = datetime.now(timezone.utc)
        user.session_token = str(uuid.uuid4())
        db.session.commit()
        return jsonify({
            "message": "Login successful", 
            "session_token": user.session_token,
            "display_name": user.display_name,
            "is_admin": user.role == 'admin'
        }), 200
        
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/auth/recover', methods=['POST'])
def recover():
    data = request.json
    username = data.get('username')
    recovery_key = data.get('recovery_key')
    new_password = data.get('new_password')
    
    user = User.query.filter_by(username=username).first()
    if user and user.recovery_key_hash and check_password_hash(user.recovery_key_hash, recovery_key):
        user.password_hash = generate_password_hash(new_password)
        
        # Generate new recovery key
        new_recovery_key = '-'.join([''.join(random.choices(string.ascii_uppercase + string.digits, k=4)) for _ in range(3)])
        user.recovery_key_hash = generate_password_hash(new_recovery_key)
        
        user.last_active = datetime.now(timezone.utc)
        user.session_token = str(uuid.uuid4())
        db.session.commit()
        
        return jsonify({
            "message": "Account recovered successfully",
            "session_token": user.session_token,
            "display_name": user.display_name,
            "recovery_key": new_recovery_key,
            "is_admin": user.role == 'admin'
        }), 200
        
    return jsonify({"error": "Invalid recovery key or username"}), 401

# --- Account Settings ---

@app.route('/api/auth/profile/avatar', methods=['PUT'])
def update_avatar():
    data = request.json
    avatar_url = data.get('avatar')
    
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    user.avatar = avatar_url
    db.session.commit()
    return jsonify({"message": "Avatar updated", "avatar": user.avatar})

@app.route('/api/me', methods=['GET'])
def get_me():
    session_token = request.headers.get('Authorization')
    if not session_token:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.filter_by(session_token=session_token).first()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    return jsonify({
        "username": user.username,
        "display_name": user.display_name,
        "avatar": user.avatar,
        "role": user.role,
        "is_registered": user.is_registered,
        "created_at": user.created_at.isoformat() + 'Z',
        "badges": get_user_badges(user),
        "stats": {
            "whispers": Post.query.filter_by(user_id=user.id, is_deleted=False).count(),
            "reactions": db.session.query(db.func.sum(Post.upvotes)).filter_by(user_id=user.id).scalar() or 0
        }
    })

@app.route('/api/managers/me', methods=['GET'])
def get_managers_me():
    session_token = request.headers.get('Authorization')
    if not session_token:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.filter_by(session_token=session_token).first()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    manager_roles = Manager.query.filter_by(user_id=user.id).all()
    handles = [role.handle for role in manager_roles]
    
    return jsonify({"handles": handles})

@app.route('/api/users/<username>', methods=['GET'])
def get_user_profile(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    posts = Post.query.filter_by(user_id=user.id, parent_id=None, is_deleted=False).order_by(Post.created_at.desc()).limit(30).all()
    
    # Bulk fetch replies counts to avoid N+1 query burst
    post_ids = [p.id for p in posts]
    from sqlalchemy import func
    reply_counts_query = db.session.query(Post.parent_id, func.count(Post.id)).filter(Post.parent_id.in_(post_ids), Post.is_deleted == False).group_by(Post.parent_id).all()
    reply_counts = dict(reply_counts_query)
    
    posts_data = []
    for p in posts:
        posts_data.append({
            "id": p.id,
            "content": p.content,
            "author_username": user.username,
            "author_display": user.display_name,
            "author_avatar": user.avatar,
            "created_at": p.created_at.isoformat() + 'Z',
            "upvotes": p.upvotes,
            "replies_count": reply_counts.get(p.id, 0),
            "topic": p.topic
        })
        
    return jsonify({
        "username": user.username,
        "display_name": user.display_name,
        "avatar": user.avatar,
        "is_registered": user.is_registered,
        "posts": posts_data,
        "stats": {
            "whispers": len(posts),
            "reactions": sum(p.upvotes for p in posts)
        }
    })

@app.route('/api/me/identity', methods=['POST'])
def regenerate_identity():
    session_token = request.headers.get('Authorization')
    if not session_token:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.filter_by(session_token=session_token).first()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    new_display, new_username = generate_creative_identity()
    user.display_name = new_display
    if not user.is_registered:
        user.username = new_username
    user.avatar = new_display[0] if new_display else 'A'
    db.session.commit()
    
    return jsonify({
        "message": "Identity regenerated",
        "display_name": user.display_name,
        "avatar": user.avatar
    })

@app.route('/api/settings/change_username', methods=['POST'])
def change_username():
    session_token = request.headers.get('Authorization')
    if not session_token:
        return jsonify({"error": "Unauthorized"}), 401
    user = User.query.filter_by(session_token=session_token).first()
    if not user or not user.is_registered:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    new_username = data.get('new_username')
    password = data.get('password')
    
    if not new_username or not password:
        return jsonify({"error": "Missing new_username or password"}), 400
        
    if not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Incorrect password"}), 401
        
    if User.query.filter_by(username=new_username, is_registered=True).first():
        return jsonify({"error": "Username is already taken"}), 400
        
    user.username = new_username
    db.session.commit()
    return jsonify({"message": "Username successfully updated", "new_username": new_username})

@app.route('/api/settings/change_alias', methods=['POST'])
def change_alias():
    session_token = request.headers.get('Authorization')
    if not session_token:
        return jsonify({"error": "Unauthorized"}), 401
    user = User.query.filter_by(session_token=session_token).first()
    if not user or not user.is_registered:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    new_alias = data.get('new_alias')
    
    if not new_alias or not new_alias.strip():
        return jsonify({"error": "Alias cannot be empty"}), 400
        
    user.display_name = new_alias.strip()
    user.avatar = user.display_name[0]
    db.session.commit()
    return jsonify({"message": "Alias successfully updated", "display_name": user.display_name, "avatar": user.avatar})

@app.route('/api/me/password', methods=['POST'])
def change_password():
    session_token = request.headers.get('Authorization')
    data = request.json
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not session_token or not old_password or not new_password:
        return jsonify({"error": "Missing data"}), 400
        
    user = User.query.filter_by(session_token=session_token).first()
    if not user or not user.is_registered:
        return jsonify({"error": "Unauthorized"}), 401
        
    if not check_password_hash(user.password_hash, old_password):
        return jsonify({"error": "Incorrect current password"}), 403
        
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    
    return jsonify({"message": "Password updated successfully"})

@app.route('/api/me', methods=['DELETE'])
def delete_account():
    session_token = request.headers.get('Authorization')
    if not session_token:
        return jsonify({"error": "Unauthorized"}), 401
        
    user = User.query.filter_by(session_token=session_token).first()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    # Delete all replies by user
    Reply.query.filter_by(user_id=user.id).delete()
    
    # Delete all posts by user (cascading deletes polls, votes, etc if configured, or we can just delete them)
    posts = Post.query.filter_by(user_id=user.id).all()
    for p in posts:
        if p.poll:
            PollVote.query.filter_by(poll_id=p.poll.id).delete()
            PollOption.query.filter_by(poll_id=p.poll.id).delete()
            db.session.delete(p.poll)
        db.session.delete(p)
        
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({"message": "Account deleted permanently"})

# --- Posts (Whispers) ---

def get_user_badges(user, preloaded_post_count=None):
    badges = []
    if user.role == 'admin':
        badges.append({"icon": "👑", "text": "Admin", "color": "gold"})
    if not user.is_registered:
        badges.append({"icon": "👻", "text": "Ghost Mode", "color": "silver"})
    else:
        badges.append({"icon": "🛡️", "text": "Verified Account", "color": "silver"})
        
    count = preloaded_post_count if preloaded_post_count is not None else Post.query.filter_by(user_id=user.id).count()
    if count > 5:
        badges.append({"icon": "🔥", "text": "Top Whisperer", "color": "gold"})
    return badges

def serialize_post(p, user=None, user_votes=None, author_post_counts=None):
    has_voted = False
    if p.poll and user:
        if user_votes is not None:
            has_voted = p.poll.id in user_votes
        else:
            has_voted = PollVote.query.filter_by(poll_id=p.poll.id, user_id=user.id).first() is not None
        
    author_name = p.author.display_name if 'oracle' in p.author.username.lower() else ('Admin' if p.author.role == 'admin' else p.author.display_name)
    is_oracle_post = ('oracle' in p.author.username.lower())
    is_admin_post = (p.author.role == 'admin') and not is_oracle_post
    
    preloaded_count = author_post_counts.get(p.user_id, 0) if author_post_counts is not None else None
    badges = get_user_badges(p.author, preloaded_count)

    return {
        "id": p.id,
        "content": p.content,
        "image_url": p.image_url,
        "audio_url": p.audio_url,
        "topic": p.topic,
        "upvotes": p.upvotes,
        "downvotes": p.downvotes,
        "views": p.views,
        "created_at": p.created_at.isoformat() + 'Z',
        "replies_count": len([r for r in p.replies if not r.is_deleted]),
        "author_username": author_name,
        "author_avatar": p.author.avatar,
        "author_badges": badges,
        "is_admin_post": is_admin_post,
        "is_oracle_post": is_oracle_post,
        "is_pinned": p.is_pinned,
        "handle": p.handle,
        "is_announcement": p.is_announcement,
        "poll": {
            "id": p.poll.id,
            "has_voted": has_voted,
            "options": [{"id": o.id, "text": o.text, "votes": o.votes} for o in p.poll.options]
        } if p.poll else None
    }

def get_or_create_prompt_post(text):
    sys_user = User.query.filter_by(username='system_oracle').first()
    if not sys_user:
        sys_user = User(username='system_oracle', display_name='🌟 JLU Oracle', avatar='🌟', is_registered=True, role='admin')
        db.session.add(sys_user)
        db.session.commit()
    elif sys_user.role != 'admin':
        sys_user.role = 'admin'
        db.session.commit()
        
    post = Post(content=f"✨ Prompt of the Day ✨\n\n{text}", user_id=sys_user.id, topic="Events")
    db.session.add(post)
    db.session.commit()
    return post

@app.route('/api/daily_prompt', methods=['GET'])
def get_daily_prompt():
    import time
    
    session_token = request.headers.get('Authorization')
    
    # Only use cache for guests/anonymous to avoid serializing wrong user vote status
    # Note: User's own upvote status on daily prompt is ignored for guests
    if not session_token and time.time() - _server_cache['daily_prompt']['time'] < 60:
        return _server_cache['daily_prompt']['data']

    prompt_setting = SystemSetting.query.filter_by(key='daily_prompt_id').first()
    prompt_date_setting = SystemSetting.query.filter_by(key='daily_prompt_date').first()
    
    from datetime import date
    today_str = date.today().isoformat()
    
    post = None
    if prompt_setting:
        post = db.session.get(Post, int(prompt_setting.value))
        
    should_regenerate = False
    if not prompt_date_setting or prompt_date_setting.value != today_str:
        should_regenerate = True
        
    if not post or post.is_deleted or should_regenerate:
        if post and not post.is_deleted:
            db.session.delete(post)
            db.session.commit()
            
        text = generate_daily_prompt()
        post = get_or_create_prompt_post(text)
        
        if prompt_setting:
            prompt_setting.value = str(post.id)
        else:
            prompt_setting = SystemSetting(key='daily_prompt_id', value=str(post.id))
            db.session.add(prompt_setting)
        
        # also save the raw text for admin dashboard
        raw_setting = SystemSetting.query.filter_by(key='daily_prompt').first()
        if raw_setting:
            raw_setting.value = text
        else:
            raw_setting = SystemSetting(key='daily_prompt', value=text)
            db.session.add(raw_setting)
            
        if prompt_date_setting:
            prompt_date_setting.value = today_str
        else:
            prompt_date_setting = SystemSetting(key='daily_prompt_date', value=today_str)
            db.session.add(prompt_date_setting)
            
        db.session.commit()
        
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first() if session_token else None
    
    result = jsonify({"post": serialize_post(post, user)})
    if not session_token:
        _server_cache['daily_prompt'] = {'data': result, 'time': time.time()}
        
    return result

@app.route('/api/admin/daily_prompt/regenerate', methods=['POST'])
@admin_required
def regenerate_daily_prompt():
    prompt_setting = SystemSetting.query.filter_by(key='daily_prompt_id').first()
    if prompt_setting:
        old_post = db.session.get(Post, int(prompt_setting.value))
        if old_post:
            db.session.delete(old_post)
            db.session.commit()

    text = generate_daily_prompt()
    post = get_or_create_prompt_post(text)
    
    prompt_setting = SystemSetting.query.filter_by(key='daily_prompt_id').first()
    if prompt_setting:
        prompt_setting.value = str(post.id)
    else:
        prompt_setting = SystemSetting(key='daily_prompt_id', value=str(post.id))
        db.session.add(prompt_setting)
        
    raw_setting = SystemSetting.query.filter_by(key='daily_prompt').first()
    if raw_setting:
        raw_setting.value = text
    else:
        raw_setting = SystemSetting(key='daily_prompt', value=text)
        db.session.add(raw_setting)
        
    db.session.commit()
    return jsonify({"prompt": text})

@app.route('/api/posts', methods=['GET'])
def get_posts():
    # Check maintenance mode
    maintenance = SystemSetting.query.filter_by(key='maintenance').first()
    if maintenance and maintenance.value == 'true':
        session_token = request.headers.get('Authorization')
        user = User.query.filter_by(session_token=session_token).first()
        if not user or user.role != 'admin':
            return jsonify({"error": "Maintenance Mode: The app is currently under maintenance. We'll be right back!"}), 503

    topic_filter = request.args.get('topic')
    handle_filter = request.args.get('handle', 'global')
    search_query = request.args.get('q')
    query = Post.query.filter_by(parent_id=None, is_deleted=False, handle=handle_filter)
    
    if topic_filter:
        query = query.filter_by(topic=topic_filter)
        
    if search_query:
        query = query.filter(Post.content.ilike(f'%{search_query}%'))
        
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first() if session_token else None
    
    # Pagination
    limit = request.args.get('limit', 20, type=int)
    before = request.args.get('before', type=str)
    if before:
        from dateutil.parser import parse
        try:
            before_date = parse(before)
            query = query.filter(Post.created_at < before_date)
        except Exception:
            pass

    # Eager load author, poll, options, and replies to optimize DB queries
    query = query.options(
        joinedload(Post.author),
        joinedload(Post.poll).joinedload(Poll.options),
        joinedload(Post.replies)
    )
        
    posts = query.order_by(Post.is_announcement.desc(), Post.is_pinned.desc(), Post.created_at.desc()).limit(limit).all()
    
    # Pre-fetch user's voted poll IDs to avoid N+1 queries during serialization
    user_votes = set()
    if user:
        votes = PollVote.query.filter_by(user_id=user.id).all()
        user_votes = {v.poll_id for v in votes}
        
    # Bulk fetch author post counts to avoid N+1 queries in badges
    author_ids = list({p.user_id for p in posts})
    from sqlalchemy import func
    author_counts_query = db.session.query(Post.user_id, func.count(Post.id)).filter(Post.user_id.in_(author_ids)).group_by(Post.user_id).all()
    author_post_counts = dict(author_counts_query)
        
    posts_data = [serialize_post(p, user, user_votes, author_post_counts) for p in posts]
    return jsonify({"posts": posts_data})

@app.route('/api/posts', methods=['POST'])
def create_post():
    session_token = request.headers.get('Authorization')
    if not session_token:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.filter_by(session_token=session_token).first()
    if not user:
        return jsonify({"error": "Invalid session"}), 401
        
    if user.is_banned:
        return jsonify({"error": "You are banned from posting."}), 403
        
    # Check lockdown mode
    lockdown = SystemSetting.query.filter_by(key='lockdown').first()
    if lockdown and lockdown.value == 'true' and user.role != 'admin':
        return jsonify({"error": "Lockdown Mode: New posts are temporarily disabled."}), 403
        
    data = request.json
    
    if contains_blocked_word(data.get('content', '')):
        return jsonify({"error": "Your message contains blocked content."}), 400
        
    user.last_active = datetime.now(timezone.utc)
    
    raw_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    client_ip = raw_ip.split(',')[0].strip() if raw_ip else None
    
    handle = data.get('handle', 'global')
    is_announcement = data.get('is_announcement', False)
    
    if is_announcement:
        is_manager = Manager.query.filter_by(user_id=user.id, handle=handle).first()
        if not is_manager and user.role != 'admin':
            return jsonify({"error": "Only managers can post announcements"}), 403

    new_post = Post(
        content=data.get('content'),
        image_url=data.get('image_url'),
        audio_url=data.get('audio_url'),
        topic=data.get('topic', 'General'),
        user_id=user.id,
        ip_address=client_ip,
        handle=handle,
        is_announcement=is_announcement
    )
    db.session.add(new_post)
    db.session.flush() # get post.id
    
    poll_options = data.get('poll_options')
    if poll_options and isinstance(poll_options, list) and len(poll_options) > 1:
        new_poll = Poll(post_id=new_post.id)
        db.session.add(new_poll)
        db.session.flush()
        for opt_text in poll_options:
            if opt_text.strip():
                db.session.add(PollOption(poll_id=new_poll.id, text=opt_text.strip()))
                
    db.session.commit()
    
    # Emit to all connected clients for real-time feed/rooms
    post_data = serialize_post(new_post, user)
    socketio.emit('new_post', post_data)
    
    return jsonify({"message": "Whisper posted successfully", "post_id": new_post.id}), 201

@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    session_token = request.headers.get('Authorization')
    if not session_token: return jsonify({"error": "Unauthorized"}), 401
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    post = db.get_or_404(Post, post_id)
    
    is_manager = Manager.query.filter_by(user_id=user.id, handle=post.handle).first()
    
    if post.user_id != user.id and user.role != 'admin' and not is_manager:
        return jsonify({"error": "Forbidden"}), 403
        
    post.is_deleted = True
    db.session.commit()
    return jsonify({"message": "Post deleted"})

@app.route('/api/posts/<int:post_id>', methods=['PUT'])
def edit_post(post_id):
    session_token = request.headers.get('Authorization')
    if not session_token: return jsonify({"error": "Unauthorized"}), 401
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    post = db.get_or_404(Post, post_id)
    if post.user_id != user.id and user.role != 'admin':
        return jsonify({"error": "Forbidden"}), 403
        
    data = request.json
    new_content = data.get('content')
    if new_content:
        # Ponytail: append (edited) rather than schema migration
        if not new_content.endswith(' (edited)'):
            new_content += ' (edited)'
        post.content = new_content
        db.session.commit()
    return jsonify({"message": "Post updated", "post": serialize_post(post, user)})

@app.route('/api/posts/<int:post_id>/pin', methods=['POST'])
def pin_post(post_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    if not user or user.role != 'admin': return jsonify({"error": "Unauthorized"}), 403
    
    post = db.get_or_404(Post, post_id)
    post.is_pinned = not post.is_pinned
    db.session.commit()
    return jsonify({"message": "Pin status toggled", "is_pinned": post.is_pinned})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    # Check if media uploads are allowed globally
    media_setting = SystemSetting.query.filter_by(key='media_enabled').first()
    if media_setting and media_setting.value == 'false':
        return jsonify({"error": "Media uploads are currently disabled by the administrator"}), 403

    session_token = request.headers.get('Authorization')
    if not session_token or not User.query.filter_by(session_token=session_token).first():
        return jsonify({"error": "Unauthorized"}), 401
        
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'bin'
        filename = f"{uuid.uuid4().hex}.{ext}"
        
        if cloudinary_enabled:
            try:
                # Upload directly to Cloudinary (resource_type="auto" covers audio/image/video)
                upload_result = cloudinary.uploader.upload(file, resource_type="auto")
                file_url = upload_result.get("secure_url")
                return jsonify({"url": file_url}), 201
            except Exception as e:
                return jsonify({"error": f"Failed to upload to Cloudinary: {str(e)}"}), 500
        else:
            # Fallback: Save file locally (useful for local development)
            try:
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                # Ensure the URL is absolute so the separate frontend can resolve it against the backend server
                file_url = request.host_url.rstrip('/') + f"/static/uploads/{filename}"
                return jsonify({"url": file_url}), 201
            except Exception as e:
                return jsonify({"error": f"Local upload failed: {str(e)}. (Check folder permissions)"}), 500

@app.route('/api/upload/instagram', methods=['POST'])
def upload_instagram():
    session_token = request.headers.get('Authorization')
    if not session_token or not User.query.filter_by(session_token=session_token).first():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    username = data.get('username')
    if not username:
        return jsonify({"error": "Instagram username required"}), 400
        
    try:
        # Fetch image from unavatar securely on the server
        resp = requests.get(f"https://unavatar.io/instagram/{username}", stream=True, timeout=10)
        if resp.status_code != 200:
            return jsonify({"error": "Could not fetch Instagram profile"}), 400
            
        file_obj = BytesIO(resp.content)
        
        if cloudinary_enabled:
            upload_result = cloudinary.uploader.upload(file_obj, resource_type="image")
            return jsonify({"url": upload_result.get("secure_url")}), 201
        else:
            filename = f"insta_{uuid.uuid4().hex}.jpg"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            with open(filepath, 'wb') as f:
                f.write(resp.content)
            file_url = request.host_url.rstrip('/') + f"/static/uploads/{filename}"
            return jsonify({"url": file_url}), 201
    except Exception as e:
        return jsonify({"error": f"Failed to fetch or upload: {str(e)}"}), 500

# --- Interactions (Votes & Replies) ---
@app.route('/api/posts/<int:post_id>/vote', methods=['POST'])
def vote_post(post_id):
    data = request.json
    vote_type = data.get('type')
    
    post = db.get_or_404(Post, post_id)
    if vote_type == 'up':
        post.upvotes += 1
    elif vote_type == 'down':
        post.downvotes += 1
    elif vote_type == 'remove_up':
        post.upvotes = max(0, post.upvotes - 1)
    elif vote_type == 'remove_down':
        post.downvotes = max(0, post.downvotes - 1)
    else:
        return jsonify({"error": "Invalid vote type"}), 400
        
    db.session.commit()
    return jsonify({"message": "Voted successfully", "upvotes": post.upvotes, "downvotes": post.downvotes})

@app.route('/api/posts/<int:post_id>/view', methods=['POST'])
def view_post(post_id):
    post = db.get_or_404(Post, post_id)
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first() if session_token else None
    
    if user:
        existing_view = PostView.query.filter_by(post_id=post_id, user_id=user.id).first()
        if not existing_view:
            new_view = PostView(post_id=post_id, user_id=user.id)
            db.session.add(new_view)
            post.views += 1
            db.session.commit()
    else:
        post.views += 1
        db.session.commit()
        
    return jsonify({"message": "View recorded", "views": post.views})

@app.route('/api/posts/<int:post_id>/reply', methods=['POST'])
def reply_post(post_id):
    data = request.json
    session_token = request.headers.get('Authorization')
    
    if not session_token:
        return jsonify({"error": "Unauthorized"}), 401
        
    user = User.query.filter_by(session_token=session_token).first()
    if not user:
        return jsonify({"error": "Invalid session"}), 401
        
    if user.is_banned:
        return jsonify({"error": "You are banned."}), 403
        
    # Check lockdown mode
    lockdown = SystemSetting.query.filter_by(key='lockdown').first()
    if lockdown and lockdown.value == 'true' and user.role != 'admin':
        return jsonify({"error": "Lockdown Mode: New replies are temporarily disabled."}), 403
        
    parent_post = db.get_or_404(Post, post_id)
    
    if contains_blocked_word(data.get('content', '')):
        return jsonify({"error": "Your message contains blocked content."}), 400
        
    user.last_active = datetime.now(timezone.utc)
    
    new_reply = Post(
        content=data.get('content'),
        user_id=user.id,
        parent_id=parent_post.id,
        topic=parent_post.topic
    )
    db.session.add(new_reply)
    db.session.commit()
    
    reply_data = serialize_reply(new_reply)
    reply_data['parent_id'] = parent_post.id
    socketio.emit('new_reply', reply_data)
    
    return jsonify({"message": "Reply posted successfully", "reply_id": new_reply.id}), 201

def serialize_reply(r):
    author_name = r.author.display_name if 'oracle' in r.author.username.lower() else ('Admin' if r.author.role == 'admin' else r.author.display_name)
    is_oracle_post = ('oracle' in r.author.username.lower())
    is_admin_post = (r.author.role == 'admin') and not is_oracle_post
    
    return {
        "id": r.id,
        "content": r.content,
        "upvotes": r.upvotes,
        "downvotes": r.downvotes,
        "created_at": r.created_at.isoformat() + 'Z',
        "author_username": author_name,
        "author_badges": get_user_badges(r.author),
        "author_avatar": r.author.avatar,
        "is_admin_post": is_admin_post,
        "is_oracle_post": is_oracle_post,
        "replies": [serialize_reply(child) for child in r.replies if not child.is_deleted]
    }

@app.route('/api/posts/<int:post_id>/replies', methods=['GET'])
def get_replies(post_id):
    post = db.get_or_404(Post, post_id)
    replies_data = [serialize_reply(r) for r in post.replies if not r.is_deleted]
    return jsonify({"replies": replies_data})

@app.route('/api/posts/<int:post_id>/poll_vote', methods=['POST'])
def vote_poll(post_id):
    data = request.json
    option_id = data.get('option_id')
    session_token = request.headers.get('Authorization')
    
    if not session_token: return jsonify({"error": "Unauthorized"}), 401
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Invalid session"}), 401
    
    poll = Poll.query.filter_by(post_id=post_id).first()
    if not poll: return jsonify({"error": "No poll found"}), 404
    
    existing_vote = PollVote.query.filter_by(poll_id=poll.id, user_id=user.id).first()
    if existing_vote: return jsonify({"error": "Already voted"}), 400
    
    option = db.session.get(PollOption, option_id)
    if not option or option.poll_id != poll.id:
        return jsonify({"error": "Invalid option"}), 400
        
    option.votes += 1
    db.session.add(PollVote(poll_id=poll.id, user_id=user.id, option_id=option.id))
    db.session.commit()
    
    # Return updated poll data
    updated_options = [{"id": o.id, "text": o.text, "votes": o.votes} for o in poll.options]
    return jsonify({"message": "Vote cast", "options": updated_options})

# --- Direct Messaging ---
@app.route('/api/messages/support', methods=['POST'])
def support_request():
    data = request.json
    content = data.get('content')
    session_token = request.headers.get('Authorization')
    
    if not session_token: return jsonify({"error": "Unauthorized"}), 401
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Invalid session"}), 401
    
    # Get or create system oracle
    sys_user = User.query.filter_by(username='system_oracle').first()
    if not sys_user:
        sys_user = User(username='system_oracle', display_name='🌟 JLU Oracle', avatar='🌟', is_registered=True, role='admin')
        db.session.add(sys_user)
        db.session.commit()
        
    recipient_id = sys_user.id
    
    conv = Conversation.query.filter(
        ((Conversation.user1_id == user.id) & (Conversation.user2_id == recipient_id)) |
        ((Conversation.user1_id == recipient_id) & (Conversation.user2_id == user.id))
    ).first()
    
    if not conv:
        conv = Conversation(user1_id=user.id, user2_id=recipient_id, status='accepted')
        db.session.add(conv)
        db.session.commit()
        
    msg = Message(conversation_id=conv.id, sender_id=user.id, content=content)
    db.session.add(msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    
    return jsonify({"message": "Support request sent!"})

@app.route('/api/messages/request', methods=['POST'])
def message_request():
    data = request.json
    post_id = data.get('post_id')
    content = data.get('content')
    session_token = request.headers.get('Authorization')
    
    if not session_token: return jsonify({"error": "Unauthorized"}), 401
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Invalid session"}), 401
    
    post = db.get_or_404(Post, post_id)
    recipient_id = post.user_id
    
    if user.id == recipient_id:
        return jsonify({"error": "Cannot message yourself"}), 400
        
    # Check if conversation already exists
    conv = Conversation.query.filter(
        ((Conversation.user1_id == user.id) & (Conversation.user2_id == recipient_id)) |
        ((Conversation.user1_id == recipient_id) & (Conversation.user2_id == user.id))
    ).first()
    
    if not conv:
        conv = Conversation(user1_id=user.id, user2_id=recipient_id, status='pending')
        db.session.add(conv)
        db.session.flush()
        
    if content:
        msg = Message(conversation_id=conv.id, sender_id=user.id, content=content)
        db.session.add(msg)
        conv.updated_at = datetime.now(timezone.utc)
        
    db.session.commit()
    return jsonify({"message": "Request sent", "conversation_id": conv.id}), 201

@app.route('/api/messages/conversations', methods=['GET'])
def get_conversations():
    session_token = request.headers.get('Authorization')
    if not session_token: return jsonify({"error": "Unauthorized"}), 401
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Invalid session"}), 401
    
    convs = Conversation.query.filter(
        (Conversation.user1_id == user.id) | (Conversation.user2_id == user.id)
    ).order_by(Conversation.updated_at.desc()).all()
    
    if not convs:
        return jsonify({"active": [], "requests": []})
        
    other_user_ids = list(set([c.user2_id if c.user1_id == user.id else c.user1_id for c in convs]))
    
    # Bulk fetch blocks
    blocks = Block.query.filter(
        ((Block.blocker_id == user.id) & (Block.blocked_id.in_(other_user_ids))) | 
        ((Block.blocker_id.in_(other_user_ids)) & (Block.blocked_id == user.id))
    ).all()
    blocked_user_ids = {b.blocked_id if b.blocker_id == user.id else b.blocker_id for b in blocks}
    
    # Bulk fetch users
    users = User.query.filter(User.id.in_(other_user_ids)).all()
    user_map = {u.id: u.display_name for u in users}
    
    # Bulk fetch last messages
    conv_ids = [c.id for c in convs]
    from sqlalchemy import func
    subq = db.session.query(
        Message.conversation_id, 
        func.max(Message.created_at).label('max_date')
    ).filter(Message.conversation_id.in_(conv_ids)).group_by(Message.conversation_id).subquery()
    
    latest_messages = db.session.query(Message).join(
        subq, 
        (Message.conversation_id == subq.c.conversation_id) & 
        (Message.created_at == subq.c.max_date)
    ).all()
    
    last_msg_map = {m.conversation_id: m for m in latest_messages}
    
    # Count unread messages per conversation (messages by other user, after last read)
    from sqlalchemy import case as sa_case
    unread_counts = {}
    for c in convs:
        other_id = c.user2_id if c.user1_id == user.id else c.user1_id
        last_read = c.user1_read_at if c.user1_id == user.id else c.user2_read_at
        q = Message.query.filter_by(conversation_id=c.id).filter(Message.sender_id == other_id)
        if last_read:
            q = q.filter(Message.created_at > last_read)
        unread_counts[c.id] = q.count()
    
    active = []
    requests = []
    
    for c in convs:
        other_user_id = c.user2_id if c.user1_id == user.id else c.user1_id
        
        if other_user_id in blocked_user_ids:
            continue
            
        other_name = user_map.get(other_user_id, "Unknown")
        last_msg_obj = last_msg_map.get(c.id)
        last_msg_text = last_msg_obj.content if last_msg_obj else ""
        last_msg_time = (last_msg_obj.created_at.isoformat() + 'Z') if last_msg_obj and last_msg_obj.created_at else None
        
        conv_data = {
            "id": c.id,
            "other_user": other_name,
            "status": c.status,
            "last_message": last_msg_text,
            "last_message_at": last_msg_time,
            "updated_at": c.updated_at.isoformat() + 'Z',
            "is_requester": c.user1_id == user.id,
            "unread_count": unread_counts.get(c.id, 0)
        }
        
        if c.status == 'accepted':
            active.append(conv_data)
        elif c.status == 'pending':
            if c.user2_id == user.id:
                requests.append(conv_data)
            else:
                active.append(conv_data)
                
    return jsonify({"active": active, "requests": requests})

@app.route('/api/messages/<int:conv_id>/accept', methods=['POST'])
def accept_request(conv_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    conv = db.get_or_404(Conversation, conv_id)
    
    if conv.user2_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403
        
    conv.status = 'accepted'
    db.session.commit()
    return jsonify({"message": "Request accepted"})

@app.route('/api/messages/<int:conv_id>/reject', methods=['POST'])
def reject_request(conv_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    conv = db.get_or_404(Conversation, conv_id)
    
    if conv.user2_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403
        
    conv.status = 'rejected'
    db.session.commit()
    return jsonify({"message": "Request rejected"})

@app.route('/api/messages/<int:conv_id>', methods=['GET'])
def get_messages(conv_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    conv = db.get_or_404(Conversation, conv_id)
    
    if user.id not in [conv.user1_id, conv.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403
        
    limit = request.args.get('limit', 30, type=int)
    before = request.args.get('before', type=str)
    
    query = Message.query.filter_by(conversation_id=conv.id)
    
    if before:
        from dateutil.parser import parse
        try:
            before_date = parse(before)
            query = query.filter(Message.created_at < before_date)
        except Exception:
            pass
            
    messages = query.order_by(Message.created_at.desc()).limit(limit).all()
    # Reverse so they are ascending for the chat UI
    messages.reverse()
    
    msg_data = []
    for m in messages:
        msg_data.append({
            "id": m.id,
            "is_mine": m.sender_id == user.id,
            "content": m.content,
            "created_at": m.created_at.isoformat() + 'Z'
        })
        
    other_user_id = conv.user2_id if conv.user1_id == user.id else conv.user1_id
    other_user = db.session.get(User, other_user_id)
    
    # Mark conversation as read for this user
    now_utc = datetime.now(timezone.utc)
    if conv.user1_id == user.id:
        conv.user1_read_at = now_utc
    else:
        conv.user2_read_at = now_utc
    db.session.commit()
        
    return jsonify({
        "status": conv.status,
        "is_requester": conv.user1_id == user.id,
        "other_user": other_user.display_name,
        "messages": msg_data
    })

@app.route('/api/messages/<int:conv_id>', methods=['POST'])
def send_message(conv_id):
    data = request.json
    content = data.get('content')
    if contains_blocked_word(content):
        return jsonify({"error": "Your message contains blocked content."}), 400
        
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    conv = db.get_or_404(Conversation, conv_id)
    
    if user.id not in [conv.user1_id, conv.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403
        
    if conv.status != 'accepted' and conv.user1_id != user.id:
        return jsonify({"error": "Conversation not accepted"}), 403
        
    other_user_id = conv.user2_id if conv.user1_id == user.id else conv.user1_id
    is_blocked = Block.query.filter(
        ((Block.blocker_id == user.id) & (Block.blocked_id == other_user_id)) | 
        ((Block.blocker_id == other_user_id) & (Block.blocked_id == user.id))
    ).first()
    
    if is_blocked:
        return jsonify({"error": "Cannot send message. User is blocked."}), 403
        
    msg = Message(conversation_id=conv.id, sender_id=user.id, content=content)
    conv.updated_at = datetime.now(timezone.utc)
    db.session.add(msg)
    db.session.commit()
    
    msg_data = {
        "id": msg.id,
        "is_mine": False, # it's not mine for the receiver!
        "content": msg.content,
        "created_at": msg.created_at.isoformat() + 'Z',
        "conversation_id": conv.id
    }
    
    socketio.emit('new_message', msg_data, room=f"user_{other_user_id}")
    notif = Notification(user_id=other_user_id, type='message', message=f"New message from {user.display_name}")
    db.session.add(notif)
    db.session.commit()
    
    socketio.emit('new_notification', {
        'type': 'message',
        'message': f"New message from {user.display_name}"
    }, room=f"user_{other_user_id}")
    
    return jsonify({
        "id": msg.id,
        "is_mine": True,
        "content": msg.content,
        "created_at": msg.created_at.isoformat() + 'Z'
    }), 201


@app.route('/api/messages/block/<int:conv_id>', methods=['POST'])
def block_user(conv_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    conv = db.get_or_404(Conversation, conv_id)
    if user.id not in [conv.user1_id, conv.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403
        
    other_user_id = conv.user2_id if conv.user1_id == user.id else conv.user1_id
    
    # Create block
    if not Block.query.filter_by(blocker_id=user.id, blocked_id=other_user_id).first():
        block = Block(blocker_id=user.id, blocked_id=other_user_id)
        db.session.add(block)
        
    # Delete conversation
    db.session.delete(conv)
    db.session.commit()
    
    return jsonify({"message": "User blocked and conversation deleted."})

@app.route('/api/messages/conversation/<int:conv_id>', methods=['DELETE'])
def delete_conversation(conv_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    conv = db.get_or_404(Conversation, conv_id)
    if user.id not in [conv.user1_id, conv.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403
        
    db.session.delete(conv)
    db.session.commit()
    return jsonify({"message": "Conversation deleted."})

@app.route('/api/messages/<int:msg_id>', methods=['DELETE'])
def unsend_message(msg_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    msg = db.get_or_404(Message, msg_id)
    if msg.sender_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403
        
    db.session.delete(msg)
    
    # Update conversation timestamp if it was the last message? 
    # Not strictly necessary for unsend, but good practice. We'll just commit.
    db.session.commit()
    return jsonify({"message": "Message unsent."})


# --- Explore & Notifications ---

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    notifs = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(50).all()
    
    return jsonify([{
        "id": n.id,
        "type": n.type,
        "message": n.message,
        "post_id": n.post_id,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat() + 'Z'
    } for n in notifs])

@app.route('/api/notifications/read', methods=['POST'])
def mark_notifications_read():
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    Notification.query.filter_by(user_id=user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "Marked as read"})

@app.route('/api/explore/trending', methods=['GET'])
def get_trending():
    from sqlalchemy import func
    
    # Simple trending logic: group by topic and count posts in the last 7 days
    # Since sqlite and datetime logic can be tricky, we'll just group all for now
    counts = db.session.query(Post.topic, func.count(Post.id)).group_by(Post.topic).order_by(func.count(Post.id).desc()).limit(5).all()
    
    result = []
    for rank, (topic, count) in enumerate(counts, 1):
        result.append({
            "rank": rank,
            "topic": topic if topic else "General",
            "count": count
        })
    return jsonify(result)

@app.route('/api/explore/search', methods=['GET'])
def explore_search():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
        
    search_term = f"%{query}%"
    
    # Search Post content, or Author name (via User join)
    posts = Post.query.join(User, Post.user_id == User.id).filter(
        (Post.content.ilike(search_term)) | 
        (User.display_name.ilike(search_term))
    ).order_by(Post.created_at.desc()).limit(20).all()
    
    # We must format posts exactly like fetchPosts does
    result = []
    for p in posts:
        author = db.session.get(User, p.author_id)
        
        upvotes = PollVote.query.filter_by(post_id=p.id, is_upvote=True).count()
        downvotes = PollVote.query.filter_by(post_id=p.id, is_upvote=False).count()
        reply_count = Post.query.filter_by(parent_id=p.id).count()
        
        post_data = {
            "id": p.id,
            "topic": p.topic,
            "content": p.content,
            "media_url": p.media_url,
            "author": author.display_name if author else "Unknown",
            "created_at": p.created_at.isoformat() + 'Z',
            "upvotes": upvotes - downvotes,
            "reply_count": reply_count,
            "view_count": p.view_count,
            "is_author": False # Assuming search doesn't highlight your own posts yet
        }
        result.append(post_data)
        
    return jsonify(result)


# --- Sidebar API ---
@app.route('/api/sidebar/stats', methods=['GET'])
def get_sidebar_stats():
    import time
    if time.time() - _server_cache['sidebar_stats']['time'] < 60:
        return _server_cache['sidebar_stats']['data']
        
    from datetime import datetime, timedelta, timezone
    today = datetime.now(timezone.utc) - timedelta(days=1)
    
    # Total posts today
    total_posts = Post.query.filter(Post.created_at >= today).count()
    
    # Estimate online users (people who generated or refreshed a token today)
    online_users = User.query.filter(User.created_at >= today).count()
    if online_users < 100: online_users = 100 + (total_posts * 3) # Fake it till you make it for UI
    
    # Trending Tags: extract hashtags from last 100 posts
    recent_posts = Post.query.order_by(Post.created_at.desc()).limit(100).all()
    import re
    tags = {}
    for p in recent_posts:
        if p.content:
            found_tags = re.findall(r'#(\w+)', p.content)
            for t in found_tags:
                tags[t] = tags.get(t, 0) + 1
    
    # Sort by frequency and take top 5
    sorted_tags = sorted(tags.items(), key=lambda item: item[1], reverse=True)[:5]
    trending_tags = ["#" + t[0] for t in sorted_tags]
    
    result = jsonify({
        "total_posts_today": total_posts,
        "online_users": online_users,
        "trending_tags": trending_tags
    })
    
    _server_cache['sidebar_stats'] = {'data': result, 'time': time.time()}
    return result

@app.route('/api/sidebar/polls', methods=['GET'])
def get_sidebar_polls():
    polls = Poll.query.join(Post).order_by(Post.created_at.desc()).limit(10).all()
    from datetime import datetime, timedelta
    # Generate new poll if none exist or latest is > 24 hours old
    if not polls or polls[0].post.created_at < datetime.utcnow() - timedelta(days=1):
        from ai import generate_campus_poll
        poll_data = generate_campus_poll()
        if poll_data:
            # We must assign it to the system bot user (or None if allowed, but Post needs author)
            # Oh wait, Poll object doesn't require author_id if it's separate? Let's check model...
            # Actually our Poll model is tied to a Post!
            # Let's create a post first.
            bot_user = User.query.filter(User.username.like('bot_%')).first()
            if not bot_user:
                bot_user = User(username='bot_system', display_name='Campus AI', is_registered=False)
                db.session.add(bot_user)
                db.session.commit()
                
            new_post = Post(content=f"📊 {poll_data['question']}", user_id=bot_user.id)
            db.session.add(new_post)
            db.session.flush()
            
            new_poll = Poll(post_id=new_post.id)
            db.session.add(new_poll)
            db.session.flush()
            
            for opt in poll_data['options']:
                db.session.add(PollOption(poll_id=new_poll.id, text=opt))
            db.session.commit()
            
            polls = Poll.query.join(Post).order_by(Post.created_at.desc()).limit(3).all()
            
    result = []
    for poll in polls:
        opts = PollOption.query.filter_by(poll_id=poll.id).all()
        total_votes = sum(o.votes for o in opts)
        
        # Check if current user voted? The endpoint doesn't strictly need auth, but it helps.
        # We'll just return raw options, frontend can handle auth on vote.
        result.append({
            "id": poll.id,
            "post_id": poll.post_id,
            "question": poll.post.content,
            "total_votes": total_votes,
            "options": [{"id": o.id, "text": o.text, "votes": o.votes} for o in opts]
        })
        
    return jsonify(result)

# --- Admin Routes ---



@app.route('/api/admin/broadcast', methods=['POST'])
@admin_required
def admin_broadcast():
    data = request.json
    message = data.get('message')
    if not message:
        return jsonify({"error": "Message required"}), 400
        
    socketio.emit('new_notification', {
        'type': 'system',
        'message': message,
        'post_id': None
    })
    return jsonify({"message": "Broadcast sent successfully"})

@app.route('/api/admin/forge_post', methods=['POST'])
@admin_required
def admin_forge_post():
    data = request.json
    content = data.get('content')
    topic = data.get('topic', 'General')
    author_name = data.get('author_name', '').strip()
    
    if not content:
        return jsonify({"error": "Content is required"}), 400
        
    if author_name:
        # Check if bot user already exists
        user = User.query.filter(User.display_name == author_name, User.username.like('bot_%') | User.username.like('permbot_%')).first()
        if not user:
            import uuid
            username = f"bot_{uuid.uuid4().hex[:8]}"
            user = User(
                display_name=author_name,
                username=username,
                avatar=author_name[0] if author_name else 'A'
            )
            db.session.add(user)
            db.session.commit()
    else:
        # Select random bot from User
        import random
        bots = User.query.filter(User.username.like('bot_%') | User.username.like('permbot_%')).all()
        if bots:
            user = random.choice(bots)
        else:
            display_name, username = generate_creative_identity()
            user = User(
                display_name=display_name,
                username=f"bot_{username}" if not username.startswith("bot_") else username,
                avatar=display_name[0] if display_name else 'A'
            )
            db.session.add(user)
            db.session.commit()
            
    post = Post(
        content=content,
        topic=topic,
        author_id=user.id
    )
    db.session.add(post)
    db.session.commit()
    
    return jsonify({"message": "Post forged successfully", "post_id": post.id})

@app.route('/api/admin/conversations', methods=['GET'])
@admin_required
def admin_conversations():
    conversations = Conversation.query.order_by(Conversation.updated_at.desc()).all()
    res = []
    for c in conversations:
        msgs = [{"sender_id": m.sender_id, "content": m.content, "created_at": m.created_at.isoformat() + 'Z'} for m in c.messages]
        res.append({
            "id": c.id,
            "user1": {"id": c.user1_id},
            "user2": {"id": c.user2_id},
            "status": c.status,
            "updated_at": c.updated_at.isoformat() + 'Z',
            "messages": msgs
        })
    return jsonify({"conversations": res})

@app.route('/api/admin/dashboard', methods=['GET'])
@admin_required
def admin_dashboard():
    total_users = User.query.count()
    total_posts = Post.query.count()
    active_polls = Poll.query.count()
    # Mocking moderation queue since AI isn't fully active yet
    flagged_posts = Post.query.filter_by(is_deleted=False).order_by(Post.created_at.desc()).limit(10).all()
    queue = []
    for p in flagged_posts:
        queue.append({
            "id": p.id,
            "content": p.content,
            "author": p.author.display_name,
            "created_at": p.created_at.isoformat() + 'Z'
        })
    return jsonify({
        "stats": {"users": total_users, "posts": total_posts, "active_polls": active_polls},
        "queue": queue
    })

@app.route('/api/admin/posts/<int:post_id>/delete', methods=['POST'])
@admin_required
def admin_delete_post(post_id):
    post = db.get_or_404(Post, post_id)
    post.is_deleted = True
    db.session.commit()
    return jsonify({"message": "Post softly deleted"})

@app.route('/api/admin/posts/<int:post_id>/edit_stats', methods=['POST'])
@admin_required
def admin_edit_stats(post_id):
    post = db.get_or_404(Post, post_id)
    data = request.json
    
    if 'views' in data:
        post.views = data['views']
    if 'upvotes' in data:
        post.upvotes = data['upvotes']
    if 'downvotes' in data:
        post.downvotes = data['downvotes']
        
    db.session.commit()
    return jsonify({"message": "Stats updated"})

@app.route('/api/admin/bots/spawn', methods=['POST'])
@admin_required
def admin_spawn_bots():
    data = request.json or {}
    try:
        count = int(data.get('count', 1))
    except:
        count = 1
    
    topic = data.get('topic', '')
    if not topic.strip():
        topic = None
        
    # Cap count to prevent timeouts or rate limit abuse
    if count > 10:
        count = 10
        
    results = spawn_manual_bots(count, topic)
    return jsonify({"message": f"Successfully executed {len(results)} bot actions.", "results": results})

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_get_users():
    from sqlalchemy import func
    users = User.query.all()
    # Fetch all post counts in a single query
    post_counts_raw = db.session.query(Post.user_id, func.count(Post.id)).filter_by(parent_id=None).group_by(Post.user_id).all()
    post_counts = {uid: count for uid, count in post_counts_raw}
    
    user_data = []
    for u in users:
        user_data.append({
            "id": u.id,
            "username": u.username or "Anonymous",
            "display_name": u.display_name,
            "role": u.role,
            "is_bot": bool(u.username and (u.username.startswith("bot_") or u.username.startswith("permbot_"))),
            "is_permanent": bool(u.username and u.username.startswith("permbot_")),
            "created_at": u.created_at.isoformat() + 'Z' if u.created_at else "Unknown",
            "post_count": post_counts.get(u.id, 0),
            "is_banned": u.is_banned,
            "ip_address": u.ip_address,
            "is_registered": u.is_registered
        })
    return jsonify(user_data)

@app.route('/api/admin/users/<int:user_id>/toggle_ban', methods=['POST'])
@admin_required
def admin_toggle_ban(user_id):
    user = db.get_or_404(User, user_id)
    if user.role == 'admin':
        return jsonify({"error": "Cannot ban an admin"}), 403
        
    user.is_banned = not user.is_banned
    db.session.commit()
    status = "banned" if user.is_banned else "unbanned"
    return jsonify({"message": f"User {user.display_name} {status}"})

@app.route('/api/admin/users/<int:user_id>/toggle_permanent', methods=['POST'])
@admin_required
def admin_toggle_permanent(user_id):
    user = db.get_or_404(User, user_id)
    if not user.username or not (user.username.startswith("bot_") or user.username.startswith("permbot_")):
        return jsonify({"error": "Can only make bots permanent"}), 400
        
    if user.username.startswith("permbot_"):
        user.username = user.username.replace("permbot_", "bot_", 1)
        status = "normal bot"
    else:
        user.username = user.username.replace("bot_", "permbot_", 1)
        status = "permanent bot"
        
    db.session.commit()
    return jsonify({"message": f"Bot {user.display_name} is now a {status}"})

@app.route('/api/config', methods=['GET'])
def get_public_config():
    settings = SystemSetting.query.all()
    config = {}
    for s in settings:
        if s.key in ['site_logo', 'maintenance', 'site_name', 'global_theme']:
            config[s.key] = s.value == 'true' if s.value in ['true', 'false'] else s.value
    return jsonify(config)

@app.route('/api/admin/settings', methods=['GET'])
@admin_required
def admin_get_settings():
    settings = SystemSetting.query.all()
    settings_dict = {}
    for s in settings:
        if s.value in ['true', 'false']:
            settings_dict[s.key] = (s.value == 'true')
        else:
            settings_dict[s.key] = s.value
    return jsonify(settings_dict)

@app.route('/api/admin/settings', methods=['POST'])
@admin_required
def admin_update_settings():
    data = request.json
    for k, v in data.items():
        setting = SystemSetting.query.filter_by(key=k).first()
        if isinstance(v, bool):
            val_str = 'true' if v else 'false'
        else:
            val_str = str(v)
            
        if setting:
            setting.value = val_str
        else:
            setting = SystemSetting(key=k, value=val_str)
            db.session.add(setting)
    db.session.commit()
    db.session.commit()
    return jsonify({"message": "Settings updated"})

@app.route('/api/admin/blocked_words', methods=['GET'])
@admin_required
def admin_get_blocked_words():
    words = BlockedWord.query.order_by(BlockedWord.created_at.desc()).all()
    return jsonify([{"id": w.id, "word": w.word} for w in words])

@app.route('/api/admin/blocked_words', methods=['POST'])
@admin_required
def admin_add_blocked_word():
    data = request.json
    word_str = data.get('word', '').strip().lower()
    if not word_str:
        return jsonify({"error": "Word cannot be empty"}), 400
        
    existing = BlockedWord.query.filter_by(word=word_str).first()
    if existing:
        return jsonify({"error": "Word already blocked"}), 400
        
    new_word = BlockedWord(word=word_str)
    db.session.add(new_word)
    db.session.commit()
    return jsonify({"id": new_word.id, "word": new_word.word})

@app.route('/api/admin/blocked_words/<int:word_id>', methods=['DELETE'])
@admin_required
def admin_delete_blocked_word(word_id):
    word = db.session.get(BlockedWord, word_id)
    if not word:
        return jsonify({"error": "Word not found"}), 404
        
    db.session.delete(word)
    db.session.commit()
    return jsonify({"message": "Word unblocked"})

@app.route('/api/admin/posts/all', methods=['GET'])
@admin_required
def admin_get_all_posts():
    results = db.session.query(Post, User).outerjoin(User, Post.user_id == User.id).filter(Post.parent_id == None).order_by(Post.created_at.desc()).all()
    posts_data = []
    for p, author in results:
        posts_data.append({
            "id": p.id,
            "content": p.content,
            "author_display": author.display_name if author else "Unknown",
            "author_username": author.username if author else "Unknown",
            "created_at": p.created_at.isoformat() + 'Z',
            "is_deleted": p.is_deleted,
            "upvotes": p.upvotes,
            "ip_address": p.ip_address
        })
    return jsonify(posts_data)

@app.route('/api/admin/posts/<int:post_id>/author', methods=['GET'])
@admin_required
def admin_get_post_author(post_id):
    post = db.get_or_404(Post, post_id)
    author = db.session.get(User, post.user_id)
    if not author:
        return jsonify({"error": "Author not found"}), 404
        
    return jsonify({
        "username": author.username,
        "display_name": author.display_name,
        "is_registered": author.password_hash is not None,
        "created_at": author.created_at.isoformat() + 'Z'
    })

@app.route('/api/admin/users/<username>/ban', methods=['POST'])
@admin_required
def admin_ban_user(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    user.is_banned = True
    # Also softly delete all their posts
    for p in user.posts:
        p.is_deleted = True
    db.session.commit()
    return jsonify({"message": f"User {username} banned and content hidden."})

@app.route('/api/admin/users/<username>/wipe', methods=['DELETE'])
@admin_required
def admin_wipe_user(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.role == 'admin':
        return jsonify({"error": "Cannot wipe an admin."}), 403
        
    for p in user.posts:
        db.session.delete(p)
        
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": f"User {username} completely wiped."})

@app.route('/api/admin/users/bulk-wipe', methods=['POST'])
@admin_required
def admin_bulk_wipe_users():
    data = request.json or {}
    user_ids = data.get('user_ids', [])
    if not user_ids or not isinstance(user_ids, list):
        return jsonify({"error": "No user_ids provided"}), 400
        
    users = User.query.filter(User.id.in_(user_ids), User.role != 'admin').all()
    if not users:
        return jsonify({"message": "No non-admin users matched for deletion.", "deleted_count": 0})
        
    deleted_ids = [u.id for u in users]
    
    # Clean related records in dependency order
    from models import SwipeInteraction, DatingProfile, Notification, PostView, PollVote
    SwipeInteraction.query.filter((SwipeInteraction.swiper_id.in_(deleted_ids)) | (SwipeInteraction.target_id.in_(deleted_ids))).delete(synchronize_session=False)
    DatingProfile.query.filter(DatingProfile.user_id.in_(deleted_ids)).delete(synchronize_session=False)
    Notification.query.filter(Notification.user_id.in_(deleted_ids)).delete(synchronize_session=False)
    PostView.query.filter(PostView.user_id.in_(deleted_ids)).delete(synchronize_session=False)
    PollVote.query.filter(PollVote.user_id.in_(deleted_ids)).delete(synchronize_session=False)
    
    # Delete posts by these users
    Post.query.filter(Post.user_id.in_(deleted_ids)).delete(synchronize_session=False)
    
    # Delete users
    User.query.filter(User.id.in_(deleted_ids)).delete(synchronize_session=False)
    
    db.session.commit()
    return jsonify({"message": f"Successfully wiped {len(deleted_ids)} users.", "deleted_count": len(deleted_ids)})

@app.route('/api/admin/dating_profiles', methods=['GET'])
@admin_required
def admin_get_dating_profiles():
    profiles = DatingProfile.query.all()
    result = []
    for p in profiles:
        parsed_images = []
        if p.images:
            try:
                parsed_images = json.loads(p.images)
                if not isinstance(parsed_images, list):
                    parsed_images = []
            except Exception:
                pass
        
        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "username": p.user.username if p.user else "Unknown",
            "gender": p.gender,
            "age": p.age,
            "course": p.course,
            "block": p.block,
            "image_url": p.image_url,
            "images": parsed_images,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() + 'Z' if p.created_at else None
        })
    return jsonify(result)

@app.route('/api/admin/dating_profiles/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_dating_profile(user_id):
    profile = DatingProfile.query.filter_by(user_id=user_id).first()
    if profile:
        db.session.delete(profile)
        db.session.commit()
    return jsonify({"success": True})

@app.route('/api/admin/dating_profiles/<int:user_id>/toggle', methods=['POST'])
@admin_required
def admin_toggle_dating_profile(user_id):
    profile = DatingProfile.query.filter_by(user_id=user_id).first()
    if profile:
        profile.is_active = not profile.is_active
        db.session.commit()
        return jsonify({"success": True, "is_active": profile.is_active})
    return jsonify({"error": "Profile not found"}), 404

@app.route('/api/admin/swipes', methods=['GET'])
@admin_required
def admin_get_swipes():
    from sqlalchemy.orm import aliased
    User1 = aliased(User)
    User2 = aliased(User)
    
    swipes_data = db.session.query(SwipeInteraction, User1, User2)\
        .outerjoin(User1, SwipeInteraction.swiper_id == User1.id)\
        .outerjoin(User2, SwipeInteraction.target_id == User2.id)\
        .order_by(SwipeInteraction.created_at.desc())\
        .limit(200).all()
        
    result = []
    for s, swiper, target in swipes_data:
        result.append({
            "id": s.id,
            "swiper": swiper.username if swiper else "Deleted User",
            "target": target.username if target else "Deleted User",
            "action": s.action,
            "created_at": s.created_at.isoformat() + 'Z' if s.created_at else None
        })
    return jsonify(result)

@app.route('/api/admin/dating/force_match', methods=['POST'])
@admin_required
def admin_force_match():
    data = request.json or {}
    u1_name = data.get('username1')
    u2_name = data.get('username2')
    
    if not u1_name or not u2_name:
        return jsonify({"error": "Both usernames required"}), 400
        
    user1 = User.query.filter(User.username.ilike(u1_name)).first()
    user2 = User.query.filter(User.username.ilike(u2_name)).first()
    
    if not user1 or not user2:
        return jsonify({"error": "One or both users not found"}), 404
        
    # Overwrite any existing swipes with mutual likes
    i1 = SwipeInteraction.query.filter_by(swiper_id=user1.id, target_id=user2.id).first()
    if i1:
        i1.action = 'like'
        i1.created_at = datetime.now(timezone.utc)
    else:
        db.session.add(SwipeInteraction(swiper_id=user1.id, target_id=user2.id, action='like'))
        
    i2 = SwipeInteraction.query.filter_by(swiper_id=user2.id, target_id=user1.id).first()
    if i2:
        i2.action = 'like'
        i2.created_at = datetime.now(timezone.utc)
    else:
        db.session.add(SwipeInteraction(swiper_id=user2.id, target_id=user1.id, action='like'))
        
    # Check existing conversation
    existing = Conversation.query.filter(
        ((Conversation.user1_id == user1.id) & (Conversation.user2_id == user2.id)) |
        ((Conversation.user1_id == user2.id) & (Conversation.user2_id == user1.id))
    ).first()
    
    if not existing:
        conv = Conversation(user1_id=user1.id, user2_id=user2.id, status='accepted')
        db.session.add(conv)
        db.session.flush()
        
        sys_msg = Message(
            conversation_id=conv.id, 
            sender_id=user1.id,
            content="💖 It's a Match! You both swiped right. Say hi!"
        )
        db.session.add(sys_msg)
        
        dp1 = DatingProfile.query.filter_by(user_id=user1.id).first()
        dp2 = DatingProfile.query.filter_by(user_id=user2.id).first()
        
        if dp1 and dp1.image_url:
            db.session.add(Message(conversation_id=conv.id, sender_id=user1.id, content=f"[IMAGE] {dp1.image_url}"))
        if dp2 and dp2.image_url:
            db.session.add(Message(conversation_id=conv.id, sender_id=user2.id, content=f"[IMAGE] {dp2.image_url}"))
            
    db.session.commit()
    
    # Notify if online
    socketio.emit('new_message', {"msg": "You have a new match!", "conv_id": existing.id if existing else conv.id}, room=str(user1.id))
    socketio.emit('new_message', {"msg": "You have a new match!", "conv_id": existing.id if existing else conv.id}, room=str(user2.id))
    
    return jsonify({"success": True})

@app.route('/api/admin/media', methods=['GET'])
@admin_required
def admin_get_media():
    media_list = []
    
    posts = Post.query.filter((Post.image_url != None) | (Post.audio_url != None)).all()
    for p in posts:
        if p.image_url:
            media_list.append({
                "id": f"post_img_{p.id}",
                "type": "image",
                "url": p.image_url,
                "source": f"Post #{p.id}",
                "created_at": p.created_at.isoformat() + 'Z' if p.created_at else ""
            })
        if p.audio_url:
            media_list.append({
                "id": f"post_aud_{p.id}",
                "type": "audio",
                "url": p.audio_url,
                "source": f"Post #{p.id}",
                "created_at": p.created_at.isoformat() + 'Z' if p.created_at else ""
            })
            
    profiles = DatingProfile.query.filter(DatingProfile.image_url != None).all()
    for p in profiles:
        if p.image_url:
            media_list.append({
                "id": f"dating_img_{p.id}",
                "type": "image",
                "url": p.image_url,
                "source": f"Dating Profile #{p.user_id}",
                "created_at": p.created_at.isoformat() + 'Z' if p.created_at else ""
            })
            
    media_list.sort(key=lambda x: x["created_at"], reverse=True)
    return jsonify(media_list)

# --- Dating APIs ---

def get_current_user(session_token):
    if not session_token: return None
    return User.query.filter_by(session_token=session_token).first()

@app.route('/api/dating/profile', methods=['GET', 'POST'])
def dating_profile():
    user = get_current_user(request.headers.get('Authorization'))
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    profile = DatingProfile.query.filter_by(user_id=user.id).first()
    
    if request.method == 'POST':
        data = request.json
        if not profile:
            profile = DatingProfile(user_id=user.id)
            db.session.add(profile)
        profile.bio = data.get('bio', profile.bio)
        profile.gender = data.get('gender', profile.gender)
        profile.looking_for = data.get('looking_for', profile.looking_for)
        profile.block = data.get('block', profile.block)
        profile.course = data.get('course', profile.course)
        try:
            if data.get('age'): profile.age = int(data.get('age'))
        except ValueError:
            pass
        profile.image_url = data.get('image_url', profile.image_url)
        profile.insta_username = data.get('insta_username', profile.insta_username)
        
        imgs = data.get('images')
        if imgs is not None:
            profile.images = json.dumps(imgs)
            
        def safe_json_dump(val, default):
            if val is not None:
                return json.dumps(val)
            return default
            
        profile.interests = safe_json_dump(data.get('interests'), profile.interests)
        profile.red_flags = safe_json_dump(data.get('red_flags'), profile.red_flags)
        profile.green_flags = safe_json_dump(data.get('green_flags'), profile.green_flags)
        
        if data.get('campus_spot') and data.get('campus_spot') != profile.campus_spot:
            from datetime import datetime
            profile.campus_spot_updated_at = datetime.utcnow()
        profile.campus_spot = data.get('campus_spot', profile.campus_spot)
            
        profile.is_active = data.get('is_active', True)
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Database Error: {str(e)}"}), 500
    
    if not profile:
        return jsonify(None)
        
    parsed_images = []
    if profile.images:
        try:
            parsed_images = json.loads(profile.images)
            if not isinstance(parsed_images, list):
                parsed_images = []
        except Exception:
            pass

    parsed_interests = []
    parsed_red = []
    parsed_green = []
    parsed_love = []
    if profile.interests:
        try: parsed_interests = json.loads(profile.interests)
        except Exception: pass
    if profile.red_flags:
        try: parsed_red = json.loads(profile.red_flags)
        except Exception: pass
    if profile.green_flags:
        try: parsed_green = json.loads(profile.green_flags)
        except Exception: pass
    if profile.love_languages:
        try: parsed_love = json.loads(profile.love_languages)
        except Exception: pass

    return jsonify({
        "bio": profile.bio,
        "gender": profile.gender,
        "looking_for": profile.looking_for,
        "age": profile.age,
        "block": profile.block,
        "course": profile.course,
        "image_url": profile.image_url,
        "images": parsed_images,
        "insta_username": profile.insta_username,
        "interests": parsed_interests,
        "red_flags": parsed_red,
        "green_flags": parsed_green,
        "love_languages": parsed_love,
        "campus_spot": profile.campus_spot,
        "is_active": profile.is_active
    })

@app.route('/api/dating/discover', methods=['GET'])
def dating_discover():
    user = get_current_user(request.headers.get('Authorization'))
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    profile = DatingProfile.query.filter_by(user_id=user.id).first()
    if not profile or not profile.is_active:
        return jsonify({"error": "Dating profile inactive"}), 400
        
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)
    
    liked = SwipeInteraction.query.filter_by(swiper_id=user.id, action='like').all()
    recent_passes = SwipeInteraction.query.filter(
        SwipeInteraction.swiper_id == user.id,
        SwipeInteraction.action == 'pass',
        SwipeInteraction.created_at >= cutoff
    ).all()
    
    swiped_ids = [s.target_id for s in liked] + [s.target_id for s in recent_passes]
    swiped_ids.append(user.id) # Exclude self
    
    # Query builder
    from sqlalchemy.orm import joinedload
    query = DatingProfile.query.options(joinedload(DatingProfile.user)).filter(
        DatingProfile.is_active == True,
        DatingProfile.user_id.notin_(swiped_ids)
    )
    
    # Filters
    block_filter = request.args.get('block')
    course_filter = request.args.get('course')
    
    if block_filter:
        query = query.filter(DatingProfile.block == block_filter)
    if course_filter:
        query = query.filter(DatingProfile.course == course_filter)
        
    results = query.limit(20).all()
    
    discover_list = []
    for p in results:
        if p.user.is_banned: continue
        
        parsed_images = []
        if p.images:
            try:
                parsed_images = json.loads(p.images)
                if not isinstance(parsed_images, list):
                    parsed_images = []
            except Exception:
                pass
                
        parsed_interests = []
        parsed_red = []
        parsed_green = []
        parsed_love = []
        if p.interests:
            try: parsed_interests = json.loads(p.interests)
            except Exception: pass
        if p.red_flags:
            try: parsed_red = json.loads(p.red_flags)
            except Exception: pass
        if p.green_flags:
            try: parsed_green = json.loads(p.green_flags)
            except Exception: pass
        if p.love_languages:
            try: parsed_love = json.loads(p.love_languages)
            except Exception: pass
            
        from datetime import datetime, timedelta
        cutoff_active = datetime.utcnow() - timedelta(hours=24)
        is_active_today = p.user.last_active >= cutoff_active if p.user and p.user.last_active else False

        discover_list.append({
            "user_id": p.user_id,
            "image_url": p.image_url,
            "images": parsed_images,
            "bio": p.bio,
            "gender": p.gender,
            "age": p.age,
            "block": p.block,
            "course": p.course,
            "interests": parsed_interests,
            "red_flags": parsed_red,
            "green_flags": parsed_green,
            "love_languages": parsed_love,
            "campus_spot": p.campus_spot,
            "is_active_today": is_active_today,
            "badges": get_user_badges(p.user) if p.user else []
        })
    import random
    random.shuffle(discover_list)
    return jsonify(discover_list)

@app.route('/api/dating/swipe', methods=['POST'])
def dating_swipe():
    user = get_current_user(request.headers.get('Authorization'))
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    target_id = request.json.get('target_id')
    action = request.json.get('action') # 'like', 'pass', or 'superlike'
    
    if not target_id or action not in ['like', 'pass', 'superlike']:
        return jsonify({"error": "Invalid payload"}), 400
    
    # Daily like limit check (10 likes/superlikes per day)
    if action in ['like', 'superlike']:
        from datetime import date
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
        likes_today = SwipeInteraction.query.filter(
            SwipeInteraction.swiper_id == user.id,
            SwipeInteraction.action.in_(['like', 'superlike']),
            SwipeInteraction.created_at >= today_start
        ).count()
        if likes_today >= 25:  # 25/day limit
            return jsonify({"error": "daily_limit", "message": "You've used all your likes for today. Come back tomorrow!", "likes_today": likes_today, "likes_limit": 25}), 429
    # Record swipe
    from datetime import datetime
    interaction = SwipeInteraction.query.filter_by(swiper_id=user.id, target_id=target_id).first()
    if interaction:
        interaction.action = action
        interaction.created_at = datetime.now(timezone.utc)
    else:
        interaction = SwipeInteraction(swiper_id=user.id, target_id=target_id, action=action)
        db.session.add(interaction)
    
    match_made = False
    
    if action in ['like', 'superlike']:
        # Check if they liked me back (any like/superlike from them)
        mutual = SwipeInteraction.query.filter(
            SwipeInteraction.swiper_id == target_id,
            SwipeInteraction.target_id == user.id,
            SwipeInteraction.action.in_(['like', 'superlike'])
        ).first()
        if mutual:
            match_made = True
            # Create a conversation
            existing = Conversation.query.filter(
                ((Conversation.user1_id == user.id) & (Conversation.user2_id == target_id)) |
                ((Conversation.user1_id == target_id) & (Conversation.user2_id == user.id))
            ).first()
            if not existing:
                conv = Conversation(user1_id=user.id, user2_id=target_id, status='accepted')
                db.session.add(conv)
                db.session.flush()
                # Send welcome message
                sys_msg = Message(
                    conversation_id=conv.id, 
                    sender_id=user.id,
                    content="💖 It's a Match! You both swiped right. Say hi!"
                )
                db.session.add(sys_msg)
                
                # Fetch dating profiles for pictures
                user_dp = DatingProfile.query.filter_by(user_id=user.id).first()
                target_dp = DatingProfile.query.filter_by(user_id=target_id).first()
                
                if user_dp and user_dp.image_url:
                    msg1 = Message(conversation_id=conv.id, sender_id=user.id, content=f"[IMAGE] {user_dp.image_url}")
                    db.session.add(msg1)
                if user_dp and user_dp.insta_username:
                    msg1_insta = Message(conversation_id=conv.id, sender_id=user.id, content=f"My Instagram: @{user_dp.insta_username}")
                    db.session.add(msg1_insta)
                
                if target_dp and target_dp.image_url:
                    msg2 = Message(conversation_id=conv.id, sender_id=target_id, content=f"[IMAGE] {target_dp.image_url}")
                    db.session.add(msg2)
                if target_dp and target_dp.insta_username:
                    msg2_insta = Message(conversation_id=conv.id, sender_id=target_id, content=f"My Instagram: @{target_dp.insta_username}")
                    db.session.add(msg2_insta)
                
                # Notifications
                from models import Notification
                target_user = db.session.get(User, target_id)
                target_name = target_user.display_name if target_user else "Someone"
                
                notif1 = Notification(user_id=target_id, type="message", message=f"New match with {user.display_name}!")
                notif2 = Notification(user_id=user.id, type="message", message=f"New match with {target_name}!")
                db.session.add(notif1)
                db.session.add(notif2)
                db.session.flush()
                
                try:
                    if target_user:
                        socketio.emit('new_notification', {
                            'id': notif1.id, 'type': 'message', 'message': notif1.message, 'created_at': notif1.created_at.isoformat() + 'Z'
                        }, room=f"user_{target_user.id}")
                    socketio.emit('new_notification', {
                        'id': notif2.id, 'type': 'message', 'message': notif2.message, 'created_at': notif2.created_at.isoformat() + 'Z'
                    }, room=f"user_{user.id}")
                except Exception as e:
                    pass
                
                existing = conv
    db.session.commit()
    
    # Count today's likes to return to frontend
    from datetime import date
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    likes_today = SwipeInteraction.query.filter(
        SwipeInteraction.swiper_id == user.id,
        SwipeInteraction.action.in_(['like', 'superlike']),
        SwipeInteraction.created_at >= today_start
    ).count()
    
    return jsonify({
        "match": match_made,
        "conversation_id": existing.id if match_made else None,
        "is_superlike": action == 'superlike',
        "likes_today": likes_today,
        "likes_limit": 25
    })

@app.route('/api/health')
def health():
    return jsonify({"status": "ok"})

@app.route('/api/admin/messages', methods=['GET'])
def admin_all_messages():
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    if not user or user.role != 'admin':
        return jsonify({"error": "Forbidden"}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = 50
    
    messages = db.session.query(Message, User, Conversation).join(
        User, User.id == Message.sender_id
    ).join(
        Conversation, Conversation.id == Message.conversation_id
    ).order_by(Message.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    result = []
    for msg, sender, conv in messages.items:
        other_id = conv.user2_id if conv.user1_id == sender.id else conv.user1_id
        other_user = db.session.get(User, other_id)
        result.append({
            "id": msg.id,
            "conversation_id": conv.id,
            "sender": sender.display_name,
            "sender_username": sender.username,
            "recipient": other_user.display_name if other_user else "Unknown",
            "content": msg.content,
            "created_at": msg.created_at.isoformat() + 'Z'
        })
    
    return jsonify({
        "messages": result,
        "total": messages.total,
        "page": page,
        "pages": messages.pages
    })

@app.route('/api/dating/secret_crush', methods=['POST'])
def dating_secret_crush():
    user = get_current_user(request.headers.get('Authorization'))
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    crushes = data.get('crushes', [])
    if not isinstance(crushes, list) or len(crushes) > 3:
        return jsonify({"error": "Max 3 crushes allowed"}), 400
        
    user.secret_crushes = json.dumps(crushes)
    db.session.commit()
    
    # Check for mutual secret crushes
    for crush_username in crushes:
        crush_username = crush_username.strip().lstrip('@')
        target = User.query.filter_by(username=crush_username).first()
        if target and target.secret_crushes:
            try:
                target_crushes = json.loads(target.secret_crushes)
                if user.username in target_crushes:
                    # Mutual crush! Trigger a match (if not already matched)
                    existing_conv = Conversation.query.filter(
                        ((Conversation.user1_id == user.id) & (Conversation.user2_id == target.id)) |
                        ((Conversation.user1_id == target.id) & (Conversation.user2_id == user.id))
                    ).first()
                    
                    if not existing_conv:
                        conv = Conversation(user1_id=user.id, user2_id=target.id)
                        db.session.add(conv)
                        db.session.commit()
                        
                        socketio.emit('new_notification', {
                            'title': 'Secret Crush Matched! 💘',
                            'body': f'You and {user.display_name} secretly crushed on each other!',
                            'type': 'match'
                        }, room=f"user_{target.id}")
                        socketio.emit('new_notification', {
                            'title': 'Secret Crush Matched! 💘',
                            'body': f'You and {target.display_name} secretly crushed on each other!',
                            'type': 'match'
                        }, room=f"user_{user.id}")
            except Exception:
                pass
                
    return jsonify({"message": "Secret crushes updated", "crushes": crushes})

@app.route('/api/admin/broadcast_daily_drop', methods=['POST'])
@admin_required
def admin_broadcast_daily_drop():
    # Send a broadcast to all active users via socket (simulated push)
    # The frontend will show a toast when this event is received
    socketio.emit('daily_drop', {
        'title': '8 PM Daily Drop is here! ⏰',
        'body': 'Check Dating now to see your top matches for the day before they are gone.'
    })
    return jsonify({"message": "Daily drop broadcasted."})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # Set to gevent and allow external access
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
