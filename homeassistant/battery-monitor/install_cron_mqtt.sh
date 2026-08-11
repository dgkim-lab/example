#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_FILE=${BATTERY_MONITOR_ENV_FILE:-$SCRIPT_DIR/.env}

if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

: "${MQTT_HOST:?MQTT_HOST is required}"

PYTHON_BIN=${PYTHON_BIN:-python3}
INTERVAL=${BATTERY_MONITOR_CRON_INTERVAL:-*/5 * * * *}
CRON_PATH=${BATTERY_MONITOR_CRON_PATH:-/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin}

quote_cron_value() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/%/\\%/g; s/'/'\\''/g")"
}

CRON_LINE="$INTERVAL PATH=$(quote_cron_value "$CRON_PATH") BATTERY_MONITOR_ENV_FILE=$(quote_cron_value "$ENV_FILE") $(quote_cron_value "$PYTHON_BIN") $(quote_cron_value "$SCRIPT_DIR/ha_battery_mqtt.py") >> /tmp/ha-battery-monitor-mqtt.log 2>&1"

(crontab -l 2>/dev/null | grep -v "$SCRIPT_DIR/ha_battery_mqtt.py" || true; printf '%s\n' "$CRON_LINE") | crontab -
printf 'installed cron entry for %s\n' "$SCRIPT_DIR/ha_battery_mqtt.py"
