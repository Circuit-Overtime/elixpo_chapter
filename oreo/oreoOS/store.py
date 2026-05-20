import gc
import os as _os
import time

try:
    import json as _json
except ImportError:
    _json = None
try:
    import socket as _socket
    import ssl    as _ssl
    _RAW_OK = True
except ImportError:
    _RAW_OK = False


def _bc(msg):
    """One-line USB-CDC breadcrumb — tail with `mpremote connect ...`
    while the Store app is open to see exactly where a hang lands."""
    try:
        print("[store] " + msg)
    except Exception:
        pass


def _http_get(url, accept_raw=False, timeout_s=4):
    """Tiny GET that returns the body as bytes (or None on failure).

    `accept_raw=True` flips the Accept header to application/vnd.github.raw
    so file fetches return the raw file body instead of JSON-wrapped
    base64. Used by the install path.
    """
    if not _RAW_OK:
        return None
    # Parse https://host[:port]/path
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

    accept = ("application/vnd.github.raw" if accept_raw
              else "application/vnd.github+json")

    s = None
    raw = None
    deadline = None
    try:
        import time as _t
        deadline = _t.ticks_add(_t.ticks_ms(), int(timeout_s * 1000) + 500)
    except Exception:
        pass

    auth_hdr = ""
    try:
        from oreoOS.config import GH_TOKEN as _TOK
        if _TOK:
            auth_hdr = "Authorization: Bearer " + _TOK + "\r\n"
    except Exception:
        pass

    try:
        _bc("  dns " + host)
        addr = _socket.getaddrinfo(host, port)[0][-1]
        _bc("  connect " + host + ":" + str(port))
        raw = _socket.socket()
        raw.settimeout(timeout_s)
        raw.connect(addr)
        _bc("  ssl handshake")
        s = _ssl.wrap_socket(raw, server_hostname=host)
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
        ) % (path, host, USER_AGENT, accept, auth_hdr)
        _bc("  write request")
        s.write(req.encode())

        _bc("  read body")
        buf = bytearray()
        while True:
            # Wallclock check — if we've blown our budget, bail no
            # matter what settimeout says.
            try:
                import time as _t2
                if deadline is not None and \
                   _t2.ticks_diff(deadline, _t2.ticks_ms()) <= 0:
                    _bc("  read deadline blown after %d bytes" % len(buf))
                    break
            except Exception:
                pass
            try:
                chunk = s.read(2048)
            except Exception as e:
                _bc("  read err: " + str(e))
                break
            if not chunk:
                break
            buf.extend(chunk)
            if len(buf) > 256 * 1024:
                break
    except Exception as e:
        _bc("http_get FAIL %s: %s" % (host, e))
        return None
    finally:
        for _h in (s, raw):
            try:
                if _h is not None:
                    _h.close()
            except Exception:
                pass

    # Split off the response head — body starts after \r\n\r\n.
    head_end = buf.find(b"\r\n\r\n")
    if head_end < 0:
        return None
    head = bytes(buf[:head_end])
    body = bytes(buf[head_end + 4:])

    # Parse the status line for breadcrumbs + 200-check.
    status = 0
    line0  = head.split(b"\r\n", 1)[0]
    parts  = line0.split(b" ", 2)
    if len(parts) >= 2:
        try: status = int(parts[1])
        except ValueError: status = 0
    if status != 200:
        _bc("http_get %s -> HTTP %d" % (host, status))
        return None

    # If the response was chunked (rare for github.com but defensive),
    # decode chunks. We detect it via Transfer-Encoding header.
    if b"\r\ntransfer-encoding: chunked" in (b"\r\n" + head.lower()):
        body = _dechunk(body)

    return body


def _dechunk(body):
    out = bytearray()
    i   = 0
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


# ── tunables ────────────────────────────────────────────────────────────

STORE_REPO   = "elixpo/oreo"
# Branch/tag/sha on the repo to pull the catalogue from. Defaults to
# `main`; override via oreoOS/config.py `STORE_REF = "feat/app-market"`
# while apps_market/ hasn't landed on main yet, otherwise the API
# returns 404 and the page shows an empty catalogue.
try:
    from oreoOS.config import STORE_REF as _CFG_REF
    STORE_REF = _CFG_REF
