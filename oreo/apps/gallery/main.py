"""Gallery — flip through optimised photos, or read upload instructions.

The carousel always has one extra "ADD" tile at the end. Selecting it
opens a scrollable instruction panel that walks the user through dropping
a new picture in and re-flashing the badge.

Controls:
  LEFT / RIGHT   previous / next tile (photos + the ADD tile at the end)
  UP   / DOWN    scroll the instruction panel (when on the ADD tile)
  A              refresh the photo listing
  HOME           apps drawer
"""

import os as _os
import oreoOS
from oreoOS import api
from oreoOS import theme, widgets

SW = api.SCREEN_W
SH = api.SCREEN_H


_GALLERY_DIR = "apps/gallery/assets/optimized"


def _list_photos():
    """Both formats land here:
      .py    — laptop-optimised, baked at deploy time
      .r565  — uploaded over WiFi, written by oreoOS.http_server in the
               on-device-renderable binary format defined below.
    Returned names include their extension so _load_photo can dispatch."""
    try:
        out = []
        for f in _os.listdir(_GALLERY_DIR):
            if f.startswith("_"):
                continue
            if f.endswith(".py") or f.endswith(".r565"):
                out.append(f)
        out.sort()
        return out
    except OSError:
        return []


def _load_photo(name):
    """name is the full filename ('sunset.py' / 'upload_1234.r565').
    Dispatch on extension."""
    if name.endswith(".r565"):
        return _load_r565(_GALLERY_DIR + "/" + name)
    if name.endswith(".py"):
        stem = name[:-3]
        try:
            mod = __import__("apps.gallery.assets.optimized." + stem,
                             None, None, ["DATA", "W", "H"])
            return (bytearray(mod.DATA), mod.W, mod.H)
        except (ImportError, AttributeError):
            return None
    return None


def _load_r565(path):
    """Read a 6-byte header (magic + W + H, little-endian) and the
    following W*H*2 bytes of RGB565 pixel data. Mirrors the binary
    format the upload page produces in the browser canvas pipeline."""
    try:
        with open(path, "rb") as f:
            head = f.read(6)
            if len(head) < 6 or head[0] != 0x52 or head[1] != 0x35:
                return None
            w = head[2] | (head[3] << 8)
            h = head[4] | (head[5] << 8)
            if w <= 0 or h <= 0 or w > 320 or h > 320:
                return None
            data = f.read(w * h * 2)
        if len(data) < w * h * 2:
            return None
        return (bytearray(data), w, h)
    except Exception:
        return None


# Instruction text laid out as a list of (kind, payload). kind is "h"
# (heading), "b" (bullet), or "code" (monospace command). Centralised
# here so the panel renderer stays simple.
_HELP = [
    ("h",   "Add a new photo"),
    ("b",   "Drop a JPG or PNG into"),
    ("code","apps/gallery/assets/raw/"),
    ("b",   "Square images render best;"),
    ("b",   "max ~240x240 to fit the LCD."),
    ("h",   "Optimise it"),
    ("b",   "From the repo root run:"),
    ("code","python tools/optimize_assets.py"),
    ("code","         --app gallery"),
    ("b",   "This bakes each raw image into"),
    ("b",   "a tiny RGB565 .py module."),
    ("h",   "Flash the badge"),
    ("b",   "Plug in the badge over USB then:"),
    ("code","python tools/deploy.py"),
    ("b",   "The deploy script auto-skips"),
    ("b",   "unchanged files (use --force to"),
    ("b",   "push everything)."),
    ("h",   "On the badge"),
    ("b",   "Open Gallery, press A to refresh"),
    ("b",   "the listing. New photos appear"),
    ("b",   "in alphabetical order."),
]


