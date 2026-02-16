import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ViewController()
        window?.makeKeyAndVisible()
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        // Called when scene is being released by the system
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Called when scene moves from inactive to active state
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // Called when scene moves from active to inactive state
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        // Called as scene transitions from background to foreground
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // Called as scene transitions from foreground to background
    }
}
