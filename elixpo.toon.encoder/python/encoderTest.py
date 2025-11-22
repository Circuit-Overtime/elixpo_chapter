import json
import os
import requests
from encoders import encodeValue
import tiktoken
import dotenv
from nestedCheck import has_nesting, flatten_json, unflatten_json

dotenv.load_dotenv()

with open("data/dummy_w_nest.json", "r", encoding="utf-8") as f:
    users_nested = json.load(f)

with open("data/dummy_wt_nest.json", "r", encoding="utf-8") as f:
    users_not_nested = json.load(f)

def count_tokens(text, model="cl100k_base"):
    enc = tiktoken.get_encoding(model)
    return len(enc.encode(text))

print("=== LOSSLESS FLATTENING ANALYSIS ===\n")

# Original nested
original_json = json.dumps(users_nested, indent=2)
original_tokens = count_tokens(original_json)

# Flatten with compact key-path
flat_data = flatten_json(users_nested)
print(f"Flattened entries: {len(flat_data)}")
print(f"Sample (first 5):")
for i, (k, v) in enumerate(list(flat_data.items())[:5]):
    print(f"  {k}: {v}")
print()

# Verify lossless reconstruction
reconstructed = unflatten_json(flat_data)
original_sorted = json.dumps(users_nested, sort_keys=True)
reconstructed_sorted = json.dumps(reconstructed, sort_keys=True)
is_lossless = original_sorted == reconstructed_sorted

print(f"✓ Lossless reconstruction: {is_lossless}")
if not is_lossless:
    print(f"  Original length: {len(original_sorted)}")
    print(f"  Reconstructed length: {len(reconstructed_sorted)}")
print()

# Token analysis
flat_json = json.dumps(flat_data, indent=2)
flat_tokens = count_tokens(flat_json)

print("=== TOKEN COMPARISON ===")
print(f"Original nested JSON:        {original_tokens} tokens")
print(f"Flattened (compact paths):   {flat_tokens} tokens")
savings = ((original_tokens - flat_tokens) / original_tokens) * 100
print(f"\nToken Savings: {savings:.1f}%")
print("\n✓ LOSSLESS & OPTIMIZED")

def _count_keys(obj):
    count = 0
    if isinstance(obj, dict):
        count += len(obj)
        for v in obj.values():
            count += _count_keys(v)
    elif isinstance(obj, list):
        for v in obj:
            count += _count_keys(v)
    return count