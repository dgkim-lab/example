#!/usr/bin/env python3
import json
import os
import platform
import re
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


def read_text(path):
    try:
        return Path(path).read_text(encoding="utf-8").strip()
    except OSError:
        return None


def read_int(path):
    value = read_text(path)
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def run_command(args):
    try:
        return subprocess.check_output(args, text=True, stderr=subprocess.DEVNULL)
    except (OSError, subprocess.CalledProcessError):
        return ""


def first_existing_path(paths):
    for path in paths:
        if Path(path).exists():
            return path
    return paths[0]


def linux_sample():
    batteries = sorted(path for path in Path("/sys/class/power_supply").glob("BAT*") if path.is_dir())
    if not batteries:
        return None

    battery = batteries[0]
    status = read_text(battery / "status")
    voltage_now = read_int(battery / "voltage_now")
    current_now = read_int(battery / "current_now")
    power_now = read_int(battery / "power_now")
    charge_now = read_int(battery / "charge_now")
    charge_full = read_int(battery / "charge_full")
    charge_design = read_int(battery / "charge_full_design")
    energy_now = read_int(battery / "energy_now")
    energy_full = read_int(battery / "energy_full")
    energy_design = read_int(battery / "energy_full_design")

    sample = {
        "soc": read_int(battery / "capacity"),
        "status": status,
        "designed_capacity": micro_to_milli(charge_design),
        "current_capacity": micro_to_milli(charge_now),
        "full_capacity": micro_to_milli(charge_full),
        "current": signed_current_ma(current_now, status),
        "voltage": micro_to_milli(voltage_now) / 1000 if voltage_now is not None else None,
        "power": micro_to_milli(power_now) / 1000 if power_now is not None else None,
        "cycle_count": read_int(battery / "cycle_count"),
        "temperature": read_int(battery / "temp") / 10 if read_int(battery / "temp") is not None else None,
    }

    if sample["current_capacity"] is None and energy_now and voltage_now:
        sample["current_capacity"] = energy_to_mah(energy_now, voltage_now)
    if sample["full_capacity"] is None and energy_full and voltage_now:
        sample["full_capacity"] = energy_to_mah(energy_full, voltage_now)
    if sample["designed_capacity"] is None and energy_design and voltage_now:
        sample["designed_capacity"] = energy_to_mah(energy_design, voltage_now)

    add_health(sample)
    return sample


def macos_sample():
    ioreg = first_existing_path(("/usr/sbin/ioreg", "/usr/bin/ioreg", "ioreg"))
    output = run_command([ioreg, "-rn", "AppleSmartBattery"])
    if not output:
        return None

    values = {}
    for line in output.splitlines():
        match = re.search(r'"([^"]+)"\s+=\s+(.+)$', line.strip())
        if match:
            values[match.group(1)] = parse_ioreg_value(match.group(2))

    amperage = signed_int64(as_int(values.get("Amperage")))
    voltage = as_int(values.get("Voltage"))
    display_current = as_int(values.get("CurrentCapacity"))
    display_max = as_int(values.get("MaxCapacity"))
    current_capacity = as_int(values.get("AppleRawCurrentCapacity"))
    full_capacity = as_int(values.get("AppleRawMaxCapacity"))
    designed_capacity = as_int(values.get("DesignCapacity"))
    temperature = as_int(values.get("Temperature"))

    if current_capacity is None and looks_like_mah(display_current, designed_capacity):
        current_capacity = display_current
    if full_capacity is None and looks_like_mah(display_max, designed_capacity):
        full_capacity = display_max

    sample = {
        "soc": percent(display_current, display_max),
        "status": macos_status(values),
        "designed_capacity": designed_capacity,
        "current_capacity": current_capacity,
        "full_capacity": full_capacity,
        "current": amperage,
        "voltage": voltage / 1000 if voltage is not None else None,
        "power": abs(amperage * voltage) / 1000000 if amperage is not None and voltage is not None else None,
        "cycle_count": as_int(values.get("CycleCount")),
        "temperature": temperature / 100 if temperature is not None else None,
    }
    add_health(sample)
    return sample


def parse_ioreg_value(value):
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1]
    if value in ("Yes", "No"):
        return value == "Yes"
    try:
        return int(value)
    except ValueError:
        return value


def macos_status(values):
    if values.get("ExternalConnected") and values.get("IsCharging"):
        return "Charging"
    if values.get("ExternalConnected"):
        return "Not Charging"
    return "Discharging"


def signed_int64(value):
    if value is None:
        return None
    if value >= 2**63:
        return value - 2**64
    return value


