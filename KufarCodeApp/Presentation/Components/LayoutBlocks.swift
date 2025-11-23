import SwiftUI

struct HeroBannerBlockView: View {
    let block: LayoutBlock

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.blue.opacity(0.2))
            VStack(alignment: .leading, spacing: 8) {
                Text(block.title ?? "Hero Banner")
                    .font(.title2)
                    .bold()
                Text("Dynamic hero banner content")
                    .font(.subheadline)
            }
            .padding()
        }
        .frame(maxWidth: .infinity)
    }
}

struct CategoryGridBlockView: View {
    let block: LayoutBlock

    var body: some View {
        VStack(alignment: .leading) {
            Text(block.title ?? "Categories")
                .font(.headline)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 12) {
                ForEach(0..<4) { index in
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.green.opacity(0.2))
                        .frame(height: 80)
                        .overlay(Text("Category \(index + 1)"))
                }
            }
        }
    }
}

struct AdListBlockView: View {
    let block: LayoutBlock

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(block.title ?? "Ads")
                .font(.headline)
            ForEach(0..<3) { index in
                HStack {
                    Circle().fill(Color.orange.opacity(0.3)).frame(width: 48, height: 48)
                    VStack(alignment: .leading) {
                        Text("Ad title \(index + 1)")
                        Text("Price: --")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding(8)
                .background(RoundedRectangle(cornerRadius: 10).stroke(Color.gray.opacity(0.2)))
            }
        }
    }
}

struct PromoBannerBlockView: View {
    let block: LayoutBlock

    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color.purple.opacity(0.15))
            .frame(height: 120)
            .overlay(
                Text(block.title ?? "Promo banner")
                    .bold()
            )
    }
}

struct MapBlockView: View {
    let block: LayoutBlock

    var body: some View {
        VStack(alignment: .leading) {
            Text(block.title ?? "Map")
                .font(.headline)
            MapView(ads: [])
                .frame(height: 200)
                .cornerRadius(12)
        }
    }
}
