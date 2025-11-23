import SwiftUI

struct KufarTheme {
    let primaryColor: Color

    init(cityTheme: CityTheme?) {
        if let hex = cityTheme?.primaryColorHex, let color = Color(hex: hex) {
            self.primaryColor = color
        } else {
            self.primaryColor = .accentColor
        }
    }
}
