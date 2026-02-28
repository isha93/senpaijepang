import Foundation

@MainActor
public protocol NavigationHandling: AnyObject {
    var path: [AppRoute] { get }

    func push(_ route: AppRoute)
    func pop()
    func popToRoot()
    func replace(with route: AppRoute)
}
