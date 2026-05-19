## Feature Graphic — 1024 × 500 PNG

Output: `/mnt/documents/mai-feature-graphic-1024x500.png`

### Visual composition

```
┌────────────────────────────────────────────────────────────┐
│  [aurora glow bg + faint grid]                             │
│                                                            │
│   ╭──────╮       MIA                                       │
│   │ orb  │       Your Family Assistant                     │
│   │ icon │       Groceries · Calendar · To-Dos · Receipts  │
│   ╰──────╯                                                 │
│                                  [● Voice-powered]         │
└────────────────────────────────────────────────────────────┘
```

- **Background**: deep space navy `#0A0A1A` with radial auroras — cyan top-right, violet bottom-left, magenta bottom-right (same recipe as `body` in `index.css`)
- **Faint grid overlay** at ~6% opacity for tech feel
- **Left**: uploaded MIA orb icon (≈360px), with a soft cyan/violet glow halo
- **Right column**:
  - "MIA" — Space Grotesk Bold, ~140pt, cyan→violet→magenta gradient (matches `--gradient-brand`)
  - "Your Family Assistant" — Space Grotesk Medium, ~44pt, white
  - "Groceries · Calendar · To-Dos · Receipts" — DM Sans, ~24pt, muted gray
- **Voice badge** (bottom-right pill): tiny glowing dot + "Voice-powered" in JetBrains Mono uppercase, glassy border — echoes the `.glass` utility

### Build steps

1. `code--copy user-uploads://MIA_android_icon_centered_512x512_1.png /tmp/mia-icon.png`
2. Download Space Grotesk Bold/Medium, DM Sans Regular, JetBrains Mono Medium from Google Fonts to `/tmp/fonts/`
3. Write `/tmp/feature-graphic.py` using Pillow:
   - Create 1024×500 canvas, paint navy + 3 radial gradient auroras
   - Draw subtle 32px grid lines at low alpha
   - Paste icon with a pre-blurred glow underlay
   - Render "MIA" by drawing text to a mask, then filling with a horizontal cyan→violet→magenta gradient
   - Render sub-headline + tagline in flat colors
   - Draw rounded-rect voice badge with thin border + glow dot
4. Save to `/mnt/documents/mai-feature-graphic-1024x500.png`

### QA pass

- Open the PNG, verify: nothing clipped at edges, text crisp at 100%, gradient on "MIA" reads left-to-right cleanly, icon glow not muddy, badge legible
- If anything's off, iterate (`_v2.png`) until clean
- Deliver via `<presentation-artifact>` tag

### Memory cleanup

The `mem://design/aesthetic-direction` memory still says "sage green" but your real app is dark futuristic cyan/violet. I'll update it after the banner is built so future sessions don't drift.
