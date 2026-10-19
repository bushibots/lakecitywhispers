#!/usr/bin/env python3
"""
Admin Password & Recovery Key Reset Script
-------------------------------------------
Safely updates an admin's password and issues a brand-new recovery key.
Works on local SQLite (server/jluwhisper.db) and production PostgreSQL (via DATABASE_URL).

Usage:
    python server/reset_admin_password.py [username] [new_password]

Examples:
    python server/reset_admin_password.py Admin MyNewSecurePassword123
    python server/reset_admin_password.py
"""

import os
import sys
import uuid
import random
import string
from werkzeug.security import generate_password_hash

# Ensure UTF-8 output across all consoles/terminals
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure server directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    from app import app, db
    from models import User
except ImportError as e:
    print(f"Error importing Flask app or models: {e}")
    sys.exit(1)

def generate_recovery_key():
    return '-'.join([''.join(random.choices(string.ascii_uppercase + string.digits, k=4)) for _ in range(3)])

def reset_admin(username=None, new_password=None):
    with app.app_context():
        print("=" * 60)
        print("   JLU Whisperer - Admin Password & Recovery Key Reset")
        print("=" * 60)

        # 1. Locate the target user
        user = None
        if username:
            user = User.query.filter(User.username.ilike(username)).first()
            if not user:
                print(f"[!] User with username '{username}' not found.")
        
        if not user:
            # Fallback to first registered admin
            user = User.query.filter_by(role='admin', is_registered=True).first()
            if not user:
                # Any admin
                user = User.query.filter_by(role='admin').first()

        if not user:
            print("[!] No admin account found in database. Listing available registered users:")
            registered = User.query.filter_by(is_registered=True).limit(5).all()
            for u in registered:
                print(f"  - Username: {u.username} (Role: {u.role})")
            return False

        print(f"[*] Found Admin Account:")
        print(f"    - ID: {user.id}")
        print(f"    - Username: {user.username}")
        print(f"    - Display Name: {user.display_name}")
        print(f"    - Role: {user.role}")

        # 2. Get password if not provided
        if not new_password:
            chars = string.ascii_letters + string.digits + "!@#$%"
            new_password = ''.join(random.choices(chars, k=12))
            print(f"[*] No password specified. Generated temporary password: {new_password}")

        # 3. Generate fresh recovery key
        new_recovery_key = generate_recovery_key()

        # 4. Update credentials
        user.password_hash = generate_password_hash(new_password)
        user.recovery_key_hash = generate_password_hash(new_recovery_key)
        user.session_token = str(uuid.uuid4())
        user.is_registered = True
        user.role = 'admin'

        try:
            db.session.commit()
            print("\n[+] PASSWORD & RECOVERY KEY SUCCESSFULLY UPDATED!")
            print("=" * 60)
            print(f"  Username:      {user.username}")
            print(f"  New Password:  {new_password}")
            print(f"  Recovery Key:  {new_recovery_key}")
            print(f"  Session Token: {user.session_token}")
            print("=" * 60)
            print("[!] IMPORTANT: Please save your Recovery Key in a safe place.")
            print("[!] You can now log in at /feed or /settings using these new credentials.")
            return True
        except Exception as e:
            db.session.rollback()
            print(f"[!] Database error while updating password: {e}")
            return False

if __name__ == '__main__':
    target_username = sys.argv[1] if len(sys.argv) > 1 else None
    target_password = sys.argv[2] if len(sys.argv) > 2 else None
    reset_admin(target_username, target_password)
