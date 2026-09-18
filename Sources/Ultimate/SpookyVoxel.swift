//
//  SpookyVoxel.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  1) 🧱 VOXEL RUN 3D — an endless Minecraft-style spooky runner:
//     blocky voxel world, 3 lanes, swipe/tap to dodge, jump tombstones
//     and lava pits, grab candy, outrun ghosts. Fog, moon, lightning,
//     bats, flickering torchlight. Fully wired into the manager.
//  2) ⛈️ SPOOKY STORM OVERLAY — living Halloween atmosphere over the
//     whole app at night: drifting fog, passing bats, random lightning
//     with thunder haptics, plus a tap-for-thunder storm button.
//

import SwiftUI
import SceneKit
import UIKit

// ============================================================
// MARK: - Voxel World (SceneKit graph holder)
// ============================================================

final class VoxelWorld {
    let scene = SCNScene()
    let player = SCNNode()
    let torch = SCNNode()
    let flash = SCNNode()
    var bats: [(node: SCNNode, angle: CGFloat, radius: CGFloat, height: CGFloat, speed: CGFloat)] = []

    static let laneX: [Float] = [-2.2, 0, 2.2]

    init() {
        buildEnvironment()
        buildPlayer()
    }

    // MARK: Environment

    private func buildEnvironment() {
        scene.background.contents = UIColor(red: 0.03, green: 0.01, blue: 0.09, alpha: 1)

        scene.fogColor = UIColor(red: 0.10, green: 0.03, blue: 0.18, alpha: 1)
        scene.fogStartDistance = 12
        scene.fogEndDistance = 36

        // Ambient purple gloom
        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.color = UIColor(red: 0.45, green: 0.3, blue: 0.7, alpha: 1)
        ambient.light?.intensity = 90
        scene.rootNode.addChildNode(ambient)

        // Cold moonlight
        let moon = SCNNode()
        moon.light = SCNLight()
        moon.light?.type = .directional
        moon.light?.color = UIColor(red: 0.6, green: 0.65, blue: 1.0, alpha: 1)
        moon.light?.intensity = 500
        moon.eulerAngles = SCNVector3(-0.7, 0.3, 0)
        scene.rootNode.addChildNode(moon)

        // Giant emissive moon
        let moonBall = SCNNode(geometry: SCNSphere(radius: 3.2))
        moonBall.geometry?.firstMaterial = VoxelMat.glow(UIColor(red: 1, green: 0.85, blue: 0.5, alpha: 1))
        moonBall.position = SCNVector3(-13, 13, -40)
        scene.rootNode.addChildNode(moonBall)

        // Player torch (orange flicker, updated per tick)
        torch.light = SCNLight()
        torch.light?.type = .omni
        torch.light?.color = UIColor.orange
        torch.light?.intensity = 60
        torch.light?.attenuationStartDistance = 2
        torch.light?.attenuationEndDistance = 22
        torch.position = SCNVector3(0, 3, 2)
        scene.rootNode.addChildNode(torch)

        // Lightning flash light (idle 0, spikes on strikes)
        flash.light = SCNLight()
        flash.light?.type = .directional
        flash.light?.color = UIColor.white
        flash.light?.intensity = 0
        flash.eulerAngles = SCNVector3(-1.1, -0.4, 0)
        scene.rootNode.addChildNode(flash)

        // Camera
        let camera = SCNNode()
        camera.camera = SCNCamera()
        camera.camera?.fieldOfView = 62
        camera.position = SCNVector3(0, 5.4, 8.8)
        let lookTarget = SCNNode()
        lookTarget.position = SCNVector3(0, 1.0, -8)
        scene.rootNode.addChildNode(lookTarget)
        camera.constraints = [SCNLookAtConstraint(target: lookTarget)]
        scene.rootNode.addChildNode(camera)

        // Circling bats
        for i in 0..<4 {
            let bat = SCNNode(geometry: SCNBox(width: 0.7, height: 0.12, length: 0.35, chamferRadius: 0.04))
            bat.geometry?.firstMaterial = VoxelMat.flat(UIColor.black)
            scene.rootNode.addChildNode(bat)
            bats.append((node: bat, angle: CGFloat(i) * 1.7, radius: CGFloat(5 + i), height: CGFloat(6.5 + Double(i) * 0.7), speed: CGFloat(0.5 + Double(i) * 0.14)))
        }
    }

