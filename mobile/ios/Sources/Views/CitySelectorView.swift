import SwiftUI

struct CitySelectorView: View {
    @ObservedObject var viewModel: CitySelectorViewModel
    var onSelected: () -> Void

    var body: some View {
        List(viewModel.cities) { city in
            Button(city.name) {
                viewModel.select(city: city)
                onSelected()
            }
        }
        .navigationTitle("Город")
        .task { await viewModel.load() }
    }
}
