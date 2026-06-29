#!/bin/bash

source /etc/openvpn/scripts/env.sh

NAME="${username:-${common_name:-unknown}}"
LOCAL_IP="${ifconfig_pool_remote_ip:-unknown}"
REMOTE_IP="${untrusted_ip:-unknown}"
BYTES_RECEIVED="${bytes_received:-0}"
BYTES_SENT="${bytes_sent:-0}"
DURATION="${time_duration:-0}"

HOSTNAME="$(getent hosts "$REMOTE_IP" | awk '{print $2}' | head -n1)"
HOSTNAME="${HOSTNAME:-unknown}"

FORMATTED_TIME="$(date '+%A, %B %d, %Y at %I:%M:%S %p')"

SUBJECT="${NAME} has disconnected from OPENVPN!"

MESSAGE="${FORMATTED_TIME}

An OpenVPN Client has disconnected.

Common Name: ${NAME}
Remote IP (DNS Name): ${REMOTE_IP} (${HOSTNAME})
Local IP: ${LOCAL_IP}

Bytes sent: ${BYTES_SENT}
Bytes received: ${BYTES_RECEIVED}
Duration: ${DURATION} sec.
"

curl -sS -X POST "https://slack.com/api/chat.postMessage" \
  -H "Authorization: Bearer ${SLACK_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "$(jq -n \
    --arg channel "$SLACK_CHANNEL" \
    --arg text "$SUBJECT
$MESSAGE" \
    '{channel: $channel, text: $text}')"

