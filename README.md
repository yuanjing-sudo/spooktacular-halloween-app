# Halloween Spooktacular Ultimate 🎃

A collection of spooky little games and 3D experiments: the original 2D maze, a
voxel world, spectral ghost hunts, and a new streaming 3D forest. Most of the web
demos are dependency-free and run straight from the `docs/` folder.

## Play online

**The live site is served by GitHub Pages — not localhost.**

- Hub: <https://yuanjing-sudo.github.io/spooktacular-halloween-app/>
- Endless Spooky Forest: <https://yuanjing-sudo.github.io/spooktacular-halloween-app/forest/endless-forest.html>

| Experience | Page |
| --- | --- |
| ⛏️ Maze 2D — the original candy hunt | `index.html` |
| 🧱 3D mine — first-person voxel mine | `mine3d.html` |
| 👻 3D ghosts — spectral shooter | `ghost3d.html` |
| 🌲 Voxel forest & deep-mine | `voxel.html` |
| 🌌 **Endless Spooky Forest 3D** — streaming X/Y/Z forest | `forest/endless-forest.html` |

A local server is **optional**, only for editing the code offline. The deployed
pages are ordinary static files and need no server-side code.

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

Use **WASD** or the arrow keys to move, **Shift** to run, **Space** to jump,
**E** to interact, and **Esc** to pause. Each page lists its own extras in the
in-game help and footer.
