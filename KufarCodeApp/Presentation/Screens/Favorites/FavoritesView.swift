import SwiftUI

struct FavoritesView: View {
    @EnvironmentObject var appContainer: AppContainer
    @State private var favoriteIds: [String] = []

    var body: some View {
        List(favoriteIds, id: \..self) { id in
            Text("Favorite ad: \(id)")
        }
        .onAppear {
            favoriteIds = appContainer.localStorageService.favoriteAdIds
        }
        .navigationTitle("Favorites")
    }
}
