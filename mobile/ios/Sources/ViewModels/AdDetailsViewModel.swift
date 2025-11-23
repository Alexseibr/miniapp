import Foundation

@MainActor
final class AdDetailsViewModel: ObservableObject {
    @Published var ad: Ad?
    private let adsService = AdsService()

    func load(id: String) async {
        do {
            ad = try await adsService.ad(id: id)
        } catch {
            ad = nil
        }
    }
}
