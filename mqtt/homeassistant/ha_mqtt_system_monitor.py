import json
import os
import time

import paho.mqtt.client as mqtt
import psutil
from dotenv import load_dotenv


load_dotenv()


MQTT_HOST = os.getenv("MQTT_HOST", "homeassistant.local")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")

DEVICE_ID = os.getenv("DEVICE_ID", "python_system_monitor")
DEVICE_NAME = os.getenv("DEVICE_NAME", "Python System Monitor")
BASE_TOPIC = f"home/{DEVICE_ID}"


def publish_json(client, topic, payload, retain=False):
    message = json.dumps(payload)
    client.publish(topic, message, retain=retain)

    print(f"Published topic: {topic}")
    print("Published payload:")
    print(json.dumps(payload, indent=2))


def publish_discovery(client):
    device = {
        "identifiers": [DEVICE_ID],
        "name": DEVICE_NAME,
        "manufacturer": "Custom",
        "model": "Python MQTT System Monitor",
    }

    sensors = [
        {
            "object_id": "cpu_usage",
            "name": "CPU Usage",
            "unit": "%",
            "device_class": None,
            "state_class": "measurement",
            "value_template": "{{ value_json.cpu_percent }}",
        },
        {
            "object_id": "memory_usage",
            "name": "Memory Usage",
            "unit": "%",
            "device_class": None,
            "state_class": "measurement",
            "value_template": "{{ value_json.memory_percent }}",
        },
        {
            "object_id": "memory_used",
            "name": "Memory Used",
            "unit": "MiB",
            "device_class": "data_size",
            "state_class": "measurement",
            "value_template": "{{ value_json.memory_used_mib }}",
        },
        {
            "object_id": "memory_available",
            "name": "Memory Available",
            "unit": "MiB",
            "device_class": "data_size",
            "state_class": "measurement",
            "value_template": "{{ value_json.memory_available_mib }}",
        },
    ]

    for sensor in sensors:
        config = {
            "name": sensor["name"],
            "unique_id": f"{DEVICE_ID}_{sensor['object_id']}",
            "state_topic": f"{BASE_TOPIC}/state",
            "value_template": sensor["value_template"],
            "unit_of_measurement": sensor["unit"],
            "state_class": sensor["state_class"],
            "entity_category": "diagnostic",
            "device": device,
        }

        if sensor["device_class"]:
            config["device_class"] = sensor["device_class"]

        topic = f"homeassistant/sensor/{DEVICE_ID}/{sensor['object_id']}/config"
        publish_json(client, topic, config, retain=True)


def read_system_state():
    memory = psutil.virtual_memory()

    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": memory.percent,
        "memory_used_mib": round(memory.used / 1024 / 1024, 1),
        "memory_available_mib": round(memory.available / 1024 / 1024, 1),
    }


def on_connect(client, userdata, flags, reason_code, properties=None):
    print("Connected:", reason_code)
    publish_discovery(client)


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
if MQTT_USER:
    client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
client.on_connect = on_connect

client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_start()

try:
    while True:
        state = read_system_state()
        publish_json(client, f"{BASE_TOPIC}/state", state, retain=True)
        time.sleep(10)

except KeyboardInterrupt:
    client.loop_stop()
    client.disconnect()
