from app import app, db
from models import User, Post, Poll, PollOption
from ai import generate_campus_poll
import time

with app.app_context():
    oracle = User.query.filter_by(username='system_oracle').first()
    if not oracle:
        oracle = User.query.filter_by(role='admin').first()
    if not oracle:
        oracle = User.query.first()
    
    for i in range(5):
        poll_data = generate_campus_poll()
        if poll_data:
            new_post = Post(content=poll_data['question'], author=oracle, topic='Campus')
            db.session.add(new_post)
            db.session.flush()
            
            new_poll = Poll(post_id=new_post.id, question=poll_data['question'])
            db.session.add(new_poll)
            db.session.flush()
            
            for opt in poll_data['options']:
                db.session.add(PollOption(poll_id=new_poll.id, text=opt))
            db.session.commit()
            print("Generated poll:", poll_data['question'])
        time.sleep(2)