    // MARK: Player (blocky little witch)

    private func buildPlayer() {
        // Robe
        let robe = SCNNode(geometry: SCNBox(width: 0.7, height: 0.9, length: 0.5, chamferRadius: 0.08))
        robe.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.35, green: 0.15, blue: 0.7, alpha: 1))
        robe.position = SCNVector3(0, 0.75, 0)
        player.addChildNode(robe)
        // Head
        let head = SCNNode(geometry: SCNSphere(radius: 0.32))
        head.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 1, green: 0.9, blue: 0.8, alpha: 1))
        head.position = SCNVector3(0, 1.5, 0)
        player.addChildNode(head)
        // Glowing eyes
        for x in [-0.12, 0.12] as [Float] {
            let eye = SCNNode(geometry: SCNSphere(radius: 0.06))
            eye.geometry?.firstMaterial = VoxelMat.glow(UIColor.orange)
            eye.position = SCNVector3(x, 1.55, 0.28)
            player.addChildNode(eye)
        }
        // Witch hat
        let brim = SCNNode(geometry: SCNCylinder(radius: 0.42, height: 0.08))
        brim.geometry?.firstMaterial = VoxelMat.flat(UIColor.black)
        brim.position = SCNVector3(0, 1.78, 0)
        player.addChildNode(brim)
        let cone = SCNNode(geometry: SCNCone(topRadius: 0.02, bottomRadius: 0.3, height: 0.62))
        cone.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.12, green: 0.05, blue: 0.25, alpha: 1))
        cone.position = SCNVector3(0, 2.1, 0)
        cone.eulerAngles = SCNVector3(0, 0, 0.18)
        player.addChildNode(cone)
        // Broom
        let broom = SCNNode(geometry: SCNCylinder(radius: 0.05, height: 1.5))
        broom.geometry?.firstMaterial = VoxelMat.flat(UIColor.brown)
        broom.position = SCNVector3(0.55, 0.8, 0.1)
        broom.eulerAngles = SCNVector3(0, 0, 1.1)
        player.addChildNode(broom)

        player.position = SCNVector3(0, 0, 0)
        scene.rootNode.addChildNode(player)
    }
}

// MARK: - Voxel Materials

enum VoxelMat {
    static func flat(_ color: UIColor) -> SCNMaterial {
        let m = SCNMaterial()
        m.diffuse.contents = color
        m.roughness.contents = 0.9
        return m
    }

    static func glow(_ color: UIColor) -> SCNMaterial {
        let m = SCNMaterial()
        m.diffuse.contents = color
        m.emission.contents = color
        m.emission.intensity = 1.6
        return m
    }
}

// MARK: - Row Model

enum VoxelContent {
    case empty
    case candy
    case star
    case tombstone
    case deadTree
    case pit
    case ghost

    var blocksPath: Bool {
        switch self {
        case .tombstone, .deadTree, .pit, .ghost: return true
        case .empty, .candy, .star: return false
        }
    }

    /// Can be cleared by jumping (ghosts hover — must change lane).
    var jumpable: Bool {
        switch self {
        case .tombstone, .deadTree, .pit: return true
        case .ghost, .empty, .candy, .star: return false
        }
    }
}

struct VoxelRow {
    var lanes: [VoxelContent] = [.empty, .empty, .empty]
    var nodes: [SCNNode] = []
    var z: Float = -44
    var resolved = false
}

// MARK: - SceneKit View Wrapper

struct VoxelSceneContainer: UIViewRepresentable {
    var scene: SCNScene

    func makeUIView(context: Context) -> SCNView {
        let v = SCNView()
        v.scene = scene
        v.backgroundColor = .black
        v.autoenablesDefaultLighting = true
        v.allowsCameraControl = false
        v.preferredFramesPerSecond = 60
        v.isPlaying = true
        v.antialiasingMode = .multisampling4X
        return v
    }

    func updateUIView(_ uiView: SCNView, context: Context) {
        if uiView.scene !== scene {
            uiView.scene = scene
        }
    }
}

// ============================================================
// MARK: - GAME 5: VOXEL RUN 3D (endless)
// ============================================================

