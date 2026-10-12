#!/bin/bash
# usage: lh.sh <poort> <pad> <uit.json>  — Lighthouse (mobiel) op een ingelogde pagina
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
COOKIE=$(node /home/user/Kostenplan/scripts/mobile-ux/cookie.js >/dev/null; node -e "const c=require('/home/user/Kostenplan/scripts/mobile-ux/cookie.js')();console.log(c.name+'='+c.value)")
H=$(node -e "console.log(JSON.stringify({Cookie:process.argv[1]}))" "$COOKIE")
npx --yes lighthouse@12 "http://localhost:$1$2" --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility --extra-headers="$H" --output=json --output-path="$3" --quiet >/dev/null 2>&1
node -e "const r=require('$3');console.log('$1 $2',Object.entries(r.categories).map(([k,v])=>k+':'+Math.round(v.score*100)).join(' '),'LCP',r.audits['largest-contentful-paint'].displayValue,'CLS',r.audits['cumulative-layout-shift'].displayValue,'TBT',r.audits['total-blocking-time'].displayValue)"
