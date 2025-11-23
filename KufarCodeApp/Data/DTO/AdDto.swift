import Foundation

struct AdDto: Codable, Identifiable {
    let id: String
    let title: String
    let price: Double?
    let cityCode: String
    let seasonCode: String?
    let categoryId: String?
    let coordinates: GeoPointDto?
}

struct GeoPointDto: Codable {
    let type: String
    let coordinates: [Double]
}

extension AdDto {
    func toDomain() -> Ad {
        Ad(
            id: id,
            title: title,
            price: price,
            cityCode: cityCode,
            seasonCode: seasonCode,
            categoryId: categoryId,
            location: coordinates?.toDomain()
        )
    }
}

extension GeoPointDto {
    func toDomain() -> GeoPoint {
        GeoPoint(latitude: coordinates.last ?? 0, longitude: coordinates.first ?? 0)
    }
}
