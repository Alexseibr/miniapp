import SwiftUI

struct CitySelectorView: View {
    @ObservedObject var viewModel: CitySelectorViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            switch viewModel.citiesState {
            case .idle:
                Color.clear.onAppear { viewModel.load() }
            case .loading:
                ProgressView()
            case .failed(let message):
                VStack(spacing: 12) {
                    Text(message)
                    Button("Retry") { viewModel.load() }
                }
            case .loaded(let cities):
                ForEach(cities) { city in
                    Button(action: {
                        viewModel.selectCity(city)
                        dismiss()
                    }) {
                        Text(city.name)
                    }
                }
            }
        }
        .navigationTitle("Choose city")
    }
}
