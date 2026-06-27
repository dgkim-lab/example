#!/usr/bin/env bash
set -euo pipefail

# Basic Postfix setup for relaying mail through AWS SES SMTP.
# Create setup/env.sh from setup/env.example.sh
# and edit the values before running on the server.
#
# Equivalent /etc/postfix/main.cf settings applied by postconf:
#   relayhost = [${AWS_SMTP_HOST}]:${AWS_SMTP_PORT}
#   smtp_sasl_auth_enable = yes
#   smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
#   smtp_sasl_security_options = noanonymous
#   smtp_tls_security_level = encrypt
#   smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
#   smtp_generic_maps = hash:/etc/postfix/generic
#   inet_interfaces = loopback-only
#   mydestination = $myhostname, localhost.$mydomain, localhost

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/env.sh}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create it from $SCRIPT_DIR/env.example.sh" >&2
  exit 2
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

AWS_SMTP_PORT="${AWS_SMTP_PORT:-587}"

for var in AWS_SMTP_HOST AWS_SMTP_USERNAME AWS_SMTP_PASSWORD AWS_SMTP_FROM; do
  if [[ -z "${!var:-}" ]]; then
    echo "$var is required in $ENV_FILE" >&2
    exit 2
  fi
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y postfix libsasl2-modules mailutils

postconf -e "relayhost = [${AWS_SMTP_HOST}]:${AWS_SMTP_PORT}"
postconf -e "smtp_sasl_auth_enable = yes"
postconf -e "smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd"
postconf -e "smtp_sasl_security_options = noanonymous"
postconf -e "smtp_tls_security_level = encrypt"
postconf -e "smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt"
postconf -e "smtp_generic_maps = hash:/etc/postfix/generic"
postconf -e "inet_interfaces = loopback-only"
postconf -e "mydestination = \$myhostname, localhost.\$mydomain, localhost"

cat >/etc/postfix/sasl_passwd <<EOF
[${AWS_SMTP_HOST}]:${AWS_SMTP_PORT} ${AWS_SMTP_USERNAME}:${AWS_SMTP_PASSWORD}
EOF

chmod 600 /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd

HOSTNAME_SHORT="$(hostname -s)"
HOSTNAME_FQDN="$(hostname -f 2>/dev/null || hostname)"

cat >/etc/postfix/generic <<EOF
root ${AWS_SMTP_FROM}
ubuntu ${AWS_SMTP_FROM}
root@localhost ${AWS_SMTP_FROM}
ubuntu@localhost ${AWS_SMTP_FROM}
root@${HOSTNAME_SHORT} ${AWS_SMTP_FROM}
ubuntu@${HOSTNAME_SHORT} ${AWS_SMTP_FROM}
root@${HOSTNAME_FQDN} ${AWS_SMTP_FROM}
ubuntu@${HOSTNAME_FQDN} ${AWS_SMTP_FROM}
EOF

postmap /etc/postfix/generic

systemctl restart postfix
systemctl enable postfix

echo "Postfix configured. Test with:"
echo "  echo test | mail -s 'postfix aws smtp test' root"
echo "  echo test | mail -s 'postfix aws smtp test' ubuntu"

