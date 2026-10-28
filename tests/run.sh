#!/bin/sh
# Runs tests/game.test.html in headless Chrome and prints the results.
cd "$(dirname "$0")/.." || exit 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT=$("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files \
  --virtual-time-budget=30000 --dump-dom "file://$PWD/tests/game.test.html" 2>/dev/null)
printf "%s\n" "$OUT" | awk "/<pre id=\"results\">/{p=1} p{print} /<\/pre>/{p=0}" | sed "s/<[^>]*>//g; s/&gt;/>/g; s/&lt;/</g; s/&amp;/\&/g"
printf "%s" "$OUT" | grep -q '<title>PASSED</title>'
