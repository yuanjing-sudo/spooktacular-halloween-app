"""Spooktacular Mine 3D + all 7 tabs (Ursina/Panda3D).
Tabs mirror the iOS tab bar: Maze, Candy, Mine, World, Explore, Games, Achieve.
Run:  python run.py   (needs: pip install -r requirements.txt)
"""
import json
import math
import os
import random

from ursina import (Ursina, Entity, Text, Button, camera, mouse, held_keys,
                    color, scene, destroy, time)

import engine as E
from gamedata import GHOSTS, CANDIES, MINIGAMES

SAVE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'best.json')

# Ursina's bundled font has no emoji glyphs (and Panda3D can't load the OS
# color-emoji font), so UI strings are ASCII-folded: names stay verbatim,
# only the pictographs are dropped. The 3D world keeps full color/shape feel.
def clean(s):
    if not isinstance(s, str):
        return s
    s = s.encode('ascii', errors='ignore').decode('ascii')
    return ' '.join(s.split())


def ui_text(*a, **k):
    from ursina import Text as _T
    if a and isinstance(a[0], str):
        a = (clean(a[0]),) + tuple(a[1:])
    if isinstance(k.get('text'), str):
        k['text'] = clean(k['text'])
    return _T(*a, **k)


def ui_button(*a, **k):
    from ursina import Button as _B
    if a and isinstance(a[0], str):
        a = (clean(a[0]),) + tuple(a[1:])
    if isinstance(k.get('text'), str):
        k['text'] = clean(k['text'])
    return _B(*a, **k)

TABS = ['Maze', 'Candy', 'Mine', 'World', 'Explore', 'Games', 'Achieve']
TAB_ICONS = ['⛏️', '🍬', '🛒', '🌍', '🗺️', '🎮', '🏆']


