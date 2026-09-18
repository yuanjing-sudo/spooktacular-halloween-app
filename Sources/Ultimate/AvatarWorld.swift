import SwiftUI
import SceneKit
import AVFoundation

// ============================================================
// MARK: - Spooky synth sounds (generated, no audio files)
// ============================================================

final class AWSound {
    static let shared = AWSound()
    private var engine: AVAudioEngine?
    private init() {}

    private func ready() -> AVAudioEngine? {
        if let e = engine { return e }
        do {
            // NOTE: AVAudioSession is owned by SpookyMusic (single owner —
            // two engines fighting over the category caused dropouts).
            // Music also moved to SpookyMusic; this engine is SFX-only now.
            let e = AVAudioEngine()
            e.connect(e.mainMixerNode, to: e.outputNode, format: nil)
            try e.start()
            engine = e
            return e
        } catch { return nil }
    }

    /// Enveloped sine glide between two pitches, optional spooky wobble.
    private func glide(_ f0: Float, _ f1: Float, _ dur: Double, _ vol: Float = 0.22, wobble: Float = 0, delay: Double = 0) {
        let play = { [weak self] in
            guard SpookyMusic.shared.sfxEnabled else { return }
            guard let self = self, let e = self.ready() else { return }
            let sr = Float(e.outputNode.outputFormat(forBus: 0).sampleRate)
            guard sr > 0 else { return }
            var phase: Float = 0
            var t: Float = 0
            let total = Float(dur) * sr
            let node = AVAudioSourceNode { _, _, frameCount, audioBufferList -> OSStatus in
                let abl = UnsafeMutableAudioBufferListPointer(audioBufferList)
                for frame in 0..<Int(frameCount) {
                    let k = min(1, t / max(1, total))
                    var f = f0 + (f1 - f0) * k
                    if wobble > 0 { f += sin(2 * Float.pi * 6 * t / sr) * wobble }
                    phase += 2 * Float.pi * f / sr
                    let env = (1 - k) * (1 - k)
                    let s = sin(phase) * env * vol
                    for buf in abl {
                        buf.mData?.assumingMemoryBound(to: Float.self)[frame] = s
                    }
                    t += 1
                }
                return noErr
            }
            e.attach(node)
            e.connect(node, to: e.mainMixerNode, format: nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + dur + 0.2) { e.detach(node) }
        }
        if delay > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: play)
        } else {
            play()
        }
    }

    func coin() { glide(900, 1400, 0.12); glide(1400, 1800, 0.14, 0.22, delay: 0.09) }
    func cash() { glide(700, 1100, 0.12); glide(1100, 1500, 0.14, 0.22, delay: 0.09) }
    func shoot() { glide(800, 200, 0.18, 0.2) }
    func boom() { glide(160, 40, 0.4, 0.3) }
    func hurt() { glide(220, 90, 0.25, 0.28) }
    func portal() { glide(300, 900, 0.5, 0.2) }
    func jump() { glide(300, 600, 0.15, 0.18) }
    func boing() { glide(200, 600, 0.2, 0.22); glide(600, 250, 0.25, 0.22, delay: 0.15) }
    func star() { glide(660, 660, 0.1, 0.2); glide(880, 880, 0.1, 0.2, delay: 0.1); glide(1320, 1320, 0.16, 0.2, delay: 0.2) }
    func wail() { glide(400, 800, 0.5, 0.2, wobble: 60); glide(800, 300, 0.6, 0.2, wobble: 60, delay: 0.45) }
    func rumble() { glide(70, 45, 0.9, 0.3) }
    func squeak() { glide(2000, 3200, 0.09, 0.15) }
    /// Bat sneak-attack screech: vicious descending shriek with vibrato.
    func screech() {
        glide(3400, 1100, 0.35, 0.3, wobble: 220)
        glide(2800, 900, 0.4, 0.28, wobble: 180, delay: 0.3)
    }
    /// Deep-mine moan: low mournful swell for ambient ghost audio.
    func moan() { glide(420, 240, 0.9, 0.1, wobble: 30) }
    /// Cave water drip: tiny bright blip.
    func drip() { glide(1500, 750, 0.07, 0.07) }
    /// Bomb fuse hiss: rising sizzle.
    func hiss() { glide(300, 1400, 0.9, 0.12, wobble: 90) }
    func howl() { glide(300, 620, 0.7, 0.2, wobble: 40); glide(620, 260, 0.8, 0.2, wobble: 40, delay: 0.6) }
    func growl() { glide(120, 70, 0.4, 0.28) }

    // Generative haunted music box: slow minor pad + sparse bells, loops forever.
    private var musicOn = false
    private var chordIdx = 0
    func startMusic() {
        guard !musicOn else { return }
        guard ready() != nil else { return }
        musicOn = true
        scheduleBar()
    }
    func stopMusic() { musicOn = false }
    private func scheduleBar() {
        guard musicOn else { return }
        let roots: [Float] = [110, 87.3, 130.8, 98]
        let r = roots[chordIdx % roots.count]
        chordIdx += 1
        glide(r, r * 1.005, 3.8, 0.07)
        glide(r * 1.5, r * 1.5, 3.8, 0.05)
        glide(r * 2, r * 2.02, 3.0, 0.04)
        if Bool.random() {
            let scale: [Float] = [440, 523.25, 587.33, 659.25, 783.99]
            let n = scale.randomElement()!
            glide(n, n, 1.5, 0.06, delay: Double.random(in: 0.5...2.5))
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in self?.scheduleBar() }
    }
    func heal() { glide(500, 900, 0.3, 0.2) }
    func glug() { glide(300, 150, 0.15, 0.22); glide(280, 140, 0.15, 0.22, delay: 0.14) }
}

// ============================================================
// MARK: - Avatar World (Roblox-style animated 3D playground)
// Replaces the Quest tab. Smooth multi-shape avatar (spheres,
// capsules, cones, torus) with procedural walk / idle / jump /
// wave / dance animation — no cubes. Tap ground to walk to it.
// ============================================================

/// Animation state for an avatar rig.
enum AWAnimState {
    case idle, walking, jumping, waving, dancing
}

/// Palette for one avatar.
struct AWPalette {
    var skin: UIColor
    var shirt: UIColor
    var pants: UIColor
    var hair: UIColor
    var shoes: UIColor
}

// ============================================================
// MARK: - Manager (HUD state; per-frame sim runs on display link)
// ============================================================

final class AvatarWorldManager: ObservableObject {
    @Published var stars = 0
    @Published var totalStars = 8
    @Published var toast: String? = nil
    @Published var dancing = false
    @Published var celebrated = false

    // Sim state, mutated on the main-thread display link.
    var pos = SCNVector3(0, 0, 8)
    var yaw: Float = Float.pi
    var target: SCNVector3? = nil
    var vy: Float = 0
    var grounded = true
    var moving = false
    var waveUntil = Date.distantPast
    var shootQueued = false
    var camYaw: Float = 0
    var camDist: Float = 1.0
    var guideUntil = Date.distantPast
    var portalJumpQueued = false

    func rotateView(_ d: Float) { camYaw += d }
    func zoomBy(_ f: Float) { camDist = min(1.7, max(0.55, camDist * f)) }
    var walkPhase: Float = 0
    var danceSpin: Float = 0
    var blinkIn: Double = 2.5
    var blink: Double = 0
    var squash: Double = 0
    var starTaken: [Bool] = Array(repeating: false, count: 8)
    private var toastSeq = 0

    // Battle + economy + levels.
    @Published var hp = 100
    @Published var maxHp = 100
    @Published var gold = 0
    @Published var potions = 1
    @Published var level = 0
    @Published var boltDmg = 1
    let levelNames = ["🎃 Spooky Forest", "🫧 Ghost Cave", "🏚️ Haunted House", "🌋 Lava World", "🕳️ Tunnel Maze"]
    var hitCooldownUntil = Date.distantPast
    var bombs = 3
    var bombQueued = false

    func say(_ text: String) {
        toastSeq += 1
        let seq = toastSeq
        toast = text
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { [weak self] in
            if self?.toastSeq == seq { self?.toast = nil }
        }
    }

    func jump() {
        guard grounded else { return }
        vy = 5.4
        grounded = false
        AWSound.shared.jump()
    }

    func wave() {
        waveUntil = Date().addingTimeInterval(2.5)
    }

    /// Trade one healing potion for 30s of portal guidance.
    func buyGuide() {
        if Date() < guideUntil {
            let left = Int(guideUntil.timeIntervalSinceNow)
            say("🧭 Guide active (\(left)s)!")
            return
        }
        guard potions > 0 else { say("Need a 🧪 potion for the spirit guide!"); return }
        potions -= 1
        guideUntil = Date().addingTimeInterval(30)
        say("🧭 Spirit guide! Follow the gold arrow (30s)")
    }

    func drinkPotion() {
        guard potions > 0 else { say("No potions! Buy some 🛒"); return }
        guard hp < maxHp else { say("HP already full!"); return }
        potions -= 1
        hp = min(maxHp, hp + 50)
        say("🧪 +50 HP!")
        AWSound.shared.heal()
    }

    func buyPotion() {
        guard gold >= 30 else { say("Need 30 🪙 for a potion!"); return }
        gold -= 30
        potions += 1
        say("🧪 Bought healing potion!")
        AWSound.shared.cash()
    }

    func buyCharm() {
        guard gold >= 100 else { say("Need 100 🪙 for a heart charm!"); return }
        gold -= 100
        maxHp += 20
        hp = maxHp
        say("💖 Max HP up! Fully healed!")
        AWSound.shared.cash()
    }

    func buyPower() {
        guard gold >= 150 else { say("Need 150 🪙 for a power core!"); return }
        gold -= 150
        boltDmg += 1
        say("🔥 Blaster power up!")
        AWSound.shared.cash()
    }

    func buyBomb() {
        guard gold >= 15 else { say("Need 15 🪙 for a bomb!"); return }
        gold -= 15
        bombs += 1
        say("🧨 Bought a bomb!")
        AWSound.shared.cash()
    }
}

// ============================================================
// MARK: - SceneKit View
// ============================================================

struct AvatarWorldSceneView: UIViewRepresentable {
    @ObservedObject var manager: AvatarWorldManager

    func makeCoordinator() -> Coordinator { Coordinator(manager: manager) }

