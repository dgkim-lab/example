#!/bin/bash

cat | nc localhost 4212 <<EOF
volume 255
logout
EOF

