import Foundation

struct CityLayoutDto: Codable {
    let cityCode: String
    let screen: String
    let variant: String?
    let blocks: [LayoutBlockDto]
}

struct LayoutBlockDto: Codable, Identifiable {
    let id: String
    let type: LayoutBlockType
    let title: String?
    let contentSlotId: String?
}

extension CityLayoutDto {
    func toDomain() -> CityLayout {
        CityLayout(
            cityCode: cityCode,
            screen: screen,
            variant: variant,
            blocks: blocks.map { $0.toDomain() }
        )
    }
}

extension LayoutBlockDto {
    func toDomain() -> LayoutBlock {
        LayoutBlock(
            id: id,
            type: type,
            title: title,
            contentSlotId: contentSlotId
        )
    }
}
