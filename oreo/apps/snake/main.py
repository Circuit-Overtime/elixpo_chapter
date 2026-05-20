"""Snake — classic grid snake.

Landscape 320×240. Arena under the standard header. Cell-grid: 10 px cells.
INTRO → PLAY → OVER state machine, persistent hi-score in apps/snake/hiscore.txt.
"""

import oreoOS
from oreoOS import api
from oreoOS import theme, widgets

SW = api.SCREEN_W
SH = api.SCREEN_H

CELL       = 10
ARENA_X    = 0
ARENA_Y    = widgets.HEADER_H + 2
ARENA_W    = SW
ARENA_H    = SH - widgets.HEADER_H - widgets.HINT_H - 4
COLS       = ARENA_W // CELL
ROWS       = ARENA_H // CELL
STEP_SEC0  = 0.16      # start with 6 moves/sec; gets faster as you grow

HISCORE_PATH = "apps/snake/hiscore.txt"

def _load_hi():
    try:
        with open(HISCORE_PATH) as f:
            return int(f.read().strip() or "0")
    except Exception:
        return 0

def _save_hi(v):
    try:
        with open(HISCORE_PATH, "w") as f:
            f.write(str(v))
    except Exception:
        pass


# LCG so we don't depend on `random`
_seed = 1
def _rand():
    global _seed
    _seed = (_seed * 1103515245 + 12345) & 0x7FFFFFFF
    return _seed


INTRO, PLAY, OVER, PAUSE = 1, 2, 3, 4


def _load_bg():
    """Optional grid-arena bg sprite (apps/snake/assets/optimized/arena.py).
    Returns (data, w, h) or None — caller falls back to a solid card."""
    try:
        m = __import__("apps.snake.assets.optimized.arena", None, None,
                       ["DATA", "W", "H"])
        return (bytearray(m.DATA), m.W, m.H)
    except (ImportError, AttributeError):
        return None


def _load_food():
    """Bamboo food sprite (apps/snake/assets/optimized/food.py).
    Returns (bytearray, w, h) or None — caller draws a coloured rect instead."""
    try:
        m = __import__("apps.snake.assets.optimized.food", None, None,
                       ["DATA", "W", "H"])
        return (bytearray(m.DATA), m.W, m.H)
    except (ImportError, AttributeError):
        return None


def _dim_color(c):
    """Cheap rgb565 dim by halving R/G/B for the pause/over overlay."""
    r = ((c >> 11) & 0x1F) >> 1
    g = ((c >>  5) & 0x3F) >> 1
    b = ( c        & 0x1F) >> 1
    return (r << 11) | (g << 5) | b


