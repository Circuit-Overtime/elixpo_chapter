import hashlib
import base64

def hash_to_alphanum(s, length):
    h = hashlib.sha256(s.encode()).digest()  
    b32 = base64.b32encode(h).decode('utf-8')  
    alphanum = ''.join(c for c in b32 if c.isalnum())  
    return alphanum[:length]

def generate_pollinations_token(username, github_id):
    part1 = hash_to_alphanum(username, 8)
    part2 = hash_to_alphanum(str(github_id), 11)
    combined = username + str(github_id)
    part3 = hash_to_alphanum(combined, 8)
    return "Poll_" + part1 + part2 + part3

username = "Circuit-Overtime"
github_id = 74301576

token = generate_pollinations_token(username, github_id)
print(token)
print(len(token))  
