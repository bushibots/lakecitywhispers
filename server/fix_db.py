import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres.yixdpxzlljnlkswlauls:12332145%40ARISHtkd@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres'

engine = create_engine(db_url)

with engine.connect() as conn:
    queries = [
        'ALTER TABLE dating_profile ADD COLUMN IF NOT EXISTS interests TEXT;',
        'ALTER TABLE dating_profile ADD COLUMN IF NOT EXISTS red_flags TEXT;',
        'ALTER TABLE dating_profile ADD COLUMN IF NOT EXISTS green_flags TEXT;',
        'ALTER TABLE dating_profile ADD COLUMN IF NOT EXISTS love_languages TEXT;'
    ]
    for q in queries:
        try:
            conn.execute(text(q))
            print(f"Executed: {q}")
        except Exception as e:
            print(f"Error executing {q}: {e}")
    conn.commit()
    print("Done adding columns.")