struct VoxelRunView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    var onDone: () -> Void

    @State private var world: VoxelWorld?
    @State private var rows: [VoxelRow] = []
    @State private var lane = 1
    @State private var jumpT: Double?
    @State private var score = 0
    @State private var distance: Float = 0
    @State private var candyScore = 0
    @State private var candyCount = 0
    @State private var hearts = 3
    @State private var elapsed: Double = 0
    @State private var speed: Float = 9
    @State private var spawnAccum: Float = 0
    @State private var invulnUntil = Date.distantPast
    @State private var flashOpacity = 0.0
    @State private var shakeTrigger = 0
    @State private var boltT: Double = 6
    @State private var started = false
    @State private var paused = false
    @State private var finished = false
    @State private var clock: GameClock?
    @State private var result: (xp: Int, gold: Int, isBest: Bool)?

    var body: some View {
        ArcadeShell(title: "🧱 Voxel Run 3D", onDone: onDone) {
            ZStack {
                VStack(spacing: 8) {
                    ArcadeHUD(score: score, hearts: hearts, extra: "\(Int(distance))m • \(candyCount)🍬")

                    ZStack {
                        if let world {
                            VoxelSceneContainer(scene: world.scene)
                                .cornerRadius(16)
                                .arcadeShake(trigger: shakeTrigger)
                                .gesture(
                                    DragGesture(minimumDistance: 24)
                                        .onEnded { v in
                                            let dx = v.translation.width
                                            let dy = v.translation.height
                                            if abs(dx) > abs(dy) {
                                                changeLane(dx > 0 ? 1 : -1)
                                            } else if dy < -20 {
                                                jump()
                                            }
                                        }
                                )
                                .onTapGesture(count: 1) { /* taps handled by side buttons */ }
                        } else {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.black.opacity(0.5))
                                .overlay(Text("🧱").font(.system(size: 64)).arcadeFloat())
                        }

                        // Lightning flash over the 3D view
                        Color.white
                            .opacity(flashOpacity)
                            .cornerRadius(16)
                            .allowsHitTesting(false)

                        // Pause button
                        if started && !finished {
                            VStack {
                                HStack {
                                    Spacer()
                                    Button(action: togglePause) {
                                        Image(systemName: paused ? "play.fill" : "pause.fill")
                                            .font(.headline)
                                            .foregroundColor(.white)
                                            .frame(width: 38, height: 38)
                                            .background(Color.black.opacity(0.55))
                                            .cornerRadius(10)
                                    }
                                    .padding(10)
                                }
                                Spacer()
                            }
                        }
                    }
                    .padding(.horizontal)

                    // Controls: dodge + jump
                    HStack(spacing: 14) {
                        Button(action: { changeLane(-1) }) {
                            Image(systemName: "arrow.left")
                                .font(.title2.bold())
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.purple.opacity(0.85))
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                        Button(action: jump) {
                            HStack {
                                Image(systemName: "arrow.up")
                                Text("JUMP")
                            }
                            .font(.headline.bold())
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.orange.gradient)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .arcadeGlowPulse(.orange)
                        Button(action: { changeLane(1) }) {
                            Image(systemName: "arrow.right")
                                .font(.title2.bold())
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.purple.opacity(0.85))
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 4)
                    .disabled(!started || finished || paused)

                    Text("Swipe ◀ ▶ to dodge • swipe ▲ or JUMP to leap • dodge 👻 by lane!")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }
                .padding(.top)

                if !started {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeStartCard(
                        mascot: "🧱",
                        title: "Voxel Run 3D",
                        lines: [
                            "Endless Minecraft-style sprint through Raven Lane",
                            "Dodge 👻 ghosts by lane — jump 🪦 stones & 🟧 lava",
                            "Grab 🍬 candy (+25) and ⭐ stars (+60)",
                            "It gets faster… how far can you ride your broom?"
                        ]
                    ) { startGame() }
                }

                if paused && !finished {
                    Color.black.opacity(0.6).ignoresSafeArea()
                    VStack(spacing: 12) {
                        Text("⏸️ Paused").font(.title.bold()).foregroundColor(.white)
                        Button(action: togglePause) {
                            Text("Resume").font(.headline).foregroundColor(.white)
                                .frame(maxWidth: .infinity).padding()
                                .background(Color.green).cornerRadius(12)
                        }
                    }
                    .padding(28)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(20)
                    .padding(.horizontal, 40)
                }

                if finished, let result {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeGameOverCard(
                        title: "Wiped out!",
                        score: score,
                        xp: result.xp,
                        gold: result.gold,
                        isBest: result.isBest,
                        onReplay: { startGame() },
                        onDone: onDone
                    )
                }
            }
        }
        .onDisappear { clock?.invalidate(); clock = nil }
    }

    // MARK: - Game flow

    private func startGame() {
        clock?.invalidate()
        clock = nil
        world = VoxelWorld()
        rows = []
        lane = 1
        jumpT = nil
        score = 0
        distance = 0
        candyScore = 0
        candyCount = 0
        hearts = 3
        elapsed = 0
        speed = 9
        spawnAccum = 0
        invulnUntil = Date.distantPast
        finished = false
        paused = false
        result = nil
        started = true
        manager.triggerHaptic(.medium)
        manager.addNotification("🧱 You kick off your broom down Raven Lane!")
        // Vsync display-link: tick(dt:) is already dt-based, so this only
        // swaps the jittery fixed timer for aligned, speed-correct frames.
        let c = GameClock(framesPerSecond: 60)
        c.add { dt in tick(dt: dt) }
        clock = c
    }

    private func togglePause() {
        guard started, !finished else { return }
        paused.toggle()
        manager.triggerHaptic(.light)
        if paused {
            clock?.pause()
        } else {
            clock?.resume()
        }
    }

    private func endGame() {
        finished = true
        clock?.invalidate()
        clock = nil
        result = manager.reportArcadeScore(.voxelRun, score: score, gameName: "Voxel Run 3D")
    }

    // MARK: - Input

    private func changeLane(_ dir: Int) {
        guard started, !finished, !paused else { return }
        let next = min(max(lane + dir, 0), 2)
        if next != lane {
            lane = next
            manager.triggerHaptic(.light)
        }
    }

    private func jump() {
        guard started, !finished, !paused, jumpT == nil else { return }
        jumpT = 0
        manager.triggerHaptic(.light)
    }

    // MARK: - Tick

    private func tick(dt: Double) {
        guard let world, started, !finished, !paused else { return }
        elapsed += dt
        speed = 9 + min(Float(elapsed) * 0.14, 10)
        distance += speed * Float(dt)
        score = Int(distance) + candyScore

        // Spawn rows by distance
        spawnAccum += Float(dt) * speed
        let spacing: Float = 8.5
        while spawnAccum >= spacing {
            spawnAccum -= spacing
            spawnRow(in: world)
        }

        // Move rows
        for i in rows.indices {
            rows[i].z += speed * Float(dt)
        }
        // Remove passed rows
        for row in rows where row.z > 7 {
            for n in row.nodes { n.removeFromParentNode() }
        }
        rows.removeAll { $0.z > 7 }

        // Player glide + jump arc
        let targetX = VoxelWorld.laneX[lane]
        var pos = world.player.position
        pos.x += (targetX - pos.x) * 0.28
        if let jt = jumpT {
            let next = jt + dt / 0.55
            if next >= 1 {
                jumpT = nil
                pos.y = 0
            } else {
                jumpT = next
                pos.y = Float(3.4 * sin(next * .pi))
            }
        }
        // Lean into turns + bob
        world.player.position = pos
        world.player.eulerAngles.z = (pos.x - targetX) * -0.12

        // Collisions
        let airborne = jumpT != nil
        for i in rows.indices where !rows[i].resolved {
            let row = rows[i]
            if row.z > -0.7 && row.z < 0.7 {
                rows[i].resolved = true
                resolve(row: row, airborne: airborne)
            }
        }

        // Bats circle
        let t = CGFloat(elapsed)
        for b in world.bats {
            let bx = cos(b.angle + t * b.speed) * b.radius
            let by = b.height + sin(t * 2 + b.angle) * 0.6
            let bz = CGFloat(-12) + sin(t * 0.7 + b.angle) * 2
            b.node.position = SCNVector3(Float(bx), Float(by), Float(bz))
            b.node.scale.y = Float(0.7 + 0.3 * abs(sin(t * 9 + b.angle)))
        }

        // Torch flicker follows player
        let flickerY = Float(3) + Float(sin(t * 11)) * 0.15
        world.torch.position = SCNVector3(pos.x, flickerY, 2)
        world.torch.light?.intensity = CGFloat(58) + sin(t * 13) * 7 + sin(t * 31) * 3

        // Random lightning
        boltT -= dt
        if boltT <= 0 {
            boltT = Double.random(in: 6...13)
            strikeLightning(in: world, small: true)
        }
    }

    private func resolve(row: VoxelRow, airborne: Bool) {
        guard Date() > invulnUntil else { return }
        let content = row.lanes[lane]
        switch content {
        case .empty:
            break
        case .candy:
            candyScore += 25
            candyCount += 1
            manager.triggerHaptic(.light)
            manager.createParticles(at: CGPoint(x: 200, y: 300), count: 6, emoji: "🍬")
            hidePickup(in: row, y: 1.0)
        case .star:
            candyScore += 60
            candyCount += 1
            manager.triggerHaptic(.success)
            manager.createParticles(at: CGPoint(x: 200, y: 300), count: 12, emoji: "⭐")
            manager.addNotification("⭐ Star candy! +60!")
            hidePickup(in: row, y: 1.0)
        case .tombstone, .deadTree, .pit:
            if !airborne { hitPlayer(reason: content == .pit ? "🟧 You plunged into lava!" : "💥 Bonk! Straight into a \(content == .pit ? "pit" : "tombstone")!") }
        case .ghost:
            hitPlayer(reason: "👻 A ghost phased right through you!")
        }
    }

    private func hidePickup(in row: VoxelRow, y: Float) {
        for n in row.nodes where abs(n.position.y - y) < 0.6 && n.position.y > 0.3 {
            n.removeFromParentNode()
        }
    }

    private func hitPlayer(reason: String) {
        hearts -= 1
        invulnUntil = Date().addingTimeInterval(1.4)
        shakeTrigger += 1
        flashRed()
        manager.triggerHaptic(.heavy)
        manager.addNotification("\(reason) (\(max(hearts, 0))❤️ left)")
        if hearts <= 0 {
            endGame()
        }
    }

    private func flashRed() {
        // Quick red vignette via the white flash overlay tinted by defect: reuse shake + haptic.
    }

    private func strikeLightning(in world: VoxelWorld, small: Bool) {
        world.flash.light?.intensity = 2600
        withAnimation(.linear(duration: 0.09)) { flashOpacity = small ? 0.28 : 0.5 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            world.flash.light?.intensity = 0
            withAnimation(.linear(duration: 0.25)) { flashOpacity = 0 }
        }
        manager.triggerHaptic(.heavy)
    }

    // MARK: - Row spawning

    private func spawnRow(in world: VoxelWorld) {
        var lanes: [VoxelContent] = [.empty, .empty, .empty]
        for l in 0..<3 {
            let roll = Double.random(in: 0...1)
            switch roll {
            case 0..<0.52: lanes[l] = .empty
            case 0.52..<0.70: lanes[l] = .candy
            case 0.70..<0.75: lanes[l] = .star
            case 0.75..<0.83: lanes[l] = .tombstone
            case 0.83..<0.89: lanes[l] = .deadTree
            case 0.89..<0.94: lanes[l] = .pit
            default: lanes[l] = .ghost
            }
        }
        // Guarantee a survivable lane.
        let safe = Int.random(in: 0..<3)
        lanes[safe] = Bool.random() ? .candy : .empty

        var row = VoxelRow(lanes: lanes, z: -44)
        for l in 0..<3 {
            let x = VoxelWorld.laneX[l]
            buildGround(for: lanes[l], x: x, row: &row, world: world)
            switch lanes[l] {
            case .tombstone: row.nodes.append(VoxelBuilder.tombstone(x: x, parent: world.scene.rootNode, z: row.z))
            case .deadTree: row.nodes.append(VoxelBuilder.deadTree(x: x, parent: world.scene.rootNode, z: row.z))
            case .candy: row.nodes.append(VoxelBuilder.candy(x: x, parent: world.scene.rootNode, z: row.z))
            case .star: row.nodes.append(VoxelBuilder.star(x: x, parent: world.scene.rootNode, z: row.z))
            case .ghost: row.nodes.append(VoxelBuilder.ghost(x: x, parent: world.scene.rootNode, z: row.z))
            case .pit, .empty: break
            }
        }
        // Spooky side dressing (no collision)
        if Bool.random() {
            let side: Float = Bool.random() ? -4.6 : 4.6
            if Bool.random() {
                row.nodes.append(VoxelBuilder.pumpkin(x: side + Float.random(in: -0.6...0.6), parent: world.scene.rootNode, z: row.z + Float.random(in: -2...2)))
            } else {
                row.nodes.append(VoxelBuilder.deadTree(x: side, parent: world.scene.rootNode, z: row.z, scale: 1.6))
            }
        }
        rows.append(row)
    }

    private func buildGround(for content: VoxelContent, x: Float, row: inout VoxelRow, world: VoxelWorld) {
        if content == .pit {
            // Lava glowing in the gap
            let lava = SCNNode(geometry: SCNBox(width: 1.9, height: 0.1, length: 2.4, chamferRadius: 0))
            lava.geometry?.firstMaterial = VoxelMat.glow(UIColor(red: 1, green: 0.35, blue: 0.05, alpha: 1))
            lava.position = SCNVector3(x, -0.62, row.z)
            world.scene.rootNode.addChildNode(lava)
            row.nodes.append(lava)
            return
        }
        let g = SCNNode(geometry: SCNBox(width: 1.9, height: 0.5, length: 2.4, chamferRadius: 0.02))
        let shade = Float.random(in: -0.02...0.03)
        g.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.13 + CGFloat(shade), green: 0.08, blue: 0.2, alpha: 1))
        g.position = SCNVector3(x, -0.26, row.z)
        world.scene.rootNode.addChildNode(g)
        row.nodes.append(g)
    }
}