def _wrap_help(text, max_chars):
    """Greedy word-wrap for the ADD-tile help splash.

    Splits `text` into a list of lines, each no longer than `max_chars`
    characters. Breaks on whitespace; if a single word is longer than
    `max_chars`, hard-truncates that word across multiple lines (rare —
    only happens on URLs etc., and our _HELP corpus avoids them).
    Mirrors apps/reader/main.py's _wrap_help; the two splashes are
    intentionally a family so the same word-wrap behaviour applies.
    """
    if max_chars <= 0:
        return [text]
    out  = []
    rest = text.split()
    cur  = ""
    while rest:
        w    = rest[0]
        cand = (cur + " " + w) if cur else w
        if len(cand) <= max_chars:
            cur = cand
            rest.pop(0)
            continue
        if cur:
            out.append(cur)
            cur = ""
            continue
        out.append(w[:max_chars])
        rest[0] = w[max_chars:]
    if cur:
        out.append(cur)
    return out or [""]


class App(oreoOS.App):
    name         = "Gallery"
    author       = "Circuit-Overtime"
    # _list_photos() + first-photo decode walks assets/optimized/ and
    # imports each baked RGB565 module. Cold-launch on a populated
    # gallery is in the 400-800 ms range — without the splash, the user
    # stares at the previous app's frame until the first photo lands.
    # Matches the pattern already used by Storage / Reader / Settings.
    SHOW_LOADING = True

    def on_enter(self, os):
        self._os    = os
        self._names = _list_photos()
        self._idx   = 0
        self._scroll = 0
        self._cache = {}
        self._dirty = True

    def _is_add_tile(self):
        return self._idx == len(self._names)

    def _photo(self, idx):
        name = self._names[idx]
        if name not in self._cache:
            self._cache[name] = _load_photo(name)
        return self._cache.get(name)

    def on_button_press(self, btn):
        total = len(self._names) + 1     # photos + ADD tile
        if btn == api.BTN_LEFT:
            self._idx = (self._idx - 1) % total
            self._scroll = 0
            self._dirty = True
        elif btn == api.BTN_RIGHT:
            self._idx = (self._idx + 1) % total
            self._scroll = 0
            self._dirty = True
        elif btn == api.BTN_UP and self._is_add_tile():
            self._scroll = max(0, self._scroll - 1)
            self._dirty = True
        elif btn == api.BTN_DOWN and self._is_add_tile():
            self._scroll = min(self._scroll + 1, max(0, len(_HELP) - 1))
            self._dirty = True
        elif btn == api.BTN_A:
            # Refresh listing (e.g., after dropping new photos on the FS)
            self._names = _list_photos()
            self._cache = {}
            self._idx   = 0
            self._scroll = 0
            self._dirty = True

    def update(self, dt):
        pass

    def draw(self, d):
        if not self._dirty:
            return
        d.clear(theme.BG)
        widgets.draw_header(d, "GALLERY")
        if self._is_add_tile():
            widgets.draw_hint(d, "UP/DOWN=scroll  L/R=back")
        else:
            widgets.draw_hint(d, "L/R=prev/next  A=refresh")

        # n/n counter inside the header bar (right-aligned). ADD tile counts
        # too so the user knows there's something after the last photo.
        total   = len(self._names) + 1
        idx_str = "%d/%d" % (self._idx + 1, total)
        d.text(idx_str, SW - len(idx_str) * 8 - 6,
               (widgets.HEADER_H - 8) // 2, api.WHITE)

        if self._is_add_tile():
            self._draw_add_tile(d)
        else:
            self._draw_photo(d)

        self._dirty = False

    # ── photo render ─────────────────────────────────────────────────────
    def _draw_photo(self, d):
        ph = self._photo(self._idx)
        ay = widgets.HEADER_H + 8
        ah = SH - widgets.HEADER_H - widgets.HINT_H - 16
        if ph:
            data, pw, phh = ph
            px = (SW - pw) // 2
            py = ay + (ah - phh) // 2
            d.blit(data, px, py, pw, phh)
        else:
            d.text("broken photo", (SW - 12 * 16) // 2, ay + 40,
                   theme.MUTED, scale=2)

        # ◀ / ▶ chevrons on the edges so the user knows the carousel cycles.
        # The carousel always wraps (includes the ADD tile), so both sides
        # are always navigable — render both arrows unconditionally.
        ar_y = ay + ah // 2 - 8
        d.text("<", 4,      ar_y, theme.PRIMARY, scale=2)
        d.text(">", SW - 18, ar_y, theme.PRIMARY, scale=2)

    # ── ADD tile: scrollable instructions ────────────────────────────────
    def _draw_add_tile(self, d):
        # Cream card filling the play area.
        card_x = 10
        card_y = widgets.HEADER_H + 4
        card_w = SW - 20
        card_h = SH - widgets.HEADER_H - widgets.HINT_H - 8
        d.rect(card_x + 2, card_y + 2, card_w, card_h, theme.MUTED2, fill=True)
        d.rect(card_x,     card_y,     card_w, card_h, theme.CARD,   fill=True)
        d.rect(card_x,     card_y,     card_w, 3,      theme.PRIMARY, fill=True)

        # Pink "+" badge + heading. Slightly smaller (32 vs 36) so it
        # leaves more room for the instruction body below.
        bx, by, bsz = card_x + 10, card_y + 10, 32
        d.rect(bx, by, bsz, bsz, theme.PRIMARY, fill=True)
        d.rect(bx + bsz // 2 - 2, by + 5,            4, bsz - 10, api.WHITE, fill=True)
        d.rect(bx + 5,            by + bsz // 2 - 2, bsz - 10, 4, api.WHITE, fill=True)
        d.text("Add a photo",     bx + bsz + 10, by + 2,  theme.PRIMARY, scale=2)
        d.text("scroll UP / DOWN", bx + bsz + 10, by + 22, theme.MUTED)

        # Scrollable instructions. Uniform scale=1 across headings,
        # bullets and code so all three feel like one body of text;
        # visual hierarchy comes from colour + a gold underline on
        # headings + tinted background on code, not from font size.
        text_x   = card_x + 12
        inner_w  = card_w - 24
        list_y   = card_y + 10 + bsz + 12
        list_bot = card_y + card_h - 8

        LINE_H  = 12
        ROW_GAP = 6

        max_h_chars = inner_w // 8
        max_b_chars = (inner_w - 12) // 8
        max_c_chars = (inner_w - 12) // 8

        rows = _HELP[self._scroll:]
        cur_y = list_y
        rendered = 0
        for kind, payload in rows:
            if kind == "h":
                lines = _wrap_help(payload, max_h_chars)
                block_h = len(lines) * LINE_H + 4
                if cur_y + block_h > list_bot:
                    break
                if rendered > 0:
                    cur_y += ROW_GAP
                for line in lines:
                    d.text(line, text_x, cur_y, theme.PRIMARY, scale=1)
                    cur_y += LINE_H
                last_w = len(lines[-1]) * 8
                d.rect(text_x, cur_y - 2, last_w, 1, theme.GOLD, fill=True)
            elif kind == "b":
                lines = _wrap_help(payload, max_b_chars)
                block_h = len(lines) * LINE_H + 2
                if cur_y + block_h > list_bot:
                    break
                d.rect(text_x + 2, cur_y + 3, 3, 3, theme.PRIMARY, fill=True)
                for line in lines:
                    d.text(line, text_x + 10, cur_y,
                           theme.TEXT_BRIGHT, scale=1)
                    cur_y += LINE_H
            elif kind == "code":
                truncated = payload[:max_c_chars]
                if cur_y + LINE_H > list_bot:
                    break
                d.rect(text_x + 4, cur_y - 1, inner_w - 8, LINE_H,
                       theme.DOCK_SEL, fill=True)
                d.text(truncated, text_x + 8, cur_y + 1,
                       theme.TEAL, scale=1)
                cur_y += LINE_H + 1
            rendered += 1

        # Scroll indicators — small arrows on the right edge when more
        # content exists above / below the visible window.
        sx = card_x + card_w - 14
        if self._scroll > 0:
            d.text("^", sx, list_y - 12, theme.PRIMARY, scale=2)
        if self._scroll + rendered < len(_HELP):
            d.text("v", sx, list_bot - 12, theme.PRIMARY, scale=2)
