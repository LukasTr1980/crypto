#!/bin/sh -e

export KRAKEN_API_KEY="$(cat /run/secrets/kraken_api_key)"
export KRAKEN_API_SECRET="$(cat /run/secrets/kraken_api_secret)"

exec "$@"