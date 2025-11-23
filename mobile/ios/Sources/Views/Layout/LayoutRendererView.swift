import SwiftUI

struct LayoutRendererView: View {
    let blocks: [LayoutBlock]

    var body: some View {
        VStack(spacing: 16) {
            ForEach(blocks) { block in
                switch block.type {
                case .heroBanner:
                    HeroBannerBlockView(block: block)
                case .categoryGrid:
                    CategoryGridBlockView(block: block)
                case .adList:
                    AdListBlockView(block: block)
                case .banner:
                    PromoBannerBlockView(block: block)
                case .map:
                    MapBlockView(block: block)
                }
            }
        }
    }
}
