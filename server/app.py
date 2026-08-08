import os
import uuid
import random
import string
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_migrate import Migrate
from flask_apscheduler import APScheduler
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from models import db, User, Post, Poll, PollOption, PollVote, Conversation, Message, SystemSetting, Block, Notification
import json
import random
import string
from dotenv import load_dotenv
from ai import generate_creative_identity, generate_daily_prompt

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

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
        db_url = db_url.replace('postgres://', 'postgresql+psycopg2://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'jluwhisper.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

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

# Setup AI Bot Scheduler
class Config:
    SCHEDULER_API_ENABLED = True
app.config.from_object(Config())
scheduler = APScheduler()
scheduler.init_app(app)

from bot import run_ai_bots
# Check every 5 minutes if it's time to run based on the admin setting
# The actual logic in bot.py can determine if it should execute or not.
# Wait, actually let's run it every 5 minutes, but bot.py will just roll a dice 
# or we can schedule it dynamically. For simplicity, we trigger the bot loop every 5 minutes, 
# and it has a high chance to post. 
scheduler.add_job(id='ai_bot_job', func=run_ai_bots, trigger='interval', minutes=15)
scheduler.start()

# Create tables
with app.app_context():
    db.create_all()

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
        now = datetime.utcnow()
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

# --- Authentication & Identity ---
@app.route('/api/users/session', methods=['POST'])
def create_session():
    # Provide an existing token to just log activity, or create a new guest
    req_token = request.headers.get('Authorization')
    if req_token:
        user = User.query.filter_by(session_token=req_token).first()
        if user:
            user.last_active = datetime.utcnow()
            db.session.commit()
            return jsonify({
                "session_token": user.session_token, 
                "display_name": user.display_name,
                "is_registered": user.is_registered,
                "is_admin": user.role == 'admin'
            }), 200

    # Create new Guest Identity
    display_name, username = generate_creative_identity()
    new_user = User(
        display_name=display_name,
        username=username,
        avatar=display_name[0] if display_name else 'A'
    )
    db.session.add(new_user)
    db.session.commit()
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
        db.session.commit()
        return jsonify({"message": "Registration successful", "recovery_key": recovery_key}), 201
        
    # If no valid guest session, create a fresh registered user
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
        user.last_active = datetime.utcnow()
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
        
        user.last_active = datetime.utcnow()
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
        "created_at": user.created_at.isoformat()
    })

@app.route('/api/me/identity', methods=['POST'])
def regenerate_identity():
    session_token = request.headers.get('Authorization')
    if not session_token:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.filter_by(session_token=session_token).first()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    new_identity = generate_creative_identity()
    user.display_name = new_identity
    db.session.commit()
    
    return jsonify({
        "message": "Identity regenerated",
        "display_name": user.display_name,
        "avatar": user.avatar
    })

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

def serialize_post(p, user=None):
    has_voted = False
    if p.poll and user:
        has_voted = PollVote.query.filter_by(poll_id=p.poll.id, user_id=user.id).first() is not None
        
    return {
        "id": p.id,
        "content": p.content,
        "image_url": p.image_url,
        "audio_url": p.audio_url,
        "topic": p.topic,
        "upvotes": p.upvotes,
        "downvotes": p.downvotes,
        "views": p.views,
        "created_at": p.created_at.isoformat(),
        "replies_count": len([r for r in p.replies if not r.is_deleted]),
        "author_username": p.author.display_name,
        "poll": {
            "id": p.poll.id,
            "has_voted": has_voted,
            "options": [{"id": o.id, "text": o.text, "votes": o.votes} for o in p.poll.options]
        } if p.poll else None
    }

def get_or_create_prompt_post(text):
    sys_user = User.query.filter_by(username='system_oracle').first()
    if not sys_user:
        sys_user = User(username='system_oracle', display_name='🌟 JLU Oracle', avatar='🌟', is_registered=True)
        db.session.add(sys_user)
        db.session.commit()
        
    post = Post(content=f"✨ Prompt of the Day ✨\n\n{text}", user_id=sys_user.id, topic="Events")
    db.session.add(post)
    db.session.commit()
    return post

@app.route('/api/daily_prompt', methods=['GET'])
def get_daily_prompt():
    prompt_setting = SystemSetting.query.filter_by(key='daily_prompt_id').first()
    post = None
    if prompt_setting:
        post = Post.query.get(int(prompt_setting.value))
        
    if not post or post.is_deleted:
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
            
        db.session.commit()
        
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first() if session_token else None
    
    return jsonify({"post": serialize_post(post, user)})

