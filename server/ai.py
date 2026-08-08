import os
import json
import random
from google import genai
from google.genai.errors import APIError
from dotenv import load_dotenv

load_dotenv()

# Gather all API keys from environment
api_keys = []
for key, value in os.environ.items():
    if key.startswith("GEMINI_API_KEY") and value:
        api_keys.append(value)

# If no keys found, we will use fallback mode
if not api_keys:
    print("WARNING: No GEMINI_API_KEYs found. AI features will use fallback mode.")

gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")

def generate_with_retry(prompt, is_json=False):
    """
    Attempts to generate content using Gemini, cycling through API keys 
    if one throws an error (e.g., quota exhausted or invalid key).
    """
    if not api_keys:
        return None
        
    for key in api_keys:
        try:
            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model=gemini_model,
                contents=prompt,
            )
            text = response.text.strip()
            
            if is_json:
                text = text.replace('```json', '').replace('```', '').strip()
                return json.loads(text)
            return text
            
        except Exception as e:
            print(f"Key {key[:10]}... failed: {e}")
            continue # Try next key
            
    print("CRITICAL: All Gemini API keys failed or exhausted!")
    return None

def generate_creative_identity():
    prompt = """Generate a unique, creative, and slightly mysterious anonymous identity for a user on a college anonymous app. 
    Return the result as a JSON object with two keys: 
    1. 'display_name': A cool title like 'Crimson Phoenix of the West' or 'Midnight Wanderer'. 
    2. 'username': A snake_case version of the name or something similar, like 'crimson_phoenix_99'. 
    Do not use markdown blocks, just return raw JSON."""
    
    data = generate_with_retry(prompt, is_json=True)
    if data:
        return data.get('display_name', 'Unknown'), data.get('username', f'user_{random.randint(1000,9999)}')
    else:
        # Fallback
        r = random.randint(1000, 9999)
        return f"Anonymous {r}", f"anonymous_{r}"

def generate_daily_prompt():
    prompt = """Generate an engaging, provocative, or relatable "Prompt of the Day" for a college anonymous app.
    It should focus on themes like dating, romance, crushes, heartbreaks, campus relationships, or toxic traits.
    It should be a single sentence question. Example: "What's the most toxic thing you've done for a crush?"
    Output ONLY the question text."""
    
    return generate_with_retry(prompt, is_json=False) or "What's your biggest campus confession?"


def generate_campus_poll():
    prompt = """Generate a creative, relatable multiple-choice poll about college campus life, dating, or academics.
    Return the result as a JSON object with two keys:
    1. 'question': The poll question string.
    2. 'options': An array of exactly 3 to 4 string options.
    Do not use markdown blocks, just return raw JSON."""
    
    data = generate_with_retry(prompt, is_json=True)
    if data and "question" in data and "options" in data:
        return data
    else:
        return {
            "question": "What's the best spot to chill on campus?",
            "options": ["Library Steps", "Block A Canteen", "The Lawns", "Hostel Roof"]
        }

