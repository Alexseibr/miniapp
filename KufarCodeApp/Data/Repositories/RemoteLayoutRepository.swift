import Combine

final class RemoteLayoutRepository: LayoutRepository {
    private let apiClient: ApiClientProtocol

    init(apiClient: ApiClientProtocol) {
        self.apiClient = apiClient
    }

    func getLayout(cityCode: String, screen: String, variant: String?) -> AnyPublisher<CityLayout, Error> {
        apiClient.request(Endpoint.getLayout(cityCode: cityCode, screen: screen, variant: variant))
            .map { (dto: CityLayoutDto) in dto.toDomain() }
            .eraseToAnyPublisher()
    }
}
