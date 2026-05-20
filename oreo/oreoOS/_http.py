"""Raw-socket HTTP GET with a timeout that's actually honoured.

Both `oreoOS.ota` and `oreoOS.store` use this instead of `urequests`
because `urequests`'s `timeout=` flag on the MicroPython 1.28 build we
ship only covers the connect step — body read can hang forever on a
slow / mis-behaving server, wedging the OS run loop for minutes.

Public surface:
    get_url(url, accept=None, timeout_s=4, auth=None) -> bytes | None

`accept` overrides the Accept header (GitHub Contents API needs
`application/vnd.github.raw` for raw file bodies, otherwise we get the
base64-wrapped JSON envelope).

`auth` is an optional ("Bearer <token>") header value.

Returns the response body as bytes on HTTP 200, or None on any other
status / timeout / DNS failure / SSL error. Caller logs / surfaces.
"""

import time

try:
    import socket as _socket
    import ssl    as _ssl
    _OK = True
except ImportError:
    _OK = False


USER_AGENT = "OreoBadge"


def _bc(msg):
    try:
        print("[http] " + msg)
    except Exception:
        pass


def get_url(url, accept=None, timeout_s=4, auth=None):
    if not _OK:
        return None
    if not url.startswith("https://"):
        return None

    rest = url[len("https://"):]
    slash = rest.find("/")
    if slash < 0:
        host, path = rest, "/"
    else:
        host, path = rest[:slash], rest[slash:]
    port = 443
    if ":" in host:
        host, p = host.split(":", 1)
        try: port = int(p)
        except ValueError: port = 443

    accept_hdr = accept or "*/*"

    # Auto-inject a GitHub token for *.github.com calls if one is
    # present in oreoOS.config. Bumps anonymous limit (60 / hr / IP)
    # to 5000 / hr — relevant only for sustained Store / OTA polling.
    # `auth` arg overrides if the caller wants something custom.
    if auth is None and ("github.com" in host or "githubusercontent.com" in host):
        try:
            from oreoOS.config import GH_TOKEN as _TOK
            if _TOK:
                auth = "Bearer " + _TOK
        except Exception:
            pass
    auth_hdr = ("Authorization: " + auth + "\r\n") if auth else ""

    deadline = time.ticks_add(time.ticks_ms(), int(timeout_s * 1000) + 500)
    s = None
    raw = None
    try:
        _bc("dns " + host)
        addr = _socket.getaddrinfo(host, port)[0][-1]
        _bc("connect " + host + ":" + str(port))
        raw = _socket.socket()
        raw.settimeout(timeout_s)
        raw.connect(addr)
        _bc("ssl")
        s = _ssl.wrap_socket(raw, server_hostname=host)
        # SSLSocket wraps raw — settimeout on raw doesn't always
        # propagate. Set it again on the wrapper so .read() honours it.
        try:
            s.settimeout(timeout_s)
        except Exception:
            pass

        req = (
            "GET %s HTTP/1.1\r\n"
            "Host: %s\r\n"
            "User-Agent: %s\r\n"
            "Accept: %s\r\n"
            "Accept-Encoding: identity\r\n"
            "%s"
            "Connection: close\r\n\r\n"
        ) % (path, host, USER_AGENT, accept_hdr, auth_hdr)
        s.write(req.encode())

        _bc("read")
        buf = bytearray()
        while True:
            # Hard wallclock guard — even if settimeout misfires we
            # bail when the budget is blown.
            if time.ticks_diff(deadline, time.ticks_ms()) <= 0:
                _bc("deadline blown after %d bytes" % len(buf))
                break
            try:
                chunk = s.read(2048)
            except Exception as e:
                _bc("read err: " + str(e))
                break
            if not chunk:
                break
            buf.extend(chunk)
            if len(buf) > 256 * 1024:
                break
    except Exception as e:
        _bc("FAIL " + host + ": " + str(e))
        return None
    finally:
        for h in (s, raw):
            try:
                if h is not None:
                    h.close()
            except Exception:
                pass

    # Slice headers / body, check status.
    head_end = buf.find(b"\r\n\r\n")
    if head_end < 0:
        return None
    head = bytes(buf[:head_end])
    body = bytes(buf[head_end + 4:])

    status = 0
    line0  = head.split(b"\r\n", 1)[0]
    parts  = line0.split(b" ", 2)
    if len(parts) >= 2:
        try: status = int(parts[1])
        except ValueError: status = 0
    if status != 200:
        _bc("HTTP %d %s" % (status, host))
        return None

    # Chunked-transfer dechunk (defensive — rare on github but the
    # raw-file CDN occasionally uses it).
    if b"\r\ntransfer-encoding: chunked" in (b"\r\n" + head.lower()):
        body = _dechunk(body)

    return body


def _dechunk(body):
    out = bytearray()
    i = 0
    while i < len(body):
        nl = body.find(b"\r\n", i)
        if nl < 0:
            break
        try:
            n = int(body[i:nl].split(b";")[0], 16)
        except Exception:
            break
        i = nl + 2
        if n == 0:
            break
        out.extend(body[i:i + n])
        i += n + 2
    return bytes(out)
