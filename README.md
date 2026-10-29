# Halloween Spooktacular Ultimate 🎃

A collection of spooky little games and 3D experiments: the original 2D maze, a
voxel world, spectral ghost hunts, a streaming 3D forest, and **Jade Moon Town**,
a first-person cinematic Chinese night town. Most of the web demos are
dependency-free and run straight from the `docs/` folder.

## Play online

**The live site is served by GitHub Pages — not localhost.**

- Hub: <https://yuanjing-sudo.github.io/spooktacular-halloween-app/>
- Endless Spooky Forest: <https://yuanjing-sudo.github.io/spooktacular-halloween-app/forest/endless-forest.html>

| Experience | Page |
| --- | --- |
| ⛏️ Maze 2D — the original candy hunt | `index.html` |
| 🧱 3D mine — first-person voxel mine | `mine3d.html` |
| 👻 3D maze — standalone spectral maze | `ghost3d.html` |
| 🔫 **Spectral Hunt** — first-person 3D ghost shooter (Ghost tab) | `index.html` → 👻 |
| 🏮 **Jade Moon Town** — first-person cinematic night town (Town tab) | `index.html` → 🏮 |
| 🌲 Voxel forest & deep-mine | `voxel.html` |
| 🌌 **Endless Spooky Forest 3D** — streaming X/Y/Z forest | `forest/endless-forest.html` |

A local server is **optional**, only for editing the code offline. The deployed
pages are ordinary static files and need no server-side code.

## 🔫 Spectral Hunt — the Ghost tab

The **Ghost tab** is now a genuine WebGL first-person shooter, not a 2D DOM
minigame. It runs in a Three.js `r128` scene with procedural graveyard terrain,
moonlight, shadows, ground mist, ritual light, glowing pumpkins, floating embers
and a first-person spectral relic arm. **22 ghost breeds** use animated shaders,
different silhouettes and chase, strafe, orbit, teleport, dive, ambush, ranged,
summoning, healing and self-destruct behaviours. Three **Veil Sovereigns** rotate
every fifth wave, and each boss gains new attacks and reinforcements as its
health drops. The loop includes:

- **four relic arms** — Soulfire Blaster, Grave Scatter, Storm Arc and Moon Rail —
  with distinct cadence, spread, piercing and chain-lightning patterns;
- **14 stacking relics** drafted after every wave: damage, fire rate, extra bolts,
  pierce, criticals, vitality, movement, dash/nova cooldowns, frost, witchfire,
  lifesteal, soul greed and pickup magnetism;
- **two active abilities** — a phase dash with brief invulnerability and a radial
  Soul Nova that clears projectiles;
- **omens** every third wave (Blood Moon, Eclipse, Soul Rain, The Haunting) that
  alter fog, speed, criticals, drops and score;
- endless waves, three rotating bosses, boss phases, summoned adds and a boss
  every fifth wave;
- soul combos, golden breeds, forgiving aim assist, triple/rapid pickups and health;
- a **veil radar**, boss health bar, damage numbers, hit markers, camera recoil
  and screen shake;
- a persistent best score, armory choice and a bestiary that fills in as you
  dispel breeds;
- a settings panel for sensitivity, inverted look, aim assist, damage numbers,
  screen shake, reduced motion and render quality;
- synthesized graveyard ambience and sound effects, plus a mute toggle;
- desktop keyboard/mouse and mobile joystick, fire, dash and nova controls.

`docs/vendor/three.min.js` is vendored locally, so GitHub Pages and the Google
Sites embed do not need a CDN. The original standalone 3D maze remains at
`ghost3d.html`.

## 🏮 Jade Moon Town — the Town tab

The redundant Explore tab is now **Jade Moon Town**, a full-screen,
first-person cinematic town beneath a jade moon. It is rendered by a
dependency-free Canvas2D software-3D engine in `docs/chinatown.js` and
`docs/chinatown.css`, so it works on phones and in browsers without WebGL. The
seven-tab shell is unchanged; the old world links live in the Town’s **Realms**
drawer.

- **First-person by default:** drag to look, **WASD** or arrow keys to walk,
  **Shift** to run and the wheel to step forward. Touch devices get a glass
  D-pad. Press **V**, or use **Orbit view**, to switch to the cinematic orbit
  camera; the **Aerial** chip returns to the overview and the last walking
  position is restored.
- **A real town, not a backdrop:** a palace terrace and Hall of the Azure Sky,
  Moonview Pagoda, Bell Tower, stone Moon Bridge over the canal, lantern street,
  Dragon Gate, city walls, shops, tea stalls, stone lanterns, boats, koi,
  cherry petals, fireflies, moving townsfolk and a drifting jade dragon.
- **Six landmarks + aerial:** the chip row and map markers fly the first-person
  camera to a composed viewpoint at each landmark, with an info card and
  coordinates. The **Guided tour** visits every stop in order.
- **Living light and weather:** dusk/night toggle, lantern and window glow,
  fireworks, shooting stars, and clear → rain → snow cycles. Rain adds lightning
  and thunder; snow adds warm-lit flakes.
- **Procedural sound:** a user-gesture-started WebAudio soundscape with guqin
  notes, water, wind, temple bell and thunder. Sound is off by default.
