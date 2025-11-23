import SwiftUI

struct HomeView: View {
    @ObservedObject var viewModel: HomeViewModel
    @EnvironmentObject var citySelectorViewModel: CitySelectorViewModel

    var body: some View {
        VStack {
            switch viewModel.layoutState {
            case .loading:
                ProgressView("Загрузка...")
                    .task { await viewModel.load(cityCode: citySelectorViewModel.selectedCityCode) }
            case .failed(let message):
                VStack(spacing: 12) {
                    Text("Ошибка: \(message)")
                    Button("Повторить") {
                        Task { await viewModel.load(cityCode: citySelectorViewModel.selectedCityCode) }
                    }
                }
            case .loaded(let layout):
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        LayoutRendererView(blocks: layout.blocks)
                        AdListBlockView(block: LayoutBlock(
                            id: "trending",
                            type: .adList,
                            title: "Популярное",
                            subtitle: nil,
                            contentSlotId: nil,
                            ads: viewModel.trending,
                            categories: nil
                        ))
                    }
                    .padding()
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                NavigationLink("Город") {
                    CitySelectorView(viewModel: citySelectorViewModel) {
                        Task { await viewModel.load(cityCode: citySelectorViewModel.selectedCityCode) }
                    }
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink("Избранное") {
                    FavoritesView()
                }
            }
        }
    }
}
