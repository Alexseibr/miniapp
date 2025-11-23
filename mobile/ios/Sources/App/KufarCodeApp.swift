import SwiftUI

@main
struct KufarCodeApp: App {
    @StateObject private var homeViewModel = HomeViewModel()
    @StateObject private var citySelectorViewModel = CitySelectorViewModel()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                HomeView(viewModel: homeViewModel)
                    .environmentObject(citySelectorViewModel)
            }
        }
    }
}