except Exception:
    STORE_REF = "main"
MARKET_PATH  = "apps_market"
CACHE_PATH   = "/store_cache.json"

T_API        = 6        # seconds — GitHub Contents API call
T_FILE       = 25       # seconds — raw-file download (per file)

USER_AGENT   = "OreoBadge-Store"
APPS_DIR     = "apps"


# In-memory mirror of the catalogue. Loaded lazily on first access.
_catalogue       = None
_cache_ms        = 0      # ticks_ms at last successful refresh
_last_refresh_ok = None   # True / False / None — never-tried | succeeded | failed
_last_error      = ""     # human-readable summary for the page


# ── filesystem helpers ──────────────────────────────────────────────────

def _exists(path):
    try:
        _os.stat(path); return True
    except OSError:
        return False


def _isdir(path):
    try:
        return (_os.stat(path)[0] & 0x4000) != 0
    except OSError:
        return False


def _ensure_dir(path):
    """mkdir -p — tolerates already-exists silently."""
    parts = path.split("/")
    cur = ""
    for p in parts:
        if not p:
            continue
        cur = cur + "/" + p if cur else p
        try:
            _os.mkdir(cur)
        except OSError:
            pass


def _rm_tree(path):
    """rm -rf — swallows errors so a partial uninstall doesn't hang."""
    try:
        for f in _os.listdir(path):
            child = path + "/" + f
            if _isdir(child):
                _rm_tree(child)
            else:
                try: _os.remove(child)
                except OSError: pass
        try: _os.rmdir(path)
        except OSError: pass
    except OSError:
        pass


# ── GitHub API wrappers ─────────────────────────────────────────────────

def _api(path):
    """GET https://api.github.com/repos/<repo>/contents/<path>?ref=<ref>.

    Records the last error into the module-level `_last_error` slot so
    the UI can surface a real reason ("404 on main — apps_market not
    merged?", "timeout", etc.) instead of a generic empty list.
    """
    global _last_error
    if not _RAW_OK or _json is None:
        _last_error = "no socket / json"
        return None
    url = ("https://api.github.com/repos/%s/contents/%s?ref=%s"
           % (STORE_REPO, _q(path), STORE_REF))
    _bc("API GET " + path + "@" + STORE_REF)
    body = _http_get(url, accept_raw=False, timeout_s=T_API)
    if body is None:
        _last_error = "api %s@%s timeout/error" % (path, STORE_REF)
        return None
    try:
        data = _json.loads(body.decode("utf-8"))
    except Exception as e:
        _last_error = "api parse: " + str(e)[:32]
        return None
    _bc("API OK %s (%d entries)" %
        (path, len(data) if isinstance(data, list) else 1))
    return data


def _walk(path):
    """Recursive list of every FILE under `path` in the repo. Returns
    [{path, download_url, size}] — used at install time."""
    out = []
    items = _api(path)
    if not isinstance(items, list):
        return out
    for it in items:
        if it.get("type") == "dir":
            out.extend(_walk(it["path"]))
        elif it.get("type") == "file":
            out.append({
                "path":         it["path"],
                "download_url": it.get("download_url") or "",
                "size":         it.get("size", 0),
            })
    return out


_STORE_ICONS_DIR = "/store_icons"


def _q(path):
    """Minimal URL-quoting for GitHub paths. We don't pull in urllib on
    device, and the only character we actually ship that needs encoding
    is the space ("Oreo Pet"). Anything more exotic in a dir name would
    need a real quote() — flag it here if we ever add it.
    """
    return path.replace(" ", "%20")


