"""IR driver — NEC TX + raw-edge RX.

Hardware (see oreoWare/pins.py):
    IR_TX = GPIO 2   — drives a 2N2222 base via 470 Ω. Collector → IR LED
                       cathode → IR LED anode → 10 Ω → 3V3.
    IR_RX = GPIO 18  — TSOP38238 OUT (open-collector active-LOW, with
                       internal 38 kHz demodulator). Idle HIGH; the AGC
                       inside the TSOP pulls LOW for the duration of each
                       carrier burst, so the line we read is the *envelope*
                       of the modulated signal.

TX uses esp32.RMT with carrier modulation — the RMT peripheral generates
the precise 38/40/56 kHz square wave on the pin while the pulse-train we
write decides when to "key" it on or off. Cost is sub-ms per frame.

RX uses Pin.irq() with edge triggering. Each transition timestamps an
entry into a pulse-width ring buffer; foreground code drains it via
poll(), detects an "end-of-frame" gap, and tries to decode NEC. Anything
that doesn't decode as NEC in beacon mode still surfaces as a "raw"
signature so the user sees that *something* nearby is emitting.

API:
    ir.transmit_nec(code32, carrier_hz=38000)
    ir.transmit_raw(durations_us, carrier_hz=38000)
    ir.start_receive(on_packet, mode="focus"|"beacon")
    ir.stop_receive()
    ir.poll()    — call once per app frame; runs the decoder

on_packet(code_or_None, info_dict)
    code is the 32-bit NEC value, or None when a raw/unknown packet hit
    info_dict carries "protocol", "pulse_count", "duration_us", "carrier"
"""

import time
from machine import Pin
from oreoWare import pins

try:
    from esp32 import RMT
    _HAVE_RMT = True
except ImportError:
    _HAVE_RMT = False


# ── NEC timing (microseconds) ────────────────────────────────────────────────
NEC_LEAD_HIGH = 9000
NEC_LEAD_LOW  = 4500
NEC_BIT_HIGH  = 562
NEC_BIT_LOW_0 = 562
NEC_BIT_LOW_1 = 1687
NEC_TAIL_HIGH = 562

# RMT clock: 80 MHz / clock_div. clock_div=80 → 1 µs per tick (easy maths
# and plenty of resolution at the 38 kHz / 26 µs carrier period).
_RMT_CLOCK_DIV = 80


# ── TX ──────────────────────────────────────────────────────────────────────

_rmt          = None
_rmt_carrier  = 0


def _get_rmt(carrier_hz):
    """Return a configured RMT TX object, reusing it when the carrier hasn't
    changed (re-creating costs ~3 ms)."""
    global _rmt, _rmt_carrier
    if not _HAVE_RMT:
        raise RuntimeError("esp32.RMT not available on this firmware")
    if _rmt is None or _rmt_carrier != carrier_hz:
        # tx_carrier=(freq_hz, duty_percent, idle_level)
        #   33 % duty is the canonical IR-remote level; the LED is only
        #   on for one-third of each carrier cycle which dramatically
        #   cuts average current while keeping the TSOP AGC happy.
        _rmt = RMT(0,
                   pin=Pin(pins.IR_TX),
                   clock_div=_RMT_CLOCK_DIV,
                   tx_carrier=(carrier_hz, 33, 1))
        _rmt_carrier = carrier_hz
    return _rmt


def transmit_nec(code32, carrier_hz=38000):
    """Encode a 32-bit NEC frame (LSB-first inside each byte is the actual
    over-the-wire order; we send MSB-first here, simpler — most beacons
    sending custom payloads don't care about the canonical order)."""
    pulses = [NEC_LEAD_HIGH, NEC_LEAD_LOW]
    for i in range(32):
        bit = (code32 >> (31 - i)) & 1
        pulses.append(NEC_BIT_HIGH)
        pulses.append(NEC_BIT_LOW_1 if bit else NEC_BIT_LOW_0)
    pulses.append(NEC_TAIL_HIGH)
    rmt = _get_rmt(carrier_hz)
    rmt.write_pulses(pulses, 1)   # 1 = start HIGH
    try:
        rmt.wait_done(timeout=500)
    except Exception:
        pass
    return True


