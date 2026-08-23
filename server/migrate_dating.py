from app import app, db
from sqlalchemy import text

with app.app_context():
    try:
        db.session.execute(text('ALTER TABLE dating_profile ADD COLUMN image_url VARCHAR(255)'))
        db.session.commit()
        print("Successfully added image_url column.")
    except Exception as e:
        print("Column may already exist or error:", e)
        db.session.rollback()
