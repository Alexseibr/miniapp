import SwiftUI

struct AdListBlockView: View {
    let block: LayoutBlock

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(block.title ?? "Популярное")
                .font(.headline)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(block.ads ?? []) { ad in
                        AdCardView(ad: ad)
                    }
                }
            }
        }
    }
}

struct AdCardView: View {
    let ad: Ad

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(ad.title)
                .font(.headline)
            if let price = ad.price {
                Text(price)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(width: 200)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.gray.opacity(0.1)))
    }
}
