#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 '<pattern>'" >&2
  exit 1
fi

pattern=$1

find . \
  \( -type d \( -name node_modules -o -name venv -o -name .venv \) -prune \) \
  -o \
  \( -type f -name "$pattern" -print \) \
  2>/dev/null
