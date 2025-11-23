import SwiftUI
import MapKit

struct MapBlockView: View {
    let block: LayoutBlock
    @State private var region = MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: 53.9, longitude: 27.5667), span: MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5))

    var body: some View {
        Map(initialPosition: .region(region))
            .frame(height: 200)
            .cornerRadius(12)
    }
}
