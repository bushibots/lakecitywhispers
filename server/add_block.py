import re
import sys

with open('app.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update imports
code = code.replace('from models import db, User, Post, Poll, PollOption, PollVote, Conversation, Message, SystemSetting',
                    'from models import db, User, Post, Poll, PollOption, PollVote, Conversation, Message, SystemSetting, Block')

# 2. Add block check to get_conversations
get_conv_search = r'''    for c in convs:
        # Determine the other user's display name
        other_user_id = c.user2_id if c.user1_id == user.id else c.user1_id'''
        
get_conv_replace = r'''    for c in convs:
        other_user_id = c.user2_id if c.user1_id == user.id else c.user1_id
        
        # Check if blocked
        is_blocked = Block.query.filter(
            ((Block.blocker_id == user.id) & (Block.blocked_id == other_user_id)) | 
            ((Block.blocker_id == other_user_id) & (Block.blocked_id == user.id))
        ).first()
        
        if is_blocked:
            continue
            
        # Determine the other user's display name'''

code = code.replace(get_conv_search, get_conv_replace)

# 3. Add block check to send_message
send_msg_search = r'''    if conv.status != 'accepted' and conv.user1_id != user.id:
        # Only the requester can send messages while pending (e.g. follow-ups), but actually let's just allow it for both if we want,
        # but normally receiver shouldn't reply without accepting.
        return jsonify({"error": "Conversation not accepted"}), 403'''

send_msg_replace = r'''    if conv.status != 'accepted' and conv.user1_id != user.id:
        return jsonify({"error": "Conversation not accepted"}), 403
        
    other_user_id = conv.user2_id if conv.user1_id == user.id else conv.user1_id
    is_blocked = Block.query.filter(
        ((Block.blocker_id == user.id) & (Block.blocked_id == other_user_id)) | 
        ((Block.blocker_id == other_user_id) & (Block.blocked_id == user.id))
    ).first()
    
    if is_blocked:
        return jsonify({"error": "Cannot send message. User is blocked."}), 403'''

code = code.replace(send_msg_search, send_msg_replace)

# 4. Add the 3 new endpoints
new_endpoints = r'''
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

# --- Admin Routes ---
'''

code = code.replace('# --- Admin Routes ---', new_endpoints)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(code)
print("app.py updated successfully")
