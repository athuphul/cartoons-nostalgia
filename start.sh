#!/usr/bin/env bash
# Nostalgia TV Startup Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Starting Nostalgia TV Web App..."
python3 server.py 8080
