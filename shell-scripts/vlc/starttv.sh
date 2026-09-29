#!/bin/bash

vlc --extraintf rc --rc-host=localhost:4212 \
v4l2:///dev/video0 :input-slave=alsa://hw:1,0 \
:v4l2-width=1280 :v4l2-height=720
#:v4l2-width=1920 :v4l2-height=1080

