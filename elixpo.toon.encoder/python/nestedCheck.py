import json


dummy_data = {
            "id": 1,
            "name": "John Doe",
            "email": "john.doe@example.com",
            "profile": {
                "age": 28,
                "location": "New York",
                "preferences": {
                    "theme": "dark",
                    "notifications": "true",
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
        }

def has_nesting(data):
    if isinstance(data, dict):
        return any(isinstance(v, (dict, list)) for v in data.values())
    elif isinstance(data, list):
        return any(isinstance(item, dict) and any(isinstance(v, (dict, list)) for v in item.values()) for item in data)
    return False
import re
import json

def flatten_json(data, parent_key="", out=None, compacted=False):
    if out is None:
        out = {}

    if isinstance(data, dict):
        for key, value in data.items():
            new_key = f"{parent_key}.{key}" if parent_key else key
            flatten_json(value, new_key, out)

    elif isinstance(data, list):
        for idx, item in enumerate(data):
            new_key = f"{parent_key}-{idx}"
            flatten_json(item, new_key, out)

    else:
        out[parent_key] = data

    if compacted:
        return compact_string(out)
    return out


def compact_string(flat_dict):
    parts = []
    for k, v in flat_dict.items():
        parts.append(f"{k}:{v}")
    return "{"+",".join(parts)+"}"


def unflatten_json(flat):
    if isinstance(flat, str):
        flat = flat.strip("{}")
        parts = flat.split(",")
        flat_dict = {}
        for part in parts:
            key, value = part.split(":", 1)
            if value.isdigit():
                value = int(value)
            else:
                try:
                    value = float(value)
                except:
                    pass
            flat_dict[key] = value
    else:
        flat_dict = flat  

    root = {}

    for key, value in flat_dict.items():
        segments = key.split(".") 
        current = root
        for i, seg in enumerate(segments):
            if "-" in seg:
                base, idx = seg.split("-")
                idx = int(idx)

                if base not in current:
                    current[base] = []

                while len(current[base]) <= idx:
                    current[base].append(None)

                if i == len(segments) - 1:
                    current[base][idx] = value
                else:
                    if current[base][idx] is None:
                        current[base][idx] = {}
                    current = current[base][idx]

            else:
                if i == len(segments) - 1:
                    current[seg] = value
                else:
                    if seg not in current:
                        current[seg] = {}
                    current = current[seg]

    return root

def is_lossless(a, b):
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


if __name__ == "__main__":
    flatten = flatten_json(dummy_data)
    original = unflatten_json(flatten)
    print(f"Lossless comparison: {is_lossless(dummy_data, original)}")
