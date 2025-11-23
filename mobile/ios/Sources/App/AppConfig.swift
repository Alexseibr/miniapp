import Foundation

struct AppConfig {
    static let baseURL = URL(string: ProcessInfo.processInfo.environment["BASE_URL"] ?? "http://localhost:3000")!
}
