from app import app, db
from models import User, Post, Poll, PollOption

mock_data = [
    {"question": "What's the best library spot for uninterrupted cramming?", "options": ["The Silent Zone", "Cafeteria Tables", "Lawn under the sun", "My dorm bed"]},
    {"question": "How often do you actually attend the 8 AM lectures?", "options": ["Every single day", "Maybe once a week", "What is an 8 AM lecture?", "Only on exam days"]},
    {"question": "Most overhyped event on campus this semester?", "options": ["The Cultural Fest", "Sports Week", "Tech Symposium", "Freshers Party"]}
]

with app.app_context():
    oracle = User.query.filter_by(role='admin').first()
    
    for poll_data in mock_data:
        new_post = Post(content=poll_data['question'], author=oracle, topic='Campus')
        db.session.add(new_post)
        db.session.flush()
        
        new_poll = Poll(post_id=new_post.id)
        db.session.add(new_poll)
        db.session.flush()
        
        for opt in poll_data['options']:
            db.session.add(PollOption(poll_id=new_poll.id, text=opt))
        db.session.commit()
        print("Generated mock poll:", poll_data['question'])
