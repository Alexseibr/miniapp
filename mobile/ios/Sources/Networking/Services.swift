import Foundation

struct LayoutService {
    private let client = ApiClient()

    struct LayoutRequest: APIRequest {
        typealias Response = CityLayout
        let cityCode: String
        let screen: String
        var path: String { "/api/layout" }
        var queryItems: [URLQueryItem] { [
            URLQueryItem(name: "cityCode", value: cityCode),
            URLQueryItem(name: "screen", value: screen)
        ] }
    }

    func getLayout(cityCode: String, screen: String) async throws -> CityLayout {
        try await client.send(LayoutRequest(cityCode: cityCode, screen: screen))
    }
}

struct AdsService {
    private let client = ApiClient()

    struct TrendingRequest: APIRequest {
        typealias Response = [Ad]
        let cityCode: String
        var path: String { "/api/ads/trending" }
        var queryItems: [URLQueryItem] { [URLQueryItem(name: "cityCode", value: cityCode)] }
    }

    struct NearbyRequest: APIRequest {
        typealias Response = [Ad]
        let lat: Double
        let lng: Double
        let radiusKm: Double
        var path: String { "/api/ads/nearby" }
        var queryItems: [URLQueryItem] {
            [
                URLQueryItem(name: "lat", value: String(lat)),
                URLQueryItem(name: "lng", value: String(lng)),
                URLQueryItem(name: "radiusKm", value: String(radiusKm))
            ]
        }
    }

    struct SeasonRequest: APIRequest {
        typealias Response = [Ad]
        let seasonCode: String
        var path: String { "/api/ads" }
        var queryItems: [URLQueryItem] { [URLQueryItem(name: "seasonCode", value: seasonCode)] }
    }

    struct AdByIdRequest: APIRequest {
        typealias Response = Ad
        let id: String
        var path: String { "/api/ads/\(id)" }
        var queryItems: [URLQueryItem] { [] }
    }

    func trending(cityCode: String) async throws -> [Ad] {
        try await client.send(TrendingRequest(cityCode: cityCode))
    }

    func nearby(lat: Double, lng: Double, radiusKm: Double) async throws -> [Ad] {
        try await client.send(NearbyRequest(lat: lat, lng: lng, radiusKm: radiusKm))
    }

    func bySeason(code: String) async throws -> [Ad] {
        try await client.send(SeasonRequest(seasonCode: code))
    }

    func ad(id: String) async throws -> Ad {
        try await client.send(AdByIdRequest(id: id))
    }
}

struct CityService {
    private let client = ApiClient()

    struct CityRequest: APIRequest {
        typealias Response = City
        let code: String
        var path: String { "/api/city/\(code)" }
        var queryItems: [URLQueryItem] { [] }
    }

    struct AllCitiesRequest: APIRequest {
        typealias Response = [City]
        var path: String { "/api/city" }
        var queryItems: [URLQueryItem] { [] }
    }

    func city(code: String) async throws -> City {
        try await client.send(CityRequest(code: code))
    }

    func all() async throws -> [City] {
        try await client.send(AllCitiesRequest())
    }
}

struct ContentService {
    private let client = ApiClient()

    struct SlotRequest: APIRequest {
        typealias Response = ContentSlot
        let slotId: String
        var path: String { "/api/content/slot/\(slotId)" }
        var queryItems: [URLQueryItem] { [] }
    }

    func slot(id: String) async throws -> ContentSlot {
        try await client.send(SlotRequest(slotId: id))
    }
}
