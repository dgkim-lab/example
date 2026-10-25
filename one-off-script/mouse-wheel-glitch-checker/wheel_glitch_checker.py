#!/usr/bin/env python3
"""Detect suspicious mouse-wheel direction reversals.

The live mode uses pynput, but the detector itself is dependency-free so it
can be tested with recorded wheel events or used from another program.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Optional


@dataclass(frozen=True)
class WheelEvent:
    """A normalized wheel event. ``direction`` is +1 or -1."""

    timestamp: float
    direction: int


@dataclass(frozen=True)
class Reversal:
    """A direction change that may be caused by a faulty wheel encoder."""

    event: WheelEvent
    previous_direction: int
    preceding_same_direction_events: int
    suspicious: bool


class WheelGlitchDetector:
    """Identify reversals during a continuous one-direction wheel roll.

    A reversal is suspicious when it follows ``min_same_events`` events in
    the previous direction and the previous event was no more than
    ``max_gap`` seconds ago. This makes an isolated opposite tick visible
    without treating every deliberate change of direction as a glitch.
    """

    def __init__(
        self,
        max_gap: float = 0.75,
        min_same_events: int = 3,
        callback: Optional[Callable[[Reversal], None]] = None,
    ) -> None:
        if max_gap <= 0:
            raise ValueError("max_gap must be positive")
        if min_same_events < 1:
            raise ValueError("min_same_events must be at least 1")
        self.max_gap = max_gap
        self.min_same_events = min_same_events
        self.callback = callback
        self._last: Optional[WheelEvent] = None
        self._run_direction: Optional[int] = None
        self._run_count = 0

    def feed(self, direction: int, timestamp: Optional[float] = None) -> Optional[Reversal]:
        """Feed one vertical wheel direction and return a reversal if found."""
        if direction == 0:
            return None
        direction = 1 if direction > 0 else -1
        event = WheelEvent(time.monotonic() if timestamp is None else timestamp, direction)

        reversal = None
        if self._last is not None and direction != self._last.direction:
            gap = event.timestamp - self._last.timestamp
            suspicious = (
                self._run_direction == self._last.direction
                and self._run_count >= self.min_same_events
                and 0 <= gap <= self.max_gap
            )
            reversal = Reversal(event, self._last.direction, self._run_count, suspicious)
            if self.callback is not None:
                self.callback(reversal)

        if direction == self._run_direction:
            self._run_count += 1
        else:
            self._run_direction = direction
            self._run_count = 1
        self._last = event
        return reversal


def _format_reversal(reversal: Reversal) -> str:
    stamp = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    old = "up" if reversal.previous_direction > 0 else "down"
    new = "up" if reversal.event.direction > 0 else "down"
    label = "GLITCH CANDIDATE" if reversal.suspicious else "direction change"
    return (
        f"[{stamp}] {label}: {old} -> {new} "
        f"after {reversal.preceding_same_direction_events} same-direction event(s)"
    )


def _evdev_wheel_devices():
    """Return readable Linux input devices that expose a vertical wheel."""
    try:
        from evdev import InputDevice, ecodes, list_devices
    except ImportError as exc:
        raise RuntimeError(
            "Wayland/Linux mode requires evdev; install it with: "
            "python3 -m pip install evdev"
        ) from exc

    devices = []
    for path in list_devices():
        try:
            device = InputDevice(path)
            relative_axes = device.capabilities().get(ecodes.EV_REL, [])
            if ecodes.REL_WHEEL in relative_axes:
                devices.append(device)
            else:
                device.close()
        except (PermissionError, OSError):
            continue
    return devices


def _run_evdev(detector: WheelGlitchDetector, device_path: Optional[str], verbose: bool) -> None:
    from evdev import InputDevice, ecodes

    if device_path:
        try:
            devices = [InputDevice(device_path)]
        except (FileNotFoundError, PermissionError, OSError) as exc:
            raise RuntimeError(f"cannot open {device_path}: {exc}") from exc
    else:
        devices = _evdev_wheel_devices()

    if not devices:
        raise RuntimeError(
            "no accessible wheel device found. Run with --list-devices, "
            "then use --device /dev/input/eventX; you may need to be in the "
            "input group or grant read access to the device."
        )
    if len(devices) > 1 and not device_path:
        paths = ", ".join(f"{d.path} ({d.name})" for d in devices)
        for device in devices:
            device.close()
        raise RuntimeError(
            "multiple wheel devices found; choose one with --device:\n  " + paths
        )

    device = devices[0]
    print(f"Reading wheel events from {device.path} ({device.name}).", flush=True)
    try:
        for event in device.read_loop():
            if event.type != ecodes.EV_REL or event.code != ecodes.REL_WHEEL:
                continue
            direction = 1 if event.value > 0 else -1
            if verbose:
                label = "up" if direction > 0 else "down"
                print(f"wheel: {label} (raw dy={event.value})", flush=True)
            detector.feed(direction, event.timestamp())
    finally:
        device.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gap", type=float, default=0.75,
                        help="maximum seconds between events in a suspicious reversal (default: 0.75)")
    parser.add_argument("--min-events", type=int, default=3,
                        help="same-direction events required before a reversal (default: 3)")
    parser.add_argument("--verbose", action="store_true",
                        help="print every wheel event (useful for checking listener access)")
    parser.add_argument("--backend", choices=("auto", "pynput", "evdev"), default="auto",
                        help="event source; auto uses evdev on Wayland/Linux (default: auto)")
    parser.add_argument("--device",
                        help="Linux input device, for example /dev/input/event6 (evdev backend)")
    parser.add_argument("--list-devices", action="store_true",
                        help="list accessible Linux wheel devices and exit")
    args = parser.parse_args()

    if args.list_devices:
        try:
            devices = _evdev_wheel_devices()
        except RuntimeError as exc:
            parser.error(str(exc))
        if not devices:
            print("No accessible wheel devices found.")
        for device in devices:
            print(f"{device.path}\t{device.name}")
            device.close()
        return 0

    detector = WheelGlitchDetector(
        max_gap=args.gap,
        min_same_events=args.min_events,
        callback=lambda reversal: print(_format_reversal(reversal), flush=True),
    )

    print("Watching the mouse wheel. Press Ctrl-C to stop.")
    print(f"A reversal is a glitch candidate after {args.min_events} events within {args.gap:g}s.")

    use_evdev = args.backend == "evdev" or (
        args.backend == "auto" and sys.platform.startswith("linux") and os.environ.get("WAYLAND_DISPLAY")
    )
    if use_evdev:
        try:
            _run_evdev(detector, args.device, args.verbose)
        except KeyboardInterrupt:
            print("\nStopped.")
        except RuntimeError as exc:
            parser.error(str(exc))
        return 0

    try:
        from pynput import mouse
    except ImportError:
        parser.error("live mode requires pynput; install it with: python3 -m pip install pynput")

    def on_scroll(_x: int, _y: int, _dx: int, dy: int) -> None:
        if args.verbose and dy:
            direction = "up" if dy > 0 else "down"
            print(f"wheel: {direction} (raw dy={dy})", flush=True)
        detector.feed(dy)

    try:
        with mouse.Listener(on_scroll=on_scroll) as listener:
            listener.join()
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
