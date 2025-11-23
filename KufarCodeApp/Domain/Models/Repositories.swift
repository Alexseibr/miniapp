import Combine

protocol LayoutRepository {
    func getLayout(cityCode: String, screen: String, variant: String?) -> AnyPublisher<CityLayout, Error>
}

protocol AdsRepository {
    func getTrendingAds(cityCode: String) -> AnyPublisher<[Ad], Error>
    func getNearbyAds(lat: Double, lng: Double, radiusKm: Double, categoryId: String?) -> AnyPublisher<[Ad], Error>
    func getSeasonAds(seasonCode: String) -> AnyPublisher<[Ad], Error>
}

protocol CityRepository {
    func getCity(code: String) -> AnyPublisher<City, Error>
    func getCities() -> AnyPublisher<[City], Error>
}

protocol ContentRepository {
    func getContentSlot(id: String) -> AnyPublisher<ContentSlot, Error>
}