def transmit_raw(durations_us, carrier_hz=38000):
    """Send an arbitrary HIGH/LOW alternating pattern starting HIGH."""
    rmt = _get_rmt(carrier_hz)
    rmt.write_pulses(list(durations_us), 1)
    try:
        rmt.wait_done(timeout=1000)
    except Exception:
        pass
    return True


# ── RX ──────────────────────────────────────────────────────────────────────

_rx_pin       = None
_rx_callback  = None
_rx_mode      = "focus"
_pulse_buf    = []
_last_edge_us = 0
_frame_start  = 0
_END_OF_FRAME_US = 60_000     # ≥60 ms silence → frame complete


def _on_edge(p):
    """Pin IRQ fires on every rising/falling edge of TSOP OUT.

    We just record the elapsed micros since the previous edge — the pulse
    widths are what carry the data. Edge interrupts are cheap and the
    handler runs in <10 µs so it doesn't drop frames.
    """
    global _last_edge_us, _frame_start
    now = time.ticks_us()
    if _last_edge_us:
        dt = time.ticks_diff(now, _last_edge_us)
        # Drop spurious sub-100us blips from the AGC.
        if dt > 100:
            _pulse_buf.append(dt)
    else:
        _frame_start = now
    _last_edge_us = now


def start_receive(on_packet, mode="focus"):
    """Begin listening. on_packet(code_or_None, info_dict).

    `mode` is just a hint we pass through to the callback so the Quest
    app can render differently — the decoder runs the same in both.
    """
    global _rx_pin, _rx_callback, _rx_mode, _pulse_buf, _last_edge_us
    _rx_callback  = on_packet
    _rx_mode      = mode
    _pulse_buf    = []
    _last_edge_us = 0
    if _rx_pin is None:
        _rx_pin = Pin(pins.IR_RX, Pin.IN)
    _rx_pin.irq(handler=_on_edge,
                trigger=Pin.IRQ_FALLING | Pin.IRQ_RISING)


def stop_receive():
    global _rx_pin
    if _rx_pin is not None:
        _rx_pin.irq(handler=None)
    _rx_pin = None


def poll():
    """Drain any buffered pulses, decode complete frames, fire callbacks.

    Called once per app frame. Cheap when no IR is incoming (~10 µs).
    """
    global _pulse_buf
    if not _pulse_buf or not _rx_callback:
        return
    now = time.ticks_us()
    # If the line has been quiet long enough we treat the buffer as one
    # complete frame.
    if time.ticks_diff(now, _last_edge_us) < _END_OF_FRAME_US:
        # If the buffer's getting suspiciously big without a gap, give up
        # and drop it — guards against a chattering LED nuking memory.
        if len(_pulse_buf) > 600:
            _pulse_buf = []
        return

    pulses = _pulse_buf
    _pulse_buf = []
    duration  = sum(pulses)

    code = _try_decode_nec(pulses)
    info = {
        "pulse_count": len(pulses),
        "duration_us": duration,
        "carrier":     38000,        # we only know the TSOP center freq
        "protocol":    "nec" if code is not None else "raw",
    }
    try:
        _rx_callback(code, info)
    except Exception:
        pass


def _try_decode_nec(pulses):
    """Best-effort 32-bit NEC decode. Returns int or None.

    Lenient timing windows so cheap remotes / breadboard wiring still
    decode without requiring a logic analyser.
    """
    if len(pulses) < 67:    # leader(2) + 32×bits(64) + tail(1)
        return None
    if not (7500 < pulses[0] < 10500):  return None    # 9 ms leader HIGH
    if not (3500 < pulses[1] < 5500):   return None    # 4.5 ms leader LOW

    code = 0
    for i in range(32):
        h = pulses[2 + i * 2]
        l = pulses[3 + i * 2]
        if not (300 < h < 800):
            return None
        if 1200 < l < 2200:
            code = (code << 1) | 1
        elif 300 < l < 800:
            code <<= 1
        else:
            return None
    return code