def _fetch_store_icon(name_dir, app_path, icon_filename):
    """Best-effort download of an app's optimized icon .py from GitHub
    so the Store card can render the real icon BEFORE the app is
    installed. Source path follows the project convention:
        apps_market/<dir>/assets/optimized/<icon_stem>.py
    Cached to /store_icons/<name_dir>.py. Silently no-ops on failure —
    the UI falls back to a letter glyph in that case.
    """
    if not icon_filename:
        return False
    stem = icon_filename.rsplit(".", 1)[0].replace("-", "_")
    dst  = _STORE_ICONS_DIR + "/" + name_dir + ".py"
    if _exists(dst):
        return True
    url = ("https://raw.githubusercontent.com/%s/%s/%s/assets/optimized/%s.py"
           % (STORE_REPO, STORE_REF, _q(app_path), stem))
    _bc("icon GET " + name_dir)
    body = _http_get(url, accept_raw=True, timeout_s=T_API)
    if body is None:
        return False
    _ensure_dir(_STORE_ICONS_DIR)
    try:
        with open(dst, "wb") as f:
            f.write(body)
        return True
    except Exception:
        return False


def load_store_icon(name_dir):
    """Read a cached store icon back as (data, w, h) — the UI hook for
    cards/details pages of apps that aren't installed yet."""
    path = _STORE_ICONS_DIR + "/" + name_dir + ".py"
    if not _exists(path):
        return None
    try:
        ns = {}
        with open(path) as f:
            exec(f.read(), ns)
        return (bytearray(ns["DATA"]), int(ns["W"]), int(ns["H"]))
    except Exception:
        return None


def installed_size(name_dir):
    """Sum of file sizes under /apps/<name>/, in bytes. 0 if not
    installed. Walks the dir each call — cheap on the tiny app trees
    we ship, and avoids stale cached numbers."""
    root = APPS_DIR + "/" + name_dir
    if not _exists(root):
        return 0
    total = 0
    stack = [root]
    while stack:
        d = stack.pop()
        try:
            for f in _os.listdir(d):
                p = d + "/" + f
                try:
                    st = _os.stat(p)
                except OSError:
                    continue
                if st[0] & 0x4000:
                    stack.append(p)
                else:
                    total += st[6]
        except OSError:
            pass
    return total


def _fetch_manifest(app_path):
    """Read the manifest.json for a single market app via the API."""
    if _json is None:
        return {}
    url = ("https://api.github.com/repos/%s/contents/%s/manifest.json?ref=%s"
           % (STORE_REPO, _q(app_path), STORE_REF))
    _bc("manifest GET " + app_path)
    body = _http_get(url, accept_raw=True, timeout_s=T_API)
    if body is None:
        return {}
    try:
        return _json.loads(body.decode("utf-8"))
    except Exception:
        return {}


# ── catalogue lifecycle ─────────────────────────────────────────────────

def _load_cache_from_disk():
    """Re-hydrate _catalogue from the on-flash JSON cache, if any."""
    global _catalogue, _cache_ms
    if not _exists(CACHE_PATH) or _json is None:
        return False
    try:
        with open(CACHE_PATH) as f:
            blob = _json.loads(f.read())
        _catalogue = blob.get("apps", []) or []
        _cache_ms  = int(blob.get("fetched_ms", 0))
        return True
    except Exception:
        return False


def _save_cache_to_disk():
    if _json is None:
        return
    try:
        with open(CACHE_PATH, "w") as f:
            f.write(_json.dumps({
                "fetched_ms": _cache_ms,
                "apps":       _catalogue or [],
            }))
    except Exception:
        pass


