import SwiftUI

struct CategoryGridBlockView: View {
    let block: LayoutBlock

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(block.title ?? "Категории")
                .font(.headline)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(block.categories ?? []) { category in
                        Button(action: { /* TODO: navigate */ }) {
                            Text(category.title)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Color.gray.opacity(0.1))
                                .cornerRadius(12)
                        }
                    }
                }
            }
        }
    }
}
