import sys
from app import app
from models import db, User, Manager

def assign_manager(username, handle):
    with app.app_context():
        user = User.query.filter_by(username=username).first()
        if not user:
            print(f"Error: User '{username}' not found.")
            sys.exit(1)
            
        existing = Manager.query.filter_by(user_id=user.id, handle=handle).first()
        if existing:
            print(f"User '{username}' is already a manager for '{handle}'.")
            sys.exit(0)
            
        manager = Manager(user_id=user.id, handle=handle)
        db.session.add(manager)
        db.session.commit()
        print(f"Success: '{username}' is now a manager for '{handle}'.")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python assign_manager.py <username> <handle>")
        sys.exit(1)
    
    assign_manager(sys.argv[1], sys.argv[2])
