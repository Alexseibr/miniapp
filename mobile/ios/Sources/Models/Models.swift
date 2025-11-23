import Foundation

struct City: Codable, Identifiable {
    var id: String { code }
    let code: String
    let name: String
    let theme: CityTheme?
    let modules: [String]?
}

struct CityTheme: Codable {
    let primaryColor: String?
    let logoUrl: String?
}

struct CityLayout: Codable {
    let screen: String
    let blocks: [LayoutBlock]
}

struct LayoutBlock: Codable, Identifiable {
    enum BlockType: String, Codable {
        case heroBanner = "hero_banner"
        case categoryGrid = "category_grid"
        case adList = "ad_list"
        case banner
        case map
    }

    let id: String
    let type: BlockType
    let title: String?
    let subtitle: String?
    let contentSlotId: String?
    let ads: [Ad]?
    let categories: [Category]?
}

struct Category: Codable, Identifiable {
    let id: String
    let title: String
    let iconUrl: String?
}

struct Ad: Codable, Identifiable {
    let id: String
    let title: String
    let price: String?
    let imageUrl: String?
    let description: String?
    let cityCode: String?
    let seasonCode: String?
    let location: GeoPoint?
}

struct GeoPoint: Codable {
    let type: String
    let coordinates: [Double]
}

struct ContentSlot: Codable, Identifiable {
    let id: String
    let title: String?
    let imageUrl: String?
    let ctaText: String?
    let ctaUrl: String?
}
