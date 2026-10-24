# Embedding the Endless Spooky Forest in Google Sites

The forest is a static web app. **GitHub Pages is the server.** You do not need
to run anything on your computer, and Google Sites does not need to host the
JavaScript files.

## Live URLs

- Hub: <https://yuanjing-sudo.github.io/spooktacular-halloween-app/>
- Forest: <https://yuanjing-sudo.github.io/spooktacular-halloween-app/forest/endless-forest.html>

These are HTTPS URLs served by GitHub Pages and work from any browser.

## Add it to Google Sites

1. Open your Google Sites page in edit mode.
2. Choose **Insert → Embed → Embed code**.
3. Paste this snippet and click **Next**, then **Insert**:

```html
<div style="position:relative;width:100%;height:0;padding-bottom:62.5%">
  <iframe
    src="https://yuanjing-sudo.github.io/spooktacular-halloween-app/forest/endless-forest.html"
    style="position:absolute;inset:0;width:100%;height:100%;border:0"
    allow="fullscreen; autoplay"
    allowfullscreen
    loading="lazy"
    title="Endless Spooky Forest 3D">
  </iframe>
</div>
```

4. Drag the embed to fill the width of the page. The 62.5% padding gives it a
   16:10 shape; change it to `56.25%` for 16:9.
5. Publish the Google Site.

## Notes

- The game stores saves and settings in the browser's `localStorage`, scoped to
  the `github.io` origin. Saves work normally inside the iframe.
- WebGL and pointer lock are required for first-person mouse look. If your
  browser blocks pointer lock inside an iframe, open the forest in its own tab
  using the same URL.
- GitHub Pages rebuilds automatically whenever `main` is pushed. There is no
  separate deploy step.
- The local `python3 -m http.server` command in the README is only for offline
  development. It is not part of the published page.
