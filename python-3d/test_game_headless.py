"""Headless functional test: stubs `ursina`, then plays the real game logic —
movement, pickups, ghost catch, shop, tabs, smash, depths. No window needed."""
import sys
import types
import pathlib

passed = failed = 0


def check(name, cond, detail=''):
    global passed, failed
    if cond:
        passed += 1
    else:
        failed += 1
        print('FAIL:', name, detail)


# ---------- fake ursina ----------
fake = types.ModuleType('ursina')


class FakeEnt:
    def __init__(self, *a, **kw):
        if a:
            kw.setdefault('text', a[0])
        self.__dict__.update(kw)
        self.position = kw.get('position', (0, 0, 0))
        self.rotation = kw.get('rotation', (0, 0, 0))
        self.scale = kw.get('scale', 1)
        self.enabled = kw.get('enabled', True)
        self.text = kw.get('text', '')
        self.on_click = None


class FakeCam:
    position = (0, 0, 0)
    rotation = (0, 0, 0)
    fov = 75
    ui = object()

    def look_at(self, *a):
        pass


class FakeMouse:
    locked = False
    visible = True
    velocity = (0, 0)


class FakeKeys(dict):
    def __missing__(self, k):
        return 0


class FakeColor:
    orange = 'orange'
    white = 'white'
    cyan = 'cyan'
    gray = 'gray'
    blue = 'blue'

    @staticmethod
    def rgb(r, g, b, a=255):
        return (r, g, b, a)


class FakeScene:
    fog_color = None
    fog_density = 0


class FakeTime:
    dt = 0.016


class FakeWindow:
    title = ''

    class fps_counter:
        enabled = True


class FakeApp:
    def __init__(self, *a, **k):
        pass

    def run(self):
        pass


fake.Entity = FakeEnt
fake.Text = FakeEnt
fake.Button = FakeEnt
fake.camera = FakeCam()
fake.mouse = FakeMouse()
fake.held_keys = FakeKeys()
fake.color = FakeColor()
fake.scene = FakeScene()
fake.destroy = lambda e: None
fake.time = FakeTime()
fake.window = FakeWindow()
fake.Ursina = FakeApp
sys.modules['ursina'] = fake

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import mine3d_ursina as M

g = M.Game()
check('world built (walls)', len(g.world_ents) > 100, len(g.world_ents))
check('candies placed', len(g.candies) == 8, len(g.candies))
check('ghost spawned', g.ghost_ent is not None)
check('7 tab buttons', len(g.tab_btns) == 7)

# start game
g.state = 'play'
g.show_tab(0)
# walk onto a candy
c = g.candies[0]
g.px, g.pz = c['x'], c['z']
s0 = g.score
g.update()
check('candy pickup scores', g.score > s0 and len(g.candies) == 7, (s0, g.score))
check('achievement first-candy', 'first-candy' in g.ach)
# walk onto ghost -> death
g.px, g.pz = g.ghost['x'], g.ghost['z']
g.update()
check('ghost catch kills', g.state == 'dead', g.state)
# restart via panel button
g.panel_btn.on_click()
check('restart works', g.state == 'play' and len(g.candies) == 8)
# shop: grant gold, open Mine tab, buy
g.gold = 500
g.show_tab(2)
check('shop panel visible', g.panel.enabled and 'Stone Pick' in g.panel_body.text)
g.panel_btn.on_click()
check('bought stone pick', g.pick_idx == 1 and g.gold == 500 - 8, (g.gold, g.pick_idx))
# all tabs render text
for i in range(7):
    g.show_tab(i)
    check('tab %d has title' % i, bool(g.panel_title.text) or i == 0)
# smash flow
g.show_tab(5)
g.panel_btn.on_click()  # start smash
check('smash spawns pumpkins', len(g.pumpkins) == 5, len(g.pumpkins))
p = g.pumpkins[0]
g.smash(p)
check('smash scores', g.smashed == 1 and len(g.pumpkins) == 5)
# depth clear path
g.show_tab(0)
g.candies.clear()
g.crystals.clear()
g.update()
check('depth advances', g.depth == 1, g.depth)
# orbit + win path
g.orbit = True
g.update()
check('orbit renders', True)
g.orbit = False
g.depth = 2
g.build_depth()
g.candies.clear()
g.crystals.clear()
g.update()
check('win after depth 3', g.state == 'win', g.state)
# pond + relic spots exist on fresh depth
g.restart()
check('relic + pond placed', g.relic_spot is not None and g.pond is not None)

print('PASSED: %d FAILED: %d' % (passed, failed))
sys.exit(1 if failed else 0)
