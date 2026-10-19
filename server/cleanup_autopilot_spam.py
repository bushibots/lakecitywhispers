#!/usr/bin/env python3
"""
AI Autopilot Duplicate Posts Cleanup Script
-------------------------------------------
Safely cleans up duplicate AI matchmaking announcements from the database.
Supports both SQLite (local development) and PostgreSQL (production via DATABASE_URL).

Usage:
    python server/cleanup_autopilot_spam.py
    or (from server folder):
    python cleanup_autopilot_spam.py
"""

import os
import sys

# Ensure server folder is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    from app import app, db
    from models import Post, Notification, PostView
except ImportError as e:
    print(f"Error importing Flask app or models: {e}")
    sys.exit(1)

def cleanup_duplicate_autopilot_posts(keep_latest=True):
    with app.app_context():
        print("=" * 60)
        print("  JLU Whisperer - AI Autopilot Feed Cleanup")
        print("=" * 60)
        
        # Query all AI Autopilot Drop announcement posts
        autopilot_posts = Post.query.filter(
            Post.content.like('%AI AUTOPILOT DROP%')
        ).order_by(Post.id.desc()).all()
        
        total_found = len(autopilot_posts)
        print(f"[*] Found {total_found} AI Autopilot announcement post(s) in database.")
        
        if total_found <= 1:
            print("[+] No duplicate autopilot posts found. Database feed is clean!")
            return 0
        
        # Decide which posts to keep and which to delete
        # keep_latest=True means we keep posts[0] and delete posts[1:]
        posts_to_delete = autopilot_posts[1:] if keep_latest else autopilot_posts
        
        deleted_count = 0
        deleted_notifications = 0
        deleted_views = 0
        
        for post in posts_to_delete:
            # 1. Clean up linked notifications
            notif_count = Notification.query.filter_by(post_id=post.id).delete()
            deleted_notifications += notif_count
            
            # 2. Clean up linked post views
            view_count = PostView.query.filter_by(post_id=post.id).delete()
            deleted_views += view_count
            
            # 3. Delete the duplicate post
            db.session.delete(post)
            deleted_count += 1
            
        try:
            db.session.commit()
            print(f"[✓] Successfully purged {deleted_count} duplicate AI Autopilot post(s).")
            print(f"[✓] Cleaned up {deleted_notifications} linked notification(s) and {deleted_views} post view(s).")
            if keep_latest:
                print(f"[✓] Preserved the most recent post (Post ID #{autopilot_posts[0].id}).")
            print("[✓] Database is now fully deduplicated and clean!")
            return deleted_count
        except Exception as e:
            db.session.rollback()
            print(f"[!] Database error during cleanup: {e}")
            return 0

if __name__ == '__main__':
    cleanup_duplicate_autopilot_posts(keep_latest=True)
