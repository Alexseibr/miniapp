import Combine

struct GetCityByCodeUseCase {
    let cityRepository: CityRepository

    func execute(code: String) -> AnyPublisher<City, Error> {
        cityRepository.getCity(code: code)
    }
}

struct GetAllCitiesUseCase {
    let cityRepository: CityRepository

    func execute() -> AnyPublisher<[City], Error> {
        cityRepository.getCities()
    }
}
