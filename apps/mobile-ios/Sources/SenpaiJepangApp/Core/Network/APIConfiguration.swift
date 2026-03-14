import Foundation

public struct APIConfiguration {
    public static let shared = APIConfiguration()
    
    public let baseURL: URL
    
    private init() {
        let baseURLString =
            ProcessInfo.processInfo.environment["API_BASE_URL"]?.trimmingCharacters(in: .whitespacesAndNewlines)
            ?? Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String
            ?? "https://senpai-api-app-production.up.railway.app"

        guard let url = URL(string: baseURLString), let scheme = url.scheme, !scheme.isEmpty else {
            fatalError("Invalid base URL string")
        }
        self.baseURL = url
    }
}