    func makeUIView(context: Context) -> SCNView {
        let v = SCNView()
        v.scene = context.coordinator.scene
        v.backgroundColor = UIColor(red: 0.53, green: 0.81, blue: 0.92, alpha: 1)
        v.autoenablesDefaultLighting = false
        v.allowsCameraControl = false
        v.preferredFramesPerSecond = 60
        v.isPlaying = true
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        v.addGestureRecognizer(tap)
        let pinch = UIPinchGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePinch(_:)))
        v.addGestureRecognizer(pinch)
        context.coordinator.begin(in: v)
        return v
    }

    func updateUIView(_ view: SCNView, context: Context) {
        context.coordinator.manager = manager
    }

    // ---------- NPC ----------
    final class AWNPC {
        var root = SCNNode()
        var joints: [String: SCNNode] = [:]
        var eyes: [SCNNode] = []
        var wp = SCNVector3(0, 0, 0)
        var wait: Double = 0
        var phase: Float = 0
        var yaw: Float = 0
        var waving = false
    }

    // ---------- Enemy ghost ----------
    final class AWGhost {
        var root = SCNNode()
        var body: SCNNode? = nil
        var mouth: SCNNode? = nil
        var noticed = false
        var home: Int = -1
        var isMob = false
        var mobName = "👻 Ghost"
        var touchDmg = 10
        var moveSpeed: Float = 2.4
        var hp = 2
        var maxHp = 2
        var phase: Float = 0
        var yaw: Float = 0
        var wp = SCNVector3(0, 0, 0)
        var wait: Double = 0
        var flash: Double = 0
        var chasing = false
    }

    // ---------- Ghost-hunter bolt ----------
    struct AWBolt {
        var node: SCNNode
        var vel: SCNVector3
        var life: Double
    }

    // ---------- Pickups & portals ----------
    struct AWPickup {
        var node: SCNNode
        var kind: Int // 0 = coin (respawns), 1 = potion drop (one-shot)
        var respawnAt: Double
        var spot: SCNVector3
    }

    struct AWPortal {
        var node: SCNNode
        var toLevel: Int
        var hinted = false
    }

    struct AWBat {
        var root: SCNNode
        var wingL: SCNNode
        var wingR: SCNNode
        var angle: Float
        var speed: Float
        var radius: Float
        var cy: Float
        var respawnAt: Double
    }

    struct AWBomb {
        var node: SCNNode
        var vel: SCNVector3
        var fuse: Double
    }

    final class AWWolf {
        var root = SCNNode()
        var legs: [SCNNode] = []
        var tail = SCNNode()
        var head = SCNNode()
        var yaw: Float = 0
        var wp = SCNVector3(0, 0, 0)
        var wait: Double = 0
        var phase: Float = 0
        var hp = 2
        var noticed = false
    }

    final class Coordinator: NSObject {
        var manager: AvatarWorldManager
        let scene = SCNScene()
        private var link: CADisplayLink?
        private var lastT = CACurrentMediaTime()

        // Player rig joints.
        private var rig = SCNNode()
        private var joints: [String: SCNNode] = [:]
        private var eyes: [SCNNode] = []
        private var cam = SCNNode()
        private var npcs: [AWNPC] = []
        private var starNodes: [SCNNode] = []
        private var cloudNodes: [SCNNode] = []
        private var themeRoot = SCNNode()
        private var ghosts: [AWGhost] = []
        private var bolts: [AWBolt] = []
        private var pickups: [AWPickup] = []
        private var portals: [AWPortal] = []
        private var bubbles: [SCNNode] = []
        private var groundNode: SCNNode? = nil
        private var ghostTimer: Double = 0
        private var guideArrow: SCNNode? = nil
        private var eruptT: Double = 3
        private var ambushT: Double = 12
        private var mists: [SCNNode] = []
        private var bats: [AWBat] = []
        private var volcanoSpots: [SCNVector3] = []
        private var ambNode: SCNNode? = nil
        private var flickerLights: [SCNNode] = []
        private var jackGlows: [SCNMaterial] = []
        private var stepT: Double = 0
        private var boltT: Double = 6
        private var howlT: Double = 10
        private var wolves: [AWWolf] = []
        private var bombs: [AWBomb] = []
        private var blockers: [(Float, Float, Float)] = []
        private var mazePortal: SCNNode? = nil
        private let starSpots: [SCNVector3] = [
            SCNVector3(20, 0.8, -14), SCNVector3(-26, 0.8, -20), SCNVector3(34, 0.8, 18),
            SCNVector3(-36, 0.8, 14), SCNVector3(0, 0.8, -38), SCNVector3(10, 0.8, 38),
            SCNVector3(-14, 0.8, -34), SCNVector3(40, 0.8, -24),
        ]
        private let worldR: Float = 110

        init(manager: AvatarWorldManager) {
            self.manager = manager
            super.init()
            buildWorld()
        }

        deinit { link?.invalidate() }

        func begin(in view: SCNView) {
            link?.invalidate()
            lastT = CACurrentMediaTime()
            let l = CADisplayLink(target: self, selector: #selector(step))
            l.add(to: .main, forMode: .common)
            link = l
            _ = view
        }

        // ================= Tap to move =================
        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard gesture.state == .ended, let view = gesture.view as? SCNView else { return }
            let loc = gesture.location(in: view)
            guard let hit = view.hitTest(loc, options: nil).first else { return }
            var n: SCNNode? = hit.node
            var groundHit = false
            var starHit = false
            while n != nil {
                if n!.name == "ground" { groundHit = true; break }
                if n!.name == "star" { starHit = true; break }
                n = n!.parent
            }
            guard groundHit || starHit else { return }
            var p = hit.worldCoordinates
            let d = sqrt(p.x * p.x + p.z * p.z)
            if d > worldR { p.x *= worldR / d; p.z *= worldR / d }
            p.y = 0
            manager.target = p
            manager.dancing = false
            spawnRing(at: p)
        }

        @objc func handlePinch(_ gesture: UIPinchGestureRecognizer) {
            if gesture.state == .changed {
                manager.zoomBy(1 / Float(gesture.scale))
                gesture.scale = 1
            }
        }

        // ================= Per-frame sim =================
        @objc func step() {
            let now = CACurrentMediaTime()
            var dt = now - lastT
            lastT = now
            if dt > 0.1 { dt = 0.1 }
            integrate(dt: dt, now: now)
            posePlayer(dt: dt, now: now)
            updateNPCs(dt: dt, now: now)
            updateStars(dt: dt, now: now)
            if manager.shootQueued { manager.shootQueued = false; fireBolt() }
            if manager.portalJumpQueued {
                manager.portalJumpQueued = false
                if !portalHop() { manager.jump() }
            }
            updateGhosts(dt: dt, now: now)
            updateBolts(dt: dt, now: now)
            updatePickups(dt: dt, now: now)
            updatePortals(dt: dt, now: now)
            updateGuide(now: now)
            updateBubbles(dt: dt)
            updateMists(dt: dt)
            updateBats(dt: dt, now: now)
            updateVolcano(dt: dt)
            updateLighting(dt: dt, now: now)
            updateWolves(dt: dt, now: now)
            updateBombs(dt: dt, now: now)
            updateClouds(dt: dt)
            updateCamera(dt: dt)
        }

        private func integrate(dt: Double, now: Double) {
            let m = manager
            // Walk toward tap target.
            m.moving = false
            if let t = m.target {
                let dx = t.x - m.pos.x, dz = t.z - m.pos.z
                let dist = sqrt(dx * dx + dz * dz)
                if dist < 0.2 {
                    m.target = nil
                } else {
                    let want = atan2(dx, dz)
                    m.yaw = lerpAngle(m.yaw, want, Float(min(1, dt * 10)))
                    let sp: Float = 3.6
                    m.pos.x += sin(m.yaw) * sp * Float(dt)
                    m.pos.z += cos(m.yaw) * sp * Float(dt)
                    m.walkPhase += Float(dt) * sp * 3.4
                    m.moving = true
                    stepT -= dt
                    if stepT <= 0 {
                        stepT = 0.32
                        spawnRing(at: m.pos)
                    }
            }
            // Solid props push back (maze stones, houses, volcanoes).
            for b in blockers {
                let ox = m.pos.x - b.0, oz = m.pos.z - b.1
                let dd = sqrt(ox * ox + oz * oz)
                let minD = b.2 + 0.5
                if dd < minD && dd > 0.001 {
                    m.pos.x = b.0 + ox / dd * minD
                    m.pos.z = b.1 + oz / dd * minD
                }
            }
            }
            // Jump physics.
            if !m.grounded {
                m.vy += -13.5 * Float(dt)
                m.pos.y += m.vy * Float(dt)
                if m.pos.y <= 0 {
                    m.pos.y = 0; m.vy = 0; m.grounded = true
                    m.squash = 0.18
                    spawnRing(at: m.pos)
                    spawnBurst(at: SCNVector3(m.pos.x, 0.2, m.pos.z), colors: [.white, .white, .gray], count: 6)
                }
            }
            if m.squash > 0 { m.squash -= dt }
            // Blink timer.
            m.blinkIn -= dt
            if m.blinkIn <= 0 { m.blink = 0.12; m.blinkIn = Double.random(in: 2.5...5) }
            if m.blink > 0 { m.blink -= dt }
            // Trampoline pad: big bounce.
            if m.grounded {
                let dx = m.pos.x + 4, dz = m.pos.z - 2
                if dx * dx + dz * dz < 1.44 {
                    m.vy = 9.5; m.grounded = false
                    m.say("🌀 Boing!")
                    AWSound.shared.boing()
                }
            }
            _ = now
        }

        private func animState() -> AWAnimState {
            let m = manager
            if !m.grounded { return .jumping }
            if m.dancing { return .dancing }
            if Date() < m.waveUntil { return .waving }
            if m.moving { return .walking }
            return .idle
        }

        /// Ease a joint toward target angles — kills all pose snapping.
        private func dampJ(_ n: SCNNode?, x: Float? = nil, y: Float? = nil, z: Float? = nil, rate: Float = 16, dt: Double) {
            guard let n = n else { return }
            var e = n.eulerAngles
            let k = min(1, rate * Float(dt))
            if let x = x { e.x += (x - e.x) * k }
            if let y = y { e.y += (y - e.y) * k }
            if let z = z { e.z += (z - e.z) * k }
            n.eulerAngles = e
        }

        private func posePlayer(dt: Double, now: Double) {
            let m = manager
            rig.position = SCNVector3(m.pos.x, m.pos.y, m.pos.z)
            let st = animState()
            switch st {
            case .walking:
                let s = sin(m.walkPhase)
                dampJ(joints["armL"], x: s * 0.75, dt: dt)
                dampJ(joints["armR"], x: -s * 0.75, dt: dt)
                dampJ(joints["legL"], x: -s * 0.85, dt: dt)
                dampJ(joints["legR"], x: s * 0.85, dt: dt)
                dampJ(joints["armL"], z: 0.12, dt: dt)
                dampJ(joints["armR"], z: -0.12, dt: dt)
                rig.position.y += abs(cos(m.walkPhase)) * 0.06
                dampJ(joints["torso"], x: 0.12, dt: dt)
                dampJ(joints["head"], x: 0, z: 0, dt: dt)
                rig.eulerAngles.y = m.yaw
            case .idle:
                let t = Float(now)
                dampJ(joints["armL"], x: sin(t * 2) * 0.05, dt: dt)
                dampJ(joints["armR"], x: -sin(t * 2) * 0.05, dt: dt)
                dampJ(joints["armL"], z: 0.09, dt: dt)
                dampJ(joints["armR"], z: -0.09, dt: dt)
                dampJ(joints["legL"], x: 0, dt: dt)
                dampJ(joints["legR"], x: 0, dt: dt)
                joints["torso"]?.scale.y = 1 + sin(t * 2) * 0.015
                dampJ(joints["torso"], x: 0, dt: dt)
                dampJ(joints["head"], y: sin(t * 0.7) * 0.15, z: 0, dt: dt)
                rig.eulerAngles.y = m.yaw
            case .jumping:
                dampJ(joints["legL"], x: -0.55, dt: dt)
                dampJ(joints["legR"], x: 0.35, dt: dt)
                dampJ(joints["armL"], x: -2.5, dt: dt)
                dampJ(joints["armR"], x: -2.5, dt: dt)
                dampJ(joints["armL"], z: 0.3, dt: dt)
                dampJ(joints["armR"], z: -0.3, dt: dt)
                dampJ(joints["head"], x: -0.15, z: 0, dt: dt)
                dampJ(joints["torso"], x: 0, dt: dt)
                rig.eulerAngles.y = m.yaw
            case .waving:
                let t = Float(now)
                dampJ(joints["legL"], x: 0, dt: dt)
                dampJ(joints["legR"], x: 0, dt: dt)
                dampJ(joints["armL"], x: sin(t * 2) * 0.06, dt: dt)
                dampJ(joints["armL"], z: 0.12, dt: dt)
                dampJ(joints["armR"], x: -2.75, dt: dt)
                dampJ(joints["armR"], z: -0.25 + sin(t * 9) * 0.35, dt: dt)
                rig.position.y += abs(sin(t * 4.5)) * 0.05
                dampJ(joints["head"], z: sin(t * 4.5) * 0.06, dt: dt)
                dampJ(joints["torso"], x: 0, dt: dt)
                rig.eulerAngles.y = m.yaw
            case .dancing:
                let t = Float(now)
                m.danceSpin += Float(dt) * 3.2
                rig.eulerAngles.y = m.yaw + m.danceSpin
                rig.position.y += abs(sin(t * 7)) * 0.12
                dampJ(joints["armL"], z: 1.5, rate: 10, dt: dt)
                dampJ(joints["armR"], z: -1.5, rate: 10, dt: dt)
                dampJ(joints["armL"], x: sin(t * 7) * 0.5, rate: 10, dt: dt)
                dampJ(joints["armR"], x: -sin(t * 7) * 0.5, rate: 10, dt: dt)
                dampJ(joints["legL"], x: sin(t * 7) * 0.4, rate: 10, dt: dt)
                dampJ(joints["legR"], x: -sin(t * 7) * 0.4, rate: 10, dt: dt)
                dampJ(joints["head"], z: sin(t * 3.5) * 0.12, dt: dt)
                dampJ(joints["torso"], x: 0, dt: dt)
            }
            if st != .dancing { m.danceSpin = 0 }
            // Landing squash.
            let sq: Float = m.squash > 0 ? 1 - 0.22 * Float(m.squash / 0.18) : 1
            rig.scale = SCNVector3(2 - sq > 1 ? 1 + (1 - sq) * 0.6 : 1, sq, 1)
            // Blink.
            let eo: Float = m.blink > 0 ? 0.12 : 1
            for e in eyes { e.scale.y = eo }
            _ = dt
        }

        private func updateNPCs(dt: Double, now: Double) {
            for npc in npcs {
                let dx = manager.pos.x - npc.root.position.x
                let dz = manager.pos.z - npc.root.position.z
                let playerDist = sqrt(dx * dx + dz * dz)
                if playerDist < 3.2 {
                    // Face player and wave hello.
                    npc.yaw = lerpAngle(npc.yaw, atan2(dx, dz), Float(min(1, dt * 6)))
                    npc.root.eulerAngles.y = npc.yaw
                    let t = Float(now)
                    dampJ(npc.joints["armR"], x: -2.75, dt: dt)
                    dampJ(npc.joints["armR"], z: -0.25 + sin(t * 9) * 0.35, dt: dt)
                    dampJ(npc.joints["armL"], x: 0, dt: dt)
                    dampJ(npc.joints["legL"], x: 0, dt: dt)
                    dampJ(npc.joints["legR"], x: 0, dt: dt)
                    npc.waving = true
                } else {
                    npc.waving = false
                    if npc.wait > 0 {
                        npc.wait -= dt
                        dampJ(npc.joints["armL"], x: 0, dt: dt)
                        dampJ(npc.joints["armR"], x: 0, dt: dt)
                        dampJ(npc.joints["legL"], x: 0, dt: dt)
                        dampJ(npc.joints["legR"], x: 0, dt: dt)
                    } else {
                        let tx = npc.wp.x - npc.root.position.x
                        let tz = npc.wp.z - npc.root.position.z
                        let d = sqrt(tx * tx + tz * tz)
                        if d < 0.3 {
                            npc.wait = Double.random(in: 2...5)
                            npc.wp = randomPoint()
                        } else {
                            npc.yaw = lerpAngle(npc.yaw, atan2(tx, tz), Float(min(1, dt * 5)))
                            npc.root.eulerAngles.y = npc.yaw
                            npc.root.position.x += sin(npc.yaw) * 1.3 * Float(dt)
                            npc.root.position.z += cos(npc.yaw) * 1.3 * Float(dt)
                            npc.phase += Float(dt) * 4.4
                            let s = sin(npc.phase)
                            dampJ(npc.joints["armL"], x: s * 0.7, dt: dt)
                            dampJ(npc.joints["armR"], x: -s * 0.7, dt: dt)
                            dampJ(npc.joints["legL"], x: -s * 0.8, dt: dt)
                            dampJ(npc.joints["legR"], x: s * 0.8, dt: dt)
                            npc.root.position.y = abs(cos(npc.phase)) * 0.05
                        }
                    }
                }
                // NPC blink.
                let eo2: Float = (now.truncatingRemainder(dividingBy: 4) < 0.12) ? 0.12 : 1
                for e in npc.eyes { e.scale.y = eo2 }
            }
        }

        private func updateStars(dt: Double, now: Double) {
            for (i, n) in starNodes.enumerated() {
                if manager.starTaken[i] { continue }
                n.eulerAngles.y += Float(dt) * 2.2
                n.position.y = 0.8 + sin(Float(now) * 2 + Float(i)) * 0.15
                let dx = manager.pos.x - n.position.x
                let dz = manager.pos.z - n.position.z
                if dx * dx + dz * dz < 1.0 && manager.pos.y < 1.6 {
                    manager.starTaken[i] = true
                    n.isHidden = true
                    manager.stars += 1
                    spawnBurst(at: n.position, colors: [.yellow, .orange, .white], count: 14)
                    if manager.stars >= manager.totalStars && !manager.celebrated {
                        manager.celebrated = true
                        manager.say("🏆 All 8 stars! Superstar!")
                        spawnBurst(at: SCNVector3(manager.pos.x, manager.pos.y + 1.5, manager.pos.z),
                                   colors: [.red, .yellow, .green, .blue, .purple], count: 40)
                    } else {
                        manager.say("⭐ Star \(manager.stars)/\(manager.totalStars)!")
                        AWSound.shared.star()
                    }
                }
            }
        }

        // ================= Ghost combat =================
        private func ghostTint() -> UIColor {
            switch manager.level {
            case 1: return UIColor(red: 0.7, green: 0.9, blue: 1, alpha: 1)
            case 2: return UIColor(red: 0.8, green: 0.75, blue: 0.95, alpha: 1)
            case 3: return UIColor(red: 1, green: 0.82, blue: 0.75, alpha: 1)
            default: return UIColor(red: 0.87, green: 0.95, blue: 0.87, alpha: 1)
            }
        }

        private func buildGhost() -> AWGhost {
            let g = AWGhost()
            let tint = ghostTint()
            let body = SCNNode(geometry: SCNCapsule(capRadius: 0.34, height: 0.75))
            body.geometry?.materials = [mat(tint)]
            body.position = SCNVector3(0, 1.05, 0)
            g.root.addChildNode(body)
            g.body = body
            let wisp = SCNNode(geometry: SCNCone(topRadius: 0.32, bottomRadius: 0.04, height: 0.55))
            wisp.geometry?.materials = [mat(tint)]
            wisp.position = SCNVector3(0, 0.35, 0)
            g.root.addChildNode(wisp)
            for side in [-0.13, 0.13] {
                let eye = SCNNode(geometry: SCNSphere(radius: 0.07))
                eye.geometry?.materials = [mat(.red, emission: .red)]
                eye.position = SCNVector3(Float(side), 1.2, 0.28)
                g.root.addChildNode(eye)
            }
            let mouth = SCNNode(geometry: SCNSphere(radius: 0.08))
            mouth.geometry?.materials = [mat(.black)]
            mouth.scale = SCNVector3(1, 1.3, 0.5)
            mouth.position = SCNVector3(0, 0.95, 0.29)
            g.root.addChildNode(mouth)
            g.mouth = mouth
            for side in [-0.42, 0.42] {
                let arm = SCNNode(geometry: SCNCapsule(capRadius: 0.09, height: 0.35))
                arm.geometry?.materials = [mat(tint)]
                arm.position = SCNVector3(Float(side), 1.0, 0)
                arm.eulerAngles.z = Float(side > 0 ? -0.5 : 0.5)
                g.root.addChildNode(arm)
            }
            var p = randomPoint()
            for _ in 0..<6 {
                let dx = p.x - manager.pos.x, dz = p.z - manager.pos.z
                if dx * dx + dz * dz > 144 { break }
                p = randomPoint()
            }
            g.root.position = SCNVector3(p.x, 0, p.z)
            g.wp = randomPoint()
            scene.rootNode.addChildNode(g.root)
            return g
        }

        private func updateGhosts(dt: Double, now: Double) {
            ghostTimer -= dt
            if ghostTimer <= 0 {
                ghostTimer = 4
                if ghosts.count < 6 { ghosts.append(buildGhost()) }
            }
            // Surprise ambush: something bursts out of the dark nearby.
            // Inside the maze they come twice as often — mummies included.
            ambushT -= dt
            if ambushT <= 0 {
                let inMaze = manager.level == 4
                ambushT = Double.random(in: inMaze ? 7...12 : 16...24)
                if ghosts.count < 6 {
                    let a = Float.random(in: 0...Float.pi * 2)
                    let near = SCNVector3(manager.pos.x + cos(a) * 3.2, 0, manager.pos.z + sin(a) * 3.2)
                    if inMaze && Bool.random() {
                        let mm = buildMob(kind: 2, at: near, home: 4)
                        mm.wp = SCNVector3(60, 0, 60)
                    } else {
                        let g = buildGhost()
                        g.root.position = near
                        ghosts.append(g)
                    }
                    spawnBurst(at: SCNVector3(near.x, 1.2, near.z), colors: [.purple, .black], count: 14)
                    manager.say(inMaze ? "🧻 A mummy lunges from the dark!" : "👻 Ambush! Behind you!")
                }
            }
            for g in ghosts {
                if g.home >= 0 && g.home != manager.level {
                    g.root.isHidden = true
                    continue
                }
                g.root.isHidden = false
                g.phase += Float(dt) * 3
                if g.flash > 0 { g.flash -= dt }
                let dx = manager.pos.x - g.root.position.x
                let dz = manager.pos.z - g.root.position.z
                let dist = sqrt(dx * dx + dz * dz)
                g.chasing = dist < 11
                if g.chasing {
                    g.yaw = lerpAngle(g.yaw, atan2(dx, dz), Float(min(1, dt * 5)))
                    g.root.position.x += sin(g.yaw) * g.moveSpeed * Float(dt)
                    g.root.position.z += cos(g.yaw) * g.moveSpeed * Float(dt)
                } else if g.wait > 0 {
                    g.wait -= dt
                } else {
                    let tx = g.wp.x - g.root.position.x
                    let tz = g.wp.z - g.root.position.z
                    if sqrt(tx * tx + tz * tz) < 0.5 {
                        g.wait = Double.random(in: 2...5)
                        g.wp = randomPoint()
                    } else {
                        g.yaw = lerpAngle(g.yaw, atan2(tx, tz), Float(min(1, dt * 4)))
                        g.root.position.x += sin(g.yaw) * 1.2 * Float(dt)
                        g.root.position.z += cos(g.yaw) * 1.2 * Float(dt)
                        g.phase += Float(dt) * 2
                    }
                }
                g.root.eulerAngles.y = g.yaw
                g.root.position.y = abs(sin(g.phase)) * 0.25
                g.root.eulerAngles.z = sin(g.phase * 0.7) * 0.08
                if let b = g.body, !g.isMob {
                    let c: UIColor = g.flash > 0 ? .white : (g.chasing ? UIColor(red: 1, green: 0.45, blue: 0.45, alpha: 1) : ghostTint())
                    b.geometry?.materials = [mat(c, emission: g.chasing ? .red : nil)]
                }
                g.mouth?.scale.y = g.chasing ? 2.0 : 1.3
                if g.chasing && !g.noticed {
                    g.noticed = true
                    if g.isMob {
                        manager.say("\(g.mobName) spots you!")
                        AWSound.shared.growl()
                    } else {
                        manager.say("👻 It sees you! RUN!")
                    }
                } else if !g.chasing {
                    g.noticed = false
                }
                if dist < 1.0 && Date() > manager.hitCooldownUntil {
                    manager.hitCooldownUntil = Date().addingTimeInterval(1.0)
                    hurtPlayer(g.touchDmg, from: g.root.position)
                }
            }
            _ = now
        }

        private func hurtPlayer(_ dmg: Int, from: SCNVector3) {
            let m = manager
            m.hp -= dmg
            let dx = m.pos.x - from.x, dz = m.pos.z - from.z
            let d = max(0.01, sqrt(dx * dx + dz * dz))
            m.pos.x += dx / d * 1.2
            m.pos.z += dz / d * 1.2
            spawnBurst(at: SCNVector3(m.pos.x, m.pos.y + 1.2, m.pos.z), colors: [.red, .red, .white], count: 10)
            if m.hp <= 0 {
                m.hp = m.maxHp
                m.pos = SCNVector3(0, 0, 8)
                m.target = nil
                m.say("💀 The ghosts got you! Back to start.")
            } else {
                m.say("👻 Ouch! -\(dmg) HP! Drink 🧪!")
                AWSound.shared.hurt()
            }
        }

        private func fireBolt() {
            let m = manager
            let eye = SCNVector3(m.pos.x, m.pos.y + 1.3, m.pos.z)
            var best: AWGhost? = nil
            var bestD: Float = 16
            for g in ghosts {
                let dx = g.root.position.x - eye.x
                let dz = g.root.position.z - eye.z
                let d = sqrt(dx * dx + dz * dz)
                if d < bestD { bestD = d; best = g }
            }
            guard let target = best else { m.say("🔫 No ghosts in range!"); return }
            let tp = SCNVector3(target.root.position.x, 1.1, target.root.position.z)
            var dir = SCNVector3(tp.x - eye.x, tp.y - eye.y, tp.z - eye.z)
            let len = max(0.01, sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z))
            dir = SCNVector3(dir.x / len, dir.y / len, dir.z / len)
            let bolt = SCNNode(geometry: SCNSphere(radius: 0.13))
            bolt.geometry?.materials = [mat(.cyan, emission: .cyan)]
            bolt.position = eye
            scene.rootNode.addChildNode(bolt)
            bolts.append(AWBolt(node: bolt, vel: SCNVector3(dir.x * 18, dir.y * 18, dir.z * 18), life: 1.2))
            AWSound.shared.shoot()
        }

        private func updateBolts(dt: Double, now: Double) {
            var dead: [Int] = []
            for (i, b) in bolts.enumerated() {
                var nb = b
                nb.life -= dt
                nb.node.position = SCNVector3(b.node.position.x + b.vel.x * Float(dt),
                                             b.node.position.y + b.vel.y * Float(dt),
                                             b.node.position.z + b.vel.z * Float(dt))
                var hit = false
                if nb.life > 0 {
                    // Exploding bats: bonk one mid-flight for bonus gold.
                    for bi in bats.indices {
                        let bnode = bats[bi].root
                        if bnode.isHidden { continue }
                        let bx = bnode.position.x - nb.node.position.x
                        let by = bnode.position.y - nb.node.position.y
                        let bz = bnode.position.z - nb.node.position.z
                        if bx * bx + by * by + bz * bz < 0.36 {
                            hit = true
                            manager.gold += 2
                            manager.say("🦇 Bat bonk! +2 🪙")
                            AWSound.shared.squeak()
                            spawnBurst(at: bnode.position, colors: [.black, .purple], count: 10)
                            bnode.isHidden = true
                            bats[bi].respawnAt = now + 5
                            break
                        }
                    }
                    // Bolts also drive off wolves.
                    if !hit {
                        for w in wolves where !w.root.isHidden {
                            let dx = w.root.position.x - nb.node.position.x
                            let dy = 0.6 - nb.node.position.y
                            let dz = w.root.position.z - nb.node.position.z
                            if dx * dx + dy * dy + dz * dz < 0.64 {
                                hit = true
                                w.hp -= manager.boltDmg
                                if w.hp <= 0 {
                                    spawnBurst(at: SCNVector3(w.root.position.x, 0.8, w.root.position.z), colors: [.gray, .black], count: 14)
                                    let reward = Int.random(in: 8...12)
                                    manager.gold += reward
                                    manager.say("🐺 Wolf driven off! +\(reward) 🪙")
                                    AWSound.shared.howl()
                                    w.root.removeFromParentNode()
                                    wolves.removeAll { $0 === w }
                                }
                                break
                            }
                        }
                    }
                    for g in ghosts {
                        let dx = g.root.position.x - nb.node.position.x
                        let dy = 1.0 - nb.node.position.y
                        let dz = g.root.position.z - nb.node.position.z
                        if dx * dx + dy * dy + dz * dz < 0.64 {
                            hit = true
                            g.hp -= manager.boltDmg
                            g.flash = 0.12
                            g.root.position.x += b.vel.x * 0.008
                            g.root.position.z += b.vel.z * 0.008
                            if g.hp <= 0 { killGhost(g) }
                            break
                        }
                    }
                }
                if hit || nb.life <= 0 {
                    nb.node.removeFromParentNode()
                    dead.append(i)
                } else {
                    bolts[i] = nb
                }
            }
            for i in dead.reversed() { bolts.remove(at: i) }
        }

        private func killGhost(_ g: AWGhost) {
            spawnBurst(at: SCNVector3(g.root.position.x, 1.1, g.root.position.z),
                       colors: [.white, .purple, .cyan], count: 18)
            let reward = Int.random(in: 5...15)
            manager.gold += reward
            manager.say("\(g.isMob ? g.mobName + " smashed!" : "👻 Ghost blasted!") +\(reward) 🪙")
            AWSound.shared.boom()
            if Double.random(in: 0...1) < 0.3 {
                let drop = SCNNode(geometry: SCNSphere(radius: 0.22))
                drop.geometry?.materials = [mat(.green, emission: .green)]
                drop.position = SCNVector3(g.root.position.x, 0.6, g.root.position.z)
                scene.rootNode.addChildNode(drop)
                pickups.append(AWPickup(node: drop, kind: 1, respawnAt: 0, spot: drop.position))
            }
            g.root.removeFromParentNode()
            ghosts.removeAll { $0 === g }
        }

        private func updatePickups(dt: Double, now: Double) {
            for idx in pickups.indices {
                var p = pickups[idx]
                if p.node.isHidden {
                    if p.kind == 0 && now > p.respawnAt {
                        p.node.isHidden = false
                        pickups[idx] = p
                    }
                    continue
                }
                p.node.eulerAngles.y += Float(dt) * 2.5
                if p.kind == 1 { p.node.position.y = 0.6 + sin(Float(now) * 3) * 0.12 }
                let dx = manager.pos.x - p.node.position.x
                let dz = manager.pos.z - p.node.position.z
                if dx * dx + dz * dz < 1.2 && manager.pos.y < 1.6 {
                    if p.kind == 0 {
                        manager.gold += 5
                        manager.say("+5 🪙!")
                        AWSound.shared.coin()
                        spawnBurst(at: p.node.position, colors: [.yellow], count: 8)
                        p.node.isHidden = true
                        p.respawnAt = now + 15
                        pickups[idx] = p
                    } else {
                        manager.potions += 1
                        manager.say("🧪 Found a healing potion!")
                        spawnBurst(at: p.node.position, colors: [.green], count: 8)
                        p.node.removeFromParentNode()
                        pickups.remove(at: idx)
                        return
                    }
                }
            }
        }

        private func updatePortals(dt: Double, now: Double) {
            for i in portals.indices {
                let pt = portals[i]
                pt.node.eulerAngles.y += Float(dt) * 0.8
                let ps = 1 + sin(Float(now) * 3 + Float(i)) * 0.04
                pt.node.scale = SCNVector3(ps, ps, ps)
                pt.node.position.y = 1.6 + sin(Float(now) * 2 + Float(i) * 1.7) * 0.12
                let dx = manager.pos.x - pt.node.position.x
                let dz = manager.pos.z - pt.node.position.z
                let d = sqrt(dx * dx + dz * dz)
                if d < 9 && !portals[i].hinted {
                    portals[i].hinted = true
                    manager.say("🌀 A glowing portal hums nearby…")
                }
                if d < 1.7 {
                    teleport(to: pt.toLevel)
                    return
                }
            }
        }

        private func teleport(to level: Int) {
            spawnBurst(at: SCNVector3(manager.pos.x, manager.pos.y + 1.5, manager.pos.z),
                       colors: [.white, .purple, .cyan], count: 24)
            manager.level = level
            for i in portals.indices { portals[i].hinted = false }
            manager.pos = level == 4 ? SCNVector3(48, 0, 48) : SCNVector3(0, 0, 8)
            manager.yaw = Float.pi
            manager.target = nil
            spawnBurst(at: SCNVector3(0, 1.5, 8), colors: [.white, .purple, .cyan], count: 24)
            buildTheme(level)
            manager.say("🌀 \(manager.levelNames[level])!")
            AWSound.shared.portal()
        }

        private func updateGuide(now: Double) {
            guard Date() < manager.guideUntil else {
                guideArrow?.isHidden = true
                return
            }
            if guideArrow == nil { buildGuideArrow() }
            guard let arrow = guideArrow else { return }
            arrow.isHidden = false
            var bx: Float = 0, bz: Float = 0
            var bd: Float = .greatestFiniteMagnitude
            for p in portals {
                let dx = p.node.position.x - manager.pos.x
                let dz = p.node.position.z - manager.pos.z
                let d = dx * dx + dz * dz
                if d < bd { bd = d; bx = dx; bz = dz }
            }
            guard bd < .greatestFiniteMagnitude else { return }
            arrow.position = SCNVector3(manager.pos.x, manager.pos.y + 3.1 + sin(Float(now) * 3) * 0.15, manager.pos.z)
            arrow.eulerAngles.y = atan2(bx, bz)
            let s = 1 + sin(Float(now) * 5) * 0.08
            arrow.scale = SCNVector3(s, s, s)
        }

        private func buildGuideArrow() {
            let root = SCNNode()
            let gold = mat(.yellow, emission: .orange)
            let shaft = SCNNode(geometry: SCNCylinder(radius: 0.07, height: 1.0))
            shaft.geometry?.materials = [gold]
            shaft.eulerAngles.x = Float.pi / 2
            shaft.position = SCNVector3(0, 0, 0.1)
            root.addChildNode(shaft)
            let head = SCNNode(geometry: SCNCone(topRadius: 0.0, bottomRadius: 0.24, height: 0.5))
            head.geometry?.materials = [gold]
            head.eulerAngles.x = Float.pi / 2
            head.position = SCNVector3(0, 0, 0.85)
            root.addChildNode(head)
            root.isHidden = true
            scene.rootNode.addChildNode(root)
            guideArrow = root
        }

        /// Jump button near a portal (1 unit-ish) hops through it.
        private func portalHop() -> Bool {
            var bd: Float = 2.5 * 2.5
            var best: AWPortal? = nil
            for p in portals {
                let dx = p.node.position.x - manager.pos.x
                let dz = p.node.position.z - manager.pos.z
                let d = dx * dx + dz * dz
                if d < bd { bd = d; best = p }
            }
            guard let portal = best else { return false }
            teleport(to: portal.toLevel)
            manager.say("🌀 Jumped through the portal!")
            return true
        }

        private func buildMistBank() {
            for _ in 0..<10 {
                let m = SCNNode(geometry: SCNSphere(radius: CGFloat(Float.random(in: 1.5...2.5))))
                let mm = SCNMaterial()
                mm.diffuse.contents = UIColor(white: 0.8, alpha: 0.35)
                mm.transparency = 0.3
                m.geometry?.materials = [mm]
                m.scale = SCNVector3(1.6, 0.35, 1.6)
                m.position = SCNVector3(Float.random(in: -90...90), 0.6, Float.random(in: -90...90))
                themeRoot.addChildNode(m)
                mists.append(m)
            }
        }

        /// Storm flashes + flickering lantern light.
        private func updateLighting(dt: Double, now: Double) {
            for l in flickerLights {
                l.light?.intensity = 600 + CGFloat(sin(now * 13 + Double(l.position.x)) * 250)
            }
            for (i, g) in jackGlows.enumerated() {
                g.emission.intensity = 0.7 + 0.3 * CGFloat(sin(now * 11 + Double(i) * 1.3))
            }
            guard manager.level == 0 || manager.level == 2 else { return }
            boltT -= dt
            if boltT > 0 { return }
            boltT = Double.random(in: 9...16)
            ambNode?.light?.intensity = 4
            manager.say("⛈️ Lightning cracks across the sky!")
            AWSound.shared.rumble()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
                self?.ambNode?.light?.intensity = 1
            }
        }

        private func flickerLight(at p: SCNVector3) {
            let l = SCNNode()
            l.light = SCNLight()
            l.light?.type = .omni
            l.light?.color = UIColor.orange
            l.light?.intensity = 600
            l.position = p
            themeRoot.addChildNode(l)
            flickerLights.append(l)
        }

        private func updateMists(dt: Double) {
            for m in mists {
                m.position.x += Float(dt) * 0.5
                if m.position.x > 95 { m.position.x = -95 }
            }
        }

        private func buildBats() {
            for i in 0..<5 {
                let root = SCNNode()
                let body = SCNNode(geometry: SCNSphere(radius: 0.13))
                body.geometry?.materials = [mat(.black)]
                root.addChildNode(body)
                var wings: [SCNNode] = []
                for side in [-0.3, 0.3] {
                    let w = SCNNode(geometry: SCNPlane(width: 0.55, height: 0.28))
                    w.geometry?.materials = [mat(.black)]
                    w.geometry?.firstMaterial?.isDoubleSided = true
                    w.position = SCNVector3(Float(side), 0.05, 0)
                    root.addChildNode(w)
                    wings.append(w)
                }
                themeRoot.addChildNode(root)
                bats.append(AWBat(root: root, wingL: wings[0], wingR: wings[1],
                                  angle: Float(i) * 1.26, speed: Float.random(in: 0.7...1.1),
                                  radius: Float.random(in: 6...10), cy: Float.random(in: 2...4),
                                  respawnAt: 0))
            }
        }

        private func updateBats(dt: Double, now: Double) {
            for bi in bats.indices {
                if bats[bi].root.isHidden {
                    if now > bats[bi].respawnAt { bats[bi].root.isHidden = false }
                    continue
                }
                bats[bi].angle += bats[bi].speed * Float(dt)
                let a = bats[bi].angle
                let px = manager.pos.x + cos(a) * bats[bi].radius
                let pz = manager.pos.z + sin(a) * bats[bi].radius
                bats[bi].root.position = SCNVector3(px, bats[bi].cy + sin(Float(now) * 2 + Float(bi)) * 0.4, pz)
                bats[bi].root.eulerAngles.y = -a
                let flap = sin(Float(now) * 16 + Float(bi) * 2) * 0.6
                bats[bi].wingL.eulerAngles.z = 0.25 + flap
                bats[bi].wingR.eulerAngles.z = -0.25 - flap
            }
        }

        private func buildVolcanoes() {
            volcanoSpots = [SCNVector3(-32, 0, -24), SCNVector3(30, 0, 22)]
            for s in volcanoSpots { blockers.append((s.x, s.z, 6.5)) }
            for s in volcanoSpots {
                let cone = SCNNode(geometry: SCNCone(topRadius: 2.2, bottomRadius: 6, height: 9))
                cone.geometry?.materials = [mat(UIColor(red: 0.25, green: 0.08, blue: 0.08, alpha: 1))]
                cone.position = SCNVector3(s.x, 4.5, s.z)
                themeRoot.addChildNode(cone)
                let mouth = SCNNode(geometry: SCNCylinder(radius: 2.0, height: 0.4))
                mouth.geometry?.materials = [mat(.orange, emission: .red)]
                mouth.position = SCNVector3(s.x, 9, s.z)
                themeRoot.addChildNode(mouth)
            }
            eruptT = 3
        }

        private func updateVolcano(dt: Double) {
            guard manager.level == 3, !volcanoSpots.isEmpty else { return }
            eruptT -= dt
            if eruptT > 0 { return }
            eruptT = Double.random(in: 5...9)
            let s = volcanoSpots[Int.random(in: 0..<volcanoSpots.count)]
            eruptVolcano(at: s)
            manager.say("🌋 The volcano erupts!")
        }

        private func eruptVolcano(at s: SCNVector3) {
            let top = SCNVector3(s.x, 9.2, s.z)
            for _ in 0..<22 {
                let ember = SCNNode(geometry: SCNSphere(radius: 0.12))
                ember.geometry?.materials = [mat(.orange, emission: .red)]
                ember.position = top
                themeRoot.addChildNode(ember)
                let a = Float.random(in: 0...Float.pi * 2)
                let out = Float.random(in: 1...5)
                ember.runAction(.sequence([
                    .group([
                        .moveBy(x: CGFloat(cos(a) * out), y: CGFloat(Float.random(in: 3...7)), z: CGFloat(sin(a) * out), duration: 0.9),
                        .fadeOut(duration: 1.8),
                    ]),
                    .removeFromParentNode(),
                ]))
            }
            for _ in 0..<7 {
                let smoke = SCNNode(geometry: SCNSphere(radius: 0.5))
                let sm = SCNMaterial()
                sm.diffuse.contents = UIColor(white: 0.25, alpha: 0.6)
                sm.transparency = 0.55
                smoke.geometry?.materials = [sm]
                smoke.position = top
                themeRoot.addChildNode(smoke)
                smoke.runAction(.sequence([
                    .group([
                        .moveBy(x: CGFloat(Float.random(in: -2...2)), y: 7, z: CGFloat(Float.random(in: -2...2)), duration: 2.5),
                        .scale(to: 2.5, duration: 2.5),
                        .fadeOut(duration: 2.5),
                    ]),
                    .removeFromParentNode(),
                ]))
            }
        }

        // ================= House monsters & maze mummies =================
        private func buildMob(kind: Int, at p: SCNVector3, home: Int) -> AWGhost {
            let g = AWGhost()
            g.home = home
            g.isMob = true
            let root = g.root
            if kind == 0 {
                // 🧟 Brute.
                g.mobName = "🧟 Brute"
                g.hp = 4; g.maxHp = 4; g.touchDmg = 15; g.moveSpeed = 1.8
                let bcol = UIColor(red: 0.4, green: 0.7, blue: 0.35, alpha: 1)
                let body = SCNNode(geometry: SCNCapsule(capRadius: 0.5, height: 0.9))
                body.geometry?.materials = [mat(bcol)]
                body.position = SCNVector3(0, 1.1, 0)
                root.addChildNode(body)
                g.body = body
                let head = SCNNode(geometry: SCNSphere(radius: 0.3))
                head.geometry?.materials = [mat(bcol)]
                head.scale = SCNVector3(1.2, 0.8, 1)
                head.position = SCNVector3(0, 1.85, 0)
                root.addChildNode(head)
                for side in [-0.36, 0.36] {
                    let bolt = SCNNode(geometry: SCNCylinder(radius: 0.05, height: 0.25))
                    bolt.geometry?.materials = [mat(.gray)]
                    bolt.eulerAngles.z = Float.pi / 2
                    bolt.position = SCNVector3(Float(side), 1.8, 0)
                    root.addChildNode(bolt)
                    let eye = SCNNode(geometry: SCNSphere(radius: 0.06))
                    eye.geometry?.materials = [mat(.red, emission: .red)]
                    eye.position = SCNVector3(Float(side) * 0.4, 1.88, 0.24)
                    root.addChildNode(eye)
                }
                for side in [-0.62, 0.62] {
                    let arm = SCNNode(geometry: SCNCapsule(capRadius: 0.13, height: 0.6))
                    arm.geometry?.materials = [mat(bcol)]
                    arm.position = SCNVector3(Float(side), 1.0, 0)
                    root.addChildNode(arm)
                }
            } else if kind == 1 {
                // 🧙 Witch.
                g.mobName = "🧙 Witch"
                g.hp = 2; g.maxHp = 2; g.touchDmg = 8; g.moveSpeed = 3.0
                let dress = SCNNode(geometry: SCNCone(topRadius: 0.15, bottomRadius: 0.75, height: 1.5))
                dress.geometry?.materials = [mat(.purple)]
                dress.position = SCNVector3(0, 0.75, 0)
                root.addChildNode(dress)
                g.body = dress
                let head = SCNNode(geometry: SCNSphere(radius: 0.24))
                head.geometry?.materials = [mat(UIColor(red: 0.6, green: 0.85, blue: 0.6, alpha: 1))]
                head.position = SCNVector3(0, 1.7, 0)
                root.addChildNode(head)
                head.runAction(.repeatForever(.sequence([
                    .rotateBy(x: 0, y: 0, z: 0.12, duration: 0.18),
                    .rotateBy(x: 0, y: 0, z: -0.12, duration: 0.18),
                ])))
                let brim = SCNNode(geometry: SCNCylinder(radius: 0.45, height: 0.06))
                brim.geometry?.materials = [mat(.black)]
                brim.position = SCNVector3(0, 1.92, 0)
                root.addChildNode(brim)
                let tip = SCNNode(geometry: SCNCone(topRadius: 0.01, bottomRadius: 0.22, height: 0.7))
                tip.geometry?.materials = [mat(.black)]
                tip.position = SCNVector3(0, 2.3, 0)
                tip.eulerAngles.z = 0.15
                root.addChildNode(tip)
                for side in [-0.09, 0.09] {
                    let eye = SCNNode(geometry: SCNSphere(radius: 0.05))
                    eye.geometry?.materials = [mat(.green, emission: .green)]
                    eye.position = SCNVector3(Float(side), 1.74, 0.2)
                    root.addChildNode(eye)
                }
                let stick = SCNNode(geometry: SCNCylinder(radius: 0.04, height: 1.4))
                stick.geometry?.materials = [mat(UIColor(red: 0.5, green: 0.35, blue: 0.2, alpha: 1))]
                stick.position = SCNVector3(0.55, 0.9, 0.1)
                stick.eulerAngles.z = 0.2
                root.addChildNode(stick)
                let straw = SCNNode(geometry: SCNCone(topRadius: 0.05, bottomRadius: 0.2, height: 0.4))
                straw.geometry?.materials = [mat(.yellow)]
                straw.position = SCNVector3(0.42, 0.25, 0.1)
                straw.eulerAngles.z = Float.pi - 0.2
                root.addChildNode(straw)
            } else {
                // 🧻 Mummy.
                g.mobName = "🧻 Mummy"
                g.hp = 3; g.maxHp = 3; g.touchDmg = 10; g.moveSpeed = 2.0
                let wrap = UIColor(red: 0.85, green: 0.8, blue: 0.7, alpha: 1)
                let body = SCNNode(geometry: SCNCapsule(capRadius: 0.32, height: 0.75))
                body.geometry?.materials = [mat(wrap)]
                body.position = SCNVector3(0, 1.05, 0)
                root.addChildNode(body)
                g.body = body
                for (i, wy) in [0.85, 1.05, 1.25].enumerated() {
                    let band = SCNNode(geometry: SCNTorus(ringRadius: CGFloat(0.3 - Float(i) * 0.02), pipeRadius: 0.045))
                    band.geometry?.materials = [mat(UIColor(red: 0.7, green: 0.65, blue: 0.55, alpha: 1))]
                    band.position = SCNVector3(0, Float(wy), 0)
                    band.eulerAngles.x = Float.pi / 2
                    root.addChildNode(band)
                }
                let head = SCNNode(geometry: SCNSphere(radius: 0.24))
                head.geometry?.materials = [mat(wrap)]
                head.position = SCNVector3(0, 1.72, 0)
                root.addChildNode(head)
                for side in [-0.09, 0.09] {
                    let eye = SCNNode(geometry: SCNSphere(radius: 0.055))
                    eye.geometry?.materials = [mat(.black)]
                    eye.position = SCNVector3(Float(side), 1.76, 0.2)
                    root.addChildNode(eye)
                }
                for side in [-0.4, 0.4] {
                    let arm = SCNNode(geometry: SCNCapsule(capRadius: 0.09, height: 0.5))
                    arm.geometry?.materials = [mat(wrap)]
                    arm.position = SCNVector3(Float(side), 1.15, 0.35)
                    arm.eulerAngles.x = Float.pi / 2 - 0.15
                    root.addChildNode(arm)
                }
            }
            g.root.position = SCNVector3(p.x, 0, p.z)
            g.wp = randomPoint()
            scene.rootNode.addChildNode(g.root)
            ghosts.append(g)
            return g
        }

        private func buildMobs() {
            _ = buildMob(kind: 0, at: SCNVector3(-5, 0, -26), home: 2)
            _ = buildMob(kind: 1, at: SCNVector3(5, 0, -27), home: 2)
            _ = buildMob(kind: 2, at: SCNVector3(0, 0, -23), home: 2)
        }

        // ================= Wolves =================
        private func buildWolf(at p: SCNVector3) -> AWWolf {
            let w = AWWolf()
            let fur = UIColor(red: 0.35, green: 0.33, blue: 0.36, alpha: 1)
            let body = SCNNode(geometry: SCNCapsule(capRadius: 0.26, height: 0.7))
            body.geometry?.materials = [mat(fur)]
            body.eulerAngles.x = Float.pi / 2
            body.position = SCNVector3(0, 0.55, 0)
            w.root.addChildNode(body)
            let head = SCNNode(geometry: SCNSphere(radius: 0.22))
            head.geometry?.materials = [mat(fur)]
            head.position = SCNVector3(0, 0.75, 0.55)
            w.root.addChildNode(head)
            w.head = head
            let snout = SCNNode(geometry: SCNSphere(radius: 0.11))
            snout.geometry?.materials = [mat(UIColor(red: 0.25, green: 0.23, blue: 0.26, alpha: 1))]
            snout.scale = SCNVector3(1, 0.8, 1.3)
            snout.position = SCNVector3(0, 0.68, 0.78)
            w.root.addChildNode(snout)
            for side in [-0.11, 0.11] {
                let ear = SCNNode(geometry: SCNCone(topRadius: 0.01, bottomRadius: 0.07, height: 0.18))
                ear.geometry?.materials = [mat(fur)]
                ear.position = SCNVector3(Float(side), 0.95, 0.5)
                w.root.addChildNode(ear)
                let eye = SCNNode(geometry: SCNSphere(radius: 0.035))
                eye.geometry?.materials = [mat(.yellow, emission: .yellow)]
                eye.position = SCNVector3(Float(side) * 0.8, 0.8, 0.72)
                w.root.addChildNode(eye)
            }
            for (lx, lz) in [(-0.15, 0.3), (0.15, 0.3), (-0.15, -0.3), (0.15, -0.3)] {
                let hip = SCNNode()
                hip.position = SCNVector3(Float(lx), 0.45, Float(lz))
                let leg = SCNNode(geometry: SCNCapsule(capRadius: 0.07, height: 0.35))
                leg.geometry?.materials = [mat(fur)]
                leg.position = SCNVector3(0, -0.2, 0)
                hip.addChildNode(leg)
                w.root.addChildNode(hip)
                w.legs.append(hip)
            }
            let tail = SCNNode(geometry: SCNCapsule(capRadius: 0.05, height: 0.4))
            tail.geometry?.materials = [mat(fur)]
            tail.position = SCNVector3(0, 0.62, -0.55)
            tail.eulerAngles.x = -0.9
            w.root.addChildNode(tail)
            w.tail = tail
            w.root.position = SCNVector3(p.x, 0, p.z)
            w.wp = randomPoint()
            scene.rootNode.addChildNode(w.root)
            return w
        }

        private func buildWolves() {
            wolves.append(buildWolf(at: SCNVector3(10, 0, -4)))
            wolves.append(buildWolf(at: SCNVector3(-12, 0, 6)))
            wolves.append(buildWolf(at: SCNVector3(2, 0, 16)))
        }

        private func updateWolves(dt: Double, now: Double) {
            let forest = manager.level == 0
            for w in wolves {
                w.root.isHidden = !forest
                if !forest { continue }
                w.phase += Float(dt) * 6
                let dx = manager.pos.x - w.root.position.x
                let dz = manager.pos.z - w.root.position.z
                let dist = sqrt(dx * dx + dz * dz)
                if dist < 7 {
                    if !w.noticed {
                        w.noticed = true
                        manager.say("🐺 Wolves are stalking you…")
                        AWSound.shared.growl()
                    }
                    if dist > 2.5 {
                        w.yaw = lerpAngle(w.yaw, atan2(dx, dz), Float(min(1, dt * 5)))
                        w.root.position.x += sin(w.yaw) * 2.6 * Float(dt)
                        w.root.position.z += cos(w.yaw) * 2.6 * Float(dt)
                    } else {
                        w.yaw += Float(dt) * 1.2
                        w.root.position.x = manager.pos.x + sin(w.yaw) * 2.5
                        w.root.position.z = manager.pos.z + cos(w.yaw) * 2.5
                        w.yaw = lerpAngle(w.yaw, atan2(dx, dz), Float(min(1, dt * 3)))
                    }
                    if dist < 1.3 && Date() > manager.hitCooldownUntil {
                        manager.hitCooldownUntil = Date().addingTimeInterval(1.0)
                        hurtPlayer(6, from: w.root.position)
                    }
                } else {
                    w.noticed = false
                    if w.wait > 0 {
                        w.wait -= dt
                    } else {
                        let tx = w.wp.x - w.root.position.x
                        let tz = w.wp.z - w.root.position.z
                        if sqrt(tx * tx + tz * tz) < 0.5 {
                            w.wait = Double.random(in: 2...5)
                            w.wp = randomPoint()
                        } else {
                            w.yaw = lerpAngle(w.yaw, atan2(tx, tz), Float(min(1, dt * 4)))
                            w.root.position.x += sin(w.yaw) * 2.0 * Float(dt)
                            w.root.position.z += cos(w.yaw) * 2.0 * Float(dt)
                        }
                    }
                }
                w.root.eulerAngles.y = w.yaw
                let s = sin(w.phase)
                if w.legs.count == 4 {
                    w.legs[0].eulerAngles.x = s * 0.8
                    w.legs[3].eulerAngles.x = s * 0.8
                    w.legs[1].eulerAngles.x = -s * 0.8
                    w.legs[2].eulerAngles.x = -s * 0.8
                }
                w.tail.eulerAngles.y = sin(w.phase * 0.5) * 0.4
                w.head.position.y = 0.75 + abs(cos(w.phase)) * 0.04
            }
            howlT -= dt
            if howlT <= 0 {
                howlT = Double.random(in: 14...26)
                if forest && !wolves.isEmpty {
                    manager.say("🐺 A howl echoes through the trees…")
                    AWSound.shared.howl()
                }
            }
            _ = now
        }

        // ================= Bombs =================
        private func lobBomb() {
            let m = manager
            guard m.bombs > 0 else { m.say("No bombs! Buy some 🛒"); return }
            var bx: Float = 0, bz: Float = -1
            var bd: Float = 18 * 18
            for g in ghosts {
                if g.root.isHidden { continue }
                let dx = g.root.position.x - m.pos.x
                let dz = g.root.position.z - m.pos.z
                let d = dx * dx + dz * dz
                if d < bd { bd = d; bx = dx; bz = dz }
            }
            for w in wolves where !w.root.isHidden {
                let dx = w.root.position.x - m.pos.x
                let dz = w.root.position.z - m.pos.z
                let d = dx * dx + dz * dz
                if d < bd { bd = d; bx = dx; bz = dz }
            }
            m.bombs -= 1
            let len = max(0.5, sqrt(bx * bx + bz * bz))
            let node = SCNNode(geometry: SCNSphere(radius: 0.18))
            node.geometry?.materials = [mat(.black, emission: .red)]
            node.position = SCNVector3(m.pos.x, m.pos.y + 1.4, m.pos.z)
            scene.rootNode.addChildNode(node)
            bombs.append(AWBomb(node: node, vel: SCNVector3(bx / len * 9, 6.5, bz / len * 9), fuse: 1.1))
            AWSound.shared.shoot()
        }

        private func updateBombs(dt: Double, now: Double) {
            for i in bombs.indices.reversed() {
                var b = bombs[i]
                b.fuse -= dt
                b.vel.y -= 14 * Float(dt)
                b.node.position = SCNVector3(b.node.position.x + b.vel.x * Float(dt),
                                            b.node.position.y + b.vel.y * Float(dt),
                                            b.node.position.z + b.vel.z * Float(dt))
                let s = 1 + sin(Float(now) * 20) * 0.2
                b.node.scale = SCNVector3(s, s, s)
                if b.fuse <= 0 || b.node.position.y <= 0.1 {
                    explodeBomb(at: SCNVector3(b.node.position.x, max(0.3, b.node.position.y), b.node.position.z))
                    b.node.removeFromParentNode()
                    bombs.remove(at: i)
                } else {
                    bombs[i] = b
                }
            }
        }

        private func explodeBomb(at p: SCNVector3) {
            spawnBurst(at: p, colors: [.orange, .red, .gray, .yellow], count: 30)
            AWSound.shared.boom()
            AWSound.shared.rumble()
            for g in ghosts {
                if g.root.isHidden { continue }
                let dx = g.root.position.x - p.x
                let dz = g.root.position.z - p.z
                if dx * dx + dz * dz < 12.25 {
                    g.hp -= 3
                    g.flash = 0.15
                    if g.hp <= 0 { killGhost(g) }
                }
            }
            for w in wolves where !w.root.isHidden {
                let dx = w.root.position.x - p.x
                let dz = w.root.position.z - p.z
                if dx * dx + dz * dz < 12.25 {
                    w.hp -= 3
                    if w.hp <= 0 {
                        spawnBurst(at: SCNVector3(w.root.position.x, 0.8, w.root.position.z), colors: [.gray, .black], count: 14)
                        let reward = Int.random(in: 8...12)
                        manager.gold += reward
                        manager.say("🐺 Wolf driven off! +\(reward) 🪙")
                        AWSound.shared.howl()
                        w.root.removeFromParentNode()
                        wolves.removeAll { $0 === w }
                    }
                }
            }
            manager.say("💥 Boom!")
        }

        // ================= Tunnel maze =================
        private func wallStones(_ x1: Float, _ z1: Float, _ x2: Float, _ z2: Float) {
            // Mixed materials so every stretch looks different — and solid, no gaps.
            let palette = [
                UIColor(red: 0.35, green: 0.33, blue: 0.38, alpha: 1),
                UIColor(red: 0.22, green: 0.2, blue: 0.26, alpha: 1),
                UIColor(red: 0.3, green: 0.38, blue: 0.28, alpha: 1),
                UIColor(red: 0.4, green: 0.3, blue: 0.22, alpha: 1),
                UIColor(red: 0.45, green: 0.22, blue: 0.2, alpha: 1),
            ]
            let dx = x2 - x1, dz = z2 - z1
            let len = sqrt(dx * dx + dz * dz)
            let n = max(1, Int(len / 1.7))
            for i in 0...n {
                let t = Float(i) / Float(n)
                let sx = x1 + dx * t, sz = z1 + dz * t
                let pc = palette[i % palette.count]
                let stone = SCNNode(geometry: SCNCylinder(radius: 0.95, height: 4.2))
                stone.geometry?.materials = [mat(pc)]
                stone.position = SCNVector3(sx, 2.1, sz)
                themeRoot.addChildNode(stone)
                let cap = SCNNode(geometry: SCNSphere(radius: 0.95))
                cap.geometry?.materials = [mat(pc)]
                cap.scale = SCNVector3(1, 0.5, 1)
                cap.position = SCNVector3(sx, 4.2, sz)
                themeRoot.addChildNode(cap)
                if i % 5 == 2 {
                    let torch = SCNNode(geometry: SCNSphere(radius: 0.18))
                    torch.geometry?.materials = [mat(.orange, emission: .orange)]
                    torch.position = SCNVector3(sx, 3.1, sz + 1.0)
                    themeRoot.addChildNode(torch)
                    if let tm = torch.geometry?.materials.first { jackGlows.append(tm) }
                }
                blockers.append((sx, sz, 1.1))
            }
        }

        private func buildMaze() {
            let cx: Float = 60, cz: Float = 60, h: Float = 18
            wallStones(cx - h, cz - h, cx - 4, cz - h)
            wallStones(cx, cz - h, cx + h, cz - h)
            wallStones(cx - h, cz + h, cx + 2, cz + h)
            wallStones(cx + 6, cz + h, cx + h, cz + h)
            wallStones(cx - h, cz - h, cx - h, cz - 2)
            wallStones(cx - h, cz + 2, cx - h, cz + h)
            wallStones(cx + h, cz - h, cx + h, cz - 8)
            wallStones(cx + h, cz - 4, cx + h, cz + h)
            wallStones(cx, cz - 12, cx, cz)
            wallStones(cx, cz + 4, cx, cz + 12)
            wallStones(cx - 12, cz, cx + 6, cz)
            wallStones(cx + 10, cz, cx + 12, cz)
            wallStones(cx - 12, cz + 6, cx - 6, cz + 12)
            wallStones(cx + 6, cz - 12, cx + 12, cz - 6)
            // Treasure hoard at the heart.
            for (i, r) in [0.9, 0.65, 0.4].enumerated() {
                let pile = SCNNode(geometry: SCNTorus(ringRadius: CGFloat(r), pipeRadius: 0.22))
                pile.geometry?.materials = [mat(.yellow, emission: .orange)]
                pile.eulerAngles.x = Float.pi / 2
                pile.position = SCNVector3(cx, 0.2 + Float(i) * 0.35, cz)
                themeRoot.addChildNode(pile)
            }
            blockers.append((cx, cz, 1.6))
            for (ox, oz) in [(2.5, 0), (-2.5, 0.5), (0, -2.5)] {
                let coin = SCNNode(geometry: SCNTorus(ringRadius: 0.3, pipeRadius: 0.1))
                coin.geometry?.materials = [mat(.yellow, emission: .orange)]
                coin.position = SCNVector3(cx + Float(ox), 0.7, cz + Float(oz))
                themeRoot.addChildNode(coin)
                pickups.append(AWPickup(node: coin, kind: 0, respawnAt: 0, spot: coin.position))
            }
            lampGreen(at: SCNVector3(cx - 14, 0, cz - 14))
            lampGreen(at: SCNVector3(cx + 14, 0, cz + 14))
            buildPortal(at: SCNVector3(72, 0, 68), color: .green, toLevel: 0)
            mazePortal = portals.last?.node
            if ghosts.filter({ $0.home == 4 }).count < 2 {
                let m1 = buildMob(kind: 2, at: SCNVector3(54, 0, 66), home: 4)
                m1.wp = SCNVector3(60, 0, 60)
                let m2 = buildMob(kind: 2, at: SCNVector3(66, 0, 52), home: 4)
                m2.wp = SCNVector3(60, 0, 60)
            }
        }

        private func buildHatch(at p: SCNVector3, toLevel: Int) {
            let root = SCNNode()
            let rim = SCNNode(geometry: SCNTorus(ringRadius: 1.1, pipeRadius: 0.25))
            rim.geometry?.materials = [mat(.darkGray)]
            rim.eulerAngles.x = Float.pi / 2
            rim.position = SCNVector3(0, 0.1, 0)
            root.addChildNode(rim)
            let dark = SCNNode(geometry: SCNCylinder(radius: 1.0, height: 0.1))
            let dm = SCNMaterial()
            dm.diffuse.contents = UIColor.black
            dark.geometry?.materials = [dm]
            dark.position = SCNVector3(0, 0.05, 0)
            root.addChildNode(dark)
            for (ox, oz) in [(1.5, 0.4), (-1.4, -0.5), (0.3, 1.5)] {
                let sk = SCNNode(geometry: SCNSphere(radius: 0.12))
                sk.geometry?.materials = [mat(UIColor(white: 0.88, alpha: 1))]
                sk.position = SCNVector3(Float(ox), 0.1, Float(oz))
                root.addChildNode(sk)
            }
            root.position = SCNVector3(p.x, 0, p.z)
            scene.rootNode.addChildNode(root)
            portals.append(AWPortal(node: root, toLevel: toLevel, hinted: false))
        }

        private func updateBubbles(dt: Double) {
            for b in bubbles {
                b.position.y += Float(dt) * 1.1
                if b.position.y > 6.5 {
                    b.position.y = 0
                    b.position.x = Float.random(in: -24...24)
                    b.position.z = Float.random(in: -24...24)
                }
            }
        }

        private func updateClouds(dt: Double) {
            for c in cloudNodes {
                c.position.x += Float(dt) * 0.35
                if c.position.x > 120 { c.position.x = -120 }
            }
        }

        private func updateCamera(dt: Double) {
            let p = manager.pos
            let d = manager.camDist
            let a = manager.camYaw
            let want = SCNVector3(p.x + 7.4 * d * sin(a), p.y + 4.6 * d, p.z + 7.4 * d * cos(a))
            let k = min(1, Float(dt) * 4)
            cam.position = SCNVector3(
                cam.position.x + (want.x - cam.position.x) * k,
                cam.position.y + (want.y - cam.position.y) * k,
                cam.position.z + (want.z - cam.position.z) * k)
            cam.look(at: SCNVector3(p.x, p.y + 1.3, p.z))
        }

        // ================= Helpers =================
        private func lerpAngle(_ a: Float, _ b: Float, _ t: Float) -> Float {
            var d = b - a
            while d > Float.pi { d -= Float.pi * 2 }
            while d < -Float.pi { d += Float.pi * 2 }
            return a + d * t
        }

        private func randomPoint() -> SCNVector3 {
            let a = Float.random(in: 0...Float.pi * 2)
            let r = Float.random(in: 6...45)
            return SCNVector3(cos(a) * r, 0, sin(a) * r)
        }

        private func mat(_ c: UIColor, emission: UIColor? = nil) -> SCNMaterial {
            let m = SCNMaterial()
            m.diffuse.contents = c
            if let e = emission { m.emission.contents = e }
            return m
        }

        /// Smooth avatar rig. Returns joints for animation.
        private func buildAvatar(pal: AWPalette, hat: Bool) -> (SCNNode, [String: SCNNode], [SCNNode]) {
            let root = SCNNode()
            var j: [String: SCNNode] = [:]
            var eyeNodes: [SCNNode] = []
            func limb(r: CGFloat, len: CGFloat, color: UIColor, pivot: SCNVector3) -> SCNNode {
                let p = SCNNode()
                p.position = pivot
                let mesh = SCNNode(geometry: SCNCapsule(capRadius: r, height: len))
                mesh.geometry?.materials = [mat(color)]
                mesh.position = SCNVector3(0, -len / 2, 0)
                p.addChildNode(mesh)
                return p
            }
            // Legs with shoes.
            for side in [-0.14, 0.14] {
                let leg = limb(r: 0.11, len: 0.62, color: pal.pants, pivot: SCNVector3(side, 0.88, 0))
                let shoe = SCNNode(geometry: SCNSphere(radius: 0.12))
                shoe.geometry?.materials = [mat(pal.shoes)]
                shoe.scale = SCNVector3(1, 0.6, 1.35)
                shoe.position = SCNVector3(0, -0.72, 0.06)
                leg.addChildNode(shoe)
                root.addChildNode(leg)
                j[side < 0 ? "legL" : "legR"] = leg
            }
            // Torso.
            let torso = SCNNode(geometry: SCNCapsule(capRadius: 0.27, height: 0.55))
            torso.geometry?.materials = [mat(pal.shirt)]
            torso.position = SCNVector3(0, 1.19, 0)
            root.addChildNode(torso)
            j["torso"] = torso
            // Arms with hands.
            for side in [-0.37, 0.37] {
                let arm = limb(r: 0.095, len: 0.55, color: pal.shirt, pivot: SCNVector3(side, 1.48, 0))
                let hand = SCNNode(geometry: SCNSphere(radius: 0.1))
                hand.geometry?.materials = [mat(pal.skin)]
                hand.position = SCNVector3(0, -0.6, 0)
                arm.addChildNode(hand)
                root.addChildNode(arm)
                j[side < 0 ? "armL" : "armR"] = arm
            }
            // Head + face.
            let head = SCNNode()
            head.position = SCNVector3(0, 1.78, 0)
            let skull = SCNNode(geometry: SCNSphere(radius: 0.25))
            skull.geometry?.materials = [mat(pal.skin)]
            head.addChildNode(skull)
            for side in [-0.1, 0.1] {
                let eye = SCNNode(geometry: SCNSphere(radius: 0.05))
                eye.geometry?.materials = [mat(.black)]
                eye.position = SCNVector3(side, 0.04, 0.21)
                head.addChildNode(eye)
                eyeNodes.append(eye)
                let cheek = SCNNode(geometry: SCNSphere(radius: 0.032))
                cheek.geometry?.materials = [mat(UIColor(red: 1, green: 0.6, blue: 0.6, alpha: 1))]
                cheek.position = SCNVector3(side * 1.6, -0.06, 0.19)
                head.addChildNode(cheek)
            }
            let smile = SCNNode(geometry: SCNTorus(ringRadius: 0.085, pipeRadius: 0.014))
            smile.geometry?.materials = [mat(UIColor(red: 0.25, green: 0.1, blue: 0.1, alpha: 1))]
            smile.position = SCNVector3(0, -0.1, 0.17)
            smile.eulerAngles.x = Float.pi * 0.08
            head.addChildNode(smile)
            // Hair cap.
            let hair = SCNNode(geometry: SCNSphere(radius: 0.26))
            hair.geometry?.materials = [mat(pal.hair)]
            hair.scale = SCNVector3(1.02, 0.62, 1.02)
            hair.position = SCNVector3(0, 0.12, -0.03)
            head.addChildNode(hair)
            root.addChildNode(head)
            j["head"] = head
            if hat {
                // Party hat: cone + pompom sphere.
                let cone = SCNNode(geometry: SCNCone(topRadius: 0.01, bottomRadius: 0.14, height: 0.34))
                cone.geometry?.materials = [mat(.orange, emission: .orange)]
                cone.position = SCNVector3(0, 0.4, 0)
                head.addChildNode(cone)
                let pom = SCNNode(geometry: SCNSphere(radius: 0.05))
                pom.geometry?.materials = [mat(.yellow, emission: .yellow)]
                pom.position = SCNVector3(0, 0.58, 0)
                head.addChildNode(pom)
            }
            return (root, j, eyeNodes)
        }

        private func spawnRing(at p: SCNVector3) {
            let ring = SCNNode(geometry: SCNTorus(ringRadius: 0.4, pipeRadius: 0.05))
            ring.geometry?.materials = [mat(.white)]
            ring.eulerAngles.x = Float.pi / 2
            ring.position = SCNVector3(p.x, 0.06, p.z)
            scene.rootNode.addChildNode(ring)
            ring.runAction(.sequence([
                .group([.scale(to: 1.8, duration: 0.5), .fadeOut(duration: 0.5)]),
                .removeFromParentNode(),
            ]))
        }

        private func spawnBurst(at p: SCNVector3, colors: [UIColor], count: Int) {
            let burst = SCNNode()
            burst.position = p
            scene.rootNode.addChildNode(burst)
            for i in 0..<count {
                let dot = SCNNode(geometry: SCNSphere(radius: 0.06))
                dot.geometry?.materials = [mat(colors[i % colors.count], emission: colors[i % colors.count])]
                let a = Float(i) / Float(count) * Float.pi * 2
                dot.runAction(.sequence([
                    .group([
                        .moveBy(x: CGFloat(cos(a) * 1.6), y: CGFloat(Float.random(in: 0.8...2.2)), z: CGFloat(sin(a) * 1.6), duration: 0.7),
                        .fadeOut(duration: 0.7),
                    ]),
                    .removeFromParentNode(),
                ]))
                burst.addChildNode(dot)
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { burst.removeFromParentNode() }
        }

        // ================= World =================
        private func buildWorld() {
            // Lights.
            let amb = SCNNode()
            amb.light = SCNLight()
            amb.light?.type = .ambient
            amb.light?.color = UIColor(white: 0.65, alpha: 1)
            amb.name = "ambLight"
            scene.rootNode.addChildNode(amb)
            ambNode = amb
            let sun = SCNNode()
            sun.light = SCNLight()
            sun.light?.type = .directional
            sun.light?.color = UIColor(white: 0.95, alpha: 1)
            sun.light?.castsShadow = true
            sun.position = SCNVector3(10, 18, 8)
            sun.eulerAngles = SCNVector3(-Float.pi / 4, Float.pi / 4, 0)
            scene.rootNode.addChildNode(sun)
            // Ground disc (super-sized world).
            let ground = SCNNode(geometry: SCNCylinder(radius: 120, height: 1))
            ground.geometry?.materials = [mat(UIColor(red: 0.35, green: 0.72, blue: 0.35, alpha: 1))]
            ground.position = SCNVector3(0, -0.5, 0)
            ground.name = "ground"
            scene.rootNode.addChildNode(ground)
            groundNode = ground
            // Winding pebble path.
            let pathMat = mat(UIColor(red: 0.85, green: 0.78, blue: 0.62, alpha: 1))
            for (i, z) in stride(from: Float(-14), through: Float(14), by: 4).enumerated() {
                let disc = SCNNode(geometry: SCNCylinder(radius: 1.5, height: 0.06))
                disc.geometry?.materials = [pathMat]
                disc.position = SCNVector3(sin(Float(i)) * 1.2, 0.02, z)
                disc.name = "ground"
                scene.rootNode.addChildNode(disc)
            }
            // Pond + sand ring.
            let pond = SCNNode(geometry: SCNCylinder(radius: 3, height: 0.08))
            pond.geometry?.materials = [mat(UIColor(red: 0.3, green: 0.65, blue: 0.95, alpha: 1))]
            pond.position = SCNVector3(7, 0.03, -5)
            pond.name = "ground"
            scene.rootNode.addChildNode(pond)
            let sand = SCNNode(geometry: SCNTorus(ringRadius: 3.3, pipeRadius: 0.45))
            sand.geometry?.materials = [mat(UIColor(red: 0.92, green: 0.85, blue: 0.6, alpha: 1))]
            sand.scale = SCNVector3(1, 0.25, 1)
            sand.position = SCNVector3(7, 0.02, -5)
            scene.rootNode.addChildNode(sand)
            // Round huts: cylinder wall + cone roof (zero cubes).
            hut(at: SCNVector3(-8, 0, -7), wall: UIColor(red: 0.98, green: 0.94, blue: 0.85, alpha: 1), roof: .red)
            hut(at: SCNVector3(9, 0, 6), wall: UIColor(red: 0.9, green: 0.95, blue: 1, alpha: 1), roof: .orange)
            // Trees: sphere-tops and cone pines.
            tree(at: SCNVector3(-4, 0, -11), pine: false)
            tree(at: SCNVector3(4, 0, -13), pine: true)
            tree(at: SCNVector3(-12, 0, 2), pine: true)
            tree(at: SCNVector3(12, 0, -1), pine: false)
            tree(at: SCNVector3(-2, 0, 12), pine: false)
            tree(at: SCNVector3(-13, 0, -9), pine: false)
            // Lamp posts with glowing globes.
            lamp(at: SCNVector3(2.5, 0, -2))
            lamp(at: SCNVector3(-2.5, 0, 4))
            lamp(at: SCNVector3(5, 0, 8))
            // Paddock fence run.
            fenceRun(from: SCNVector3(-14, 0, 8), to: SCNVector3(-4, 0, 8))
            // Trampoline bounce pad.
            let padBase = SCNNode(geometry: SCNTorus(ringRadius: 1.1, pipeRadius: 0.22))
            padBase.geometry?.materials = [mat(.blue, emission: .blue)]
            padBase.eulerAngles.x = Float.pi / 2
            padBase.position = SCNVector3(-4, 0.25, 2)
            scene.rootNode.addChildNode(padBase)
            for k in 0..<4 {
                let leg = SCNNode(geometry: SCNCylinder(radius: 0.08, height: 0.3))
                leg.geometry?.materials = [mat(.darkGray)]
                let a = Float(k) * Float.pi / 2
                leg.position = SCNVector3(-4 + cos(a) * 1.1, 0.12, 2 + sin(a) * 1.1)
                scene.rootNode.addChildNode(leg)
            }
            let padTop = SCNNode(geometry: SCNCylinder(radius: 1.0, height: 0.08))
            padTop.geometry?.materials = [mat(.cyan)]
            padTop.position = SCNVector3(-4, 0.32, 2)
            padTop.name = "ground"
            scene.rootNode.addChildNode(padTop)
            // Flowers.
            let blossom: [UIColor] = [.red, .yellow, .purple, .orange, .white, .systemPink]
            for i in 0..<26 {
                let a = Float.random(in: 0...Float.pi * 2)
                let r = Float.random(in: 5...24)
                let fx = cos(a) * r, fz = sin(a) * r
                let stem = SCNNode(geometry: SCNCylinder(radius: 0.02, height: 0.35))
                stem.geometry?.materials = [mat(.green)]
                stem.position = SCNVector3(fx, 0.17, fz)
                scene.rootNode.addChildNode(stem)
                let head = SCNNode(geometry: SCNSphere(radius: 0.09))
                let c = blossom[i % blossom.count]
                head.geometry?.materials = [mat(c, emission: c)]
                head.position = SCNVector3(fx, 0.38, fz)
                scene.rootNode.addChildNode(head)
            }
            // Hills on the horizon.
            for (i, hx) in [-70, -25, 30, 70].enumerated() {
                let hill = SCNNode(geometry: SCNSphere(radius: 12))
                hill.geometry?.materials = [mat(UIColor(red: 0.3, green: 0.62, blue: 0.35, alpha: 1))]
                hill.scale = SCNVector3(1.6, 0.4, 1)
                hill.position = SCNVector3(Float(hx), -0.5, -70 - Float(i % 2) * 8)
                scene.rootNode.addChildNode(hill)
            }
            // Drifting clouds.
            for i in 0..<4 {
                let cloud = SCNNode()
                for k in 0..<3 {
                    let puff = SCNNode(geometry: SCNSphere(radius: 1.1 - Double(k) * 0.2))
                    puff.geometry?.materials = [mat(.white)]
                    puff.scale = SCNVector3(1.3, 0.7, 1)
                    puff.position = SCNVector3(Float(k) * 1.4 - 1.4, Float(k % 2) * 0.3, 0)
                    cloud.addChildNode(puff)
                }
                cloud.position = SCNVector3(Float(i) * 30 - 45, 14 + Float(i), -30 - Float(i) * 4)
                scene.rootNode.addChildNode(cloud)
                cloudNodes.append(cloud)
            }
            // Collectible stars: spinning golden pyramids.
            for (i, s) in starSpots.enumerated() {
                let star = SCNNode(geometry: SCNPyramid(width: 0.5, height: 0.7, length: 0.5))
                star.geometry?.materials = [mat(.yellow, emission: .orange)]
                star.position = s
                star.name = "star"
                scene.rootNode.addChildNode(star)
                starNodes.append(star)
                _ = i
            }
            // Player avatar.
            let pal = AWPalette(skin: UIColor(red: 1, green: 0.8, blue: 0.6, alpha: 1),
                                shirt: UIColor(red: 0.2, green: 0.7, blue: 0.9, alpha: 1),
                                pants: UIColor(red: 0.25, green: 0.3, blue: 0.6, alpha: 1),
                                hair: UIColor(red: 0.4, green: 0.25, blue: 0.12, alpha: 1),
                                shoes: UIColor(red: 0.9, green: 0.25, blue: 0.25, alpha: 1))
            let built = buildAvatar(pal: pal, hat: true)
            rig = built.0
            joints = built.1
            eyes = built.2
            rig.position = manager.pos
            rig.eulerAngles.y = manager.yaw
            scene.rootNode.addChildNode(rig)
            // Two NPC friends.
            let pal2 = AWPalette(skin: UIColor(red: 0.55, green: 0.38, blue: 0.28, alpha: 1),
                                 shirt: UIColor(red: 1, green: 0.5, blue: 0.6, alpha: 1),
                                 pants: UIColor(red: 0.2, green: 0.2, blue: 0.25, alpha: 1),
                                 hair: .black,
                                 shoes: .white)
            let pal3 = AWPalette(skin: UIColor(red: 1, green: 0.87, blue: 0.7, alpha: 1),
                                 shirt: UIColor(red: 0.6, green: 0.4, blue: 0.9, alpha: 1),
                                 pants: UIColor(red: 0.9, green: 0.6, blue: 0.2, alpha: 1),
                                 hair: UIColor(red: 0.95, green: 0.75, blue: 0.3, alpha: 1),
                                 shoes: UIColor(red: 0.3, green: 0.6, blue: 1, alpha: 1))
            for (k, p) in [pal2, pal3].enumerated() {
                let npc = AWNPC()
                let b = buildAvatar(pal: p, hat: false)
                npc.root = b.0
                npc.joints = b.1
                npc.eyes = b.2
                npc.root.position = SCNVector3(Float(k) * 6 - 3, 0, -2 + Float(k) * 5)
                npc.wp = randomPoint()
                scene.rootNode.addChildNode(npc.root)
                npcs.append(npc)
            }
            // Follow camera.
            cam.camera = SCNCamera()
            cam.camera?.fieldOfView = 60
            cam.camera?.zNear = 0.1
            cam.camera?.zFar = 200
            cam.position = SCNVector3(manager.pos.x, manager.pos.y + 4.6, manager.pos.z + 7.4)
            cam.name = "camera"
            scene.rootNode.addChildNode(cam)
            scene.rootNode.addChildNode(themeRoot)
            buildCoins()
            buildPortals()
            buildHatch(at: SCNVector3(18, 0, -26), toLevel: 4)
            buildWolves()
            buildMobs()
            buildTheme(0)
        }

        private func scatter(_ n: Int, _ rMin: Float, _ rMax: Float) -> [SCNVector3] {
            var pts: [SCNVector3] = []
            for i in 0..<n {
                let a = Float(i) * 2.39996
                let r = rMin + (rMax - rMin) * Float(i) / Float(max(1, n - 1))
                pts.append(SCNVector3(cos(a) * r, 0, sin(a) * r))
            }
            return pts
        }

        private func buildCoins() {
            for s in scatter(12, 10, 70) {
                let coin = SCNNode(geometry: SCNTorus(ringRadius: 0.3, pipeRadius: 0.1))
                coin.geometry?.materials = [mat(.yellow, emission: .orange)]
                coin.position = SCNVector3(s.x, 0.7, s.z)
                scene.rootNode.addChildNode(coin)
                pickups.append(AWPickup(node: coin, kind: 0, respawnAt: 0, spot: coin.position))
            }
        }

        private func buildPortal(at p: SCNVector3, color: UIColor, toLevel: Int) {
            let root = SCNNode()
            let ring = SCNNode(geometry: SCNTorus(ringRadius: 1.3, pipeRadius: 0.2))
            ring.geometry?.materials = [mat(color, emission: color)]
            root.addChildNode(ring)
            let veil = SCNNode(geometry: SCNCylinder(radius: 1.15, height: 0.1))
            let vm = SCNMaterial()
            vm.diffuse.contents = color
            vm.transparency = 0.45
            vm.emission.contents = color
            veil.geometry?.materials = [vm]
            veil.eulerAngles.x = Float.pi / 2
            root.addChildNode(veil)
            let base = SCNNode(geometry: SCNCylinder(radius: 1.5, height: 0.15))
            base.geometry?.materials = [mat(.darkGray)]
            base.position = SCNVector3(0, -1.5, 0)
            root.addChildNode(base)
            // Sky beam so the portal can be spotted across the map.
            let beam = SCNNode(geometry: SCNCylinder(radius: 0.5, height: 44))
            let bm = SCNMaterial()
            bm.diffuse.contents = color
            bm.transparency = 0.35
            bm.emission.contents = color
            beam.geometry?.materials = [bm]
            beam.position = SCNVector3(0, 20, 0)
            root.addChildNode(beam)
            root.position = SCNVector3(p.x, 1.6, p.z)
            scene.rootNode.addChildNode(root)
            portals.append(AWPortal(node: root, toLevel: toLevel, hinted: false))
        }

        private func buildPortals() {
            buildPortal(at: SCNVector3(-32, 0, -22), color: .orange, toLevel: 1)
            buildPortal(at: SCNVector3(30, 0, 20), color: .cyan, toLevel: 2)
            buildPortal(at: SCNVector3(-28, 0, 24), color: .purple, toLevel: 3)
            buildPortal(at: SCNVector3(26, 0, -24), color: .green, toLevel: 0)
        }

        private func buildTheme(_ level: Int) {
            for c in themeRoot.childNodes { c.removeFromParentNode() }
            bubbles.removeAll()
            mists.removeAll()
            bats.removeAll()
            volcanoSpots.removeAll()
            flickerLights.removeAll()
            jackGlows.removeAll()
            if let mp = mazePortal {
                mp.removeFromParentNode()
                portals.removeAll { $0.node === mp }
                mazePortal = nil
            }
            pickups.removeAll { $0.node.parent == nil }
            blockers = [(Float(-8), Float(-7), Float(2.2)), (Float(9), Float(6), Float(2.2))]
            let amb = scene.rootNode.childNode(withName: "ambLight", recursively: false)
            switch level {
            case 1:
                // 🫧 Underwater Ghost Cave.
                scene.background.contents = UIColor(red: 0.02, green: 0.12, blue: 0.25, alpha: 1)
                groundNode?.geometry?.materials = [mat(UIColor(red: 0.2, green: 0.32, blue: 0.45, alpha: 1))]
                amb?.light?.color = UIColor(red: 0.5, green: 0.7, blue: 1, alpha: 1)
                scene.fogColor = UIColor(red: 0.02, green: 0.12, blue: 0.25, alpha: 1)
                scene.fogStartDistance = 10
                scene.fogEndDistance = 90
                scene.fogDensityExponent = 2
                let corals: [UIColor] = [.systemPink, .purple, .orange]
                for (i, s) in scatter(16, 10, 85).enumerated() {
                    let c = SCNNode(geometry: SCNCone(topRadius: 0.08, bottomRadius: 0.45, height: 1.4))
                    let cc = corals[i % corals.count]
                    c.geometry?.materials = [mat(cc, emission: cc)]
                    c.position = SCNVector3(s.x, 0.7, s.z)
                    themeRoot.addChildNode(c)
                }
                for s in scatter(12, 12, 90) {
                    let rock = SCNNode(geometry: SCNSphere(radius: 0.9))
                    rock.geometry?.materials = [mat(UIColor(red: 0.35, green: 0.42, blue: 0.55, alpha: 1))]
                    rock.scale = SCNVector3(1.2, 0.7, 1)
                    rock.position = SCNVector3(s.x, 0.2, s.z)
                    themeRoot.addChildNode(rock)
                }
                for s in scatter(12, 8, 80) {
                    let weed = SCNNode(geometry: SCNCone(topRadius: 0.02, bottomRadius: 0.16, height: 2.2))
                    weed.geometry?.materials = [mat(.green)]
                    weed.position = SCNVector3(s.x, 1.1, s.z)
                    themeRoot.addChildNode(weed)
                }
                for _ in 0..<14 {
                    let bub = SCNNode(geometry: SCNSphere(radius: 0.12))
                    let bm = SCNMaterial()
                    bm.diffuse.contents = UIColor(white: 0.9, alpha: 0.5)
                    bm.transparency = 0.5
                    bub.geometry?.materials = [bm]
                    bub.position = SCNVector3(Float.random(in: -24...24), Float.random(in: 0...6), Float.random(in: -24...24))
                    themeRoot.addChildNode(bub)
                    bubbles.append(bub)
                }
            case 2:
                // 🏚️ Haunted House grounds.
                scene.background.contents = UIColor(red: 0.05, green: 0.02, blue: 0.09, alpha: 1)
                groundNode?.geometry?.materials = [mat(UIColor(red: 0.16, green: 0.16, blue: 0.22, alpha: 1))]
                amb?.light?.color = UIColor(red: 0.5, green: 0.45, blue: 0.7, alpha: 1)
                scene.fogColor = UIColor(red: 0.05, green: 0.02, blue: 0.09, alpha: 1)
                scene.fogStartDistance = 8
                scene.fogEndDistance = 80
                scene.fogDensityExponent = 2
                bigHouse(at: SCNVector3(0, 0, -32))
                blockers.append((0, -32, 6.5))
                fenceRun(from: SCNVector3(-12, 0, -20), to: SCNVector3(12, 0, -20))
                for s in scatter(8, 16, 90) { deadTree(at: s) }
                for s in scatter(10, 10, 70) { pumpkin(at: s) }
                for s in scatter(12, 12, 80) { bones(at: s) }
                for s in [SCNVector3(6, 0, -24), SCNVector3(-7, 0, -22)] { skeleton(at: s) }
                for s in scatter(5, 14, 70) { spider(at: s, branchY: 2.8) }
                for s in [SCNVector3(6, 0, -14), SCNVector3(-6, 0, -14)] { lampGreen(at: s) }
                buildMistBank()
                buildBats()
                flickerLight(at: SCNVector3(0, 3, -24))
                flickerLight(at: SCNVector3(-8, 2.2, -10))
            case 3:
                // 🌋 Lava World.
                scene.background.contents = UIColor(red: 0.1, green: 0.02, blue: 0.02, alpha: 1)
                groundNode?.geometry?.materials = [mat(UIColor(red: 0.15, green: 0.08, blue: 0.08, alpha: 1))]
                amb?.light?.color = UIColor(red: 1, green: 0.55, blue: 0.4, alpha: 1)
                scene.fogColor = UIColor(red: 0.1, green: 0.02, blue: 0.02, alpha: 1)
                scene.fogStartDistance = 12
                scene.fogEndDistance = 100
                scene.fogDensityExponent = 2
                for s in [SCNVector3(10, 0, -8), SCNVector3(-12, 0, 6), SCNVector3(2, 0, 20)] {
                    let pool = SCNNode(geometry: SCNCylinder(radius: 2.6, height: 0.1))
                    pool.geometry?.materials = [mat(.orange, emission: .orange)]
                    pool.position = SCNVector3(s.x, 0.04, s.z)
                    themeRoot.addChildNode(pool)
                    let rim = SCNNode(geometry: SCNTorus(ringRadius: 2.7, pipeRadius: 0.3))
                    rim.geometry?.materials = [mat(.red)]
                    rim.scale = SCNVector3(1, 0.4, 1)
                    rim.position = SCNVector3(s.x, 0.05, s.z)
                    themeRoot.addChildNode(rim)
                }
                for s in scatter(12, 10, 90) { fireCone(at: s) }
                buildVolcanoes()
                skeleton(at: SCNVector3(12, 0, 8))
                for s in scatter(12, 12, 95) {
                    let rock = SCNNode(geometry: SCNSphere(radius: CGFloat(Float.random(in: 0.5...1.1))))
                    rock.geometry?.materials = [mat(.darkGray)]
                    rock.scale = SCNVector3(1.3, 0.7, 1)
                    rock.position = SCNVector3(s.x, 0.2, s.z)
                    themeRoot.addChildNode(rock)
                }
            case 4:
                // 🕳️ Hidden Tunnel Maze warren.
                scene.background.contents = UIColor(red: 0.08, green: 0.05, blue: 0.03, alpha: 1)
                groundNode?.geometry?.materials = [mat(UIColor(red: 0.23, green: 0.16, blue: 0.1, alpha: 1))]
                amb?.light?.color = UIColor(red: 0.9, green: 0.7, blue: 0.5, alpha: 1)
                scene.fogColor = UIColor(red: 0.08, green: 0.05, blue: 0.03, alpha: 1)
                scene.fogStartDistance = 6
                scene.fogEndDistance = 60
                scene.fogDensityExponent = 2
                buildMaze()
            default:
                // 🎃 Spooky Forest.
                scene.background.contents = UIColor(red: 0.1, green: 0.04, blue: 0.18, alpha: 1)
                groundNode?.geometry?.materials = [mat(UIColor(red: 0.2, green: 0.38, blue: 0.22, alpha: 1))]
                amb?.light?.color = UIColor(white: 0.45, alpha: 1)
                scene.fogColor = UIColor(red: 0.1, green: 0.04, blue: 0.18, alpha: 1)
                scene.fogStartDistance = 12
                scene.fogEndDistance = 95
                scene.fogDensityExponent = 2
                let moon = SCNNode(geometry: SCNSphere(radius: 3))
                moon.geometry?.materials = [mat(UIColor(white: 0.95, alpha: 1), emission: .white)]
                moon.position = SCNVector3(-22, 17, -34)
                themeRoot.addChildNode(moon)
                for s in scatter(14, 12, 95) { deadTree(at: s) }
                for (i, s) in scatter(14, 12, 90).enumerated() { tallPine(at: s, s: 1.1 + Float(i % 4) * 0.15) }
                for s in scatter(14, 8, 80) { pumpkin(at: s) }
                for s in scatter(12, 10, 85) { tombstone(at: s) }
                for s in scatter(14, 12, 85) { bones(at: s) }
                for s in [SCNVector3(8, 0, -6), SCNVector3(-10, 0, 4), SCNVector3(4, 0, 14)] { skeleton(at: s) }
                for s in scatter(6, 14, 75) { spider(at: s, branchY: 2.8) }
                buildMistBank()
                buildBats()
                flickerLight(at: SCNVector3(6, 2.2, 6))
                flickerLight(at: SCNVector3(-9, 2.2, -7))
            }
        }

        private func tallPine(at p: SCNVector3, s: Float) {
            let trunk = SCNNode(geometry: SCNCylinder(radius: 0.3 * CGFloat(s), height: 3.5 * CGFloat(s)))
            trunk.geometry?.materials = [mat(UIColor(red: 0.35, green: 0.22, blue: 0.12, alpha: 1))]
            trunk.position = SCNVector3(p.x, 1.75 * s, p.z)
            themeRoot.addChildNode(trunk)
            let leaf = UIColor(red: 0.12, green: 0.42, blue: 0.18, alpha: 1)
            for k in 0..<3 {
                let w = (2.6 - Float(k) * 0.6) * s
                let y = (3.6 + Float(k) * 1.35) * s
                let c = SCNNode(geometry: SCNCone(topRadius: 0.05, bottomRadius: CGFloat(w), height: 2.2 * CGFloat(s)))
                c.geometry?.materials = [mat(leaf)]
                c.position = SCNVector3(p.x, y, p.z)
                themeRoot.addChildNode(c)
            }
            // Hanging moss.
            for side in [-0.8, 0.8] {
                let moss = SCNNode(geometry: SCNSphere(radius: 0.35 * CGFloat(s)))
                moss.geometry?.materials = [mat(UIColor(red: 0.3, green: 0.5, blue: 0.25, alpha: 1))]
                moss.scale = SCNVector3(1, 1.4, 1)
                moss.position = SCNVector3(p.x + Float(side) * s, 3.2 * s, p.z)
                themeRoot.addChildNode(moss)
            }
        }

        private func deadTree(at p: SCNVector3) {
            let trunk = SCNNode(geometry: SCNCylinder(radius: 0.18, height: 2.6))
            trunk.geometry?.materials = [mat(UIColor(red: 0.25, green: 0.16, blue: 0.1, alpha: 1))]
            trunk.position = SCNVector3(p.x, 1.3, p.z)
            themeRoot.addChildNode(trunk)
            for (dx, dz, tilt) in [(0.5, 0.1, 0.7), (-0.45, -0.2, -0.65), (0.05, 0.5, 0.4)] {
                let br = SCNNode(geometry: SCNCylinder(radius: 0.07, height: 1.3))
                br.geometry?.materials = [mat(UIColor(red: 0.25, green: 0.16, blue: 0.1, alpha: 1))]
                br.position = SCNVector3(p.x + Float(dx), 2.4, p.z + Float(dz))
                br.eulerAngles.z = Float(tilt)
                themeRoot.addChildNode(br)
            }
            let owl = SCNNode(geometry: SCNSphere(radius: 0.14))
            owl.geometry?.materials = [mat(.black)]
            owl.position = SCNVector3(p.x + 0.35, 2.5, p.z + 0.15)
            themeRoot.addChildNode(owl)
        }

        private func pumpkin(at p: SCNVector3) {
            let body = SCNNode(geometry: SCNSphere(radius: 0.42))
            body.geometry?.materials = [mat(.orange, emission: UIColor(red: 0.9, green: 0.4, blue: 0, alpha: 1))]
            body.scale = SCNVector3(1, 0.82, 1)
            body.position = SCNVector3(p.x, 0.34, p.z)
            themeRoot.addChildNode(body)
            let stem = SCNNode(geometry: SCNCylinder(radius: 0.06, height: 0.25))
            stem.geometry?.materials = [mat(.green)]
            stem.position = SCNVector3(p.x, 0.72, p.z)
            themeRoot.addChildNode(stem)
            for side in [-0.15, 0.15] {
                let eye = SCNNode(geometry: SCNSphere(radius: 0.07))
                let em = mat(.yellow, emission: .yellow)
                eye.geometry?.materials = [em]
                jackGlows.append(em)
                eye.position = SCNVector3(p.x + Float(side), 0.44, p.z + 0.35)
                themeRoot.addChildNode(eye)
            }
            // Carved glowing grin.
            let grin = SCNNode(geometry: SCNSphere(radius: 0.16))
            let gm = mat(.orange, emission: .orange)
            grin.geometry?.materials = [gm]
            jackGlows.append(gm)
            grin.scale = SCNVector3(1.5, 0.55, 0.4)
            grin.position = SCNVector3(p.x, 0.22, p.z + 0.33)
            themeRoot.addChildNode(grin)
        }

        private func bones(at p: SCNVector3) {
            let bone = SCNNode(geometry: SCNCapsule(capRadius: 0.06, height: 0.5))
            bone.geometry?.materials = [mat(UIColor(white: 0.9, alpha: 1))]
            bone.position = SCNVector3(p.x, 0.08, p.z)
            bone.eulerAngles = SCNVector3(Float.pi / 2, 0, Float.random(in: 0...Float.pi))
            themeRoot.addChildNode(bone)
            let skull = SCNNode(geometry: SCNSphere(radius: 0.13))
            skull.geometry?.materials = [mat(UIColor(white: 0.88, alpha: 1))]
            skull.position = SCNVector3(p.x + 0.4, 0.12, p.z + 0.15)
            themeRoot.addChildNode(skull)
            // Extra skulls + scattered bones: a proper pile.
            for (ox, oz) in [(-0.35, 0.3), (0.1, -0.4)] {
                let s2 = SCNNode(geometry: SCNSphere(radius: 0.11))
                s2.geometry?.materials = [mat(UIColor(white: 0.88, alpha: 1))]
                s2.position = SCNVector3(p.x + Float(ox), 0.1, p.z + Float(oz))
                s2.eulerAngles.y = Float.random(in: 0...Float.pi * 2)
                themeRoot.addChildNode(s2)
            }
            let bone2 = SCNNode(geometry: SCNCapsule(capRadius: 0.05, height: 0.4))
            bone2.geometry?.materials = [mat(UIColor(white: 0.9, alpha: 1))]
            bone2.position = SCNVector3(p.x - 0.2, 0.07, p.z - 0.25)
            bone2.eulerAngles = SCNVector3(Float.pi / 2, 0, Float.random(in: 0...Float.pi))
            themeRoot.addChildNode(bone2)
        }

        private func spider(at p: SCNVector3, branchY: Float) {
            let hanger = SCNNode()
            hanger.position = SCNVector3(p.x, branchY, p.z)
            let thread = SCNNode(geometry: SCNCylinder(radius: 0.012, height: 1.4))
            thread.geometry?.materials = [mat(UIColor(white: 0.8, alpha: 0.6))]
            thread.position = SCNVector3(0, -0.7, 0)
            hanger.addChildNode(thread)
            let sbody = SCNNode(geometry: SCNSphere(radius: 0.13))
            sbody.geometry?.materials = [mat(.black)]
            sbody.scale = SCNVector3(1, 0.8, 1.2)
            sbody.position = SCNVector3(0, -1.4, 0)
            hanger.addChildNode(sbody)
            for k in 0..<8 {
                let a = Float(k) / 8 * Float.pi * 2
                let leg = SCNNode(geometry: SCNCylinder(radius: 0.015, height: 0.32))
                leg.geometry?.materials = [mat(.black)]
                leg.position = SCNVector3(cos(a) * 0.16, -1.4, sin(a) * 0.16)
                leg.eulerAngles = SCNVector3(Float.pi / 3 * (k % 2 == 0 ? 1 : -1), 0, a)
                hanger.addChildNode(leg)
            }
            for side in [-0.04, 0.04] {
                let seye = SCNNode(geometry: SCNSphere(radius: 0.025))
                seye.geometry?.materials = [mat(.red, emission: .red)]
                seye.position = SCNVector3(Float(side), -1.35, 0.11)
                hanger.addChildNode(seye)
            }
            hanger.runAction(.repeatForever(.sequence([
                .rotateBy(x: 0, y: 0, z: 0.18, duration: 1.6),
                .rotateBy(x: 0, y: 0, z: -0.18, duration: 1.6),
            ])))
            themeRoot.addChildNode(hanger)
        }

        /// Spooky dancing skeleton: skull + jaw + ribs + limbs, all action-animated.
        private func skeleton(at p: SCNVector3) {
            let root = SCNNode()
            root.position = SCNVector3(p.x, 0, p.z)
            let bone = UIColor(white: 0.92, alpha: 1)
            let pelvis = SCNNode(geometry: SCNSphere(radius: 0.16))
            pelvis.geometry?.materials = [mat(bone)]
            pelvis.scale = SCNVector3(1.2, 0.7, 0.9)
            pelvis.position = SCNVector3(0, 0.85, 0)
            root.addChildNode(pelvis)
            let spine = SCNNode(geometry: SCNCapsule(capRadius: 0.06, height: 0.5))
            spine.geometry?.materials = [mat(bone)]
            spine.position = SCNVector3(0, 1.15, 0)
            root.addChildNode(spine)
            for (i, ry) in [1.05, 1.2, 1.35].enumerated() {
                let rib = SCNNode(geometry: SCNTorus(ringRadius: CGFloat(0.26 - Float(i) * 0.03), pipeRadius: 0.035))
                rib.geometry?.materials = [mat(bone)]
                rib.position = SCNVector3(0, Float(ry), 0)
                rib.eulerAngles.x = Float.pi / 2 - 0.15
                root.addChildNode(rib)
            }
            for side in [-0.3, 0.3] {
                let armP = SCNNode()
                armP.position = SCNVector3(Float(side), 1.38, 0)
                let arm = SCNNode(geometry: SCNCapsule(capRadius: 0.05, height: 0.5))
                arm.geometry?.materials = [mat(bone)]
                arm.position = SCNVector3(0, -0.28, 0)
                armP.addChildNode(arm)
                root.addChildNode(armP)
                armP.runAction(.repeatForever(.sequence([
                    .rotateBy(x: 0, y: 0, z: 0.7, duration: 0.5),
                    .rotateBy(x: 0, y: 0, z: -0.7, duration: 0.5),
                ])))
                let leg = SCNNode(geometry: SCNCapsule(capRadius: 0.07, height: 0.6))
                leg.geometry?.materials = [mat(bone)]
                leg.position = SCNVector3(Float(side) * 0.5, 0.42, 0)
                root.addChildNode(leg)
            }
            let skull = SCNNode(geometry: SCNSphere(radius: 0.22))
            skull.geometry?.materials = [mat(bone)]
            skull.position = SCNVector3(0, 1.68, 0)
            root.addChildNode(skull)
            skull.runAction(.repeatForever(.sequence([
                .rotateBy(x: 0, y: 0, z: 0.18, duration: 0.8),
                .rotateBy(x: 0, y: 0, z: -0.18, duration: 0.8),
            ])))
            for side in [-0.08, 0.08] {
                let sock = SCNNode(geometry: SCNSphere(radius: 0.05))
                sock.geometry?.materials = [mat(.black)]
                sock.position = SCNVector3(Float(side), 0.04, 0.18)
                skull.addChildNode(sock)
            }
            let jaw = SCNNode(geometry: SCNSphere(radius: 0.09))
            jaw.geometry?.materials = [mat(bone)]
            jaw.scale = SCNVector3(1.1, 0.5, 0.9)
            jaw.position = SCNVector3(0, -0.16, 0.08)
            skull.addChildNode(jaw)
            jaw.runAction(.repeatForever(.sequence([
                .moveBy(x: 0, y: -0.05, z: 0, duration: 0.22),
                .moveBy(x: 0, y: 0.05, z: 0, duration: 0.22),
            ])))
            root.runAction(.repeatForever(.sequence([
                .moveBy(x: 0, y: 0.18, z: 0, duration: 0.45),
                .moveBy(x: 0, y: -0.18, z: 0, duration: 0.45),
            ])))
            themeRoot.addChildNode(root)
        }

        private func tombstone(at p: SCNVector3) {
            let stone = SCNNode(geometry: SCNSphere(radius: 0.4))
            stone.geometry?.materials = [mat(.gray)]
            stone.scale = SCNVector3(0.85, 1.15, 0.4)
            stone.position = SCNVector3(p.x, 0.4, p.z)
            stone.eulerAngles.z = Float(Float.random(in: -0.15...0.15))
            themeRoot.addChildNode(stone)
            let base = SCNNode(geometry: SCNCylinder(radius: 0.4, height: 0.15))
            base.geometry?.materials = [mat(.darkGray)]
            base.position = SCNVector3(p.x, 0.07, p.z)
            themeRoot.addChildNode(base)
        }

        private func bigHouse(at p: SCNVector3) {
            let main = SCNNode(geometry: SCNCylinder(radius: 5.5, height: 4.5))
            main.geometry?.materials = [mat(UIColor(red: 0.3, green: 0.25, blue: 0.35, alpha: 1))]
            main.position = SCNVector3(p.x, 2.25, p.z)
            themeRoot.addChildNode(main)
            let roof = SCNNode(geometry: SCNCone(topRadius: 0.1, bottomRadius: 6.5, height: 3))
            roof.geometry?.materials = [mat(UIColor(red: 0.45, green: 0.1, blue: 0.15, alpha: 1))]
            roof.position = SCNVector3(p.x, 6, p.z)
            themeRoot.addChildNode(roof)
            let tower = SCNNode(geometry: SCNCylinder(radius: 1.8, height: 7))
            tower.geometry?.materials = [mat(UIColor(red: 0.35, green: 0.28, blue: 0.4, alpha: 1))]
            tower.position = SCNVector3(p.x + 4.5, 3.5, p.z + 1)
            themeRoot.addChildNode(tower)
            let troof = SCNNode(geometry: SCNCone(topRadius: 0.05, bottomRadius: 2.4, height: 2.5))
            troof.geometry?.materials = [mat(.black)]
            troof.position = SCNVector3(p.x + 4.5, 8.2, p.z + 1)
            themeRoot.addChildNode(troof)
            for wx in [-3, 0, 3] {
                let win = SCNNode(geometry: SCNSphere(radius: 0.4))
                win.geometry?.materials = [mat(.green, emission: .green)]
                win.scale = SCNVector3(1, 1.2, 0.4)
                win.position = SCNVector3(p.x + Float(wx), 2.8, p.z + 5.2)
                themeRoot.addChildNode(win)
            }
            let door = SCNNode(geometry: SCNSphere(radius: 0.8))
            door.geometry?.materials = [mat(.black)]
            door.scale = SCNVector3(1, 1.4, 0.4)
            door.position = SCNVector3(p.x, 1.0, p.z + 5.2)
            themeRoot.addChildNode(door)
        }

        private func lampGreen(at p: SCNVector3) {
            let pole = SCNNode(geometry: SCNCylinder(radius: 0.07, height: 2.3))
            pole.geometry?.materials = [mat(.black)]
            pole.position = SCNVector3(p.x, 1.15, p.z)
            themeRoot.addChildNode(pole)
            let globe = SCNNode(geometry: SCNSphere(radius: 0.28))
            globe.geometry?.materials = [mat(.green, emission: .green)]
            globe.position = SCNVector3(p.x, 2.5, p.z)
            themeRoot.addChildNode(globe)
        }

        private func fireCone(at p: SCNVector3) {
            let outer = SCNNode(geometry: SCNCone(topRadius: 0.05, bottomRadius: 0.55, height: 1.3))
            outer.geometry?.materials = [mat(.orange, emission: .orange)]
            outer.position = SCNVector3(p.x, 0.65, p.z)
            themeRoot.addChildNode(outer)
            let inner = SCNNode(geometry: SCNCone(topRadius: 0.02, bottomRadius: 0.28, height: 0.8))
            inner.geometry?.materials = [mat(.yellow, emission: .yellow)]
            inner.position = SCNVector3(p.x, 0.5, p.z)
            themeRoot.addChildNode(inner)
            let base = SCNNode(geometry: SCNSphere(radius: 0.6))
            base.geometry?.materials = [mat(.darkGray)]
            base.scale = SCNVector3(1.2, 0.4, 1.2)
            base.position = SCNVector3(p.x, 0.1, p.z)
            themeRoot.addChildNode(base)
        }

        private func hut(at p: SCNVector3, wall: UIColor, roof: UIColor) {
            let w = SCNNode(geometry: SCNCylinder(radius: 1.7, height: 1.8))
            w.geometry?.materials = [mat(wall)]
            w.position = SCNVector3(p.x, 0.9, p.z)
            scene.rootNode.addChildNode(w)
            let r = SCNNode(geometry: SCNCone(topRadius: 0.05, bottomRadius: 2.3, height: 1.4))
            r.geometry?.materials = [mat(roof)]
            r.position = SCNVector3(p.x, 2.5, p.z)
            scene.rootNode.addChildNode(r)
            let knob = SCNNode(geometry: SCNSphere(radius: 0.16))
            knob.geometry?.materials = [mat(.yellow, emission: .yellow)]
            knob.position = SCNVector3(p.x, 3.3, p.z)
            scene.rootNode.addChildNode(knob)
            let door = SCNNode(geometry: SCNSphere(radius: 0.45))
            door.geometry?.materials = [mat(UIColor(red: 0.4, green: 0.25, blue: 0.12, alpha: 1))]
            door.scale = SCNVector3(0.9, 1.2, 0.4)
            door.position = SCNVector3(p.x, 0.55, p.z + 1.55)
            scene.rootNode.addChildNode(door)
            for side in [-0.9, 0.9] {
                let win = SCNNode(geometry: SCNSphere(radius: 0.22))
                win.geometry?.materials = [mat(.yellow, emission: .yellow)]
                win.scale = SCNVector3(1, 1, 0.4)
                win.position = SCNVector3(p.x + Float(side), 1.1, p.z + 1.5)
                scene.rootNode.addChildNode(win)
            }
        }

        private func tree(at p: SCNVector3, pine: Bool) {
            let trunk = SCNNode(geometry: SCNCylinder(radius: 0.16, height: 1.3))
            trunk.geometry?.materials = [mat(UIColor(red: 0.45, green: 0.3, blue: 0.15, alpha: 1))]
            trunk.position = SCNVector3(p.x, 0.65, p.z)
            scene.rootNode.addChildNode(trunk)
            let leaf = UIColor(red: 0.2, green: 0.6, blue: 0.25, alpha: 1)
            if pine {
                let c1 = SCNNode(geometry: SCNCone(topRadius: 0.05, bottomRadius: 1.1, height: 1.4))
                c1.geometry?.materials = [mat(leaf)]
                c1.position = SCNVector3(p.x, 1.9, p.z)
                scene.rootNode.addChildNode(c1)
                let c2 = SCNNode(geometry: SCNCone(topRadius: 0.05, bottomRadius: 0.8, height: 1.1))
                c2.geometry?.materials = [mat(leaf)]
                c2.position = SCNVector3(p.x, 2.7, p.z)
                scene.rootNode.addChildNode(c2)
            } else {
                for (dx, dy, dz, rr) in [(0, 1.9, 0, 0.95), (-0.55, 1.5, 0.2, 0.6), (0.55, 1.55, -0.15, 0.65)] {
                    let s = SCNNode(geometry: SCNSphere(radius: CGFloat(rr)))
                    s.geometry?.materials = [mat(leaf)]
                    s.position = SCNVector3(p.x + Float(dx), Float(dy), p.z + Float(dz))
                    scene.rootNode.addChildNode(s)
                }
                let apple = SCNNode(geometry: SCNSphere(radius: 0.12))
                apple.geometry?.materials = [mat(.red, emission: .red)]
                apple.position = SCNVector3(p.x + 0.6, 1.7, p.z + 0.5)
                scene.rootNode.addChildNode(apple)
            }
        }

        private func lamp(at p: SCNVector3) {
            let pole = SCNNode(geometry: SCNCylinder(radius: 0.07, height: 2.3))
            pole.geometry?.materials = [mat(.darkGray)]
            pole.position = SCNVector3(p.x, 1.15, p.z)
            scene.rootNode.addChildNode(pole)
            let globe = SCNNode(geometry: SCNSphere(radius: 0.28))
            globe.geometry?.materials = [mat(.yellow, emission: UIColor(red: 1, green: 0.85, blue: 0.4, alpha: 1))]
            globe.position = SCNVector3(p.x, 2.5, p.z)
            scene.rootNode.addChildNode(globe)
            let cap = SCNNode(geometry: SCNCone(topRadius: 0.02, bottomRadius: 0.35, height: 0.3))
            cap.geometry?.materials = [mat(.darkGray)]
            cap.position = SCNVector3(p.x, 2.85, p.z)
            scene.rootNode.addChildNode(cap)
        }

        private func fenceRun(from a: SCNVector3, to b: SCNVector3) {
            let n = 6
            let postMat = mat(UIColor(red: 0.6, green: 0.42, blue: 0.25, alpha: 1))
            for i in 0...n {
                let t = Float(i) / Float(n)
                let px = a.x + (b.x - a.x) * t
                let pz = a.z + (b.z - a.z) * t
                let post = SCNNode(geometry: SCNCylinder(radius: 0.09, height: 0.9))
                post.geometry?.materials = [postMat]
                post.position = SCNVector3(px, 0.45, pz)
                scene.rootNode.addChildNode(post)
                let knob = SCNNode(geometry: SCNSphere(radius: 0.11))
                knob.geometry?.materials = [postMat]
                knob.position = SCNVector3(px, 0.92, pz)
                scene.rootNode.addChildNode(knob)
            }
            let len = sqrt((b.x - a.x) * (b.x - a.x) + (b.z - a.z) * (b.z - a.z))
            for h in [0.35, 0.65] {
                let rail = SCNNode(geometry: SCNCylinder(radius: 0.05, height: CGFloat(len)))
                rail.geometry?.materials = [postMat]
                rail.position = SCNVector3((a.x + b.x) / 2, Float(h), (a.z + b.z) / 2)
                rail.eulerAngles = SCNVector3(Float.pi / 2, 0, Float.pi / 2 - atan2(b.z - a.z, b.x - a.x))
                scene.rootNode.addChildNode(rail)
            }
        }
    }
}