def refresh(force=False):
    """Pull a fresh catalogue from GitHub. Returns the new list (which
    may be empty if the network failed). On any failure, the in-memory
    cache is left untouched so the UI can fall back to stale entries.

    `force=True` is the API the Store app calls when the user presses
    A. Without force, repeated calls inside the same OS session reuse
    the in-memory copy.
    """
    global _catalogue, _cache_ms, _last_refresh_ok, _last_error
    # Truthy-only short-circuit. An *empty* cached list (left over from
    # a previous failed refresh) should NOT block a fresh API call —
    # otherwise the Store sits on "LOADING" forever because
    # _last_refresh_ok stays None and the classifier never advances.
    if not force and _catalogue:
        return _catalogue
    _bc("refresh START force=%s ref=%s" % (force, STORE_REF))

    # WiFi gate — same defensive check as the OTA path. If WiFi isn't
    # up, we don't even try to call the API; the local cache is the
    # only thing we can show.
    try:
        from oreoWare import wifi
        if not wifi.is_connected():
            if _catalogue is None:
                _load_cache_from_disk()
            _last_refresh_ok = False
            _last_error      = "wifi down"
            return _catalogue or []
    except Exception:
        pass

    _last_error = ""
    listing = _api(MARKET_PATH)
    if not isinstance(listing, list):
        if _catalogue is None:
            _load_cache_from_disk()
        _last_refresh_ok = False
        return _catalogue or []
    fresh = []
    for it in listing:
        if it.get("type") != "dir":
            continue
        name_dir = it.get("name", "")
        app_path = it.get("path", "")
        if not name_dir or not app_path:
            continue
        manifest = _fetch_manifest(app_path) or {}
        icon_file = manifest.get("icon") or ""
        # Pull the icon module bytes so the card can paint without the
        # app being installed. Best-effort — if it fails we just fall
        # back to the letter glyph in _draw_card.
        if icon_file:
            _fetch_store_icon(name_dir, app_path, icon_file)
        fresh.append({
            "dir":          name_dir,
            "name":         manifest.get("name", name_dir) or name_dir,
            "icon":         icon_file or None,
            "author":       manifest.get("author") or None,
            "description":  manifest.get("description", "") or "",
            "path":         app_path,
        })

    _catalogue       = fresh
    _last_refresh_ok = True
    for e in _catalogue:
        e["installed"] = is_installed(e["dir"])
    _invalidate_details()
    try:
        live = {e["dir"] + ".py" for e in _catalogue}
        for f in _os.listdir(_STORE_ICONS_DIR):
            if f.endswith(".py") and f not in live:
                try: _os.remove(_STORE_ICONS_DIR + "/" + f)
                except OSError: pass
    except OSError:
        pass
    try:
        _cache_ms = time.ticks_ms()
    except Exception:
        _cache_ms = 0
    _save_cache_to_disk()
    return _catalogue


def last_refresh_ok():
    """Tri-state: True / False / None (never tried this boot)."""
    return _last_refresh_ok


def last_error():
    return _last_error


# Per-app detail cache so repeatedly opening + closing the details page
# for the same app doesn't re-hit GitHub. Cleared by refresh().
_details_cache = {}


def get_details(name_dir):
    """Lazy fetch of the manifest + file listing for one market app.

    Returns a dict:
        {
            "name":       human display name from manifest, fallback dir
            "icon":       manifest 'icon' field (filename) or None
            "author":     manifest 'author' field or None
            "description": manifest 'description' field or "" (if any)
            "files":      [{path, download_url, size}, ...] for install()
            "bytes":      total bytes the install would download
            "ok":         True iff both API calls returned cleanly
        }

    Cached in-memory per OS session; the next refresh() invalidates
    every entry so a contributor pushing a manifest change can be
    picked up without rebooting.
    """
    if name_dir in _details_cache:
        return _details_cache[name_dir]
    cat = list_market()
    entry = None
    for e in cat:
        if e["dir"] == name_dir:
            entry = e
            break
    if not entry:
        return {"ok": False}

    # Disk-cache hit? Cached details mirror the manifest as of the last
    # refresh, so they're fine until refresh() wipes _details_cache.
    disk = _details_disk_load(name_dir)
    if disk and disk.get("ok"):
        _details_cache[name_dir] = disk
        return disk

    # No network call — refresh() already enriched the catalogue entry
    # with everything we need for the details page. The file-tree walk
    # is deferred to install() so opening details is instant after the
    # first catalogue load.
    out = {
        "name":         entry.get("name")        or name_dir,
        "icon":         entry.get("icon")        or None,
        "author":       entry.get("author")      or None,
        "description":  entry.get("description") or "",
        "files":        None,    # populated lazily by install()
        "bytes":        None,
        "ok":           True,
    }
    _details_cache[name_dir] = out
    _details_disk_save(name_dir, out)
    return out


# ── disk persistence for the per-app details cache ─────────────────────
# One small JSON file per app under /store_details/. Survives reboots
# so opening Store + tapping an app is instant after the first time.
_DETAILS_DIR = "/store_details"


def _details_disk_path(name_dir):
    return _DETAILS_DIR + "/" + name_dir + ".json"


def _details_disk_load(name_dir):
    if _json is None:
        return None
    try:
        with open(_details_disk_path(name_dir)) as f:
            return _json.loads(f.read())
    except Exception:
        return None


