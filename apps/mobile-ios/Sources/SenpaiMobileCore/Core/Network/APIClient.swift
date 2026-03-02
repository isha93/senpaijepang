import Foundation

public protocol APIClientProtocol {
    func request<T: Decodable>(_ endpoint: APIEndpoint, responseType: T.Type) async throws -> T
    func request(_ endpoint: APIEndpoint) async throws
}

public final class APIClient: APIClientProtocol {
    
    private let session: URLSession
    private let tokenProvider: AuthTokenProvider?
    
    public init(session: URLSession = .shared, tokenProvider: AuthTokenProvider? = nil) {
        self.session = session
        self.tokenProvider = tokenProvider
    }
    
    public func request<T: Decodable>(_ endpoint: APIEndpoint, responseType: T.Type) async throws -> T {
        let (data, response) = try await performRequest(endpoint)
        return try decode(data: data, responseType: responseType)
    }
    
    public func request(_ endpoint: APIEndpoint) async throws {
        _ = try await performRequest(endpoint)
    }
    
    private func performRequest(_ endpoint: APIEndpoint) async throws -> (Data, URLResponse) {
        let request = try await buildURLRequest(from: endpoint)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            return (data, response)
        case 401:
            // Optional: Handle token refresh logic here
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        case 500...599:
            throw APIError.serverError(statusCode: httpResponse.statusCode)
        default:
            throw APIError.custom("Unexpected status code: \(httpResponse.statusCode)")
        }
    }
    
    private func buildURLRequest(from endpoint: APIEndpoint) async throws -> URLRequest {
        var urlComponents = URLComponents(url: APIConfiguration.shared.baseURL, resolvingAgainstBaseURL: true)
        
        // Ensure path starts with a slash if not empty
        var endpointPath = endpoint.path
        if !endpointPath.isEmpty && !endpointPath.hasPrefix("/") {
            endpointPath = "/" + endpointPath
        }
        let basePath = urlComponents?.path ?? ""
        urlComponents?.path = basePath + endpointPath
        urlComponents?.queryItems = endpoint.queryItems
        
        guard let url = urlComponents?.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        
        // Add content type by default
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        if let headers = endpoint.headers {
            for (key, value) in headers {
                request.setValue(value, forHTTPHeaderField: key)
            }
        }
        
        if endpoint.requiresAuth {
            if let token = try await tokenProvider?.getAccessToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
        }
        
        if let body = endpoint.body {
            request.httpBody = body
        }
        
        return request
    }
    
    private func decode<T: Decodable>(data: Data, responseType: T.Type) throws -> T {
        do {
            let decoder = JSONDecoder()
            // Configure decoder if needed (e.g., date formatting)
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}