def looks_like_mah(value, designed_capacity):
    if value is None:
        return False
    if designed_capacity is None:
        return value > 100
    return value > 100 and value <= designed_capacity * 2


def micro_to_milli(value):
    return value // 1000 if value is not None else None


def signed_current_ma(current_microamps, status):
    current_ma = micro_to_milli(current_microamps)
    if current_ma is None:
        return None
    if status and status.lower() == "discharging":
        return -abs(current_ma)
    return current_ma


def energy_to_mah(energy_microwh, voltage_microv):
    if not energy_microwh or not voltage_microv:
        return None
    return round((energy_microwh / voltage_microv) * 1000)


def percent(value, total):
    if value is None or not total:
        return None
    return round((value / total) * 100, 2)


def as_int(value):
    return value if isinstance(value, int) else None


def add_health(sample):
    health = percent(sample.get("full_capacity"), sample.get("designed_capacity"))
    if health is not None:
        sample["health"] = health


def collect_sample():
    if sys.platform.startswith("linux"):
        sample = linux_sample()
    elif sys.platform == "darwin":
        sample = macos_sample()
    else:
        sample = None

    if not sample:
        raise RuntimeError(f"no supported battery metrics found for {platform.system()}")

    return {key: value for key, value in sample.items() if value is not None}


def slug(value):
    return re.sub(r"[^a-z0-9_]+", "_", value.lower()).strip("_")


def sensor_definitions(device_id):
    prefix = f"sensor.{slug(device_id)}_battery"
    return {
        "soc": (f"{prefix}_soc", "%", "battery", "measurement", "Battery SoC"),
        "health": (f"{prefix}_health", "%", None, "measurement", "Battery Health"),
        "designed_capacity": (f"{prefix}_designed_capacity", "mAh", None, "measurement", "Battery Designed Capacity"),
        "current_capacity": (f"{prefix}_current_capacity", "mAh", None, "measurement", "Battery Current Capacity"),
        "full_capacity": (f"{prefix}_full_capacity", "mAh", None, "measurement", "Battery Full Capacity"),
        "current": (f"{prefix}_current", "mA", "current", "measurement", "Battery Current"),
        "voltage": (f"{prefix}_voltage", "V", "voltage", "measurement", "Battery Voltage"),
        "power": (f"{prefix}_power", "W", "power", "measurement", "Battery Power"),
        "cycle_count": (f"{prefix}_cycle_count", None, None, "measurement", "Battery Cycle Count"),
        "temperature": (f"{prefix}_temperature", "°C", "temperature", "measurement", "Battery Temperature"),
        "status": (f"{prefix}_status", None, None, None, "Battery Status"),
    }


def post_state(entity_id, state, attrs):
    ha_url = os.environ["HA_URL"].rstrip("/")
    token = os.environ["HA_TOKEN"]
    payload = json.dumps({"state": str(state), "attributes": attrs}).encode("utf-8")
    request = urllib.request.Request(
        f"{ha_url}/api/states/{entity_id}",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        response.read()


def send_to_homeassistant(sample):
    device_id = os.getenv("BATTERY_MONITOR_DEVICE_ID") or socket.gethostname()
    hostname = socket.gethostname()
    os_name = platform.platform()
    sent = []
    for metric, value in sample.items():
        definition = sensor_definitions(device_id).get(metric)
        if not definition:
            continue
        entity_id, unit, device_class, state_class, label = definition
        attrs = {
            "friendly_name": f"{device_id} {label}",
            "device_id": device_id,
            "hostname": hostname,
            "os_name": os_name,
        }
        if unit:
            attrs["unit_of_measurement"] = unit
        if device_class:
            attrs["device_class"] = device_class
        if state_class:
            attrs["state_class"] = state_class
        post_state(entity_id, value, attrs)
        sent.append(entity_id)
    return sent


def main():
    if "HA_URL" not in os.environ or "HA_TOKEN" not in os.environ:
        print("HA_URL and HA_TOKEN are required", file=sys.stderr)
        return 2

    sample = collect_sample()
    if os.getenv("BATTERY_MONITOR_DRY_RUN") == "1":
        print(json.dumps(sample, indent=2, sort_keys=True))
        return 0

    for attempt in range(3):
        try:
            sent = send_to_homeassistant(sample)
            print(f"sent {len(sent)} Home Assistant sensors")
            return 0
        except urllib.error.URLError as err:
            if attempt == 2:
                print(f"failed to send metrics: {err}", file=sys.stderr)
                return 1
            time.sleep(2**attempt)

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
