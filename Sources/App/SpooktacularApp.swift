import SwiftUI

@main struct SpooktacularApp: App {
    @State private var booted = false

    var body: some Scene {
        WindowGroup {
            Group {
                if booted {
                    UltimateContentView()
                        .preferredColorScheme(.dark)
                        .transition(.opacity.combined(with: .scale(scale: 0.98)))
                } else {
                    MineBootSequenceView {
                        booted = true
                    }
                }
            }
            .animation(.spring(response: 0.5, dampingFraction: 0.8), value: booted)
        }
    }
}
