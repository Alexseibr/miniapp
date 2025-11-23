import SwiftUI

struct AdDetailsView: View {
    @StateObject var viewModel = AdDetailsViewModel()
    let adId: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let ad = viewModel.ad {
                Text(ad.title).font(.title)
                if let price = ad.price { Text(price).font(.headline) }
                if let description = ad.description { Text(description) }
            } else {
                ProgressView("Загрузка...")
            }
        }
        .padding()
        .task { await viewModel.load(id: adId) }
    }
}
