import requests
import json
import urllib.parse
url = "https://search.pollinations.ai/search"
headers = {"Content-Type": "application/json"}
data = {
    "messages": [
        {"role": "user", "content": "What is the latest information of the stock market?"}
    ]
}

response = requests.post(url, headers=headers, data=json.dumps(data))
print(response.text)
