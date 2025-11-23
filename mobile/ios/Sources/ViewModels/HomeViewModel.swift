import Foundation

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var layoutState: LoadState<CityLayout> = .loading
    @Published var trending: [Ad] = []

    private let layoutService = LayoutService()
    private let adsService = AdsService()

    func load(cityCode: String) async {
        layoutState = .loading
        do {
            let layout = try await layoutService.getLayout(cityCode: cityCode, screen: "home")
            let trendingAds = try await adsService.trending(cityCode: cityCode)
            layoutState = .loaded(layout)
            trending = trendingAds
        } catch {
            layoutState = .failed(error.localizedDescription)
        }
    }
}

enum LoadState<Value> {
    case loading
    case loaded(Value)
    case failed(String)
}
