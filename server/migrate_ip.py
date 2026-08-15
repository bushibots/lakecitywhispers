from app import app, db
import sqlalchemy as sa

with app.app_context():
    # SQLite doesn't strictly support ALTER TABLE ADD COLUMN smoothly via pure SQLAlchemy sometimes,
    # but we can try executing raw SQL if we are using SQLite, or use Alembic. 
    # Since we are using SQLAlchemy directly here, raw sql is safest for a quick migration.
    try:
        db.session.execute(sa.text("ALTER TABLE user ADD COLUMN ip_address VARCHAR(45)"))
    except Exception as e:
        print("User table likely already has ip_address:", e)
        
    try:
        db.session.execute(sa.text("ALTER TABLE post ADD COLUMN ip_address VARCHAR(45)"))
    except Exception as e:
        print("Post table likely already has ip_address:", e)
        
    db.session.commit()
    print("Migration complete.")
