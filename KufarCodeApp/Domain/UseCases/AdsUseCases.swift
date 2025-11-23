import Combine

struct GetTrendingAdsUseCase {
    let adsRepository: AdsRepository

    func execute(cityCode: String) -> AnyPublisher<[Ad], Error> {
        adsRepository.getTrendingAds(cityCode: cityCode)
    }
}

struct GetNearbyAdsUseCase {
    let adsRepository: AdsRepository

    func execute(lat: Double, lng: Double, radiusKm: Double, categoryId: String? = nil) -> AnyPublisher<[Ad], Error> {
        adsRepository.getNearbyAds(lat: lat, lng: lng, radiusKm: radiusKm, categoryId: categoryId)
    }
}

struct GetSeasonAdsUseCase {
    let adsRepository: AdsRepository

    func execute(seasonCode: String) -> AnyPublisher<[Ad], Error> {
        adsRepository.getSeasonAds(seasonCode: seasonCode)
    }
}