// ============================================================
// MARK: - SwiftUI View (Quest tab content)
// ============================================================

struct AvatarWorldView: View {
    @EnvironmentObject var ultimate: HalloweenUltimateManager
    @StateObject private var manager = AvatarWorldManager()
    @State private var showShop = false

    var body: some View {
        ZStack {
            AvatarWorldSceneView(manager: manager)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Row 1: stars + level meter + gold.
                HStack(spacing: 8) {
                    HStack(spacing: 4) {
                        Text("⭐").font(.subheadline)
                        Text("\(manager.stars)/\(manager.totalStars)")
                            .font(.subheadline.bold()).foregroundColor(.white)
                    }
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(Color.black.opacity(0.65)).cornerRadius(10)
                    Text("🗺️ \(manager.level + 1)/\(manager.levelNames.count) · \(manager.levelNames[manager.level])")
                        .font(.caption.bold()).foregroundColor(.white)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(Color.purple.opacity(0.8)).cornerRadius(10)
                        .lineLimit(1).minimumScaleFactor(0.7)
                    Spacer()
                    HStack(spacing: 4) {
                        Text("🪙").font(.subheadline)
                        Text("\(manager.gold)")
                            .font(.subheadline.bold()).foregroundColor(.white)
                    }
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(Color.black.opacity(0.65)).cornerRadius(10)
                }
                .padding(.horizontal, 8)
                .padding(.top, 4)
                // Row 2: HP bar.
                HStack(spacing: 8) {
                    HStack(spacing: 4) {
                        Text("❤️").font(.caption)
                        ProgressView(value: Double(manager.hp), total: Double(max(manager.maxHp, 1)))
                            .progressViewStyle(LinearProgressViewStyle(tint: .red))
                        Text("\(manager.hp)/\(manager.maxHp)")
                            .font(.system(size: 9).bold()).foregroundColor(.white)
                    }
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(Color.black.opacity(0.65)).cornerRadius(10)
                    Spacer()
                }
                .padding(.horizontal, 8)
                .padding(.top, 4)

                Spacer()

                Text("👆 Tap the grass to walk there")
                    .font(.caption2).foregroundColor(.white.opacity(0.85))
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Color.black.opacity(0.5)).cornerRadius(8)
                    .padding(.bottom, 6)

                // Action buttons.
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        Button(action: {
                            manager.rotateView(0.35)
                            ultimate.triggerHaptic(.light)
                        }) {
                            VStack(spacing: 2) {
                                Text("↺").font(.title2)
                                Text("Left").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.teal.opacity(0.85)).cornerRadius(14)
                        }
                        Button(action: {
                            manager.rotateView(-0.35)
                            ultimate.triggerHaptic(.light)
                        }) {
                            VStack(spacing: 2) {
                                Text("↻").font(.title2)
                                Text("Right").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.teal.opacity(0.85)).cornerRadius(14)
                        }
                        Button(action: {
                            manager.zoomBy(0.85)
                            ultimate.triggerHaptic(.light)
                        }) {
                            VStack(spacing: 2) {
                                Text("＋").font(.title2)
                                Text("In").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.indigo.opacity(0.85)).cornerRadius(14)
                        }
                        Button(action: {
                            manager.zoomBy(1.18)
                            ultimate.triggerHaptic(.light)
                        }) {
                            VStack(spacing: 2) {
                                Text("－").font(.title2)
                                Text("Out").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.indigo.opacity(0.85)).cornerRadius(14)
                        }
                        Button(action: {
                            manager.shootQueued = true
                            ultimate.triggerHaptic(.medium)
                        }) {
                            VStack(spacing: 2) {
                                Text("🔫").font(.title2)
                                Text("Shoot").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(.horizontal, 18).padding(.vertical, 10)
                            .background(Color.red.opacity(0.9)).cornerRadius(14)
                        }
                        Button(action: {
                            manager.bombQueued = true
                            ultimate.triggerHaptic(.medium)
                        }) {
                            VStack(spacing: 2) {
                                Text("🧨×\(manager.bombs)").font(.title3.bold()).foregroundColor(.white)
                                Text("Bomb").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.orange.opacity(0.9)).cornerRadius(14)
                        }
                        Button(action: {
                            manager.portalJumpQueued = true
                            ultimate.triggerHaptic(.medium)
                        }) {
                            VStack(spacing: 2) {
                                Text("⬆️").font(.title2)
                                Text("Jump").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.orange.opacity(0.9)).cornerRadius(14)
                        }
                        Button(action: {
                            manager.drinkPotion()
                            ultimate.triggerHaptic(.light)
                        }) {
                            VStack(spacing: 2) {
                                Text("🧪×\(manager.potions)").font(.title3.bold()).foregroundColor(.white)
                                Text("Heal").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.green.opacity(0.85)).cornerRadius(14)
                        }
                        Button(action: {
                            showShop = true
                            ultimate.triggerHaptic(.light)
                        }) {
                            VStack(spacing: 2) {
                                Text("🛒").font(.title2)
                                Text("Shop").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.blue.opacity(0.85)).cornerRadius(14)
                        }
                        Button(action: {
                            manager.buyGuide()
                            ultimate.triggerHaptic(.light)
                        }) {
                            VStack(spacing: 2) {
                                Text("🧭").font(.title2)
                                Text("Guide").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.yellow.opacity(0.85)).cornerRadius(14)
                        }
                        Button(action: {
                            manager.wave()
                            ultimate.triggerHaptic(.light)
                        }) {
                            VStack(spacing: 2) {
                                Text("👋").font(.title2)
                                Text("Wave").font(.caption2.bold()).foregroundColor(.white)
                            }
                            .padding(10)
                            .background(Color.pink.opacity(0.85)).cornerRadius(14)
                        }
                    }
                    .padding(.horizontal, 12)
                }
                .padding(.bottom, 8)
            }
        }
        .sheet(isPresented: $showShop) {
            AWShopView(manager: manager)
        }
    }
}

