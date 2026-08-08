import re
import sys

with open('app.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update imports
code = code.replace('from models import db, User, Post, Poll, PollOption, PollVote, Conversation, Message, SystemSetting, Block',
                    'from models import db, User, Post, Poll, PollOption, PollVote, Conversation, Message, SystemSetting, Block, Notification')

# 2. Add Notification in create_reply
reply_search = '''    # Emit notification to post author (if not self)
    post = Post.query.get(post_id)
    if post and post.author_id != user.id:
        socketio.emit('new_notification', {'''
        
reply_replace = '''    # Emit notification to post author (if not self)
    post = Post.query.get(post_id)
    if post and post.author_id != user.id:
        notif = Notification(user_id=post.author_id, type='reply', message=f"{user.display_name} replied to your post.", post_id=post.id)
        db.session.add(notif)
        db.session.commit()
        socketio.emit('new_notification', {'''
code = code.replace(reply_search, reply_replace)

# 3. Add Notification in vote_post
vote_search = '''        # Emit notification
        post = Post.query.get(post_id)
        if post and post.author_id != user.id:
            socketio.emit('new_notification', {'''

vote_replace = '''        # Emit notification
        post = Post.query.get(post_id)
        if post and post.author_id != user.id:
            notif = Notification(user_id=post.author_id, type='upvote', message=f"Someone upvoted your post.", post_id=post.id)
            db.session.add(notif)
            db.session.commit()
            socketio.emit('new_notification', {'''
code = code.replace(vote_search, vote_replace)

# 4. Add Notification in send_message
msg_search = '''    socketio.emit('new_notification', {
        'type': 'message',
        'message': f"New message from {user.display_name}"
    }, room=f"user_{other_user_id}")'''

msg_replace = '''    notif = Notification(user_id=other_user_id, type='message', message=f"New message from {user.display_name}")
    db.session.add(notif)
    db.session.commit()
    
    socketio.emit('new_notification', {
        'type': 'message',
        'message': f"New message from {user.display_name}"
    }, room=f"user_{other_user_id}")'''
code = code.replace(msg_search, msg_replace)

# 5. Add Notification in request_message
req_search = '''    socketio.emit('new_notification', {
        'type': 'message_request',
        'message': f"{user.display_name} sent you a message request."
    }, room=f"user_{target_user_id}")'''

req_replace = '''    notif = Notification(user_id=target_user_id, type='message_request', message=f"{user.display_name} sent you a message request.")
    db.session.add(notif)
    db.session.commit()
    
    socketio.emit('new_notification', {
        'type': 'message_request',
        'message': f"{user.display_name} sent you a message request."
    }, room=f"user_{target_user_id}")'''
code = code.replace(req_search, req_replace)

# 6. Add new endpoints for Explore & Notifications
new_endpoints = '''
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
            "topic": topic,
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

# --- Admin Routes ---
'''

code = code.replace('# --- Admin Routes ---', new_endpoints)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(code)
print("app.py updated for explore and notifications")
