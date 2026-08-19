#!/usr/bin/env bash

SERVER=192.168.1.123
PORT=24800
CHECK_PORT=80
APP=org.deskflow.deskflow

INTERVAL=3
FAIL_THRESHOLD=3

fail_count=0

while sleep "$INTERVAL"; do

    # server 자체가 아직 안 살아났으면 기다림
    if ! nc -z -w1 "$SERVER" "$CHECK_PORT"; then
        fail_count=0
        continue
    fi

    # 정상적으로 Deskflow TCP connection이 있으면 OK
    if ss -Htn state established dst "$SERVER:$PORT" | grep -q .; then
        fail_count=0
        continue
    fi

    # server는 살아 있는데 client가 안 붙어 있음
    ((fail_count++))
    echo "fail_count $fail_count"

    if (( fail_count >= FAIL_THRESHOLD )); then
        echo "server reachable but Deskflow disconnected; restarting Flatpak"

        flatpak kill "$APP" 2>/dev/null
        sleep 1
        flatpak run "$APP" >/dev/null 2>&1 &

        fail_count=0

        # Deskflow가 뜰 시간
        sleep 10
    fi
done
