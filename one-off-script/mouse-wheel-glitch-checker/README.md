# Mouse wheel glitch checker

This utility watches mouse-wheel events and reports direction changes.
An opposite tick is marked **GLITCH CANDIDATE** when it follows at least three
events in the other direction and arrives within 0.75 seconds of the previous
event.

## Run

```sh
python3 -m pip install pynput
python3 wheel_glitch_checker.py
```

On Wayland, use the Linux input backend instead:

```sh
python3 -m pip install evdev
python3 wheel_glitch_checker.py --backend evdev --verbose
```

If it reports multiple devices, list them and choose the one belonging to your
mouse:

```sh
python3 wheel_glitch_checker.py --list-devices
python3 wheel_glitch_checker.py --backend evdev --device /dev/input/event6 --verbose
```

The selected `/dev/input/eventX` must be readable. On many Linux systems this
means adding your account to the `input` group, then logging in again. Direct
evdev access is intentionally protected because it can observe input before
Wayland applications receive it.

To confirm that the program is receiving wheel events, use verbose mode:

```sh
python3 wheel_glitch_checker.py --verbose
```

You should see `wheel: up` or `wheel: down` for each event. In normal mode,
the program stays quiet during a steady roll and only prints reversals.

Tune the detector if needed:

```sh
python3 wheel_glitch_checker.py --min-events 2 --gap 1.0
```

Use `Ctrl-C` to stop. Every reversal is printed; only suspicious reversals
are labelled `GLITCH CANDIDATE`. The `pynput` listener may require accessibility
permission on macOS or input-device permission on Linux.

## Test

```sh
python3 -m unittest -v
```
