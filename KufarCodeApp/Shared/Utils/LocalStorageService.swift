import Foundation

final class LocalStorageService {
    enum Keys {
        static let selectedCityCode = "selectedCityCode"
        static let favoriteAdIds = "favoriteAdIds"
    }

    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    var selectedCityCode: String? {
        get { userDefaults.string(forKey: Keys.selectedCityCode) }
        set { userDefaults.setValue(newValue, forKey: Keys.selectedCityCode) }
    }

    var favoriteAdIds: [String] {
        get { userDefaults.stringArray(forKey: Keys.favoriteAdIds) ?? [] }
        set { userDefaults.setValue(newValue, forKey: Keys.favoriteAdIds) }
    }
}