// MARK: - Voxel Builders (pumpkins, tombstones, trees, candy, ghosts)

enum VoxelBuilder {
    static func tombstone(x: Float, parent: SCNNode, z: Float) -> SCNNode {
        let root = SCNNode()
        let stone = SCNNode(geometry: SCNBox(width: 0.75, height: 1.05, length: 0.3, chamferRadius: 0.1))
        stone.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.45, green: 0.45, blue: 0.55, alpha: 1))
        stone.position = SCNVector3(0, 0.52, 0)
        root.addChildNode(stone)
        let top = SCNNode(geometry: SCNCylinder(radius: 0.37, height: 0.3))
        top.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.45, green: 0.45, blue: 0.55, alpha: 1))
        top.eulerAngles = SCNVector3(Float.pi / 2, 0, 0)
        top.position = SCNVector3(0, 1.05, 0)
        root.addChildNode(top)
        // Glowing epitaph
        let glyph = SCNNode(geometry: SCNBox(width: 0.3, height: 0.4, length: 0.05, chamferRadius: 0.02))
        glyph.geometry?.firstMaterial = VoxelMat.glow(UIColor(red: 0.6, green: 1, blue: 0.5, alpha: 1))
        glyph.position = SCNVector3(0, 0.55, 0.16)
        root.addChildNode(glyph)
        root.position = SCNVector3(x, 0, z)
        parent.addChildNode(root)
        return root
    }

    static func deadTree(x: Float, parent: SCNNode, z: Float, scale: Float = 1.0) -> SCNNode {
        let root = SCNNode()
        let trunk = SCNNode(geometry: SCNCylinder(radius: 0.16, height: 1.9))
        trunk.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.25, green: 0.12, blue: 0.08, alpha: 1))
        trunk.position = SCNVector3(0, 0.95, 0)
        root.addChildNode(trunk)
        for (i, a) in [0.5, 2.4, 4.4].enumerated() {
            let branch = SCNNode(geometry: SCNCylinder(radius: 0.07, height: 1.0))
            branch.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.22, green: 0.1, blue: 0.08, alpha: 1))
            let bx: Float = Float(cos(a)) * 0.4
            let bz: Float = Float(sin(a)) * 0.4
            branch.position = SCNVector3(bx, 1.2 + Float(i) * 0.3, bz)
            branch.eulerAngles = SCNVector3(0, 0, 0.9)
            root.addChildNode(branch)
        }
        let crown = SCNNode(geometry: SCNCone(topRadius: 0.05, bottomRadius: 0.85, height: 1.1))
        crown.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.2, green: 0.08, blue: 0.3, alpha: 1))
        crown.position = SCNVector3(0, 2.2, 0)
        root.addChildNode(crown)
        root.scale = SCNVector3(scale, scale, scale)
        root.position = SCNVector3(x, 0, z)
        parent.addChildNode(root)
        return root
    }

    static func candy(x: Float, parent: SCNNode, z: Float) -> SCNNode {
        let root = SCNNode()
        let cube = SCNNode(geometry: SCNBox(width: 0.45, height: 0.45, length: 0.45, chamferRadius: 0.1))
        cube.geometry?.firstMaterial = VoxelMat.glow(UIColor.orange)
        root.addChildNode(cube)
        for s in [-0.42, 0.42] as [Float] {
            let wing = SCNNode(geometry: SCNCone(topRadius: 0.02, bottomRadius: 0.2, height: 0.35))
            wing.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.7, green: 0.2, blue: 0.1, alpha: 1))
            wing.position = SCNVector3(s, 0, 0)
            wing.eulerAngles = SCNVector3(0, 0, s > 0 ? -1.2 : 1.2)
            root.addChildNode(wing)
        }
        root.position = SCNVector3(x, 1.0, z)
        root.runAction(.repeatForever(.rotateBy(x: 0, y: CGFloat.pi * 2, z: 0, duration: 1.6)))
        parent.addChildNode(root)
        return root
    }

    static func star(x: Float, parent: SCNNode, z: Float) -> SCNNode {
        let root = SCNNode(geometry: SCNSphere(radius: 0.3))
        root.geometry?.firstMaterial = VoxelMat.glow(UIColor.yellow)
        root.position = SCNVector3(x, 1.0, z)
        root.runAction(.repeatForever(.rotateBy(x: 0, y: CGFloat.pi * 2, z: 0, duration: 1.1)))
        parent.addChildNode(root)
        return root
    }

    static func ghost(x: Float, parent: SCNNode, z: Float) -> SCNNode {
        let root = SCNNode()
        let body = SCNNode(geometry: SCNBox(width: 0.7, height: 0.9, length: 0.5, chamferRadius: 0.18))
        body.geometry?.firstMaterial = VoxelMat.flat(UIColor(white: 0.92, alpha: 1))
        body.position = SCNVector3(0, 0, 0)
        root.addChildNode(body)
        for ex in [-0.15, 0.15] as [Float] {
            let eye = SCNNode(geometry: SCNSphere(radius: 0.09))
            eye.geometry?.firstMaterial = VoxelMat.glow(UIColor.red)
            eye.position = SCNVector3(ex, 0.12, 0.26)
            root.addChildNode(eye)
        }
        let mouth = SCNNode(geometry: SCNSphere(radius: 0.1))
        mouth.geometry?.firstMaterial = VoxelMat.flat(UIColor.black)
        mouth.scale = SCNVector3(1, 1.4, 0.6)
        mouth.position = SCNVector3(0, -0.18, 0.24)
        root.addChildNode(mouth)
        root.position = SCNVector3(x, 1.0, z)
        root.runAction(.repeatForever(.sequence([
            .moveBy(x: 0, y: 0.25, z: 0, duration: 0.7),
            .moveBy(x: 0, y: -0.25, z: 0, duration: 0.7)
        ])))
        parent.addChildNode(root)
        return root
    }

    static func pumpkin(x: Float, parent: SCNNode, z: Float) -> SCNNode {
        let root = SCNNode()
        let body = SCNNode(geometry: SCNSphere(radius: 0.55))
        body.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.95, green: 0.45, blue: 0.08, alpha: 1))
        body.scale = SCNVector3(1, 0.82, 1)
        body.position = SCNVector3(0, 0.45, 0)
        root.addChildNode(body)
        for ex in [-0.18, 0.18] as [Float] {
            let eye = SCNNode(geometry: SCNBox(width: 0.14, height: 0.16, length: 0.05, chamferRadius: 0))
            eye.geometry?.firstMaterial = VoxelMat.glow(UIColor.yellow)
            eye.position = SCNVector3(ex, 0.55, 0.48)
            root.addChildNode(eye)
        }
        let grin = SCNNode(geometry: SCNBox(width: 0.4, height: 0.1, length: 0.05, chamferRadius: 0))
        grin.geometry?.firstMaterial = VoxelMat.glow(UIColor.yellow)
        grin.position = SCNVector3(0, 0.28, 0.5)
        root.addChildNode(grin)
        let stem = SCNNode(geometry: SCNCylinder(radius: 0.08, height: 0.3))
        stem.geometry?.firstMaterial = VoxelMat.flat(UIColor(red: 0.2, green: 0.4, blue: 0.15, alpha: 1))
        stem.position = SCNVector3(0, 0.95, 0)
        root.addChildNode(stem)
        root.position = SCNVector3(x, 0, z)
        parent.addChildNode(root)
        return root
    }
}

