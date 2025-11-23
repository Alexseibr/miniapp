import Foundation

struct CityDto: Codable {
    let code: String
    let name: String
    let theme: CityThemeDto?
}

struct CityThemeDto: Codable {
    let primaryColor: String
}

extension CityDto {
    func toDomain() -> City {
        City(
            code: code,
            name: name,
            theme: theme?.toDomain()
        )
    }
}

extension CityThemeDto {
    func toDomain() -> CityTheme {
        CityTheme(primaryColorHex: primaryColor)
    }
}
