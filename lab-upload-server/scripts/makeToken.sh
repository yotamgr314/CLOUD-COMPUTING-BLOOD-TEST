#!/usr/bin/env bash
set -euo pipefail

LAB_ID="${1:-003}"
USER_ID="${2:-3001}"
EXP="${3:-1h}"

TOKEN="$(node -r dotenv/config -e "console.log(require('jsonwebtoken').sign({lab_id:'$LAB_ID', user_id:'$USER_ID'}, process.env.JWT_SECRET, {expiresIn:'$EXP'}))")"
echo "$TOKEN"