// ============================================================
// MARK: - ⛈️ SPOOKY STORM OVERLAY (app-wide night atmosphere)
// ============================================================

struct SpookyStormOverlay: View {
    @ObservedObject var manager: HalloweenUltimateManager
    @State private var flash = 0.0
    @State private var fogA = -320.0
    @State private var fogB = 320.0
    @State private var stormTimer: Timer?

    var body: some View {
        ZStack {
            // Drifting fog bands (never block touches)
            RoundedRectangle(cornerRadius: 60)
                .fill(Color.purple.opacity(0.10))
                .frame(width: 560, height: 90)
                .blur(radius: 26)
                .offset(x: fogA, y: -140)
                .allowsHitTesting(false)
                .onAppear {
                    withAnimation(.linear(duration: 21).repeatForever(autoreverses: true)) {
                        fogA = 320
                    }
                }
            RoundedRectangle(cornerRadius: 60)
                .fill(Color.white.opacity(0.06))
                .frame(width: 620, height: 70)
                .blur(radius: 30)
                .offset(x: fogB, y: 190)
                .allowsHitTesting(false)
                .onAppear {
                    withAnimation(.linear(duration: 27).repeatForever(autoreverses: true)) {
                        fogB = -320
                    }
                }

            // Passing bats
            StormBat(delay: 0, y: 120, duration: 11)
            StormBat(delay: 4, y: 190, duration: 14)
            StormBat(delay: 8, y: 90, duration: 12)

            // Lightning flash
            Color.white
                .opacity(flash)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            // Tap-for-thunder button (the interactive bit)
            VStack {
                HStack {
                    Spacer()
                    Button(action: { strike(manual: true) }) {
                        Text("⛈️")
                            .font(.title2)
                            .padding(8)
                            .background(Color.black.opacity(0.45))
                            .cornerRadius(12)
                            .arcadeGlowPulse(.purple)
                    }
                    .padding(.trailing, 12)
                    .padding(.top, 108)
                }
                Spacer()
            }
        }
        .onAppear {
            stormTimer?.invalidate()
            stormTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
                if Double.random(in: 0...1) < 0.09 {
                    strike(manual: false)
                }
            }
        }
        .onDisappear { stormTimer?.invalidate() }
    }

    private func strike(manual: Bool) {
        // Double-blink lightning
        withAnimation(.linear(duration: 0.08)) { flash = manual ? 0.5 : 0.38 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.linear(duration: 0.08)) { flash = 0.08 }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            withAnimation(.linear(duration: 0.1)) { flash = manual ? 0.42 : 0.3 }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.34) {
            withAnimation(.linear(duration: 0.4)) { flash = 0 }
        }
        manager.triggerHaptic(.heavy)
        if manual {
            manager.createParticles(at: CGPoint(x: 200, y: 120), count: 14, emoji: "⚡")
            manager.addNotification("⛈️ You summon the storm! The ghosts shiver...")
        }
    }
}

struct StormBat: View {
    var delay: Double
    var y: CGFloat
    var duration: Double
    @State private var x: CGFloat = -60

    var body: some View {
        Text("🦇")
            .font(.system(size: 26))
            .position(x: x, y: y)
            .opacity(0.75)
            .allowsHitTesting(false)
            .onAppear {
                x = -60
                withAnimation(.linear(duration: duration).repeatForever(autoreverses: false).delay(delay)) {
                    x = UIScreen.main.bounds.width + 60
                }
            }
    }
}
