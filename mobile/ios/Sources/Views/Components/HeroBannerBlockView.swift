import SwiftUI

struct HeroBannerBlockView: View {
    let block: LayoutBlock

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.blue)
                .frame(height: 160)
            Text(block.title ?? "")
                .font(.title)
                .foregroundColor(.white)
                .padding()
        }
    }
}
