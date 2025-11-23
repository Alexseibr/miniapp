import Foundation
import Combine

final class AdDetailViewModel: ObservableObject {
    @Published var ad: Ad
    @Published var isFavorite: Bool
    private let localStorageService: LocalStorageService

    init(ad: Ad, localStorageService: LocalStorageService) {
        self.ad = ad
        self.localStorageService = localStorageService
        self.isFavorite = localStorageService.favoriteAdIds.contains(ad.id)
    }

    func toggleFavorite() {
        var favorites = localStorageService.favoriteAdIds
        if let index = favorites.firstIndex(of: ad.id) {
            favorites.remove(at: index)
            isFavorite = false
        } else {
            favorites.append(ad.id)
            isFavorite = true
        }
        localStorageService.favoriteAdIds = favorites
    }
}
