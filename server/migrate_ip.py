from app import app, db
import sqlalchemy as sa

with app.app_context():
    try:
        db.session.execute(sa.text('ALTER TABLE "user" ADD COLUMN ip_address VARCHAR(45)'))
        print("Added ip_address to user table.")
    except Exception as e:
        print("Error on user table:", e)
        db.session.rollback()
        
    try:
        db.session.execute(sa.text('ALTER TABLE post ADD COLUMN ip_address VARCHAR(45)'))
        print("Added ip_address to post table.")
    except Exception as e:
        print("Error on post table:", e)
        db.session.rollback()
        
    db.session.commit()
    print("Migration complete.")
