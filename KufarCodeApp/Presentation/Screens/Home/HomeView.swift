import SwiftUI

struct HomeView: View {
    @ObservedObject var viewModel: HomeViewModel
    @EnvironmentObject var appContainer: AppContainer

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("KufarCode")
                .toolbar {
                    NavigationLink("Cities") {
                        CitySelectorView(viewModel: CitySelectorViewModel(
                            getAllCitiesUseCase: appContainer.getAllCitiesUseCase,
                            cityManager: appContainer.cityManager
                        ))
                    }
                    NavigationLink("Favorites") {
                        FavoritesView()
                    }
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.layoutState {
        case .idle:
            Color.clear.onAppear { viewModel.load() }
        case .loading:
            ProgressView("Loading layout…")
        case .failed(let message):
            VStack(spacing: 12) {
                Text(message)
                Button("Retry") { viewModel.load() }
            }
        case .loaded(let blocks):
            LayoutRendererView(blocks: blocks)
        }
    }
}