class Game:
    def __init__(self):
        self.app = Ursina(title='Spooktacular Mine 3D')
        window_title = 'Spooktacular Mine 3D'
        try:
            from ursina import window as _w
            _w.title = window_title
            _w.fps_counter.enabled = False
        except Exception:
            pass
        camera.fov = 75
        self.seed = 20261031
        self.best = 0
        try:
            with open(SAVE) as f:
                self.best = int(json.load(f).get('best3d', 0))
        except Exception:
            pass
        self.tab = 0
        self.paused = False
        self.orbit = False
        self.smash_mode = False
        self.pumpkins = []
        self.smashed = 0
        self.world_ents = []
        self.pickup_ents = []
        self.ghost_ent = None
        self.torch_ents = []
        self.reset_run(new_seed=False)
        self.build_ui()
        self.build_depth()
        self.show_tab(0)

    # ---------------- run state (same systems as web game) ----------------
    def reset_run(self, new_seed=True):
        if new_seed:
            self.seed = random.randrange(10 ** 9)
        self.depth = 0
        self.score = 0
        self.combo = 0
        self.streak = 0
        self.gold = 0
        self.level = 1
        self.xp = 0
        self.pick_idx = 0
        self.relics = []
        self.ach = {}
        self.collected_candy = 0
        self.state = 'title'  # title | play | dead | win | shop handled via Mine tab
        self.px, self.pz = 1.5, 1.5
        self.yaw, self.pitch = 45.0, 0.0
        self.ghost = {'x': 1.5, 'z': 1.5, 'path': [], 'think': 0}
        self.flash_msg = ''
        self.flash_t = 0
        self.anim_t = 0

    def gold_mult(self):
        return 1 + sum(r[2] for r in self.relics if r[1] == 'Gold')

    def dmg_mult(self):
        return 1 + sum(r[2] for r in self.relics if r[1] == 'Damage')

    def speed_mult(self):
        return 1 + sum(r[2] for r in self.relics if r[1] == 'Speed')

    def pack_bonus(self):
        return min(2, sum(1 for r in self.relics if r[1] == 'Pack'))

    def move_speed(self):
        return (2.6 + self.pick_idx * 0.35) * self.speed_mult()

    def unlock(self, aid, name):
        if aid not in self.ach:
            self.ach[aid] = name
            self.flash(f'ACHIEVEMENT: {name}', 3)

    def flash(self, msg, dur=2.2):
        self.flash_msg = msg
        self.flash_t = dur

    def gain_xp(self, n):
        self.xp += n
        while self.xp >= E.xp_next(self.level):
            self.xp -= E.xp_next(self.level)
            self.level += 1
            self.gold += 25
            self.score += 100
            self.flash(f'Level {self.level}! +25 gold')
            if self.level >= 5:
                self.unlock('level-5', 'Living Myth (level 5)')

    # ---------------- depth / world ----------------
    def build_depth(self):
        for e in self.world_ents + self.pickup_ents + self.pumpkins:
            destroy(e)
        self.world_ents, self.pickup_ents, self.pumpkins = [], [], []
        if self.ghost_ent:
            destroy(self.ghost_ent)
            self.ghost_ent = None
        self.torch_ents = []
        cfg = E.DEPTHS[self.depth]
        rng = E.SeededRNG(self.seed + self.depth * 7919)
        cells, w, d = E.carve_dfs(cfg['size'], cfg['size'], self.seed + self.depth * 7919)
        self.cells, self.w, self.d = cells, w, d
        rooms = [(x, z) for (x, z) in cells if x % 2 == 1 and z % 2 == 1 and not (x == 1 and z == 1)]
        rooms = rng.shuffle(rooms)
        n = 0
        self.candies = [{'x': x + 0.5, 'z': z + 0.5} for (x, z) in rooms[n:n + cfg['candies']]]
        n += cfg['candies']
        self.crystals = [{'x': x + 0.5, 'z': z + 0.5} for (x, z) in rooms[n:n + cfg['candies'] + cfg['crystals'] + self.pack_bonus()]]
        n += cfg['candies'] + cfg['crystals'] + self.pack_bonus()
        self.relic_spot = {'x': rooms[n][0] + 0.5, 'z': rooms[n][1] + 0.5} if n < len(rooms) else None
        n += 1
        self.pond = {'x': rooms[n][0] + 0.5, 'z': rooms[n][1] + 0.5} if n < len(rooms) else None
        self.pond_used = False
        # ghost spawns farthest room
        gx, gz, best = 1.5, 1.5, -1
        for (x, z) in rooms:
            dist = abs(x - 1) + abs(z - 1)
            if dist > best:
                best, gx, gz = dist, x + 0.5, z + 0.5
        self.ghost = {'x': gx, 'z': gz, 'path': [], 'think': 0}
        self.px, self.pz = 1.5, 1.5
        wr, wg, wb = cfg['wall']
        wall_col = color.rgb(int(wr * 255), int(wg * 255), int(wb * 255))
        # floor
        self.world_ents.append(Entity(model='cube', color=color.rgb(12, 8, 26),
                                      position=(w / 2, -0.5, d / 2), scale=(w, 1, d)))
        for (x, z) in [(x, z) for x in range(w) for z in range(d)]:
            if (x, z) in cells:
                continue
            self.world_ents.append(Entity(model='cube', color=wall_col,
                                          position=(x + 0.5, 1.2, z + 0.5), scale=(1, 2.4, 1),
                                          collider='box'))
        # torches on every 3rd room
        for i, (x, z) in enumerate(rooms):
            if i % 3 == 0 and len(self.torch_ents) < 24:
                t = Entity(model='sphere', color=color.orange, position=(x + 0.5, 1.9, z + 0.5), scale=0.22)
                self.world_ents.append(t)
                self.torch_ents.append(t)
        fr, fg, fb = cfg['fog']
        scene.fog_color = color.rgb(int(fr * 255), int(fg * 255), int(fb * 255))
        scene.fog_density = 0.035
        self.ghost_info = GHOSTS[(self.seed + self.depth) % len(GHOSTS)]
        self.ghost_ent = Entity(model='sphere', color=color.white,
                                position=(gx, 1.1, gz), scale=1.0)
        self.refresh_pickups()
        self.refresh_hud()

    def refresh_pickups(self):
        for e in self.pickup_ents:
            destroy(e)
        self.pickup_ents = []
        for c in self.candies:
            self.pickup_ents.append(Entity(model='sphere', color=color.orange,
                                           position=(c['x'], 0.55, c['z']), scale=0.35))
        for c in self.crystals:
            self.pickup_ents.append(Entity(model='cube', color=color.cyan,
                                           position=(c['x'], 0.65, c['z']), scale=0.4, rotation=(45, 45, 0)))
        if self.relic_spot:
            self.pickup_ents.append(Entity(model='cube', color=color.gray,
                                           position=(self.relic_spot['x'], 0.6, self.relic_spot['z']), scale=0.6))
        if self.pond and not self.pond_used:
            self.pickup_ents.append(Entity(model='cube', color=color.blue,
                                           position=(self.pond['x'], 0.15, self.pond['z']), scale=(0.9, 0.2, 0.9)))

    # ---------------- UI: HUD, tabs, panels ----------------
    def build_ui(self):
        self.hud = ui_text('', position=(-0.85, 0.47), origin=(-0.5, 0.5), scale=1.4)
        self.msg = ui_text('', position=(0, 0.42), origin=(0, 0), scale=1.6)
        self.tab_btns = []
        for i, name in enumerate(TABS):
            b = ui_button(text=f'{TAB_ICONS[i]} {name}', scale=(0.13, 0.05),
                       position=(-0.78 + i * 0.155, -0.46))
            b.on_click = (lambda i=i: self.show_tab(i))
            self.tab_btns.append(b)
        # generic panel
        self.panel = Entity(parent=camera.ui, model='quad', color=color.rgb(16, 8, 34, 235),
                            scale=(1.5, 0.8), position=(0, 0.02), enabled=False)
        self.panel_title = ui_text('', parent=camera.ui, position=(0, 0.36), origin=(0, 0), scale=2, enabled=False)
        self.panel_body = ui_text('', parent=camera.ui, position=(-0.68, 0.28), origin=(-0.5, 0.5), scale=0.95, enabled=False)
        self.panel_btn = ui_button(text='', scale=(0.3, 0.06), position=(0, -0.36), enabled=False)
        self.shop_btn = ui_button(text='', scale=(0.3, 0.06), position=(0.0, -0.28), enabled=False)

    def show_tab(self, i):
        self.tab = i
        self.paused = (i != 0)
        mouse.locked = (i == 0 and self.state == 'play' and not self.orbit)
        mouse.visible = not mouse.locked
        for b in self.tab_btns:
            b.color = color.orange if self.tab_btns.index(b) == i else color.rgb(60, 30, 100)
        if i == 0:
            self.hide_panel()
        elif i == 1:
            lines = [f"{c['name']}  ({c['points']} pts)" for c in CANDIES]
            self.show_panel('Candy Vault', f'Collected: {self.collected_candy}\n' + '\n'.join(lines[:20]),
                            'Back to Maze', lambda: self.show_tab(0))
        elif i == 2:
            self.show_shop_panel()
        elif i == 3:
            comp = [g['name'] for g in GHOSTS[:8]]
            self.show_panel('Avatar World', 'Companions:\n' + '\n'.join(comp), 'Back to Maze', lambda: self.show_tab(0))
        elif i == 4:
            regions = ['Northgate Warren', 'Ember Deeps', 'The Heart', 'Lantern Row',
                       'Tangle Warrens', 'Gilded Warrens', 'Far Reaches', 'Howling Deeps']
            self.show_panel('Explore — Worlds Hub',
                            'Regions:\n' + '\n'.join(regions) + '\n\nWorlds: Maze 3D (here!), Graveyard 3D (orbit: press O)',
                            'Back to Maze', lambda: self.show_tab(0))
        elif i == 5:
            self.show_panel('Games', '\n'.join(n for _, n in MINIGAMES) + '\n\nPumpkin Smash is LIVE in the maze!',
                            'Play Pumpkin Smash', lambda: self.start_smash())
        elif i == 6:
            self.show_panel('Achievements', self.ach_text(), 'Back to Maze', lambda: self.show_tab(0))

    def ach_text(self):
        all_ach = [('first-candy', 'First Bite (grab candy)'), ('clear-1', 'Pathfinder (clear a depth)'),
                   ('first-pick', 'New Edge (first upgrade)'), ('void-drill', 'Maximum Spin (Void Drill)'),
                   ('level-5', 'Living Myth (level 5)'), ('score-1k', 'Score Legend (1,000 pts)'),
                   ('smash-10', 'Pumpkin Pro (smash 10)')]
        return '\n'.join(('UNLOCKED ' if a in self.ach else 'locked   ') + n for a, n in all_ach)

    def show_panel(self, title, body, btn_text, btn_fn, btn2_text='', btn2_fn=None):
        self.panel.enabled = True
        self.panel_title.enabled = True
        self.panel_body.enabled = True
        self.panel_btn.enabled = True
        self.panel_title.text = title
        self.panel_body.text = body
        self.panel_btn.text = btn_text
        self.panel_btn.on_click = btn_fn
        self.shop_btn.enabled = False

    def hide_panel(self):
        self.panel.enabled = False
        self.panel_title.enabled = False
        self.panel_body.enabled = False
        self.panel_btn.enabled = False
        self.shop_btn.enabled = False

    def show_shop_panel(self):
        nxt = E.PICKS[self.pick_idx + 1] if self.pick_idx + 1 < len(E.PICKS) else None
        cur = E.PICKS[self.pick_idx]['name']
        if nxt and self.gold >= nxt['cost']:
            self.show_panel('Mine Shop', f'Gold: {self.gold}\nWielding: {cur}\nNext: {nxt["name"]} ({nxt["cost"]} gold)',
                            f'Buy {nxt["name"]}', lambda: self.buy_pick())
        elif nxt:
            self.show_panel('Mine Shop', f'Gold: {self.gold}\nWielding: {cur}\nNext: {nxt["name"]} ({nxt["cost"]} gold) — need {nxt["cost"] - self.gold} more',
                            'Back to Maze', lambda: self.show_tab(0))
        else:
            self.show_panel('Mine Shop', f'Gold: {self.gold}\nWielding: {cur} (max!)',
                            'Back to Maze', lambda: self.show_tab(0))

    def buy_pick(self):
        nxt = E.PICKS[self.pick_idx + 1]
        if self.gold < nxt['cost']:
            return
        self.gold -= nxt['cost']
        self.pick_idx += 1
        self.score += 50
        if self.pick_idx == 1:
            self.unlock('first-pick', 'New Edge (first upgrade)')
        if E.PICKS[self.pick_idx]['name'] == 'Void Drill':
            self.unlock('void-drill', 'Maximum Spin (Void Drill)')
        self.show_shop_panel()
        self.refresh_hud()

    def start_smash(self):
        self.show_tab(0)
        mouse.locked = False
        mouse.visible = True
        self.smash_mode = True
        for _ in range(5):
            self.spawn_pumpkin()
        self.flash('SMASH the pumpkins! Click them!')

    def spawn_pumpkin(self):
        cells = list(self.cells)
        x, z = random.choice(cells)
        p = Entity(model='sphere', color=color.rgb(255, 110, 0), position=(x + 0.5, 0.5, z + 0.5),
                   scale=0.7, collider='box', name='pumpkin')
        p.on_click = lambda: self.smash(p)
        self.pumpkins.append(p)

    def smash(self, p):
        if p not in self.pumpkins:
            return
        self.pumpkins.remove(p)
        destroy(p)
        self.smashed += 1
        self.score += 25
        self.flash(f'SMASHED! +25 ({self.smashed})')
        if self.smashed >= 10:
            self.unlock('smash-10', 'Pumpkin Pro (smash 10)')
        self.spawn_pumpkin()
        self.refresh_hud()

    def refresh_hud(self):
        cfg = E.DEPTHS[self.depth]
        left = len(self.candies) + len(self.crystals)
        self.hud.text = (f'Score {E.compact(self.score)}  Depth {cfg["layer"]}  Left {left}  '
                         f'Gold {E.compact(self.gold)}  Lv {self.level}  {E.PICKS[self.pick_idx]["name"]}  '
                         f'Best {E.compact(self.best)}')

    # ---------------- events ----------------
    def die(self):
        self.state = 'dead'
        self.combo = 0
        self.save_best()
        mouse.locked = False
        mouse.visible = True
        self.show_panel('CAUGHT!', f'{self.ghost_info["name"]} got you.\nScore {E.compact(self.score)}  Best {E.compact(self.best)}',
                        'Try again', lambda: self.restart())

    def win(self):
        self.state = 'win'
        self.score += 1000
        self.save_best()
        mouse.locked = False
        mouse.visible = True
        self.show_panel('SPOOKTACULAR!', f'All 3 depths cleared!\nScore {E.compact(self.score)}  Best {E.compact(self.best)}',
                        'Play again', lambda: self.restart())

    def save_best(self):
        if self.score > self.best:
            self.best = self.score
            try:
                with open(SAVE, 'w') as f:
                    json.dump({'best3d': self.best}, f)
            except Exception:
                pass

    def restart(self):
        self.hide_panel()
        self.reset_run(new_seed=True)
        self.build_depth()
        self.state = 'play'
        self.show_tab(0)

    def depth_cleared(self):
        self.score += 250 * (self.depth + 1)
        self.gold += 30
        self.unlock('clear-1', 'Pathfinder (clear a depth)')
        if self.depth >= len(E.DEPTHS) - 1:
            self.win()
            return
        self.depth += 1
        self.build_depth()
        self.flash(f'Depth {self.depth + 1}: {E.DEPTHS[self.depth]["layer"]} — spend gold in the Mine tab!')
        self.refresh_hud()

    # ---------------- per-frame ----------------
    def walkable(self, x, z):
        return (x, z) in self.cells

    def circle_hits_wall(self, wx, wz, r=0.32):
        cx0, cz0 = math.floor(wx), math.floor(wz)
        for ox in (-1, 0, 1):
            for oz in (-1, 0, 1):
                cx, cz = cx0 + ox, cz0 + oz
                if self.walkable(cx, cz):
                    continue
                nx = min(max(wx, cx), cx + 1)
                nz = min(max(wz, cz), cz + 1)
                if (wx - nx) ** 2 + (wz - nz) ** 2 < r * r:
                    return True
        return False

    def update(self):
        self.anim_t += time.dt
        if self.flash_t > 0:
            self.flash_t -= time.dt
        if self.flash_t > 0:
            self.msg.text = self.flash_msg
        else:
            self.msg.text = ''
        if self.orbit or self.state == 'title':
            import time as _t
            cx, cz = self.w / 2, self.d / 2
            r = max(self.w, self.d) * 0.9
            a = _t.time() * 0.12
            camera.position = (cx + math.sin(a) * r, r * 0.7, cz + math.cos(a) * r)
            camera.look_at((cx, 0, cz))
            return
        if self.state != 'play' or self.paused:
            return
        # look
        if mouse.locked:
            self.yaw -= mouse.velocity[0] * 28
            self.pitch = max(-70, min(70, self.pitch - mouse.velocity[1] * 22))
        turn = (held_keys['right arrow'] - held_keys['left arrow']) * 90 * time.dt
        self.yaw += turn
        # move
        fw = held_keys['w'] + held_keys['up arrow'] - held_keys['s'] - held_keys['down arrow']
        st = held_keys['d'] - held_keys['a']
        sp = self.move_speed() * time.dt
        sy, cy = math.sin(math.radians(self.yaw)), math.cos(math.radians(self.yaw))
        # yaw=0 faces -z like the web build
        dx = (sy * fw + cy * st) * sp
        dz = (-cy * fw + sy * st) * sp
        if not self.circle_hits_wall(self.px + dx, self.pz):
            self.px += dx
        if not self.circle_hits_wall(self.px, self.pz + dz):
            self.pz += dz
        self.px = max(0.4, min(self.w - 0.4, self.px))
        self.pz = max(0.4, min(self.d - 0.4, self.pz))
        camera.position = (self.px, 1.15, self.pz)
        camera.rotation = (self.pitch, self.yaw, 0)
        # torch flicker
        for i, t in enumerate(self.torch_ents):
            t.scale = 0.2 + 0.05 * math.sin(self.anim_t * 7 + i * 1.7)
        self.update_ghost()
        self.update_pickups()
        self.refresh_hud()

    def update_ghost(self):
        g = self.ghost
        cfg = E.DEPTHS[self.depth]
        g['think'] -= time.dt
        if g['think'] <= 0:
            g['think'] = cfg['think']
            p = E.astar((math.floor(g['x']), math.floor(g['z'])),
                        (math.floor(self.px), math.floor(self.pz)),
                        lambda n: n in self.cells, 600)
            g['path'] = [(n[0] + 0.5, n[1] + 0.5) for n in p[1:]] if p and len(p) > 1 else []
        gs = cfg['ghost_speed'] * time.dt
        while gs > 0 and g['path']:
            tx, tz = g['path'][0]
            dx, dz = tx - g['x'], tz - g['z']
            dist = math.hypot(dx, dz)
            if dist < 1e-4:
                g['path'].pop(0)
                continue
            step = min(gs, dist)
            g['x'] += dx / dist * step
            g['z'] += dz / dist * step
            gs -= step
            if step >= dist - 1e-6:
                g['path'].pop(0)
        self.ghost_ent.position = (g['x'], 1.1 + 0.1 * math.sin(self.anim_t * 5), g['z'])
        if math.hypot(self.px - g['x'], self.pz - g['z']) < 0.8:
            self.die()

    def near(self, ax, az, bx, bz, r):
        return (ax - bx) ** 2 + (az - bz) ** 2 < r * r

    def update_pickups(self):
        changed = False
        for c in list(self.candies):
            if self.near(self.px, self.pz, c['x'], c['z'], 0.7):
                self.candies.remove(c)
                self.combo += 1
                self.streak += 1
                self.score += round((10 * E.combo_mult(self.combo) + E.streak_bonus(self.streak)) * self.dmg_mult())
                self.gold += round(2 * self.gold_mult())
                self.gain_xp(8)
                self.collected_candy += 1
                self.unlock('first-candy', 'First Bite (grab candy)')
                if self.score >= 1000:
                    self.unlock('score-1k', 'Score Legend (1,000 pts)')
                changed = True
        for c in list(self.crystals):
            if self.near(self.px, self.pz, c['x'], c['z'], 0.7):
                self.crystals.remove(c)
                self.combo += 2
                self.score += round(50 * E.combo_mult(self.combo) * self.dmg_mult())
                self.gold += round(5 * self.gold_mult())
                self.gain_xp(20)
                changed = True
        if self.relic_spot and self.near(self.px, self.pz, self.relic_spot['x'], self.relic_spot['z'], 0.7):
            owned = [r[0] for r in self.relics]
            pool = [r for r in E.RELICS if r[0] not in owned]
            if pool:
                relic = random.choice(pool)
                self.relics.append(relic)
                self.score += 150
                self.flash(f'Relic: {relic[0]} ({relic[1]} +{round(relic[2] * 100)}%)', 3)
            self.relic_spot = None
            changed = True
        if self.pond and not self.pond_used and self.near(self.px, self.pz, self.pond['x'], self.pond['z'], 0.8):
            self.pond_used = True
            bag = []
            for name, rarity, value in E.FISH:
                bag += [(name, rarity, value)] * E.FISH_WEIGHT[rarity]
            name, rarity, value = random.choice(bag)
            gv = round(value * self.gold_mult())
            self.gold += gv
            self.score += round(value * self.dmg_mult())
            self.flash(f'Caught {name} ({rarity}) +{gv} gold', 3)
            changed = True
        if changed:
            self.refresh_pickups()
        if not self.candies and not self.crystals:
            self.depth_cleared()

    def on_key(self, key):
        if key == 'escape':
            self.show_tab(0)
        if key == 'o':
            self.orbit = not self.orbit
            mouse.locked = (not self.orbit and self.tab == 0 and self.state == 'play')
            mouse.visible = not mouse.locked
        if key == 'enter' and self.state == 'title':
            self.state = 'play'
            self.show_tab(0)


game = None


def input(key):
    if game:
        game.on_key(key)


def update():
    if game:
        game.update()


def main():
    global game
    game = Game()
    game.show_panel('SPOOKTACULAR MINE 3D',
                    'Same mine, real 3D.\nWASD + mouse, arrows work too.\nGrab candy/crystals, find relics, fish ponds,\nspend gold in the Mine tab. Dodge the ghost!\nTabs below: Maze Candy Mine World Explore Games Achieve.',
                    'Descend!', lambda: (setattr(game, 'state', 'play'), game.show_tab(0)))
    game.app.run()


if __name__ == '__main__':
    main()
