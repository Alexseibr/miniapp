import Foundation
import Combine

final class CitySelectorViewModel: ObservableObject {
    @Published var citiesState: ViewState<[City]> = .idle
    private let getAllCitiesUseCase: GetAllCitiesUseCase
    private let cityManager: CityManager
    private var cancellables = Set<AnyCancellable>()

    init(getAllCitiesUseCase: GetAllCitiesUseCase, cityManager: CityManager) {
        self.getAllCitiesUseCase = getAllCitiesUseCase
        self.cityManager = cityManager
        load()
    }

    func load() {
        citiesState = .loading
        getAllCitiesUseCase.execute()
            .sink { [weak self] completion in
                if case let .failure(error) = completion {
                    self?.citiesState = .failed(error.localizedDescription)
                }
            } receiveValue: { [weak self] cities in
                self?.citiesState = .loaded(cities)
            }
            .store(in: &cancellables)
    }

    func selectCity(_ city: City) {
        cityManager.updateCity(code: city.code)
    }
}
