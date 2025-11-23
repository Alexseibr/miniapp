import Foundation

enum LayoutBlockType: String, Codable {
    case heroBanner = "hero_banner"
    case categoryGrid = "category_grid"
    case adList = "ad_list"
    case banner = "banner"
    case map = "map"
}

struct LayoutBlock: Identifiable, Codable {
    let id: String
    let type: LayoutBlockType
    let title: String?
    let contentSlotId: String?
}
