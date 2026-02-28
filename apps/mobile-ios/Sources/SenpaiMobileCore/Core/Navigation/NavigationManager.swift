import Combine
import Foundation

@MainActor
public final class NavigationManager: ObservableObject, NavigationHandling {
    @Published public private(set) var path: [AppRoute]

    public init(path: [AppRoute] = []) {
        self.path = path
    }

    public func push(_ route: AppRoute) {
        path.append(route)
    }

    public func pop() {
        guard !path.isEmpty else { return }
        path.removeLast()
    }

    public func popToRoot() {
        path.removeAll(keepingCapacity: false)
    }

    public func replace(with route: AppRoute) {
        path = [route]
    }

    public func sync(path newPath: [AppRoute]) {
        path = newPath
    }
}
