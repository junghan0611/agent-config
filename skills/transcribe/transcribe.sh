#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# GROQ_API_KEY lives in ~/.env.local (SSOT). Source it rather than trusting the
# inherited environment: pi hides the Groq provider by deleting the key from its
# own process (pi-extensions/hide-providers.ts), so a pi-spawned child may not
# inherit it.
if [ -f "$HOME/.env.local" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.env.local"
fi

# Skill-local config still wins, for a key that differs from the SSOT one.
if [ -f "$SCRIPT_DIR/config" ]; then
  source "$SCRIPT_DIR/config"
fi

if [ -z "$1" ]; then
  echo "Usage: transcribe.sh <audio-file>"
  exit 1
fi

if [ -z "$GROQ_API_KEY" ]; then
  echo "Error: GROQ_API_KEY not set. Create config file with: echo 'GROQ_API_KEY=\"your-key\"' > $SCRIPT_DIR/config"
  exit 1
fi

AUDIO_FILE="$1"

if [ ! -f "$AUDIO_FILE" ]; then
  echo "Error: File not found: $AUDIO_FILE"
  exit 1
fi

curl -s -X POST "https://api.groq.com/openai/v1/audio/transcriptions" \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -F "file=@${AUDIO_FILE}" \
  -F "model=whisper-large-v3-turbo" \
  -F "response_format=text"
