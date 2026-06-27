#!/bin/bash
#
# This script is used to notify system admin when user accesses this server via ssh session
#
# Usage
#
# 1. Create slack access token according to slack documentation.
# 2. Copy `env.example.sh` to `env.sh` in the same directory and update
#    `SLACK_TOKEN` and `SLACK_CHANNEL`
# 3. Copy this script, `env.sh`, and `env.example.sh` to `/etc/pam.scripts/`
# 4. Add following line at the bottom of `/etc/pam.d/sshd` (of course, without backtick ```)
# ```
# session required pam_exec.sh /etc/pam.scripts/noti_slack.sh
# ```
#

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/env.sh"
SLACK_URL=https://slack.com/api/chat.postMessage

if [ ! -f "$ENV_FILE" ]; then
	echo "Missing env file: $ENV_FILE" >&2
	echo "Create it from $SCRIPT_DIR/env.example.sh" >&2
	exit 0
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

if [ -z "${SLACK_TOKEN:-}" ] || [ -z "${SLACK_CHANNEL:-}" ]; then
	echo "SLACK_TOKEN and SLACK_CHANNEL must be set in $ENV_FILE" >&2
	exit 0
fi


NOW=$(date '+%Y-%m-%d %H:%M:%S')
#SYS_INFO=$(uname -snrmo)
SYS_INFO=$(uname -mo)

PAYLOAD=$(cat <<EOF
{
  "channel": "$SLACK_CHANNEL",
  "text": "🔐 ${HOSTNAME} *SSH Login Notification*",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*${HOSTNAME}* | New SSH login detected"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*User:* \`$PAM_USER\`" },
        { "type": "mrkdwn", "text": "*Source IP:* \`$PAM_RHOST\`" },
        { "type": "mrkdwn", "text": "*Service:* \`$PAM_SERVICE\`" },
        { "type": "mrkdwn", "text": "*TTY:* \`$PAM_TTY\`" }
      ]
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "📅 *Time:* $NOW  |  💻 *System:* $SYS_INFO" }
      ]
    }
  ]
}
EOF
)

if [ "x${PAM_TYPE}" = "xopen_session" ]; then
	if ! curl --silent --show-error --fail \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer ${SLACK_TOKEN}" \
		-X POST "$SLACK_URL" \
		-d "$PAYLOAD"; then
		echo "Failed to send Slack notification" >&2
	fi
fi

exit 0
