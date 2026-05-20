# Example app

A minimal, working Oreo OS app you can copy as a starting point. It draws
a header, listens for **A / B** button presses, and increments a counter.

Use it as a reference for the lifecycle methods, the framebuffer drawing
calls, and the asset pipeline conventions.

---

## 1. Create your app

```bash
cp -r templates/example_app apps/my_app
```

Folder layout that the OS scans for:

```
apps/my_app/
├── __init__.py        ← empty, just makes the folder a package
├── main.py            ← your App class
├── manifest.json      ← name, version, author, icon
└── assets/            ← (optional) sprites + photos
    ├── raw/           ← source PNGs you commit
    └── optimized/     ← generated .py modules — loaded at runtime
```

The launcher discovers an app by looking for `manifest.json` + `main.py`
under `apps/<name>/`. The Python class **must be named `App`** and **must
subclass `oreoOS.App`**.

## 2. Edit the manifest

```json
{
  "name": "My App",
  "type": "app",
  "version": "0.1",
  "icon": "my_app_icon.png",
  "author": "your-github-handle"
}
```

`author` lands on the loading screen as "By @author" when `SHOW_LOADING =
True`. `icon` is the file name (without path) of a 32×32 PNG dropped into
`assets/icons/raw/` — run `python tools/optimize_assets.py my_app_icon`
to bake it.

## 3. App lifecycle

```python
class App(oreoOS.App):
    name         = "My App"      # shown in the menu / loading screen
    SHOW_LOADING = False         # set True for slow on_enter (>200 ms)

    def on_enter(self, os):      # once, on launch
        super().on_enter(os)

    def on_exit(self):           # once, on HOME exit — save state here
        pass

    def update(self, dt):        # every frame; dt = seconds since last frame
        pass

    def draw(self, d):           # every frame; do NOT call d.present()
        pass

    def on_button_press(self, btn):
        pass

    def on_button_release(self, btn):
        pass
```

Set `self._dirty = True` whenever a redraw is needed and gate `draw()`
on it — re-flushing the framebuf to the display is the most expensive
thing in a frame.

## 4. Buttons

```python
api.BTN_A    api.BTN_B    api.BTN_C
api.BTN_UP   api.BTN_DOWN api.BTN_LEFT  api.BTN_RIGHT
api.BTN_HOME
```

HOME is intercepted by the OS and routes to the apps drawer; an app
never receives it in `on_button_press`. If your app needs HOME (e.g. for
a custom exit gesture), implement `on_home_press(self)` and return
`True` to suppress the default routing.

## 5. Drawing

```python
d.clear(color)                        # fill the framebuffer
d.rect(x, y, w, h, color, fill=True)  # filled or outline rect
d.pixel(x, y, color)                  # one pixel
d.text("hi", x, y, color, scale=1)    # framebuf 8×8 — scale stretches it
d.blit(data, x, y, w, h)              # RGB565 bytearray sprite
```

For nicer typography use the bitmap font:

```python
from oreoOS import pixelfont
font = pixelfont.load("pixelify_16")
font.text(d, "HELLO", 10, 20, oreoOS.api.WHITE)
```

For colours, prefer the theme module so your app matches the OS palette:

```python
from oreoOS import theme
d.clear(theme.BG)
d.text("hi", 0, 0, theme.PRIMARY)
```

## 6. Assets

Drop source images / PNGs into `assets/raw/`, then bake them:

```bash
# Per-app sprites listed in tools/optimize_assets.py:PER_APP_SIZES
python tools/optimize_assets.py --app my_app
```

The optimiser writes `assets/optimized/<name>.py` modules with
`W`, `H`, `DATA` (big-endian RGB565). Load them with:

```python
def _try_sprite(name):
    try:
        m = __import__("apps.my_app.assets.optimized." + name, None, None,
                       ["DATA", "W", "H"])
        return (bytearray(m.DATA), m.W, m.H)
    except (ImportError, AttributeError):
        return None
```

Transparency is done via chroma-key magenta (RGB565 `0xF81F`); the
optimiser fills cleared pixels with it, and `d.blit()` skips them.

## 7. Persistence

There's no NVS yet — write small state to flat files under your app dir:

```python
PATH = "apps/my_app/state.txt"

def _save(score):
    try:
        with open(PATH, "w") as f:
            f.write(str(int(score)))
    except OSError:
        pass
```

The whole `apps/my_app/` directory is on the device filesystem after
`tools/deploy.py`, so state writes survive reboots until you `--clean`
the device.

## 8. Test + deploy

```bash
python tools/deploy.py             # incremental flash; --force to re-push
```

On the badge, open the **Apps** drawer and pick your app. HOME takes you
back to the drawer, then HOME again to the home screen.

## 9. Common pitfalls

- **Don't call `d.present()`** — the OS does it once per frame.
- **Don't import `pygame` / `pillow`** — none of that ships on device.
- **Network calls are blocking.** Hide them behind `SHOW_LOADING = True`
  so the user sees the pink panel while `on_enter` runs.
- **`time.localtime()` reflects the configured timezone.** NTP is set
  in `oreoOS/launcher.py` at boot and shifted by `TIMEZONE_OFFSET` from
  `config.py`.
- **The framebuf is RGB565 big-endian.** Use `oreoOS.api.rgb(r, g, b)`
  to pack colours — never construct the integer by hand.
