import re

file_path = r'e:\Thejluwhisperers\server\app.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update datetime import
content = re.sub(r'from datetime import datetime, timedelta', r'from datetime import datetime, timedelta, timezone', content)

# 2. Replace datetime.utcnow()
content = content.replace('datetime.utcnow()', 'datetime.now(timezone.utc)')

# 3. Replace Model.query.get(id)
# Pattern: Word.query.get(var) -> db.session.get(Word, var)
content = re.sub(r'([A-Za-z0-9_]+)\.query\.get\((.*?)\)', r'db.session.get(\1, \2)', content)

# 4. Replace Model.query.get_or_404(id)
# Pattern: Word.query.get_or_404(var) -> db.get_or_404(Word, var)
content = re.sub(r'([A-Za-z0-9_]+)\.query\.get_or_404\((.*?)\)', r'db.get_or_404(\1, \2)', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Deprecations fixed.")
