import SwiftUI

extension Color {
    init?(hex: String) {
        var sanitized = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        if sanitized.count == 6 {
            sanitized.append("FF")
        }
        guard let int = UInt64(sanitized, radix: 16) else { return nil }

        let r = Double((int >> 24) & 0xFF) / 255.0
        let g = Double((int >> 16) & 0xFF) / 255.0
        let b = Double((int >> 8) & 0xFF) / 255.0
        let a = Double(int & 0xFF) / 255.0

        self.init(red: r, green: g, blue: b, opacity: a)
    }
}
