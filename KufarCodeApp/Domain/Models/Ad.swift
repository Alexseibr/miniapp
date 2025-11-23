import Foundation

struct Ad: Identifiable {
    let id: String
    let title: String
    let price: Double?
    let cityCode: String
    let seasonCode: String?
    let categoryId: String?
    let location: GeoPoint?
}

struct GeoPoint {
    let latitude: Double
    let longitude: Double
}
