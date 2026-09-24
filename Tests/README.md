# Tests

Native XCTest suite for the pure game logic (`SpookyLogicTests.swift`).

## Run on Mac

```sh
# install the generator once
brew install xcodegen

# regenerate the project (picks up the Tests target from project.yml)
xcodegen generate

# build + run the suite (iPhone simulator)
xcodebuild test \
  -project HalloweenSpooktacularUltimate.xcodeproj \
  -scheme HalloweenSpooktacularUltimate \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```

## What's covered

- Easing math (12 curves: endpoints, overshoot, settle)
- Oscillators, frame-rate-independent smoothing
- Scoring, curves, compact numbers
- Seeded RNG + Perlin determinism/bounds
- Maze carvers (connectivity, seed sensitivity, braid)
- A* hunting (detours, budgets, smoothing)
- Raycast picking (hits, misses, distances)
- Quest/expedition routing consistency + catalog sanity
- Regions, depth layers, pick tiers, seals, spin weights
- Relics, fish, ghost kinds
- Net-loop authority (hits, blasts, snapshots, corruption)
- Bonds, streaks, store day math + corruption recovery, pet bounds

## Windows note

Xcode doesn't run on Windows. `spooktacular-verify/test_logic.py`
mirrors the same assertions in Python and runs anywhere:

```sh
python3 spooktacular-verify/test_logic.py
```
