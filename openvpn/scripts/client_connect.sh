#!/bin/bash

source /etc/openvpn/scripts/env.sh

SLACK_TOKEN="${SLACK_TOKEN}"
SLACK_CHANNEL="${SLACK_CHANNEL}"

NAME="${username:-${common_name:-unknown}}"
LOCAL_IP="${ifconfig_pool_remote_ip:-unknown}"
REMOTE_IP="${untrusted_ip:-unknown}"
HOSTNAME="$(getent hosts "$REMOTE_IP" | awk '{print $2}' | head -n1)"

if [ -z "$HOSTNAME" ]; then
  HOSTNAME="unknown"
fi

FORMATTED_TIME="$(date '+%A, %B %d, %Y at %I:%M:%S %p')"

SUBJECT="${NAME} has successfully connected via OPENVPN!"

MESSAGE="${FORMATTED_TIME}

An OpenVPN Client has connected.

Common Name: ${NAME}
Remote IP DNS Name: ${REMOTE_IP} (${HOSTNAME})
Local IP: ${LOCAL_IP}
"

curl -sS -X POST "https://slack.com/api/chat.postMessage" \
  -H "Authorization: Bearer ${SLACK_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "$(jq -n \
    --arg channel "$SLACK_CHANNEL" \
    --arg text "$SUBJECT
$MESSAGE" \
    '{channel: $channel, text: $text}')"

