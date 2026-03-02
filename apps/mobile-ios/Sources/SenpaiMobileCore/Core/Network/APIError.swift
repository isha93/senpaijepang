import Foundation

public enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case decodingError(Error)
    case unauthorized
    case forbidden
    case notFound
    case serverError(statusCode: Int)
    case networkError(Error)
    case unknown(Error?)
    case custom(String)
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The URL provided was invalid."
        case .invalidResponse:
            return "The server responded with an invalid response."
        case .decodingError(let error):
            return "Failed to decode the response: \(error.localizedDescription)"
        case .unauthorized:
            return "You are not authorized to perform this action. Please log in again."
        case .forbidden:
            return "You do not have permission to access this resource."
        case .notFound:
            return "The requested resource could not be found."
        case .serverError(let statusCode):
            return "The server encountered an error (Status code: \(statusCode))."
        case .networkError(let error):
            return "A network error occurred: \(error.localizedDescription)"
        case .unknown(let error):
            return "An unknown error occurred: \(error?.localizedDescription ?? "No underlying error")"
        case .custom(let message):
            return message
        }
    }
}
