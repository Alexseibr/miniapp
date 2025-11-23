import Foundation

@MainActor
final class CitySelectorViewModel: ObservableObject {
    @Published var cities: [City] = []
    @Published var selectedCityCode: String = UserDefaults.standard.string(forKey: "city_code") ?? "brest"

    private let cityService = CityService()

    func load() async {
        do {
            cities = try await cityService.all()
        } catch {
            cities = []
        }
    }

    func select(city: City) {
        selectedCityCode = city.code
        UserDefaults.standard.set(city.code, forKey: "city_code")
    }
}
