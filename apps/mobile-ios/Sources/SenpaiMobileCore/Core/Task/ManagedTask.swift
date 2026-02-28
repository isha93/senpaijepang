import Foundation

@MainActor
public protocol ManagedTask: AnyObject {
    var isLoading: Bool { get set }
    var errorMessage: String? { get set }
}

public extension ManagedTask {
    @discardableResult
    func executeTask<T>(_ task: @MainActor () async throws -> T) async -> T? {
        isLoading = true
        defer { isLoading = false }

        do {
            return try await task()
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }
}
