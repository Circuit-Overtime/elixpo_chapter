#!/usr/bin/env python3

import requests
import json

url = "http://157.230.129.96:8006/v1/chat/completions"

payload = {
    "messages": [
        {
            "role": "user",
            "content": "what are the latest issues on the polinations repo"
        }
    ],
    "user_name": "http_test_user",
    "is_admin": False
}


try:
    response = requests.post(url, json=payload, timeout=300)
    response.raise_for_status()
    
    result = response.json()
    print("Response:")
    print(json.dumps(result, indent=2))
    
except requests.exceptions.ConnectionError:
    print("Error: Could not connect to server. Make sure tommy_api.py is running ")
except requests.exceptions.Timeout:
    print("Error: Request timed out")
except Exception as e:
    print(f"Error: {e}")

