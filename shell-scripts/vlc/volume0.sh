#!/bin/bash

cat | nc localhost 4212 <<EOF
volume 0
logout
EOF

