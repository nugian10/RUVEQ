# RUVEQ — Ancient Clockwork Machines

3,333 antique clockwork machines on BNB Smart Chain (chain ID 56).
Theme: mesin jam kuno — brass gears, springs, dials, pendulums,
winding keys and rivets. Rich flat SVG, 900x1125, no text,
no gradients (depth from layered flat fills + opacity only).

## Rendering (v2 — richer, render-only change)

- Trapezoidal-toothed gears with hubs, spokes and light crescents;
  ornate dials with Roman numerals drawn as line segments (XII / III /
  VI / IX), diamond-shaped hands and a red second hand (Rare+);
  spiral springs, riveted panels, screws, beveled frames, glass
  reflections, smoke, moon craters, constellations, sun rays and
  warm glow accents; richer per-background scenes (workshop wall,
  midnight blue, parchment, charcoal, copper dusk, blueprint).
- Skeleton dials show the exposed gear instead of numerals.
- Epic/Legendary dials get a gold ring with studs.
- Render-only: every token's traits, rarity and deck order are
  EXACTLY the same as v1 — only the SVG drawing changed.

## Files

- `images/1.svg` … `images/3333.svg` — 3,333 unique SVGs (34.64 MB total, largest 15,499 bytes)
- `metadata/1.json` … `metadata/3333.json` — one metadata file per token
- `all-tokens.json` — trait + hash index for all 3,333 tokens
- `collection.json` — collection summary (counts, deckHash, salt)

## Rarity (exact, from the gacha deck)

- Common: 2000
- Uncommon: 800
- Rare: 333
- Epic: 150
- Legendary: 50
- Total: 3333

## Deck

- deckHash: 0x1c41cd1f1305d3227b896c0c6985e6c370b7bac4b6cc6ad2be5af31248a9e8c1
- Salt: RUVE (0x52555645), from RUVEQ
- Deck seed: RUVEQ-DECK-SEED-2026-11-04-v1
- Deck file: `scripts/deck.json` (deterministic Fisher-Yates shuffle)

## Generator

- Command: `python3 art/generate.py`
- Verify: `python3 art/verify.py`
- Regeneration is byte-identical (tree hash verified identical on re-run).
- Traits: Body Type (8), Gear (6), Material (6), Dial (6),
  Background (6), Winding Key (4), Pendulum (4). All 3,333 trait
  combinations are unique. Legendary tokens always have a pendulum
  and a winding key.

## Verification result (v2, re-verified after render-only change)

- `python3 art/verify.py`: 31 PASS, 0 FAIL — ALL CHECKS PASSED
- 3,333 distinct SVG SHA-256 hashes, 3,333 distinct trait combos,
  rarity counts exact, all metadata valid JSON.
- Traits vs v1: 0 differences; deckHash UNCHANGED
  (0x1c41cd1f1305d3227b896c0c6985e6c370b7bac4b6cc6ad2be5af31248a9e8c1).
- Storage change 4 Nov 2026: image fields switched from the
  `ipfs://<IMAGES_CID>/N.svg` placeholder to GitHub raw URLs
  (`https://raw.githubusercontent.com/nugian10/RUVEQ/main/collection/images/N.svg`);
  `collection.json` imageBase/metadataBase updated the same way.
  Re-ran `python3 art/verify.py`: 31 PASS, 0 FAIL — ALL CHECKS PASSED.
  Traits, rarity counts and deckHash UNCHANGED by the URL switch
  (only the image URL string changed in the 3,333 metadata files).
- Elements per token: 47–86 (limit 200). Determinism: full re-run
  regenerates byte-identical output (collection tree hash identical).

## Status

- Contract: NOT deployed, no address.
- Storage: GitHub (nugian10/RUVEQ). Metadata image fields use
  `https://raw.githubusercontent.com/nugian10/RUVEQ/main/collection/images/N.svg`.
- Site live at https://ruveq.vercel.app/; repo https://github.com/nugian10/RUVEQ.
