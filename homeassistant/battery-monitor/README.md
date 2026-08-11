# Home Assistant Battery Monitor

Small scratchpad for sending laptop battery metrics directly to Home Assistant without the Battery Monitor server.

Two simple modes are included:

- REST API: posts one Home Assistant state per metric.
- MQTT discovery: publishes retained discovery configs and a JSON state payload.

## Setup

Copy the example env file:

```sh
cp .env.example .env
vi .env
```

## REST mode

Create a Home Assistant Long-Lived Access Token:

`Home Assistant > Profile > Security > Long-Lived Access Tokens`

Configure these in `.env`:

```sh
HA_URL=http://homeassistant.local:8123
HA_TOKEN=...
BATTERY_MONITOR_DEVICE_ID=example-mac
```

Run once:

```sh
set -a
. ./.env
set +a
python3 ha_battery_monitor.py
```

Install cron:

```sh
./install_cron.sh
```

## MQTT mode

Requires `mosquitto_pub` on the client machine.

macOS:

```sh
brew install mosquitto
```

Debian/Ubuntu:

```sh
sudo apt install mosquitto-clients
```

Configure these in `.env`:

```sh
MQTT_HOST=homeassistant.local
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
BATTERY_MONITOR_DEVICE_ID=example-mac
```

Run once:

```sh
set -a
. ./.env
set +a
python3 ha_battery_mqtt.py
```

Dry run:

```sh
set -a
. ./.env
set +a
BATTERY_MONITOR_DRY_RUN=1 python3 ha_battery_mqtt.py
```

Install cron:

```sh
./install_cron_mqtt.sh
```

## Sensors

Both modes expose these metrics when available:

- Battery SoC
- Battery health
- Designed capacity
- Current capacity
- Full capacity
- Charge/discharge current
- Voltage
- Power
- Cycle count
- Temperature
- Status

REST entity names look like:

```text
sensor.<device>_battery_soc
sensor.<device>_battery_voltage
```

MQTT uses discovery topics like:

```text
homeassistant/sensor/<device>/battery_soc/config
battery-monitor/<device>/state
```

Home Assistant docs:

- REST API: https://developers.home-assistant.io/docs/api/rest/
- MQTT: https://www.home-assistant.io/integrations/mqtt
