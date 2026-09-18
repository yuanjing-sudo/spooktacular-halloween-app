import SwiftUI
import AVFoundation

// ============================================================
// MARK: - SpookyMusic: single global music + sound-effects switchboard
//
// Why this exists: the app had 3 competing infinite AVAudioPlayers
// pointing at mp3 files that don't exist in the bundle (silent no-ops)
// plus a generative loop buried in AWSound — all autostarting, none
// mutable, and the Settings toggles were `.constant(true)` dummies.
//
// This manager owns ALL music: a generative haunted score rendered
// offline into two gapless loops (no audio files needed), optional
// bundled-mp3 override, one persisted mute switch, interruption and
// background handling, and a shared SFX on/off gate for AWSound.
// ============================================================

final class SpookyMusic: ObservableObject {
    static let shared = SpookyMusic()

    @Published var musicEnabled: Bool {
        didSet {
            UserDefaults.standard.set(musicEnabled, forKey: "spookyMusicEnabled")
            if musicEnabled { start() } else { stop() }
        }
    }
    @Published var sfxEnabled: Bool {
        didSet { UserDefaults.standard.set(sfxEnabled, forKey: "spookySfxEnabled") }
    }
    @Published var musicVolume: Double {
        didSet {
            UserDefaults.standard.set(musicVolume, forKey: "spookyMusicVolume")
            applyVolumes()
        }
    }
    @Published private(set) var isPlaying = false

    private var engine: AVAudioEngine?
    private var padNode: AVAudioPlayerNode?
    private var bellNode: AVAudioPlayerNode?
    private var fadeTimer: Timer?
    private var filePlayers = NSHashTable<AVAudioPlayer>.weakObjects()
    private var fileBaseVolumes = NSMapTable<AVAudioPlayer, NSNumber>(keyOptions: .weakMemory, valueOptions: .strongMemory)
    private var wasPlayingBeforeInterruption = false
    private var interruptionObserver: NSObjectProtocol?

