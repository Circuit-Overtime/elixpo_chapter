import requests
import os
from dotenv import load_dotenv
load_dotenv()


OWNER = "Circuit-Overtime"
REPO = "elixpo_chapter"
BRANCH = "main"
TOKEN = os.getenv("githubToken")

url = f"https://api.github.com/repos/{OWNER}/{REPO}/git/trees/{BRANCH}?recursive=1"
headers = {"Authorization": f"Bearer {TOKEN}"}
resp = requests.get(url, headers=headers).json()

READABLE_EXTS = {
    ".env", ".py", ".md", ".js", ".ts",
    ".rb", ".html", ".txt", ".json", ".yml", ".yaml", ".toml", ".ini",
    ".cfg", ".dockerfile",
}


async def findExtensions():
    exts = set()
    for item in resp.get("tree", []):
        if item["type"] == "blob": 
            _, ext = os.path.splitext(item["path"])
            if ext in READABLE_EXTS:
                exts.add(ext)
    return sorted(exts)
