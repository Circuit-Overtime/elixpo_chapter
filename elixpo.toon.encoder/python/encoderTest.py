import json
import os
import requests
from encoders import encodeValue
import tiktoken
import dotenv
from nestedCheck import has_nesting, flatten_json
dotenv.load_dotenv()
with open("data/dummy_w_nest.json", "r", encoding="utf-8") as f:
    users = json.load(f)

def count_tokens(text, model="cl100k_base"):
    enc = tiktoken.get_encoding(model)
    return len(enc.encode(text))



encoded_original = encodeValue(
    users,
    options={"indent": 2, "delimiter": ", ", "lengthMarker": True}
)

min_str = json.dumps(users, indent=2)



# -------------------------------------------------------
# COUNT TOKENS
# -------------------------------------------------------
print("==================================================")
print("Nested JSON token count        :", count_tokens(json.dumps(users, indent=2)))
print("Minimal Flat JSON token count  :", count_tokens(min_str))
print("Encoded original: ", count_tokens(encoded_original))
print("\nDONE.")
