from app import app
from models import DatingProfile
with app.app_context():
    profile = DatingProfile.query.filter_by(is_active=True).first()
    if profile:
        print(f"TOKEN={profile.user.session_token}")
    else:
        print("No active profiles.")
