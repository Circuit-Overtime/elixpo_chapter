"""Example app — minimal counter to demo the Oreo OS app lifecycle.

Copy this folder to apps/<your-app>/ and start editing. See README.md
for the full lifecycle / drawing / asset reference.
"""

import oreoOS
from oreoOS import api, theme, widgets


class App(oreoOS.App):
    name         = "Example"
    SHOW_LOADING = False

    def on_enter(self, os):
        super().on_enter(os)
        self.counter = 0
        self._dirty  = True

    def on_exit(self):
        pass

    def on_button_press(self, btn):
        if btn == api.BTN_A:
            self.counter += 1
            self._dirty = True
        elif btn == api.BTN_B:
            self.counter -= 1
            self._dirty = True

    def update(self, dt):
        pass

    def draw(self, d):
        if not self._dirty:
            return
        d.clear(theme.BG)
        widgets.draw_header(d, "EXAMPLE")
        widgets.draw_hint  (d, "A=+1  B=-1  HOME=back")

        msg = "Counter: %d" % self.counter
        mw  = len(msg) * 16
        d.text(msg, (api.SCREEN_W - mw) // 2,
               (api.SCREEN_H - 16) // 2, theme.PRIMARY, scale=2)

        self._dirty = False
