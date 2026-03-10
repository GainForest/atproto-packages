# Tap service for Railway deployment
#
# This is a thin wrapper around the official Tap image that allows
# Railway to inject environment variables at runtime.
#
# The official image works fine, but having our own Dockerfile gives us
# more control over the configuration and health checks.

FROM ghcr.io/bluesky-social/indigo/tap:latest

# Railway will inject these via environment variables
# No build-time configuration needed

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:2480/health | grep -q '"status":"ok"' || exit 1

EXPOSE 2480

# The base image already has the correct CMD
