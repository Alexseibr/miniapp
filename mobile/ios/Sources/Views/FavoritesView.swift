import SwiftUI

struct FavoritesView: View {
    @State private var favorites: [String] = UserDefaults.standard.stringArray(forKey: "favorites") ?? []

    var body: some View {
        List {
            if favorites.isEmpty {
                Text("Нет избранных объявлений")
            } else {
                ForEach(favorites, id: \.self) { id in
                    Text("Объявление \(id)")
                }
            }
        }
        .navigationTitle("Избранное")
    }
}
