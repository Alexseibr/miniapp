import Foundation

struct ContentSlotDto: Codable, Identifiable {
    let id: String
    let title: String
    let ads: [AdDto]
}

extension ContentSlotDto {
    func toDomain() -> ContentSlot {
        ContentSlot(id: id, title: title, ads: ads.map { $0.toDomain() })
    }
}
