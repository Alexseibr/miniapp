import SwiftUI

struct PromoBannerBlockView: View {
    let block: LayoutBlock

    var body: some View {
        VStack(alignment: .leading) {
            Text(block.title ?? "")
                .font(.body)
                .padding()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.gray.opacity(0.15)))
    }
}
