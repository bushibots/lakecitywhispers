from app import app, db
from models import PostView

with app.app_context():
    PostView.__table__.create(db.engine, checkfirst=True)
    print("PostView table created successfully.")
