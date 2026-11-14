# Play collection

Three browser-only experiences served with the portfolio on GitHub Pages. No frontend library, AI call, account, database, or separate hosting is required. Open `play/` under the configured `/personal-website/` base path.

- **Neon Drift:** fixed 60 Hz driving simulation, directional checkpoints, two-lap time trials, keyboard/touch controls, pause/restart, bounded trails, and locally saved ghost runs. Invalid or older track/physics records are ignored. Runs end at three minutes; scores are local, not globally verified. Sound is not included.
- **Weather Window:** procedural landscape, seeded rain, manual weather presets, rain/wind/daylight controls, transitions, and static/pause modes. It is an artistic scene, not measured weather. No external weather provider is contacted.
- **Living Sketchbook:** normalized strokes, Botanical/Flow generation, seed and palette controls, bounded undo/redo, keyboard-accessible examples, local opt-in drafts, and 1800 × 1200 PNG exports. Drafts and drawings are not uploaded.

Graphics code loads only on its own page. The collection and homepage use static SVG illustrations. Pages are real directories with `index.html`, and the build allowlist explicitly includes `play/`; API uploads explicitly exclude it.

The studios share lifecycle handling that suspends animation for hidden tabs/offscreen stages. Reduced-motion preferences start the studios still and lower decorative game effects. Storage failure leaves the experiences usable. Pure simulation, generation, validation, and history behavior are tested with Node; controls, rendering, responsiveness, and export are verified in the browser.

Develop with `npm run build` then `npm run dev`. The preview serves `http://127.0.0.1:4173/personal-website/play/`. Rebuild and reload after editing.
