# 🌌 Endless Spooky Forest

A streaming, procedurally generated 3D Halloween forest that runs entirely in the
browser. No build step, no engine, no external assets — just hand-written
JavaScript, raw WebGL and procedural geometry.

Open **`endless-forest.html`** from a local web server (the page uses ES5-style
classic scripts, so `file://` works in most browsers too):

```sh
# from the repository root
python3 -m http.server 8000 --directory docs
# then visit http://localhost:8000/forest/endless-forest.html
```

---

## What is out there

The world is unbounded on **X, Z and Y**. Terrain is generated deterministically in
16 × 16 metre chunks from a seed, then streamed in and out around the player. The
vertical range runs from **−18 m** in the flooded deeps to **+78 m** in the canopy,
and includes floating islands and root bridges.

Five biomes blend into each other:

| Biome | Character |
| --- | --- |
| 🌲 **Whispering Pines** | Tall conifers, needle litter, cold blue fog |
| 🍂 **Hollow Grove** | Bare twisting trees, pumpkins, amber light |
| 🌫️ **Mistfen** | Shallow water, reeds, drowned ruins |
| 🍄 **Moonlit Glade** | Glowing mushrooms, fireflies, pale grass |
| 🩸 **Bloodwood** | Red-canopy trees, thorn thickets, hostile weather |

Every chunk also gets props: logs, stones, ruins, fences, gravestones, lanterns,
spider webs, mushrooms, shrubs, wild carrot patches, burrows and campfire sites.

## Creature comforts

- **Rabbits** — twelve AI states, articulated ears, blinking eyes, whiskers, tail,
  hop animation, warrens, trust and taming, feeding with carrots, companion
  following, and a name + personality for every rabbit you meet.
- **Carrots** — wild patches and player-planted seeds, four visual growth stages,
  ridged 3D taproots with torus rings, swaying leaf fans, flowers on ripe plants,
  watering, harvesting, eating and roasting.
- **Campfires** — stone rings, crossed logs, tripods, cooking pots and skull
  totems; procedural flames, embers, smoke and sparks. Light, fuel, cook carrots,
  roast marshmallows, warm up, sit down and listen to a story.
- **Weather and sky** — a full 24-hour cycle, sun, moon, stars, aurora, drifting
  cloud, rain, fog, snow, wind and occasional blood moons. Lightning flashes are
  timed to thunder.
- **Exploration** — stamina, warmth, health, running, jumping, swimming, crouching,
  flight, a third-person avatar, photo mode, a compass, minimap and a journal with
  statistics, achievements, rabbit bonds, carrot records and campfire history.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` / arrows | Walk |
| `Shift` | Run (or descend while flying) |
| `Space` | Jump |
| `Ctrl` | Crouch |
| `E` | Interact / harvest / talk / open campfire menu |
| `Q` | Call bonded rabbits |
| `J` | Journal |
| `M` / `Tab` | Map / explorer tab |
| `F` | Toggle flight |
| `R` / `X` | Rise / descend while flying |
| `V` | First / third person |
| `P` | Photo mode |
| `1` | Eat a carrot (roasted carrots first) |
| `2` | Plant a carrot seed |
| `5` | Journal |
| `Esc` | Pause |
| Mouse | Look (click to capture the pointer) |

Touch devices get a virtual joystick, drag-to-look, and on-screen buttons for
interact, jump, run, journal and photo mode.

## Seeds and saving

- The default seed is **`20261031`**. A seed can be entered on the start screen,
  in the pause menu, or via the URL hash: `#seed=12345`.
- World generation is deterministic: the same seed always produces the same
  terrain, props, carrot patches, warrens and campfires.
- Progress is saved to `localStorage` under `spooky_forest_save_v2` (world seed,
  player transform, inventory, carrot state, campfire state and rabbit bonds).
  Settings live under `spooky_forest_settings_v2`.
- The spawn clearing always contains **The First Hearth** campfire, a wild carrot
  patch, and a rabbit warren, so a new game begins with something to do.

## Architecture

The forest is deliberately dependency-free and split into small modules:

| File | Responsibility |
| --- | --- |
| `util.js` | Math, RNG, value/simplex-ish noise, matrices, frustum, colours, event bus, storage, procedural WebAudio, name/story banks |
| `mesh.js` | `MeshBuilder`: quads, boxes, spheres, ellipsoids, cylinders, cones, discs, leaves, toruses, stars, transforms and vertex colours |
| `world.js` | Seeded height/biome fields, chunk streaming, trees, props, ruins, floating islands, collision and surface queries |
| `renderer.js` | WebGL 1 lit shader, procedural sky, chunk upload/eviction, dynamic meshes, particles, eight point lights, water, frustum culling, floating origin |
| `carrots.js` | Carrot growth simulation, meshes, harvesting, planting, watering, persistence |
| `campfires.js` | Campfire variants, fire/smoke/ember particles, fuel, cooking, actions, light sources |
| `rabbits.js` | Rabbit meshes, animation, AI states, warrens, taming, companion behaviour |
| `player.js` | Movement, collision, stamina/warmth/health, mouse and touch look, avatar, photo mode |
| `atmosphere.js` | Time of day, palettes, sun/moon/stars/aurora, weather, lightning, ambient audio |
| `ui.js` | HUD, compass, minimap, prompts, toasts, start/pause/settings, fire menu, journal, achievements, touch controls |
| `main.js` | Game loop, system wiring, interactions, achievements, save/load, particles, debug helpers |

`endless-forest.html` and `forest.css` provide the page and all UI styling.

## Performance notes

- Chunks are meshed on a time budget and uploaded lazily; distant chunks are
  evicted with a GPU buffer cache.
- Dynamic geometry (player avatar, carrots, rabbits, fires, markers) is merged
  into one buffer per frame. Carrots use distance LOD and a low-detail silhouette
  beyond 32 m; rabbits and warrens are culled with the rest of the dynamic pass.
- Quality presets (`low`, `medium`, `high`) scale render resolution, draw
  distance, particle caps and carrot tessellation.
- The render origin floats with the camera, so coordinates stay small even after
  walking millions of metres.

## Debug helpers

`window.SpookyForestGame` exposes the running game. Useful console commands:

```js
SpookyForestGame.teleport(120, 20, -80);
SpookyForestGame.setTime(23.5);
SpookyForestGame.spawnRabbitNear('Mallow');
SpookyForestGame.saveGame();
SpookyForestGame.renderer.info;   // fps, chunks, vertices
```

## Verification

The simulation modules (`util`, `mesh`, `world`, `carrots`, `campfires`,
`rabbits`, `player`, `atmosphere`) are DOM-independent and have been exercised
headlessly with Node: deterministic chunk generation, spawn contents, campfire
lighting/cooking/story actions, rabbit feeding/taming, mesh building, a 300-frame
simulation and save/load round-trips all pass. The UI has been checked for
duplicate and missing element IDs and rendered with a mock WebGL context.

The page is best experienced in a real browser with WebGL enabled.
