import Foundation

protocol APIRequest {
    associatedtype Response: Decodable
    var path: String { get }
    var queryItems: [URLQueryItem] { get }
}

struct ApiClient {
    func send<T: APIRequest>(_ request: T) async throws -> T.Response {
        var components = URLComponents(url: AppConfig.baseURL.appendingPathComponent(request.path), resolvingAgainstBaseURL: false)!
        components.queryItems = request.queryItems.isEmpty ? nil : request.queryItems
        guard let url = components.url else { throw URLError(.badURL) }

        let (data, response) = try await URLSession.shared.data(from: url)
        guard let httpResponse = response as? HTTPURLResponse, (200..<300).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.Response.self, from: data)
    }
}
