#!/bin/sh
set -eu
cid=$(/usr/bin/docker ps -q \
    --filter label=com.docker.compose.project=proyecto-uml-case-sw1 \
    --filter label=com.docker.compose.service=web | head -n 1)
if [ -n "$cid" ]; then
  /usr/bin/docker exec "$cid" nginx -s reload
fi
