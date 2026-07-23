#!/bin/sh
set -e

# Launch SearXNG via its own entrypoint (config init + Granian on :8080) in the background.
# Run it from /usr/local/searxng so `granian searx.webapp:app` can import the searx package,
# matching the base image's WORKDIR. Entrypoint path verified against searxng/searxng:latest.
(cd /usr/local/searxng && exec ./entrypoint.sh) &

# The app binds Render's $PORT on 0.0.0.0 and reaches SearXNG on 127.0.0.1:8080.
exec node /app/dist/main
