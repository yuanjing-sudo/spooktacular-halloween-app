import SwiftUI
import QuartzCore

// ============================================================
// MARK: - GameClock: one vsync-aligned driver for ambient sims
//
// Replaces scattered Timer.scheduledTimer game loops. Timers fire on
// the runloop with no vsync alignment (visible judder) and fixed
// per-tick steps run 2x fast on 120Hz ProMotion screens. This clock:
//  - ticks on CADisplayLink (vsync-aligned, no judder)
//  - passes real delta-time so motion is speed-correct everywhere
//  - clamps dt (background hiccups can't teleport entities)
//  - auto-pauses when the app resigns active (no wasted work)
// ============================================================

final class GameClock {
    typealias TickHandler = (_ dt: Double) -> Void

    private var link: CADisplayLink?
    private var handlers: [UUID: TickHandler] = [:]
    private var lastTimestamp: CFTimeInterval = 0
    private let maxDelta = 1.0 / 20.0
    private var resignObserver: NSObjectProtocol?
    private var becomeObserver: NSObjectProtocol?
    private var pausedBySystem = false

    init(framesPerSecond: Int = 30) {
        let link = CADisplayLink(target: self, selector: #selector(step(_:)))
        link.preferredFramesPerSecond = framesPerSecond
        link.isPaused = true
        link.add(to: .main, forMode: .common)
        self.link = link
        resignObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil, queue: .main
        ) { [weak self] _ in
            guard let self = self, let link = self.link, !link.isPaused else { return }
            self.pausedBySystem = true
            link.isPaused = true
        }
        becomeObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil, queue: .main
        ) { [weak self] _ in
            guard let self = self, let link = self.link else { return }
            if self.pausedBySystem {
                self.pausedBySystem = false
                self.lastTimestamp = 0 // avoid dt spike on return
                if !self.handlers.isEmpty { link.isPaused = false }
            }
        }
    }

    deinit {
        link?.invalidate()
        if let o = resignObserver { NotificationCenter.default.removeObserver(o) }
        if let o = becomeObserver { NotificationCenter.default.removeObserver(o) }
    }

    /// Registers a per-tick handler. The clock runs while ≥1 handler exists.
    @discardableResult
    func add(_ handler: @escaping TickHandler) -> UUID {
        let id = UUID()
        handlers[id] = handler
        lastTimestamp = 0
        link?.isPaused = false
        return id
    }

    func remove(_ id: UUID) {
        handlers.removeValue(forKey: id)
        if handlers.isEmpty { link?.isPaused = true }
    }

    func stop() {
        handlers.removeAll()
        link?.isPaused = true
    }

    /// Pauses but keeps handlers so `resume()` can continue the same loop.
    func pause() {
        link?.isPaused = true
    }

    func resume() {
        lastTimestamp = 0
        if !handlers.isEmpty { link?.isPaused = false }
    }

    /// Full teardown: breaks handler retain cycles and kills the link.
    /// Always prefer this over `stop()` when the loop won't be resumed.
    func invalidate() {
        handlers.removeAll()
        link?.isPaused = true
        link?.invalidate()
        link = nil
    }

    @objc private func step(_ link: CADisplayLink) {
        let now = link.timestamp
        defer { lastTimestamp = now }
        guard lastTimestamp > 0 else { return } // skip first tick (no dt yet)
        var dt = now - lastTimestamp
        if dt <= 0 { return }
        dt = min(dt, maxDelta)
        for handler in handlers.values { handler(dt) }
    }
}
