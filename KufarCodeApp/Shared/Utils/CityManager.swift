import Foundation
import Combine

final class CityManager: ObservableObject {
    @Published private(set) var selectedCityCode: String?
    private let localStorageService: LocalStorageService

    init(localStorageService: LocalStorageService) {
        self.localStorageService = localStorageService
        self.selectedCityCode = localStorageService.selectedCityCode
    }

    func updateCity(code: String) {
        localStorageService.selectedCityCode = code
        selectedCityCode = code
    }
}
