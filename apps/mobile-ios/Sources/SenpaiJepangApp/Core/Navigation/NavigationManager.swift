import Combine
import Foundation

@MainActor
final class NavigationManager: ObservableObject, NavigationHandling {
    @Published private(set) var path: [AppRoute]

    init(path: [AppRoute] = []) {
        self.path = path
    }

    func push(_ route: AppRoute) {
        path.append(route)
    }

    func pop() {
        guard !path.isEmpty else { return }
        path.removeLast()
    }

    func popToRoot() {
        path.removeAll(keepingCapacity: false)
    }

    func replace(with route: AppRoute) {
        path = [route]
    }

    func sync(path newPath: [AppRoute]) {
        path = newPath
    }
}
