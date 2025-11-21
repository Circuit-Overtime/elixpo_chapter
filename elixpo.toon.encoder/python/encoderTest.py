from encoders import encodeValue
import json


json_block = """
                {
            "id": 1,
            "name": "John Doe",
            "email": "john.doe@example.com",
            "profile": {
                "age": 28,
                "location": "New York",
                "preferences": {
                    "theme": "dark",
                    "notifications": true,
                    "language": "en"
                }
            },
            "orders": [
                {
                    "orderId": "ORD-001",
                    "amount": 99.99,
                    "status": "completed"
                }
            ]
        },
"""

def flatten_json(data, parent_key="", out=None):
    if out is None:
        out = {}

    # Case 1: primitive value → assign directly
    if not isinstance(data, (dict, list)):
        out[parent_key] = data
        return out

    # Case 2: object → expand keys using dot notation
    if isinstance(data, dict):
        for key, value in data.items():
            new_key = key if parent_key == "" else f"{parent_key}.{key}"
            flatten_json(value, new_key, out)
        return out

    # Case 3: array → use [index] notation
    if isinstance(data, list):
        for index, item in enumerate(data):
            new_key = f"{parent_key}[{index}]"
            flatten_json(item, new_key, out)
        return out


flat = flatten_json(json_block)
print(flat)
print("="* 50 )
print(encodeValue(flat, options={"indent": 2, "delimiter": ", ", "lengthMarker": True}))
        