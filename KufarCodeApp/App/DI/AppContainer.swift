import Foundation
import Combine

final class AppContainer: ObservableObject {
    // Networking
    let apiClient: ApiClient

    // Services
    let localStorageService: LocalStorageService
    let cityManager: CityManager

    // Repositories
    let layoutRepository: LayoutRepository
    let adsRepository: AdsRepository
    let cityRepository: CityRepository
    let contentRepository: ContentRepository

    // Use Cases
    let getHomeLayoutUseCase: GetHomeLayoutUseCase
    let getTrendingAdsUseCase: GetTrendingAdsUseCase
    let getNearbyAdsUseCase: GetNearbyAdsUseCase
    let getSeasonAdsUseCase: GetSeasonAdsUseCase
    let getCityByCodeUseCase: GetCityByCodeUseCase
    let getAllCitiesUseCase: GetAllCitiesUseCase
    let getContentSlotUseCase: GetContentSlotUseCase

    init(baseURL: URL = URL(string: "https://api.example.com")!,
         userDefaults: UserDefaults = .standard) {
        self.apiClient = ApiClient(baseURL: baseURL)
        self.localStorageService = LocalStorageService(userDefaults: userDefaults)
        self.cityManager = CityManager(localStorageService: localStorageService)

        self.layoutRepository = RemoteLayoutRepository(apiClient: apiClient)
        self.adsRepository = RemoteAdsRepository(apiClient: apiClient)
        self.cityRepository = RemoteCityRepository(apiClient: apiClient)
        self.contentRepository = RemoteContentRepository(apiClient: apiClient)

        self.getHomeLayoutUseCase = GetHomeLayoutUseCase(
            cityRepository: cityRepository,
            layoutRepository: layoutRepository
        )
        self.getTrendingAdsUseCase = GetTrendingAdsUseCase(adsRepository: adsRepository)
        self.getNearbyAdsUseCase = GetNearbyAdsUseCase(adsRepository: adsRepository)
        self.getSeasonAdsUseCase = GetSeasonAdsUseCase(adsRepository: adsRepository)
        self.getCityByCodeUseCase = GetCityByCodeUseCase(cityRepository: cityRepository)
        self.getAllCitiesUseCase = GetAllCitiesUseCase(cityRepository: cityRepository)
        self.getContentSlotUseCase = GetContentSlotUseCase(contentRepository: contentRepository)
    }
}
