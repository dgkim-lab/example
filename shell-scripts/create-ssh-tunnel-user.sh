#!/usr/bin/env bash

# Example /etc/ssh/sshd_config block (replace tunneluser with the chosen name):
# Match User tunneluser
#     AllowTcpForwarding remote
#     PermitListen localhost:10022
#     PermitTTY no
#     X11Forwarding no
#     AllowAgentForwarding no
#
# Validate the configuration with "sshd -t", then reload the SSH service.

set -euo pipefail

die() {
    printf 'Error: %s\n' "$*" >&2
    exit 1
}

if (($# != 2)); then
    printf 'Usage: %s USERNAME PUBLIC_KEY_FILE\n' "${0##*/}" >&2
    exit 2
fi

username="$1"
public_key_file="$2"

[[ "$EUID" -eq 0 ]] || die "run this script as root (for example, with sudo)"
[[ "$username" =~ ^[a-z_][a-z0-9_-]*$ ]] || die "invalid username: $username"
[[ -r "$public_key_file" ]] || die "cannot read public key file: $public_key_file"
command -v ssh-keygen >/dev/null 2>&1 || die "ssh-keygen is required"

[[ ! -e "/home/$username" ]] || die "home directory already exists: /home/$username"
if getent passwd "$username" >/dev/null; then
    die "user already exists: $username"
fi

key_count=0
public_key=""
while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    key_count=$((key_count + 1))
    public_key="$line"
done < "$public_key_file"
[[ "$key_count" -eq 1 ]] || die "public key file must contain exactly one key"
ssh-keygen -lf "$public_key_file" >/dev/null || die "invalid public key file"

useradd --create-home --user-group --shell /usr/sbin/nologin "$username"
install -d -m 700 -o "$username" -g "$username" "/home/$username/.ssh"
printf 'restrict,port-forwarding,permitlisten="localhost:10022" %s\n' "$public_key" \
    > "/home/$username/.ssh/authorized_keys"
chown "$username:$username" "/home/$username/.ssh/authorized_keys"
chmod 600 "/home/$username/.ssh/authorized_keys"

printf 'Created SSH tunnel user "%s". Add the sshd_config block at the top of this script, replacing tunneluser with %s.\n' \
    "$username" "$username"
printf 'Connect with: ssh -N -R 10022:localhost:22 %s@<server>\n' "$username"
