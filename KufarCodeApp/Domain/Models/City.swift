import Foundation

struct City: Identifiable {
    var id: String { code }
    let code: String
    let name: String
    let theme: CityTheme?
}

struct CityTheme {
    let primaryColorHex: String
}