class App(oreoOS.App):
    name = "Snake"

    def on_enter(self, os):
        self._os     = os
        self._state  = INTRO
        self._hi     = _load_hi()
        self._new_hi = False
        self._blink  = 0.0
        self._dirty  = True
        # INTRO state runs _draw_arena, which references self._snake and
        # self._food — initialise both BEFORE the first frame so we don't
        # AttributeError before _start() ever runs.
        mid_c = COLS // 2
        mid_r = ROWS // 2
        self._snake    = [(mid_c - i, mid_r) for i in range(4)]
        self._food     = (COLS // 4, mid_r)
        self._dir      = (1, 0)
        self._next_dir = self._dir
        self._step_left = STEP_SEC0
        self._step_sec  = STEP_SEC0
        self._score    = 0
        # Cache the food sprite once — chroma-keyed so the arena tile shows
        # through around the bamboo.
        self._food_sprite = _load_food()

    def _start(self):
        mid_c = COLS // 2
        mid_r = ROWS // 2
        self._snake = [(mid_c - i, mid_r) for i in range(4)]   # head first
        self._dir   = (1, 0)         # facing right
        self._next_dir = self._dir
        self._food   = self._random_food()
        self._step_left = STEP_SEC0
        self._step_sec  = STEP_SEC0
        self._score = 0
        self._state = PLAY
        self._dirty = True

    def _random_food(self):
        snake_set = set(self._snake)
        while True:
            c = _rand() % COLS
            r = _rand() % ROWS
            if (c, r) not in snake_set:
                return (c, r)

    def on_button_press(self, btn):
        if self._state == INTRO and btn == api.BTN_A:
            self._start(); return
        if self._state == OVER and btn == api.BTN_A:
            self._state = INTRO; self._dirty = True; return
        # B toggles pause while playing or already paused.
        if btn == api.BTN_B:
            if self._state == PLAY:
                self._state = PAUSE; self._dirty = True; return
            if self._state == PAUSE:
                self._state = PLAY;  self._dirty = True; return
        if self._state != PLAY:
            return
        # No 180° reversals
        dx, dy = self._dir
        if   btn == api.BTN_LEFT  and dx ==  0: self._next_dir = (-1,  0)
        elif btn == api.BTN_RIGHT and dx ==  0: self._next_dir = ( 1,  0)
        elif btn == api.BTN_UP    and dy ==  0: self._next_dir = ( 0, -1)
        elif btn == api.BTN_DOWN  and dy ==  0: self._next_dir = ( 0,  1)

    def update(self, dt):
        self._blink += dt
        if self._state != PLAY:
            return
        self._step_left -= dt
        if self._step_left > 0:
            return
        self._step_left += self._step_sec

        self._dir = self._next_dir
        dx, dy = self._dir
        hc, hr = self._snake[0]
        nc, nr = hc + dx, hr + dy

        # Wall collision
        if nc < 0 or nc >= COLS or nr < 0 or nr >= ROWS:
            self._die()
            return
        # Self collision
        if (nc, nr) in self._snake:
            self._die()
            return

        self._snake.insert(0, (nc, nr))
        if (nc, nr) == self._food:
            self._score += 1
            self._food = self._random_food()
            # Speed-up: shorten step time by 2% per food, floor 60 ms
            self._step_sec = max(0.06, self._step_sec * 0.97)
        else:
            self._snake.pop()
        self._dirty = True

    def _die(self):
        if self._score > self._hi:
            self._hi = self._score
            self._new_hi = True
            _save_hi(self._hi)
        else:
            self._new_hi = False
        self._state = OVER
        self._dirty = True

    # ── render ───────────────────────────────────────────────────────────
    def draw(self, d):
        # Render every frame for the blinking prompts; the arena is tiny so
        # full redraw is cheap.
        d.clear(theme.BG)
        widgets.draw_header(d, "SNAKE")

        if self._state == INTRO:
            self._draw_arena(d)
            self._dim_arena(d)
            self._draw_intro(d)
        elif self._state == PLAY:
            self._draw_arena(d)
            self._draw_hud(d, "%d" % self._score)
        elif self._state == PAUSE:
            self._draw_arena(d)
            self._draw_hud(d, "%d" % self._score)
            self._dim_arena(d)
            self._draw_paused(d)
        elif self._state == OVER:
            self._draw_arena(d)
            self._draw_hud(d, "%d" % self._score)
            self._dim_arena(d)
            self._draw_gameover(d)

        widgets.draw_hint(d, "A=start  B=pause  arrows=move")

    def _dim_arena(self, d):
        """Translucent-looking dim overlay using sparse scanlines (every other
        row of black). Cheap, gives the world a faded look behind the panel."""
        for y in range(ARENA_Y, ARENA_Y + ARENA_H, 2):
            d.rect(ARENA_X, y, ARENA_W, 1, api.rgb(0, 0, 0), fill=True)

    def _draw_paused(self, d):
        panel_w = 200
        panel_h = 76
        px = (SW - panel_w) // 2
        py = (SH - panel_h) // 2
        d.rect(px, py, panel_w, panel_h, theme.STATUS_BG, fill=True)
        d.rect(px, py, panel_w,  2,      theme.PRIMARY,   fill=True)
        d.text("PAUSED", px + (panel_w - 6 * 16) // 2, py + 14, api.WHITE, scale=2)
        if int(self._blink * 2) % 2 == 0:
            msg = "Press B to resume"
            d.text(msg, px + (panel_w - len(msg) * 8) // 2, py + 48, api.WHITE)

    def _draw_arena(self, d):
        # Arena background — tile the asset if available, else a flat panel.
        bg = _load_bg()
        if bg:
            data, bw, bh = bg
            y = ARENA_Y
            while y < ARENA_Y + ARENA_H:
                x = ARENA_X
                while x < ARENA_X + ARENA_W:
                    d.blit(data, x, y, bw, bh)
                    x += bw
                y += bh
        else:
            d.rect(ARENA_X, ARENA_Y, ARENA_W, ARENA_H, theme.CARD, fill=True)
        # Food — bamboo sprite (or coloured rect fallback before the
        # asset has been generated/optimised)
        fc, fr = self._food
        fx, fy = ARENA_X + fc * CELL, ARENA_Y + fr * CELL
        if self._food_sprite:
            fdata, fw, fh = self._food_sprite
            d.blit(fdata,
                   fx + (CELL - fw) // 2,
                   fy + (CELL - fh) // 2,
                   fw, fh)
        else:
            d.rect(fx + 1, fy + 1, CELL - 2, CELL - 2,
                   theme.PRIMARY, fill=True)
        # Snake body — head brighter
        for i, (c, r) in enumerate(self._snake):
            color = theme.TEAL if i == 0 else theme.GREEN
            d.rect(ARENA_X + c * CELL + 1, ARENA_Y + r * CELL + 1,
                   CELL - 2, CELL - 2, color, fill=True)

    def _draw_hud(self, d, score_str):
        d.text(score_str, SW - len(score_str) * 16 - 6, 6, api.WHITE, scale=2)

    def _draw_intro(self, d):
        # Centred title — white on the dimmed arena so it reads from across
        # the room. Title uses scale=3, glyph cell = 8 * 3 = 24 px wide.
        title = "SNAKE"
        d.text(title, (SW - len(title) * 24) // 2, 60, api.WHITE, scale=3)

        if self._hi:
            hi = "HIGH %d" % self._hi
            d.text(hi, (SW - len(hi) * 16) // 2, 104, theme.GOLD, scale=2)

        # Blink the prompt so it reads as a call-to-action.
        if int(self._blink * 2) % 2 == 0:
            msg = "Press A to start"
            d.text(msg, (SW - len(msg) * 16) // 2, 150, api.WHITE, scale=2)

    def _draw_gameover(self, d):
        # Full-width dark overlay band that crosses the entire arena, so the
        # GAME OVER message reads as an arcade-style "kill cam" rather than a
        # tiny popup floating above the snake.
        band_h = 120
        band_y = (SH - band_h) // 2
        # Dark backdrop with a soft inner card.
        d.rect(0,         band_y,         SW,        band_h, api.rgb(10, 14, 28), fill=True)
        d.rect(0,         band_y,         SW,        3,      theme.PRIMARY,       fill=True)
        d.rect(0,         band_y + band_h - 3, SW,   3,      theme.PRIMARY,       fill=True)

        # Massive scale=3 GAME OVER title in white — primary readable focus.
        title = "GAME OVER"
        d.text(title, (SW - len(title) * 24) // 2, band_y + 14,
               api.WHITE, scale=3)

        # Score + best on the same row so the eye groups them.
        score = "Score %d" % self._score
        if self._new_hi:
            note   = "NEW HIGH!"
            note_c = theme.GOLD
        else:
            note   = "Best %d" % self._hi
            note_c = theme.GOLD if self._hi else theme.MUTED
        d.text(score, (SW - len(score) * 16) // 2, band_y + 52,
               api.WHITE, scale=2)
        d.text(note,  (SW - len(note)  * 16) // 2, band_y + 76,
               note_c, scale=2)

        if int(self._blink * 2) % 2 == 0:
            msg = "Press A to retry"
            d.text(msg, (SW - len(msg) * 8) // 2, band_y + band_h - 18,
                   api.WHITE)
