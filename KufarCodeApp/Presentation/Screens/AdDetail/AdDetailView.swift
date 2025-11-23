import SwiftUI

struct AdDetailView: View {
    @ObservedObject var viewModel: AdDetailViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(viewModel.ad.title)
                .font(.title)
            if let price = viewModel.ad.price {
                Text("$\(price, specifier: "%.2f")")
                    .font(.headline)
            }
            HStack {
                Text("City: \(viewModel.ad.cityCode)")
                if let season = viewModel.ad.seasonCode {
                    Text("Season: \(season)")
                }
            }
            Button(action: viewModel.toggleFavorite) {
                Label(viewModel.isFavorite ? "Remove from favorites" : "Add to favorites", systemImage: viewModel.isFavorite ? "heart.fill" : "heart")
            }
            Spacer()
        }
        .padding()
        .navigationTitle("Ad detail")
    }
}
