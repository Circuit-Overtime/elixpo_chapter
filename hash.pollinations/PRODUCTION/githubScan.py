import re
import asyncio
import requests
import time
import os
import hashlib
import base64
import urllib.parse
from dotenv import load_dotenv
from getFileExtension import findExtensions
from sendEmailToLeaks import send_email
load_dotenv()

class PollinationsTokenScanner:
    def __init__(self):
        self.github_token = os.getenv("githubToken")
        self.token_regex = re.compile(r'Poll_[A-Z0-9]{8}[A-Z0-9]{11}[A-Z0-9]{8}')
        
    def hash_to_alphanum(self, s, length):
        h = hashlib.sha256(s.encode()).digest()
        b32 = base64.b32encode(h).decode('utf-8')
        alphanum = ''.join(c for c in b32 if c.isalnum())
        return alphanum[:length]

    def generate_pollinations_token(self, username, github_id):
        part1 = self.hash_to_alphanum(username, 8)
        part2 = self.hash_to_alphanum(str(github_id), 11)
        combined = username + str(github_id)
        part3 = self.hash_to_alphanum(combined, 8)
        return "Poll_" + part1 + part2 + part3

    def scan_text_for_tokens(self, text, username, file_path=""):
        findings = []
        lines = text.split('\n')
        for line_num, line in enumerate(lines, 1):
            # Find all potential tokens using regex
            matches = self.token_regex.findall(line)
            
            for token in matches:
                    if token:
                        findings.append({
                            'file_path': file_path,
                            'line_number': line_num,
                            'token': token,
                            'username': username,
                            'line_content': line.strip()
                        })
                        break
        
        return findings

    async def search_github_repos(self, username):
        extensionList = await findExtensions()
        search_queries = [
            f"Poll_ in:file user:{username} extension:{ext}" for ext in extensionList
        ]

        all_findings = []

        for query in search_queries:
            print(f"🔍 Scanning: {query}")
            findings = self._execute_search(query, username)
        
        all_findings = []
        
        for query in search_queries:
            print(f"🔍 Scanning: {query}")
            findings = self._execute_search(query, username)
            all_findings.extend(findings)
            time.sleep(2)  
            
        return all_findings

    def _execute_search(self, query, username):
        params = {
            "q": query,
            "per_page": 100
        }
        headers = {
            "Authorization": f"Bearer {self.github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        
        try:
            response = requests.get("https://api.github.com/search/code", 
                                  params=params, headers=headers)
            if response.status_code == 403:
                reset_header = response.headers.get("X-RateLimit-Reset")
                if reset_header:
                    reset = int(reset_header)
                    sleep_time = max(reset - int(time.time()), 5)
                else:
                    sleep_time = 20  
                print(f"Rate limited, sleeping {sleep_time:.0f}s")
                time.sleep(sleep_time)
                return self._execute_search(query)
            
            if response.status_code != 200:
                print(f"   Error: {response.status_code}")
                print(f"   Response: {response.text}")
                return []
                
            items = response.json().get("items", [])
            findings = []
            
            for item in items:
                content = self._get_file_content(item["url"])
                if content:
                    file_findings = self.scan_text_for_tokens(content, username, item["path"])
                    for finding in file_findings:
                        finding.update({
                            'repo_url': item["repository"]["html_url"],
                            'file_url': item["html_url"],
                            'owner': item["repository"]["owner"]["login"]
                        })
                        findings.append(finding)
                        
            return findings
            
        except Exception as e:
            print(f"   Search error: {e}")
            return []

    def _get_file_content(self, content_url):
        headers = {
            "Authorization": f"Bearer {self.github_token}",
            "Accept": "application/vnd.github.raw"
        }
        
        try:
            response = requests.get(content_url, headers=headers)
            if response.status_code == 200:
                return response.text
        except:
            pass
        return None

    def _get_latest_commit_and_diff(self, repo_full_name, file_path):
        headers = {
            "Authorization": f"Bearer {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        commits_url = f"https://api.github.com/repos/{repo_full_name}/commits"
        params = {"path": file_path, "per_page": 1}
        try:
            resp = requests.get(commits_url, headers=headers, params=params)
            if resp.status_code == 200 and resp.json():
                commit = resp.json()[0]
                commit_hash = commit["sha"]
                commit_url = f"https://api.github.com/repos/{repo_full_name}/commits/{commit_hash}"
                diff_headers = headers.copy()
                diff_headers["Accept"] = "application/vnd.github.v3.diff"
                diff_resp = requests.get(commit_url, headers=diff_headers)
                diff_info = diff_resp.text if diff_resp.status_code == 200 else ""
                return commit_hash, diff_info
        except Exception as e:
            print(f"   Commit/diff fetch error: {e}")
        return "", ""

    async def scan_user_protection(self, username):
        print(f"🛡️  POLLINATIONS TOKEN PROTECTION SCAN")
        print(f"👤 Scanning for user: {username}")
        print("=" * 60)

            
        findings = await self.search_github_repos(username)
        for finding in findings:
            repo_url = finding['repo_url']
            file_path = finding['file_path']
            line_number = finding['line_number']
            token = finding['token']
            repo_full_name = "/".join(urllib.parse.urlparse(repo_url).path.strip("/").split("/")[:2])
            commit_hash, diff_info = self._get_latest_commit_and_diff(repo_full_name, file_path)
            receiver_email = "ayushbhatt633@gmail.com"
            if receiver_email:
                await send_email(
                    receiver_email=receiver_email,
                    repo_url=repo_url,
                    file_path=file_path,
                    line_number=line_number,
                    token=token,
                    commit_hash=commit_hash,
                    diff_info=diff_info
                )
        if not findings:
            print("✅ No exposed Pollinations tokens found!")
        else:
            print(f"🚨 ALERT: Found {len(findings)} exposed tokens!")
            print("\n📋 EXPOSURE REPORT:")
            print("=" * 60)
            
            for finding in findings:
                print(f"🗂️  Repository: {finding['repo_url']}")
                print(f"📄 File: {finding['file_path']} (line {finding['line_number']})")
                print(f"🔑 Token: {finding['token']}")
                print(f"👤 User: {finding['username']} ({finding['github_id']})")
                print(f"🔗 Direct link: {finding['file_url']}")
                print(f"📝 Content: {finding['line_content']}")
                print("-" * 40)
            
        return findings
    
if __name__ == "__main__":
    async def main():
        scanner = PollinationsTokenScanner()
        findings = await scanner.scan_user_protection("Circuit-Overtime")
        print(f"Total Findings: {len(findings)}")
    asyncio.run(main())

