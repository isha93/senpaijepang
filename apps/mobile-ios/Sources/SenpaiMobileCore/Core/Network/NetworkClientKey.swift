import Foundation
import SwiftUI

private struct NetworkClientKey: EnvironmentKey {
    static let defaultValue: APIClientProtocol = APIClient()
}

public extension EnvironmentValues {
    var apiClient: APIClientProtocol {
        get { self[NetworkClientKey.self] }
        set { self[NetworkClientKey.self] = newValue }
    }
}
