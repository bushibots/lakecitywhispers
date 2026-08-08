import re

with open("app.py", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add MAX_CONTENT_LENGTH
flask_init = "app = Flask(__name__)"
flask_config = """app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 9 * 1024 * 1024 # 9 MB limit
"""
if "MAX_CONTENT_LENGTH" not in code:
    code = code.replace(flask_init, flask_config)

# 2. Add media_enabled check to /api/upload
upload_route = """@app.route('/api/upload', methods=['POST'])
def upload_file():
    token = request.headers.get('Authorization')"""
    
upload_check = """@app.route('/api/upload', methods=['POST'])
def upload_file():
    # Check if media uploads are allowed globally
    media_setting = SystemSetting.query.filter_by(key='media_enabled').first()
    if media_setting and media_setting.value == 'false':
        return jsonify({"error": "Media uploads are currently disabled by the administrator"}), 403

    token = request.headers.get('Authorization')"""
    
if "media_setting" not in code:
    code = code.replace(upload_route, upload_check)

with open("app.py", "w", encoding="utf-8") as f:
    f.write(code)
print("Updated app.py with media restrictions")
