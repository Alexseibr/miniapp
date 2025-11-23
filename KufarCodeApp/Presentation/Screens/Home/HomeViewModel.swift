import Foundation
import Combine

final class HomeViewModel: ObservableObject {
    @Published var layoutState: ViewState<[LayoutBlock]> = .idle
    @Published var cityState: ViewState<City> = .idle

    private let getHomeLayoutUseCase: GetHomeLayoutUseCase
    private let cityManager: CityManager
    private var cancellables = Set<AnyCancellable>()

    init(getHomeLayoutUseCase: GetHomeLayoutUseCase, cityManager: CityManager) {
        self.getHomeLayoutUseCase = getHomeLayoutUseCase
        self.cityManager = cityManager
        load()
    }

    func load() {
        let cityCode = cityManager.selectedCityCode ?? "minsk"
        layoutState = .loading
        getHomeLayoutUseCase.execute(cityCode: cityCode)
            .sink { [weak self] completion in
                if case let .failure(error) = completion {
                    self?.layoutState = .failed(error.localizedDescription)
                }
            } receiveValue: { [weak self] layout in
                self?.layoutState = .loaded(layout.blocks)
                self?.cityState = .loaded(City(code: layout.cityCode, name: layout.cityCode.uppercased(), theme: nil))
            }
            .store(in: &cancellables)
    }
}
