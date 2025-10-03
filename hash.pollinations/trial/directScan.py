import re
import hashlib
import base64

# Your existing functions
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

# Test the exposed token
exposed_token = "Poll_EC53MY42FN5NTX3JQNJJIY3LE7U"
print(f"Exposed token: {exposed_token}")
print(f"Token length: {len(exposed_token)}")

# Check if it matches your regex
TOKEN_REGEX = re.compile(r'^Poll_[A-Z2-7]{8}[A-Z2-7]{11}[A-Z2-7]{8}$')
print(f"Regex match: {bool(TOKEN_REGEX.match(exposed_token))}")

# Generate token for Circuit-Overtime to compare
circuit_token = generate_pollinations_token("Circuit-Overtime", 74301576)
print(f"Circuit-Overtime token: {circuit_token}")
print(f"Tokens match: {exposed_token == circuit_token}")