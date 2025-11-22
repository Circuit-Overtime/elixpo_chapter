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

def flatten_json(data):
    """
    Lossless flattening with compact key-path encoding.
    Example: {"user": {"name": "John"}} -> {"user.name": "John"}
    Returns: flat_data only (no separate structure_map)
    """
    flat_data = {}
    
    def _flatten(value, path):
        if isinstance(value, dict):
            for k, v in value.items():
                _flatten(v, path + [str(k)])
        elif isinstance(value, list):
            for i, v in enumerate(value):
                _flatten(v, path + [f"[{i}]"])
        else:
            # Leaf value - use dot notation with bracket for arrays
            key = ".".join(path) if path else "root"
            flat_data[key] = value
    
    _flatten(data, [])
    return flat_data

def unflatten_json(flat_data):
    """
    Reconstruct original JSON from flat representation.
    Guarantees: decode(encode(x)) == x
    """
    result = None
    
    for path_str, value in flat_data.items():
        if path_str == "root":
            result = value
            continue
        
        # Parse path: "user.profile.[0].name" -> ["user", "profile", "[0]", "name"]
        parts = []
        current = ""
        i = 0
        while i < len(path_str):
            if path_str[i] == "[":
                if current:
                    parts.append(current)
                    current = ""
                j = path_str.index("]", i)
                parts.append(path_str[i:j+1])
                i = j + 1
            elif path_str[i] == ".":
                if current:
                    parts.append(current)
                    current = ""
                i += 1
            else:
                current += path_str[i]
                i += 1
        if current:
            parts.append(current)
        
        # Initialize result
        if result is None:
            result = [] if parts[0].startswith("[") else {}
        
        # Navigate to parent
        current = result
        for i, part in enumerate(parts[:-1]):
            if part.startswith("["):
                idx = int(part[1:-1])
                while len(current) <= idx:
                    current.append(None)
                if current[idx] is None:
                    next_part = parts[i + 1]
                    current[idx] = [] if next_part.startswith("[") else {}
                current = current[idx]
            else:
                if part not in current:
                    next_part = parts[i + 1]
                    current[part] = [] if next_part.startswith("[") else {}
                current = current[part]
        
        # Set final value
        final_part = parts[-1]
        if final_part.startswith("["):
            idx = int(final_part[1:-1])
            while len(current) <= idx:
                current.append(None)
            current[idx] = value
        else:
            current[final_part] = value
    
    return result