import json
from app import app, db
from models import User, DatingProfile

with app.app_context():
    # Find any user who has an active dating profile
    profile = DatingProfile.query.filter_by(is_active=True).first()
    if not profile:
        print("No active profiles found.")
        exit()
        
    user = profile.user
    print(f"Testing discover for user: {user.username}")
    
    from datetime import datetime, timedelta, timezone
    from models import SwipeInteraction
    from sqlalchemy.orm import joinedload
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    
    liked = SwipeInteraction.query.filter_by(swiper_id=user.id, action='like').all()
    recent_passes = SwipeInteraction.query.filter(
        SwipeInteraction.swiper_id == user.id,
        SwipeInteraction.action == 'pass',
        SwipeInteraction.created_at >= cutoff
    ).all()
    
    swiped_ids = [s.target_id for s in liked] + [s.target_id for s in recent_passes]
    swiped_ids.append(user.id) # Exclude self
    
    query = DatingProfile.query.options(joinedload(DatingProfile.user)).filter(
        DatingProfile.is_active == True,
        DatingProfile.user_id.notin_(swiped_ids)
    )
    
    results = query.limit(20).all()
    print(f"Found {len(results)} potential matches.")
    
    discover_list = []
    for p in results:
        if p.user.is_banned: continue
        
        parsed_images = []
        if p.images:
            try:
                parsed_images = json.loads(p.images)
                if not isinstance(parsed_images, list):
                    parsed_images = []
            except Exception as e:
                print(f"Error parsing images for {p.id}: {e}")
                pass
                
        discover_list.append({
            "user_id": p.user_id,
            "image_url": p.image_url,
            "images": parsed_images,
            "bio": p.bio,
            "gender": p.gender,
            "age": p.age
        })
        
    print(f"Successfully processed {len(discover_list)} profiles.")
    if len(discover_list) > 0:
        print(discover_list[0])
