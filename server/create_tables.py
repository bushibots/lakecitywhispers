from app import app, db

with app.app_context():
    db.create_all()
    print("All missing tables created successfully.")
