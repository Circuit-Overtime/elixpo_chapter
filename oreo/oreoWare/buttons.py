"""Buttons backend — implements oreoOS.api.Buttons via INPUT_PULLUP GPIOs.

Edge detection (just_pressed / just_released) works against the *previous* frame,
so update() must be called exactly once per frame by the OS loop. Apps don't
call update() themselves — they receive a Buttons instance that's already up to
date.
"""

import time

from machine import Pin

from oreoOS import api
from oreoWare import pins


_BTN_TO_GPIO = {
    api.BTN_HOME:  pins.BTN_HOME,
    api.BTN_A:     pins.BTN_A,
    api.BTN_B:     pins.BTN_B,
    api.BTN_C:     pins.BTN_C,
    api.BTN_UP:    pins.BTN_UP,
    api.BTN_DOWN:  pins.BTN_DOWN,
    api.BTN_LEFT:  pins.BTN_LEFT,
    api.BTN_RIGHT: pins.BTN_RIGHT,
}


class Buttons(api.Buttons):
    def __init__(self):
        self._pins = {b: Pin(g, Pin.IN, Pin.PULL_UP) for b, g in _BTN_TO_GPIO.items()}
        self._curr = {b: 1 for b in _BTN_TO_GPIO}
        self._prev = {b: 1 for b in _BTN_TO_GPIO}
        # Press-timestamp tracking — used by the run loop to synthesize
        # long-press auto-repeat events for navigation buttons (so any
        # scrollable list "just works" with a held UP/DOWN). None means
        # the button is up; an int = time.ticks_ms() at press edge.
        self._press_ms = {b: None for b in _BTN_TO_GPIO}

    def update(self):
        now = time.ticks_ms()
        for b, p in self._pins.items():
            self._prev[b] = self._curr[b]
            v = p.value()
            self._curr[b] = v
            if self._prev[b] == 1 and v == 0:
                # Falling edge — record the press timestamp.
                self._press_ms[b] = now
            elif v == 1:
                self._press_ms[b] = None

    def is_pressed(self, btn):
        return self._curr[btn] == 0

    def just_pressed(self, btn):
        return self._curr[btn] == 0 and self._prev[btn] == 1

    def just_released(self, btn):
        return self._curr[btn] == 1 and self._prev[btn] == 0

    def pressed_for_ms(self, btn):
        """Milliseconds the button has been held, or 0 if currently up.

        Read by the OS run loop to fire auto-repeat events on navigation
        buttons. Cheap to call every frame — pure arithmetic on the
        cached press timestamp.
        """
        t = self._press_ms.get(btn)
        if t is None:
            return 0
        return time.ticks_diff(time.ticks_ms(), t)
