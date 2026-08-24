import requests
username = "zuck"

print("testing microlink...")
try:
    r = requests.get(f"https://api.microlink.io/?url=https://www.instagram.com/{username}/&filter=image.url")
    print(r.status_code, r.text)
except Exception as e:
    print(e)
