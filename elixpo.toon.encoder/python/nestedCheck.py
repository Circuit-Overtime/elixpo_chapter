import json
import urllib.parse


with open("data/dummy_w_nest.json", "r", encoding="utf-8") as f:
    dummy_data = json.load(f)

def has_nesting(data): 
    if isinstance(data, dict): 
        return any(isinstance(v, (dict, list)) for v in data.values()) 
    elif isinstance(data, list): 
        return any(isinstance(item, dict) and any(isinstance(v, (dict, list)) for v in item.values()) for item in data) 
    return False

def flatten(data, parent_key="", out=None):
    if not isinstance(data, (dict, list)):
        return {"_": data}
    if out is None:
        out = {}
    if isinstance(data, dict):
        for key, value in data.items():
            new_key = f"{parent_key}.{key}" if parent_key else key
            flatten(value, new_key, out)

    elif isinstance(data, list):
        for i, item in enumerate(data):
            new_key = f"{parent_key}.{i}"
            flatten(item, new_key, out)

    return out



def unflatten(flat):
    root = {}
    for composite_key, value in flat.items():
        parts = composite_key.split(".")
        curr = root
        for i, part in enumerate(parts):
            if part.isdigit():
                part = int(part)
                is_last = (i == len(parts) - 1)
                if not isinstance(curr, list):
                    curr_parent = curr
                    curr = []
                    if isinstance(curr_parent, dict):
                        curr_parent[parts[i - 1]] = curr
                while len(curr) <= part:
                    curr.append(None)

                if is_last:
                    curr[part] = value
                else:
                    if curr[part] is None:
                        next_part = parts[i + 1]
                        curr[part] = [] if next_part.isdigit() else {}
                    curr = curr[part]

            else:
                is_last = (i == len(parts) - 1)
                if not isinstance(curr, dict):
                    raise TypeError("Structure mismatch while unflattening")

                if is_last:
                    curr[part] = value
                else:
                    if part not in curr:
                        next_part = parts[i + 1]
                        curr[part] = [] if next_part.isdigit() else {}
                    curr = curr[part]
    return root

def normalize_unflattened(original, unflat):
    if isinstance(original, list):
        if isinstance(unflat, dict):
            if all(k.isdigit() for k in unflat.keys()):
                max_idx = max(int(k) for k in unflat.keys())
                lst = [None] * (max_idx + 1)
                for k, v in unflat.items():
                    lst[int(k)] = v
                return lst
        return unflat
    return unflat


def is_lossless(a, b):
    return json.dumps(a, sort_keys=True) in json.dumps(b, sort_keys=True)

if __name__ == "__main__":
    print(has_nesting(dummy_data))
    flat = flatten(dummy_data)
    print(json.dumps(flat, indent=2))
    print("\n=== UNFLATTENED DATA ===")
    unflat = unflatten(flat)
    unflat = normalize_unflattened(dummy_data, unflat)
    print(json.dumps(unflat, indent=2))
    print("\n=== COMPARISON DATA ===")
    print(f"Lossless flattening test: {is_lossless(dummy_data, unflat)}")
