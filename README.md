# CATCHU! — Photo-to-GIF crane machine

Work branch: `feat/otaku-gif-maker`. The root page is the new maker. The former tarot page and stylesheet are preserved under `components/LegacyTarotPage.tsx` and `components/legacy-tarot.css`; legacy API routes are unchanged. No merging or deployment is included in this commit.

## Run

```sh
npm ci
npm run dev
npm run build
```

The maker does not need API keys. Uploaded photos are decoded and cropped locally. GIF frames are rendered with the same Canvas renderer as the preview and encoded sequentially in a Web Worker using gifenc. No photo upload endpoint is used. Output: looping 6-second GIF, 10 fps, 480×640 or 720×960. File size depends on image content; there is no fixed size guarantee.

## First version

- One or two PNG/JPEG/WebP photos (20MB per file); transparent-margin cropping.
- Per-photo size, rotation, flip, name, replacement and deletion.
- Five machine colors; optional sign and winning text.
- Preview, encoding progress, cancellation, explicit download link and completed-GIF preview.
- Mobile single-column layout. Reloading clears the project.

Not included yet: automatic background removal, drag/pinch positioning, saved projects, adjustable timings, audio. Animation is a stylized preset, not simulated claw physics. The repetition deliberately resets after the result scene.

## Checks

`npx tsc --noEmit` and `npm run build` validate types and production bundling.

Optional test dependencies: `@napi-rs/canvas` for `node tests/render.cjs`; `playwright` plus its Chromium installation for `node tests/smoke.cjs`. These are test-only and can be supplied via `NODE_PATH`. Smoke tests expect a running server (`TEST_URL`, default http://localhost:3000); `TEST_CHROME_PATH` may select a local browser. Render tests write intermediate PNGs/GIFs to the operating system temporary directory.

Before release, manually check actual Samsung Internet, Chrome and Whale: uploads, names, image dimensions, cancellation/retry, downloaded GIF playback, and mobile layout. Browser smoke test execution and live deployment must be reported separately from build/render tests.
