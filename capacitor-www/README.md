# Not the app

Capacitor's CLI requires `webDir` to point at a real directory even
though this project doesn't use it to load content -- `capacitor.config.ts`
sets `server.url` to the live production site, so the native WebView
loads `https://www.shiftpilothq.com` directly, not anything from here.

This directory holds a single placeholder `index.html` only because
`npx cap sync` refuses to run against an empty one. If you ever need a
real bundled fallback page (e.g. to show something before the WebView
finishes its first load, or as an offline shell distinct from
`app/offline/page.tsx` which is served *by the live site itself*),
that's the file to build out -- it isn't one today.
