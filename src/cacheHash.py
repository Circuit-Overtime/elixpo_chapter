import hashlib
import string

# Base62 alphabet (alphanumeric only)
BASE62 = string.digits + string.ascii_letters

def base62_encode(num: int) -> str:
    """Convert an integer to a base62 string."""
    if num == 0:
        return BASE62[0]
    digits = []
    base = len(BASE62)
    while num:
        num, rem = divmod(num, base)
        digits.append(BASE62[rem])
    return ''.join(reversed(digits))

def cacheName(query: str, length: int = 16) -> str:
    """Generate deterministic alphanumeric cache name from query."""
    # Hash the query deterministically with SHA256
    digest = hashlib.sha256(query.encode()).digest()
    # Convert first 8 bytes to int
    num = int.from_bytes(digest[:8], 'big')
    # Encode to base62
    encoded = base62_encode(num)
    # Truncate/pad to fixed length
    return encoded[:length]

if __name__ == "__main__":
    print(cacheName("a beautiful flower 42"))
    print(cacheName("SELECT * FROM users WHERE id=43"))
    print(cacheName("a beautiful flower"))  
