import Combine

final class RemoteCityRepository: CityRepository {
    private let apiClient: ApiClientProtocol

    init(apiClient: ApiClientProtocol) {
        self.apiClient = apiClient
    }

    func getCity(code: String) -> AnyPublisher<City, Error> {
        apiClient.request(Endpoint.getCity(code: code))
            .map { (dto: CityDto) in dto.toDomain() }
            .eraseToAnyPublisher()
    }

    func getCities() -> AnyPublisher<[City], Error> {
        apiClient.request(Endpoint.getCities())
            .map { (dtos: [CityDto]) in dtos.map { $0.toDomain() } }
            .eraseToAnyPublisher()
    }
}
