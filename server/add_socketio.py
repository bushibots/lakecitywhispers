import re
import sys

with open('app.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports and Setup
setup_replacement = '''from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room'''
code = code.replace('from flask import Flask, jsonify, request\nfrom flask_cors import CORS', setup_replacement)

# Initialize SocketIO after CORS(app)
init_replacement = '''CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('join')
def on_join(data):
    user_id = data.get('user_id')
    if user_id:
        join_room(f"user_{user_id}")
'''
code = code.replace('CORS(app)', init_replacement)

# 2. Emit new_post globally in create_post
create_post_search = '''    db.session.add(post)
    db.session.commit()
    
    return jsonify({"message": "Post created"}), 201'''

create_post_replace = '''    db.session.add(post)
    db.session.commit()
    
    # Emit to all connected clients
    socketio.emit('new_post', {
        'id': post.id,
        'title': post.title,
        'content': post.content,
        'author_name': user.display_name,
        'created_at': post.created_at.isoformat()
    })
    
    return jsonify({"message": "Post created"}), 201'''
code = code.replace(create_post_search, create_post_replace)

# 3. Emit notification in create_reply
reply_search = '''    db.session.add(reply)
    db.session.commit()
    
    return jsonify({"message": "Reply created"}), 201'''
    
reply_replace = '''    db.session.add(reply)
    db.session.commit()
    
    # Emit notification to post author (if not self)
    post = Post.query.get(post_id)
    if post and post.author_id != user.id:
        socketio.emit('new_notification', {
            'type': 'reply',
            'message': f"{user.display_name} replied to your post.",
            'post_id': post.id
        }, room=f"user_{post.author_id}")
    
    return jsonify({"message": "Reply created"}), 201'''
code = code.replace(reply_search, reply_replace)

# 4. Emit notification in vote_post
vote_search = '''        db.session.add(vote)
        
    db.session.commit()
    return jsonify({"message": "Vote registered"})'''
    
vote_replace = '''        db.session.add(vote)
        
        # Emit notification
        post = Post.query.get(post_id)
        if post and post.author_id != user.id:
            socketio.emit('new_notification', {
                'type': 'upvote',
                'message': f"Someone upvoted your post.",
                'post_id': post.id
            }, room=f"user_{post.author_id}")
            
    db.session.commit()
    return jsonify({"message": "Vote registered"})'''
code = code.replace(vote_search, vote_replace)

# 5. Emit message in send_message
msg_search = '''    msg = Message(conversation_id=conv.id, sender_id=user.id, content=content)
    conv.updated_at = datetime.utcnow()
    db.session.add(msg)
    db.session.commit()
    
    return jsonify({'''
    
msg_replace = '''    msg = Message(conversation_id=conv.id, sender_id=user.id, content=content)
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
    socketio.emit('new_notification', {
        'type': 'message',
        'message': f"New message from {user.display_name}"
    }, room=f"user_{other_user_id}")
    
    return jsonify({'''
code = code.replace(msg_search, msg_replace)

# 6. Emit new_request in request_message
req_search = '''    db.session.add(conv)
    db.session.commit()
    
    return jsonify({"message": "Request sent", "conversation_id": conv.id}), 201'''

req_replace = '''    db.session.add(conv)
    db.session.commit()
    
    socketio.emit('new_notification', {
        'type': 'message_request',
        'message': f"{user.display_name} sent you a message request."
    }, room=f"user_{target_user_id}")
    
    return jsonify({"message": "Request sent", "conversation_id": conv.id}), 201'''
code = code.replace(req_search, req_replace)

# 7. Update run command at the bottom
run_search = '''if __name__ == '__main__':
    app.run(debug=True)'''
run_replace = '''if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)'''
code = code.replace(run_search, run_replace)

# 8. Update old app.run blocks (just in case they exist differently)
code = re.sub(r'app\.run\(.*?\)', r"socketio.run(app, host='0.0.0.0', port=5000, debug=True)", code)


with open('app.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("SocketIO added successfully to app.py")