- **Photo mode** hides the HUD, tab bar and close control, adds a letterboxed
  frame and lets you save the current canvas as a PNG.
- **Realms** opens the older worlds (Endless Forest, Voxel, Mine, Ghost maze)
  without leaving the Town.
- The renderer adapts its internal scale to the frame rate and uses a wider
  portrait FOV; there is no WebGL requirement. Performance varies by device, so
  the live FPS counter is shown in the HUD.

Town controls: **drag** look · **WASD / arrows** walk · **Shift** run ·
**wheel** step · **V** orbit/walk · **N** dusk/night · **R** weather ·
**M** sound · **P** photo · **Esc** exit photo/Realms/tour.

## 🕹️ Midnight Arcade

The seven-tab web shell now opens a full-screen **Midnight Arcade** with 20
games — every one playable in its own dedicated room:

- **Arcade:** Pumpkin Smash, Spell Duel, Voxel Run, Witch Flight.
- **Puzzle:** Candy Sort, Maze Escape.
- **Spooky:** Ghost Race.
- **Brain:** Crypt Trivia, Echo Simon, Memory Match, Witch’s Brew, Haunted
  Hangman, Crypt Count.
- **Reflex:** Ritual Rhythm, Candy Catcher, Bat Swarm, Spider Siege, Pumpkin
  Archery, Vampire Reflex, Candle Keep.

Each card now carries a hand-built miniature scene rather than an emoji, and
every game room shares a themed ambient stage, a 3-2-1 countdown and a larger
play surface. Cards show category, difficulty and your best score. Entering a
game opens a full-screen room with an intro card, pause sheet (Esc), restart,
mute and a result screen, so nothing gets clipped inside the 390 px game
canvas. Best scores and the mute setting persist in `localStorage`, and the
Arcade is reachable from `index.html`, `mine3d.html`, `ghost3d.html` and
`voxel.html`.

## 3D worlds

- **Endless 3D mine** (`mine3d.html`) — five hand-built strata, then unbounded
  procedural depths with frost, crypt, crystal, magma and root themes, cave bats
  and an endlessly scaling A* ghost.
- **3D ghosts** (`ghost3d.html`) — larger mazes with carved rooms, loops,
  palette shifts, roaming bats, fog-of-war and a true X/Y/Z axis: Space jumps,
  R/F (or ▲/▼) fly, and the HUD tracks coordinates.
- **Voxel worlds** (`voxel.html`) — an endless streaming forest, a deep mine,
  Frost Depths, and a 64×24×64 Crystal Caverns geode with full 3D flight.

## 🌌 Endless Spooky Forest

The newest addition is a near-infinite procedural forest with:

- deterministic 16 m chunks across unbounded X/Z and a vertical range of
  −18 m to +78 m, including floating islands;
- five biomes, weather, a 24-hour day/night cycle, aurora and blood moons;
- articulate, tameable rabbits with warrens and twelve AI states;
- plantable and wild carrots in four growth stages, with detailed ridged roots;
- campfires you can light, cook on, warm up at, sit beside and hear stories from;
- carvable jack-o'-lanterns, owls, bats, frogs, hedgehogs, moths and fireflies;
- a fishing minigame with seven catches, records and campfire cooking;
- the twelve-step Lantern Road quest chain;
- a journal, achievements, minimap, compass, photo mode and full touch controls.

See [`docs/forest/README.md`](docs/forest/README.md) for controls, seeds,
architecture and performance notes.

### Embed in Google Sites

In Google Sites choose **Insert → Embed → Embed code** and paste:

```html
<div style="position:relative;width:100%;height:0;padding-bottom:62.5%">
  <iframe src="https://yuanjing-sudo.github.io/spooktacular-halloween-app/forest/endless-forest.html"
    style="position:absolute;inset:0;width:100%;height:100%;border:0"
    allow="fullscreen; autoplay" allowfullscreen loading="lazy"
    title="Endless Spooky Forest 3D"></iframe>
</div>
```

That iframe points at the live GitHub Pages server, so nothing runs on your device.
See [`docs/forest/GOOGLE-SITES.md`](docs/forest/GOOGLE-SITES.md) for a longer guide.

## Other implementations

- `Sources/` — the SwiftUI game engine reference implementation.
- `Tests/` — Swift logic tests.
- `python-3d/` — Python/Ursina prototype and headless tests.
- `java-3d/` — Java 3D renderer.

## Controls (web)

In the 3D worlds, use **WASD** or the arrow keys to move, **Shift** to run,
**Space** to jump, **E** to interact, and **Esc** to pause. In **Spectral Hunt**,
move with **WASD**, drag to look, click or press **Space** to fire, **Q** to
phase dash, **E** to unleash Soul Nova, and **1–4** to switch relic arms.
**Esc** pauses; the Settings button opens the options panel from the start or
pause screen. Touch devices get a movement stick, a fire button, dash/nova
buttons, a weapon pill and a relic-draft screen. In **Jade Moon Town**, drag to
look, **WASD / arrows** to walk, **Shift** to run, **V** to toggle orbit view,
**N** for dusk/night, **R** for weather, **M** for sound and **P** for photo
mode; on touch, use the on-screen D-pad. Each page lists its own extras in the
in-game help and footer.
