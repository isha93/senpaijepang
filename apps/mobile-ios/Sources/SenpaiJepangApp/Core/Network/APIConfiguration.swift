import Foundation

public struct APIConfiguration {
    public static let shared = APIConfiguration()
    
    public let baseURL: URL
    
    private init() {
        guard let url = URL(string: "https://senpai-api-app-production.up.railway.app") else {
            fatalError("Invalid base URL string")
        }
        self.baseURL = url
    }
}
