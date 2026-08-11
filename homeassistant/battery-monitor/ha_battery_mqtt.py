#!/usr/bin/env python3
import json
import os
import re
import socket
import subprocess
import sys

from ha_battery_monitor import collect_sample


def slug(value):
    return re.sub(r"[^a-z0-9_]+", "_", value.lower()).strip("_")


def mqtt_args(topic, payload, retain=False):
    args = [
        os.getenv("MOSQUITTO_PUB_BIN", "mosquitto_pub"),
        "-h",
        os.environ["MQTT_HOST"],
        "-p",
        os.getenv("MQTT_PORT", "1883"),
        "-t",
        topic,
        "-m",
        payload,
    ]
    username = os.getenv("MQTT_USERNAME", "")
    password = os.getenv("MQTT_PASSWORD", "")
    if username:
        args.extend(["-u", username])
    if password:
        args.extend(["-P", password])
    if retain:
        args.append("-r")
    return args


def publish(topic, payload, retain=False):
    subprocess.check_call(mqtt_args(topic, payload, retain=retain))


def metric_definitions():
    return {
        "soc": ("Battery SoC", "%", "battery", "measurement"),
        "health": ("Battery Health", "%", None, "measurement"),
        "designed_capacity": ("Battery Designed Capacity", "mAh", None, "measurement"),
        "current_capacity": ("Battery Current Capacity", "mAh", None, "measurement"),
        "full_capacity": ("Battery Full Capacity", "mAh", None, "measurement"),
        "current": ("Battery Current", "mA", "current", "measurement"),
        "voltage": ("Battery Voltage", "V", "voltage", "measurement"),
        "power": ("Battery Power", "W", "power", "measurement"),
        "cycle_count": ("Battery Cycle Count", None, None, "measurement"),
        "temperature": ("Battery Temperature", "°C", "temperature", "measurement"),
        "status": ("Battery Status", None, None, None),
    }


def discovery_payload(device_slug, device_id, state_topic, availability_topic, metric, label, unit, device_class, state_class):
    payload = {
        "name": label,
        "unique_id": f"{device_slug}_battery_{metric}",
        "state_topic": state_topic,
        "value_template": "{{ value_json." + metric + " }}",
        "availability_topic": availability_topic,
        "payload_available": "online",
        "payload_not_available": "offline",
        "device": {
            "identifiers": [device_slug],
            "name": device_id,
            "manufacturer": "battery-monitor-script",
        },
        "origin": {
            "name": "battery-monitor-script",
            "sw_version": "scratchpad",
        },
    }
    if unit:
        payload["unit_of_measurement"] = unit
    if device_class:
        payload["device_class"] = device_class
    if state_class:
        payload["state_class"] = state_class
    return payload


def publish_discovery(device_slug, device_id, state_topic):
    prefix = os.getenv("MQTT_DISCOVERY_PREFIX", "homeassistant").strip("/")
    for metric, definition in metric_definitions().items():
        label, unit, device_class, state_class = definition
        topic = f"{prefix}/sensor/{device_slug}/battery_{metric}/config"
        payload = discovery_payload(device_slug, device_id, state_topic, f"{os.getenv('MQTT_BASE_TOPIC', 'battery-monitor').strip('/')}/{device_slug}/availability", metric, label, unit, device_class, state_class)
        publish(topic, json.dumps(payload, separators=(",", ":")), retain=True)


def main():
    if "MQTT_HOST" not in os.environ:
        print("MQTT_HOST is required", file=sys.stderr)
        return 2

    device_id = os.getenv("BATTERY_MONITOR_DEVICE_ID") or socket.gethostname()
    device_slug = slug(device_id)
    base_topic = os.getenv("MQTT_BASE_TOPIC", "battery-monitor").strip("/")
    state_topic = f"{base_topic}/{device_slug}/state"
    availability_topic = f"{base_topic}/{device_slug}/availability"

    sample = collect_sample()
    state = {metric: sample[metric] for metric in metric_definitions() if metric in sample}

    if os.getenv("BATTERY_MONITOR_DRY_RUN") == "1":
        print(json.dumps({"state_topic": state_topic, "state": state}, indent=2, sort_keys=True))
        return 0

    publish_discovery(device_slug, device_id, state_topic)
    publish(availability_topic, "online", retain=True)
    publish(state_topic, json.dumps(state, separators=(",", ":")), retain=os.getenv("MQTT_RETAIN_STATE", "true").lower() == "true")
    print(f"published {len(state)} MQTT battery metrics")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