// ============================================================
// MARK: - Shop (spend ghost gold)
// ============================================================

struct AWShopView: View {
    @EnvironmentObject var ultimate: HalloweenUltimateManager
    @ObservedObject var manager: AvatarWorldManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 12) {
                HStack {
                    Text("🪙 \(manager.gold) gold").font(.headline)
                    Spacer()
                    Text("❤️ \(manager.hp)/\(manager.maxHp)").font(.subheadline)
                }
                .padding(.horizontal)
                AWShopRow(emoji: "🧪", name: "Healing Potion", desc: "+50 HP (own \(manager.potions))", price: 30) {
                    manager.buyPotion()
                    ultimate.triggerHaptic(.light)
                }
                AWShopRow(emoji: "💖", name: "Heart Charm", desc: "+20 Max HP & full heal", price: 100) {
                    manager.buyCharm()
                    ultimate.triggerHaptic(.medium)
                }
                AWShopRow(emoji: "🔥", name: "Power Core", desc: "Blaster +1 dmg (now \(manager.boltDmg))", price: 150) {
                    manager.buyPower()
                    ultimate.triggerHaptic(.medium)
                }
                AWShopRow(emoji: "🧨", name: "Bomb Bundle ×3", desc: "Lobbed AoE booms (own \(manager.bombs))", price: 45) {
                    manager.buyBomb()
                    manager.buyBomb()
                    manager.buyBomb()
                    ultimate.triggerHaptic(.medium)
                }
                Spacer()
            }
            .padding(.top)
            .navigationTitle("🛒 Ghost Shop")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct AWShopRow: View {
    var emoji: String
    var name: String
    var desc: String
    var price: Int
    var onBuy: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Text(emoji).font(.largeTitle)
            VStack(alignment: .leading, spacing: 2) {
                Text(name).font(.headline)
                Text(desc).font(.caption).foregroundColor(.secondary)
                Text("\(price) 🪙").font(.subheadline.bold()).foregroundColor(.orange)
            }
            Spacer()
            Button(action: onBuy) {
                Text("Buy").bold()
                    .padding(.horizontal, 18).padding(.vertical, 8)
                    .background(Color.green).foregroundColor(.white).cornerRadius(10)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(14)
        .padding(.horizontal)
    }
}