    private init() {
        self.musicEnabled = UserDefaults.standard.object(forKey: "spookyMusicEnabled") as? Bool ?? true
        self.sfxEnabled = UserDefaults.standard.object(forKey: "spookySfxEnabled") as? Bool ?? true
        self.musicVolume = UserDefaults.standard.object(forKey: "spookyMusicVolume") as? Double ?? 0.5
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil, queue: .main
        ) { [weak self] note in self?.handleInterruption(note) }
    }

    // MARK: - Lifecycle (call from app appear / scene phase)

    /// Begin playback if the user has music enabled. Safe to call repeatedly.
    func userStart() {
        guard musicEnabled else { return }
        start()
    }

    func setActive(_ active: Bool) {
        if active {
            if musicEnabled { start() }
        } else {
            pauseEngine()
        }
    }

    // MARK: - File-loop registry (legacy per-screen mp3 players)

    /// Screens that own an AVAudioPlayer loop register it here instead of
    /// calling play() themselves, so mute/volume/pause apply globally.
    /// If any real file loop exists it takes over and the synth stays off.
    func registerFilePlayer(_ player: AVAudioPlayer?, baseVolume: Float) {
        guard let player = player else { return }
        player.numberOfLoops = -1
        filePlayers.add(player)
        fileBaseVolumes.setObject(NSNumber(value: baseVolume), forKey: player)
        applyState()
    }

    private var hasFileLoops: Bool { filePlayers.allObjects.count > 0 }

    // MARK: - Engine

    private func ensureSession() {
        do {
            // .playback so music is audible even with the silent switch on.
            try AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("SpookyMusic session failed: \(error)")
        }
    }

    private func start() {
        ensureSession()
        if hasFileLoops {
            applyState()
            return
        }
        do {
            if engine == nil { try buildEngine() }
            guard let engine = engine else { return }
            if !engine.isRunning { try engine.start() }
            padNode?.play()
            bellNode?.play()
            fade(to: Float(musicVolume))
            isPlaying = true
        } catch {
            print("SpookyMusic start failed: \(error)")
        }
    }

    private func stop() {
        fade(to: 0) { [weak self] in
            self?.padNode?.pause()
            self?.bellNode?.pause()
            self?.isPlaying = false
        }
        for player in filePlayers.allObjects { player.pause() }
    }

    private func pauseEngine() {
        padNode?.pause()
        bellNode?.pause()
        for player in filePlayers.allObjects { player.pause() }
        isPlaying = false
    }

    private func applyState() {
        if !musicEnabled { stop(); return }
        if hasFileLoops {
            // Real mp3s win: silence the synth, run the files.
            padNode?.pause()
            bellNode?.pause()
            applyVolumes()
            for player in filePlayers.allObjects { if !player.isPlaying { player.play() } }
            isPlaying = true
        } else if isPlaying || engine == nil {
            start()
        }
        applyVolumes()
    }

    private func applyVolumes() {
        for player in filePlayers.allObjects {
            let base = fileBaseVolumes.object(forKey: player)?.floatValue ?? 0.4
            player.volume = min(1, max(0, base * Float(musicVolume) * 2))
        }
        if !hasFileLoops {
            padNode?.volume = 1
            bellNode?.volume = 1
        }
    }

    private func fade(to target: Float, done: (() -> Void)? = nil) {
        fadeTimer?.invalidate()
        let steps = 20
        var step = 0
        let startV: Float = padNode?.volume ?? 0
        fadeTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] t in
            guard let self = self else { t.invalidate(); return }
            step += 1
            let k = min(1, Float(step) / Float(steps))
            // Smoothstep easing — no clicks, no linear zipper noise.
            let e = k * k * (3 - 2 * k)
            let v = startV + (target - startV) * e
            self.padNode?.volume = v
            self.bellNode?.volume = v
            if step >= steps { t.invalidate(); done?() }
        }
    }

    private func handleInterruption(_ note: Notification) {
        guard let info = note.userInfo,
              let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .began {
            wasPlayingBeforeInterruption = isPlaying
            pauseEngine()
        } else if type == .ended {
            let opts = info[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            if AVAudioSession.InterruptionOptions(rawValue: opts).contains(.shouldResume),
               wasPlayingBeforeInterruption, musicEnabled {
                start()
            }
        }
    }

    // MARK: - Generative score (rendered once, looped gaplessly)

    private func buildEngine() throws {
        let engine = AVAudioEngine()
        let pad = AVAudioPlayerNode()
        let bells = AVAudioPlayerNode()
        engine.attach(pad)
        engine.attach(bells)
        // Explicit stereo format on every connection: scheduleBuffer and
        // play() both throw NSException when formats disagree anywhere
        // in the chain, so buffers are rendered stereo (see makeBuffer)
        // and wired stereo with no format-converting units in between.
        // (Darkness is baked into the render instead of an EQ node.)
        guard let stereo = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 2) else {
            throw NSError(domain: "SpookyMusic", code: 1)
        }
        engine.connect(pad, to: engine.mainMixerNode, format: stereo)
        engine.connect(bells, to: engine.mainMixerNode, format: stereo)
        pad.scheduleBuffer(renderPad(), at: nil, options: .loops)
        bells.scheduleBuffer(renderBells(), at: nil, options: .loops)
        pad.volume = 0
        bells.volume = 0
        self.engine = engine
        self.padNode = pad
        self.bellNode = bells
    }

    private func makeBuffer(seconds: Double) -> AVAudioPCMBuffer? {
        guard let fmt = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 2),
              let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: AVAudioFrameCount(44_100 * seconds)) else { return nil }
        buf.frameLength = buf.frameCapacity
        return buf
    }

    /// Writes one mono sample to both stereo channels.
    private func poke(_ buf: AVAudioPCMBuffer, _ i: Int, _ s: Double) {
        let v = Float(s)
        buf.floatChannelData?[0][i] = v
        buf.floatChannelData?[1][i] = v
    }

    /// 16s minor pad: Am – F – C – G roots (4s each) with harmonics + shimmer.
    private func renderPad() -> AVAudioPCMBuffer {
        let sr = 44_100.0
        let buf = makeBuffer(seconds: 16)!
        let roots: [Double] = [110.0, 87.31, 130.81, 98.0]
        let total = Int(16 * sr)
        for i in 0..<total {
            let t = Double(i) / sr
            let chord = min(3, Int(t / 4.0))
            let local = t - Double(chord * 4)
            // Raised-cosine per-chord envelope: seamless at loop + chord joints.
            let env = 0.5 - 0.5 * cos(2 * .pi * local / 4.0)
            let f = roots[chord]
            let shimmer = 1 + 0.003 * sin(2 * .pi * 0.25 * t)
            var s = sin(2 * .pi * f * shimmer * t)
                + 0.4 * sin(2 * .pi * 2 * f * t)
                + 0.15 * sin(2 * .pi * 3 * f * t + 1)
            s *= 0.055 * (0.35 + 0.65 * env)
            poke(buf, i, s)
        }
        return buf
    }

    /// 11s sparse music-box bells (A-minor pentatonic) + wind swell.
    /// Deterministic LCG so the motif is identical every launch.
    private func renderBells() -> AVAudioPCMBuffer {
        let sr = 44_100.0
        let buf = makeBuffer(seconds: 11)!
        var seed: UInt64 = 0xC0FFEE
        func rnd() -> Double {
            seed = seed &* 6364136223846793005 &+ 1442695040888963407
            return Double(seed >> 33) / Double(1 << 31)
        }
        struct Bell { let start: Double; let freq: Double; let dur: Double; let vol: Double }
        let scale = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0]
        var bells: [Bell] = []
        var t = 0.4
        while t < 10.2 {
            bells.append(Bell(start: t, freq: scale[Int(rnd() * Double(scale.count))],
                              dur: 1.2 + rnd() * 1.2, vol: 0.05 + rnd() * 0.05))
            t += 1.4 + rnd() * 2.2
        }
        let total = Int(11 * sr)
        var windPhase = 0.0
        for i in 0..<total {
            let time = Double(i) / sr
            var s = 0.0
            for b in bells where time >= b.start {
                let lt = time - b.start
                if lt < b.dur {
                    let k = lt / b.dur
                    let env = exp(-3.5 * k) * min(1, lt / 0.01)
                    s += sin(2 * .pi * b.freq * lt) * env * b.vol
                    s += 0.3 * sin(2 * .pi * b.freq * 2 * lt) * env * b.vol
                }
            }
            // Slow wind swell (loop-safe: exactly 1 cycle per buffer).
            windPhase += 2 * .pi / Double(total)
            s += sin(windPhase) * 0.012 + sin(windPhase * 3 + 1) * 0.006
            poke(buf, i, s)
        }
        return buf
    }
}

// ============================================================
// MARK: - Music toggle button (drop anywhere, always visible)
// ============================================================

struct MusicToggleButton: View {
    @ObservedObject private var music = SpookyMusic.shared
    var size: CGFloat = 22

    var body: some View {
        Button(action: { music.musicEnabled.toggle() }) {
            Image(systemName: music.musicEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill")
                .font(.system(size: size))
                .foregroundColor(music.musicEnabled ? .orange : .gray)
                .frame(width: 36, height: 36)
                .background(Circle().fill(Color.black.opacity(0.5)))
        }
        .accessibilityLabel(music.musicEnabled ? "Mute music" : "Unmute music")
    }
}
