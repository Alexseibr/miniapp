import Combine

struct GetContentSlotUseCase {
    let contentRepository: ContentRepository

    func execute(id: String) -> AnyPublisher<ContentSlot, Error> {
        contentRepository.getContentSlot(id: id)
    }
}