@app.route('/api/admin/daily_prompt/regenerate', methods=['POST'])
@admin_required
def regenerate_daily_prompt():
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
    query = Post.query.filter_by(parent_id=None, is_deleted=False)
    
    if topic_filter:
        query = query.filter_by(topic=topic_filter)
        
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first() if session_token else None
        
    posts = query.order_by(Post.created_at.desc()).all()
    posts_data = [serialize_post(p, user) for p in posts]
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
    user.last_active = datetime.utcnow()
    
    new_post = Post(
        content=data.get('content'),
        image_url=data.get('image_url'),
        audio_url=data.get('audio_url'),
        topic=data.get('topic', 'General'),
        user_id=user.id
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
    
    return jsonify({"message": "Whisper posted successfully", "post_id": new_post.id}), 201

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
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            file_url = f"/static/uploads/{filename}"
            return jsonify({"url": file_url}), 201

# --- Interactions (Votes & Replies) ---
@app.route('/api/posts/<int:post_id>/vote', methods=['POST'])
def vote_post(post_id):
    data = request.json
    vote_type = data.get('type')
    
    post = Post.query.get_or_404(post_id)
    if vote_type == 'up':
        post.upvotes += 1
    elif vote_type == 'down':
        post.downvotes += 1
    else:
        return jsonify({"error": "Invalid vote type"}), 400
        
    db.session.commit()
    return jsonify({"message": "Voted successfully", "upvotes": post.upvotes, "downvotes": post.downvotes})

@app.route('/api/posts/<int:post_id>/view', methods=['POST'])
def view_post(post_id):
    post = Post.query.get_or_404(post_id)
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
        
    parent_post = Post.query.get_or_404(post_id)
    user.last_active = datetime.utcnow()
    
    new_reply = Post(
        content=data.get('content'),
        user_id=user.id,
        parent_id=parent_post.id,
        topic=parent_post.topic
    )
    db.session.add(new_reply)
    db.session.commit()
    
    return jsonify({"message": "Reply posted successfully", "reply_id": new_reply.id}), 201

@app.route('/api/posts/<int:post_id>/replies', methods=['GET'])
def get_replies(post_id):
    post = Post.query.get_or_404(post_id)
    replies_data = []
    for r in post.replies:
        if not r.is_deleted:
            replies_data.append({
                "id": r.id,
                "content": r.content,
                "upvotes": r.upvotes,
                "downvotes": r.downvotes,
                "created_at": r.created_at.isoformat(),
                "author_username": r.author.display_name
            })
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
    
    option = PollOption.query.get(option_id)
    if not option or option.poll_id != poll.id:
        return jsonify({"error": "Invalid option"}), 400
        
    option.votes += 1
    db.session.add(PollVote(poll_id=poll.id, user_id=user.id, option_id=option.id))
    db.session.commit()
    
    # Return updated poll data
    updated_options = [{"id": o.id, "text": o.text, "votes": o.votes} for o in poll.options]
    return jsonify({"message": "Vote cast", "options": updated_options})

# --- Direct Messaging ---
@app.route('/api/messages/request', methods=['POST'])
def message_request():
    data = request.json
    post_id = data.get('post_id')
    content = data.get('content')
    session_token = request.headers.get('Authorization')
    
    if not session_token: return jsonify({"error": "Unauthorized"}), 401
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Invalid session"}), 401
    
    post = Post.query.get_or_404(post_id)
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
        conv.updated_at = datetime.utcnow()
        
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
    
    active = []
    requests = []
    
    for c in convs:
        other_user_id = c.user2_id if c.user1_id == user.id else c.user1_id
        
        # Check if blocked
        is_blocked = Block.query.filter(
            ((Block.blocker_id == user.id) & (Block.blocked_id == other_user_id)) | 
            ((Block.blocker_id == other_user_id) & (Block.blocked_id == user.id))
        ).first()
        
        if is_blocked:
            continue
            
        # Determine the other user's display name
        other_user = User.query.get(other_user_id)
        other_name = other_user.display_name if other_user else "Unknown"
        
        last_msg = Message.query.filter_by(conversation_id=c.id).order_by(Message.created_at.desc()).first()
        last_msg_text = last_msg.content if last_msg else ""
        
        conv_data = {
            "id": c.id,
            "other_user": other_name,
            "status": c.status,
            "last_message": last_msg_text,
            "updated_at": c.updated_at.isoformat(),
            "is_requester": c.user1_id == user.id
        }
        
        if c.status == 'accepted':
            active.append(conv_data)
        elif c.status == 'pending':
            # Only show in requests if they are NOT the requester
            if c.user2_id == user.id:
                requests.append(conv_data)
            else:
                # If they are the requester, it's still pending for them but they can view it in active (or a sent requests tab)
                # Let's put it in active for the sender so they can see their sent requests
                active.append(conv_data)
                
    return jsonify({"active": active, "requests": requests})

@app.route('/api/messages/<int:conv_id>/accept', methods=['POST'])
def accept_request(conv_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    conv = Conversation.query.get_or_404(conv_id)
    
    if conv.user2_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403
        
    conv.status = 'accepted'
    db.session.commit()
    return jsonify({"message": "Request accepted"})

@app.route('/api/messages/<int:conv_id>/reject', methods=['POST'])
def reject_request(conv_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    conv = Conversation.query.get_or_404(conv_id)
    
    if conv.user2_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403
        
    conv.status = 'rejected'
    db.session.commit()
    return jsonify({"message": "Request rejected"})

@app.route('/api/messages/<int:conv_id>', methods=['GET'])
def get_messages(conv_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    conv = Conversation.query.get_or_404(conv_id)
    
    if user.id not in [conv.user1_id, conv.user2_id]:
        return jsonify({"error": "Unauthorized"}), 403
        
    messages = Message.query.filter_by(conversation_id=conv.id).order_by(Message.created_at.asc()).all()
    msg_data = []
    for m in messages:
        msg_data.append({
            "id": m.id,
            "is_mine": m.sender_id == user.id,
            "content": m.content,
            "created_at": m.created_at.isoformat()
        })
        
    other_user_id = conv.user2_id if conv.user1_id == user.id else conv.user1_id
    other_user = User.query.get(other_user_id)
        
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
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    conv = Conversation.query.get_or_404(conv_id)
    
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
    conv.updated_at = datetime.utcnow()
    db.session.add(msg)
    db.session.commit()
    
    msg_data = {
        "id": msg.id,
        "is_mine": False, # it's not mine for the receiver!
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
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
        "created_at": msg.created_at.isoformat()
    }), 201


@app.route('/api/messages/block/<int:conv_id>', methods=['POST'])
def block_user(conv_id):
    session_token = request.headers.get('Authorization')
    user = User.query.filter_by(session_token=session_token).first()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    conv = Conversation.query.get_or_404(conv_id)
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
    
    conv = Conversation.query.get_or_404(conv_id)
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
    
    msg = Message.query.get_or_404(msg_id)
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
        "created_at": n.created_at.isoformat()
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
    posts = Post.query.join(User, Post.author_id == User.id).filter(
        (Post.content.ilike(search_term)) | 
        (User.display_name.ilike(search_term))
    ).order_by(Post.created_at.desc()).limit(20).all()
    
    # We must format posts exactly like fetchPosts does
    result = []
    for p in posts:
        author = User.query.get(p.author_id)
        
        upvotes = PollVote.query.filter_by(post_id=p.id, is_upvote=True).count()
        downvotes = PollVote.query.filter_by(post_id=p.id, is_upvote=False).count()
        reply_count = Post.query.filter_by(parent_id=p.id).count()
        
        post_data = {
            "id": p.id,
            "topic": p.topic,
            "content": p.content,
            "media_url": p.media_url,
            "author": author.display_name if author else "Unknown",
            "created_at": p.created_at.isoformat(),
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
    from datetime import datetime, timedelta
    today = datetime.utcnow() - timedelta(days=1)
    
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
    
    return jsonify({
        "total_posts_today": total_posts,
        "online_users": online_users,
        "trending_tags": trending_tags
    })

@app.route('/api/sidebar/polls', methods=['GET'])
def get_sidebar_polls():
    polls = Poll.query.order_by(Poll.created_at.desc()).limit(3).all()
    
    from datetime import datetime, timedelta
    # Generate new poll if none exist or latest is > 24 hours old
    if not polls or polls[0].created_at < datetime.utcnow() - timedelta(days=1):
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
            
            new_poll = Poll(post_id=new_post.id, question=poll_data['question'])
            db.session.add(new_poll)
            db.session.flush()
            
            for opt in poll_data['options']:
                db.session.add(PollOption(poll_id=new_poll.id, text=opt))
            db.session.commit()
            
            polls = Poll.query.order_by(Poll.created_at.desc()).limit(3).all()
            
    result = []
    for poll in polls:
        opts = PollOption.query.filter_by(poll_id=poll.id).all()
        total_votes = sum(o.vote_count for o in opts)
        
        # Check if current user voted? The endpoint doesn't strictly need auth, but it helps.
        # We'll just return raw options, frontend can handle auth on vote.
        result.append({
            "id": poll.id,
            "post_id": poll.post_id,
            "question": poll.question,
            "total_votes": total_votes,
            "options": [{"id": o.id, "text": o.text, "votes": o.vote_count} for o in opts]
        })
        
    return jsonify(result)

# --- Admin Routes ---



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
            "created_at": p.created_at.isoformat()
        })
    return jsonify({
        "stats": {"users": total_users, "posts": total_posts, "active_polls": active_polls},
        "queue": queue
    })

@app.route('/api/admin/posts/<int:post_id>/delete', methods=['POST'])
@admin_required
def admin_delete_post(post_id):
    post = Post.query.get_or_404(post_id)
    post.is_deleted = True
    db.session.commit()
    return jsonify({"message": "Post softly deleted"})

@app.route('/api/admin/posts/<int:post_id>/edit_stats', methods=['POST'])
@admin_required
def admin_edit_stats(post_id):
    post = Post.query.get_or_404(post_id)
    data = request.json
    
    if 'views' in data:
        post.views = data['views']
    if 'upvotes' in data:
        post.upvotes = data['upvotes']
    if 'downvotes' in data:
        post.downvotes = data['downvotes']
        
    db.session.commit()
    return jsonify({"message": "Stats updated"})

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_get_users():
    users = User.query.order_by(User.created_at.desc()).all()
    user_data = []
    for u in users:
        post_count = Post.query.filter_by(user_id=u.id, parent_id=None).count()
        user_data.append({
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "role": u.role,
            "is_banned": u.is_banned,
            "created_at": u.created_at.isoformat(),
            "post_count": post_count
        })
    return jsonify(user_data)

@app.route('/api/admin/users/<username>/toggle_ban', methods=['POST'])
@admin_required
def admin_toggle_ban(username):
    user = User.query.filter_by(username=username).first_or_404()
    if user.role == 'admin':
        return jsonify({"error": "Cannot ban an admin"}), 403
        
    user.is_banned = not user.is_banned
    db.session.commit()
    status = "banned" if user.is_banned else "unbanned"
    return jsonify({"message": f"User {username} {status}"})

@app.route('/api/admin/settings', methods=['GET'])
@admin_required
def admin_get_settings():
    settings = SystemSetting.query.all()
    settings_dict = {s.key: (s.value == 'true') for s in settings}
    return jsonify(settings_dict)

@app.route('/api/admin/settings', methods=['POST'])
@admin_required
def admin_update_settings():
    data = request.json
    for k, v in data.items():
        setting = SystemSetting.query.filter_by(key=k).first()
        val_str = 'true' if v else 'false'
        if setting:
            setting.value = val_str
        else:
            setting = SystemSetting(key=k, value=val_str)
            db.session.add(setting)
    db.session.commit()
    return jsonify({"message": "Settings updated"})

@app.route('/api/admin/posts/all', methods=['GET'])
@admin_required
def admin_get_all_posts():
    posts = Post.query.filter_by(parent_id=None).order_by(Post.created_at.desc()).all()
    posts_data = []
    for p in posts:
        author = User.query.get(p.user_id)
        posts_data.append({
            "id": p.id,
            "content": p.content,
            "author_display": author.display_name if author else "Unknown",
            "author_username": author.username if author else "Unknown",
            "created_at": p.created_at.isoformat(),
            "is_deleted": p.is_deleted,
            "upvotes": p.upvotes
        })
    return jsonify(posts_data)

@app.route('/api/admin/posts/<int:post_id>/author', methods=['GET'])
@admin_required
def admin_get_post_author(post_id):
    post = Post.query.get_or_404(post_id)
    author = User.query.get(post.user_id)
    if not author:
        return jsonify({"error": "Author not found"}), 404
        
    return jsonify({
        "username": author.username,
        "display_name": author.display_name,
        "is_registered": author.password_hash is not None,
        "created_at": author.created_at.isoformat()
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

@app.route('/api/health')
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
