# Sleep Vote Lite

Simple sleep voting for survival worlds: skip night when enough players are in bed.

## Features
- Tracks players entering/leaving beds.
- Broadcasts progress (e.g. `2/4 needed`).
- Skips night and clears weather once threshold is reached.

## Requirements
- Paper or Folia 1.20+
- Skript 2.7+

## Installation
1. Copy `sleep-vote-lite.sk` into `plugins/Skript/scripts/`.
2. Run `/skript reload sleep-vote-lite`.

## Configuration
Inside `sleep-vote-lite.sk`:
- `sleep-percent-required` (default `50`)
