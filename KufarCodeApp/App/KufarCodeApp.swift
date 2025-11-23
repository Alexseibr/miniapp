import SwiftUI

@main
struct KufarCodeApp: App {
    @StateObject private var appContainer = AppContainer()

    var body: some Scene {
        WindowGroup {
            HomeView(viewModel: HomeViewModel(
                getHomeLayoutUseCase: appContainer.getHomeLayoutUseCase,
                cityManager: appContainer.cityManager
            ))
            .environmentObject(appContainer)
        }
    }
}