def _details_disk_save(name_dir, payload):
    if _json is None:
        return
    _ensure_dir(_DETAILS_DIR)
    try:
        with open(_details_disk_path(name_dir), "w") as f:
            f.write(_json.dumps(payload))
    except Exception:
        pass


def _details_disk_clear():
    try:
        for f in _os.listdir(_DETAILS_DIR):
            try: _os.remove(_DETAILS_DIR + "/" + f)
            except OSError: pass
    except Exception:
        pass


# When refresh() succeeds we wipe the per-app details cache so a
# contributor pushing a manifest update isn't masked by stale cache.
def _invalidate_details():
    _details_cache.clear()
    _details_disk_clear()


def list_market():
    """Read-only listing for the UI. Returns the in-memory catalogue
    (loading the disk cache on first call) and tags each entry with
    its current install state."""
    global _catalogue
    if _catalogue is None:
        if not _load_cache_from_disk():
            _catalogue = []
    for e in _catalogue:
        e["installed"] = is_installed(e["dir"])
    return _catalogue


def cache_age_ms():
    """ticks_diff from the last successful refresh, or None if no
    cache has been populated this boot."""
    if not _cache_ms:
        return None
    try:
        return time.ticks_diff(time.ticks_ms(), _cache_ms)
    except Exception:
        return None


# ── install / uninstall ─────────────────────────────────────────────────

def is_installed(name):
    """An app is 'installed' iff /apps/<name>/main.py exists."""
    return _exists(APPS_DIR + "/" + name + "/main.py")


def install(name):
    """Download every file under `apps_market/<name>/` on GitHub and
    write it to `apps/<name>/<relative>`. Returns True iff main.py
    landed cleanly.

    Network and storage errors are non-fatal per-file; the function
    keeps going so the user gets a partial install rather than a
    nothing-at-all failure (they can hit A again to retry).
    """
    if not _RAW_OK:
        return False
    # Find the catalogue entry first so we know the GitHub path. We
    # walk lazily here (NOT in get_details) so opening the details
    # page is cheap (one API call) — install is the user's explicit
    # "I want this" so the heavier walk is acceptable.
    cat = list_market()
    entry = None
    for e in cat:
        if e["dir"] == name:
            entry = e
            break
    if not entry:
        return False
    files = _walk(entry["path"])
    if not files:
        return False

    root_prefix = entry["path"] + "/"
    target_root = APPS_DIR + "/" + name

    for f in files:
        rel = f["path"]
        if not rel.startswith(root_prefix):
            continue
        rel = rel[len(root_prefix):]
        dst = target_root + "/" + rel
        parent = dst.rsplit("/", 1)[0] if "/" in dst else ""
        if parent:
            _ensure_dir(parent)
        _bc("install GET " + rel)
        body = _http_get(f["download_url"], accept_raw=False,
                         timeout_s=T_FILE)
        if body is None:
            continue
        try:
            with open(dst, "wb") as out:
                out.write(body)
        except Exception:
            pass
        gc.collect()

    # Post-install integrity check: the launcher's drawer skips any
    # app whose manifest.json is missing or unparseable, so a silent
    # failure here surfaces as "the app vanished from the drawer".
    # Verify and try to re-fetch once if the file is bad.
    mf_path = target_root + "/manifest.json"
    if _json is not None:
        ok_mf = False
        try:
            with open(mf_path) as f:
                _json.loads(f.read())
            ok_mf = True
        except Exception:
            ok_mf = False
        if not ok_mf:
            _bc("install manifest invalid, retrying")
            url = ("https://raw.githubusercontent.com/%s/%s/%s/manifest.json"
                   % (STORE_REPO, STORE_REF, _q(entry["path"])))
            body = _http_get(url, accept_raw=True, timeout_s=T_FILE)
            if body is not None:
                try:
                    with open(mf_path, "wb") as out:
                        out.write(body)
                except Exception:
                    pass

    return is_installed(name)


def uninstall(name):
    dst = APPS_DIR + "/" + name
    if not _exists(dst):
        return True
    _rm_tree(dst)
    return not _exists(dst)
