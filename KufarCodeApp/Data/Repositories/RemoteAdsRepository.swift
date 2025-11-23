import Combine

final class RemoteAdsRepository: AdsRepository {
    private let apiClient: ApiClientProtocol

    init(apiClient: ApiClientProtocol) {
        self.apiClient = apiClient
    }

    func getTrendingAds(cityCode: String) -> AnyPublisher<[Ad], Error> {
        apiClient.request(Endpoint.getTrendingAds(cityCode: cityCode))
            .map { (dtos: [AdDto]) in dtos.map { $0.toDomain() } }
            .eraseToAnyPublisher()
    }

    func getNearbyAds(lat: Double, lng: Double, radiusKm: Double, categoryId: String?) -> AnyPublisher<[Ad], Error> {
        apiClient.request(Endpoint.getNearbyAds(lat: lat, lng: lng, radiusKm: radiusKm, categoryId: categoryId))
            .map { (dtos: [AdDto]) in dtos.map { $0.toDomain() } }
            .eraseToAnyPublisher()
    }

    func getSeasonAds(seasonCode: String) -> AnyPublisher<[Ad], Error> {
        apiClient.request(Endpoint.getSeasonAds(seasonCode: seasonCode))
            .map { (dtos: [AdDto]) in dtos.map { $0.toDomain() } }
            .eraseToAnyPublisher()
    }
}
