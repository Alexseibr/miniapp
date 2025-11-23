import Combine

final class RemoteContentRepository: ContentRepository {
    private let apiClient: ApiClientProtocol

    init(apiClient: ApiClientProtocol) {
        self.apiClient = apiClient
    }

    func getContentSlot(id: String) -> AnyPublisher<ContentSlot, Error> {
        apiClient.request(Endpoint.getContentSlot(slotId: id))
            .map { (dto: ContentSlotDto) in dto.toDomain() }
            .eraseToAnyPublisher()
    }
}
