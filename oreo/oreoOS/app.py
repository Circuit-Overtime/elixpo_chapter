class App:
    """Base class for Lix OS apps.

    Lifecycle: on_enter -> (update + draw)* -> on_exit
    Subclass and override any of: on_enter, update, draw, on_exit,
    on_button_press, on_button_release.
    """

    name = "unnamed"

    def on_enter(self, os):
        self.os = os

    def on_exit(self):
        pass

    def update(self, dt):
        """Per-frame state update. dt = seconds since last frame."""

    def draw(self, display):
        """Per-frame rendering. Don't call display.present() — the OS does that."""

    def on_button_press(self, btn):
        pass

    def on_button_release(self, btn):
        pass
