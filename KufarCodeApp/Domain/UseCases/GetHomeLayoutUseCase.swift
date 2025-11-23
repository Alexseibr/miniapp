import Combine

struct GetHomeLayoutUseCase {
    let cityRepository: CityRepository
    let layoutRepository: LayoutRepository

    func execute(cityCode: String, screen: String = "home", variant: String? = nil) -> AnyPublisher<CityLayout, Error> {
        layoutRepository.getLayout(cityCode: cityCode, screen: screen, variant: variant)
    }
}
