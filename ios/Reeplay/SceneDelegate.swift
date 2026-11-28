import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

class SceneDelegate: RCTDefaultReactNativeFactoryDelegate, UIWindowSceneDelegate {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      return
    }

    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let urlContext = connectionOptions.urlContexts.first {
      launchOptions[.url] = urlContext.url
      if let sourceApplication = urlContext.options.sourceApplication {
        launchOptions[.sourceApplication] = sourceApplication
      }
      if let annotation = urlContext.options.annotation {
        launchOptions[.annotation] = annotation
      }
    }

    dependencyProvider = RCTAppDependencyProvider()
    let factory = RCTReactNativeFactory(delegate: self)
    reactNativeFactory = factory
    window = UIWindow(windowScene: windowScene)

    factory.startReactNative(
      withModuleName: "Reeplay",
      in: window,
      launchOptions: launchOptions
    )
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let urlContext = URLContexts.first else {
      return
    }

    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let sourceApplication = urlContext.options.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = urlContext.options.annotation {
      options[.annotation] = annotation
    }

    RCTLinkingManager.application(
      UIApplication.shared,
      open: urlContext.url,
      options: options
    )
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
