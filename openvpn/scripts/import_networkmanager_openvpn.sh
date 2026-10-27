#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage: import_networkmanager_openvpn.sh [PROFILE.ovpn]

Import an OpenVPN profile into NetworkManager using nmcli.
If PROFILE.ovpn is omitted, ./some-vpn.ovpn is used.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$#" -gt 1 ]]; then
  usage >&2
  exit 2
fi

profile="${1:-some-vpn.ovpn}"

if [[ ! -f "$profile" ]]; then
  printf 'Error: OpenVPN profile not found: %s\n' "$profile" >&2
  exit 1
fi

if [[ ! -r "$profile" ]]; then
  printf 'Error: OpenVPN profile is not readable: %s\n' "$profile" >&2
  exit 1
fi

if ! command -v nmcli >/dev/null 2>&1; then
  printf '%s\n' \
    'Error: nmcli is not installed or is not in PATH.' \
    'Install NetworkManager, then run this script again.' >&2
  exit 127
fi

printf 'Importing %s into NetworkManager...\n' "$profile"

if ! import_output="$(nmcli connection import type openvpn file "$profile" 2>&1)"; then
  printf '%s\n' "$import_output" >&2
  printf '%s\n' \
    'OpenVPN import failed. Make sure the NetworkManager OpenVPN plugin is installed:' \
    '  Ubuntu/Debian: sudo apt install network-manager-openvpn' \
    '  CachyOS/Arch:  sudo pacman -S networkmanager-openvpn' >&2
  exit 1
fi

printf '%s\n' "$import_output"
printf '%s\n' 'The OpenVPN profile was added to NetworkManager.'
