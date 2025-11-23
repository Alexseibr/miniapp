import Foundation

enum HTTPMethod: String {
    case get = "GET"
}

struct Endpoint {
    let path: String
    let method: HTTPMethod
    let queryItems: [URLQueryItem]

    init(path: String, method: HTTPMethod = .get, queryItems: [URLQueryItem] = []) {
        self.path = path
        self.method = method
        self.queryItems = queryItems
    }
}

extension Endpoint {
    static func getLayout(cityCode: String, screen: String, variant: String? = nil) -> Endpoint {
        var items = [
            URLQueryItem(name: "cityCode", value: cityCode),
            URLQueryItem(name: "screen", value: screen)
        ]
        if let variant = variant {
            items.append(URLQueryItem(name: "variant", value: variant))
        }
        return Endpoint(path: "/api/layout", queryItems: items)
    }

    static func getTrendingAds(cityCode: String) -> Endpoint {
        Endpoint(path: "/api/ads/trending", queryItems: [
            URLQueryItem(name: "cityCode", value: cityCode)
        ])
    }

    static func getNearbyAds(lat: Double, lng: Double, radiusKm: Double, categoryId: String? = nil) -> Endpoint {
        var items = [
            URLQueryItem(name: "lat", value: String(lat)),
            URLQueryItem(name: "lng", value: String(lng)),
            URLQueryItem(name: "radiusKm", value: String(radiusKm))
        ]
        if let categoryId = categoryId {
            items.append(URLQueryItem(name: "categoryId", value: categoryId))
        }
        return Endpoint(path: "/api/ads/nearby", queryItems: items)
    }

    static func getSeasonAds(seasonCode: String) -> Endpoint {
        Endpoint(path: "/api/ads", queryItems: [
            URLQueryItem(name: "seasonCode", value: seasonCode)
        ])
    }

    static func getCity(code: String) -> Endpoint {
        Endpoint(path: "/api/city/\(code)")
    }

    static func getCities() -> Endpoint {
        Endpoint(path: "/api/city")
    }

    static func getContentSlot(slotId: String) -> Endpoint {
        Endpoint(path: "/api/content/slot/\(slotId)")
    }
}
