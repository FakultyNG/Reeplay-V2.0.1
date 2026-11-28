import UIKit
#if canImport(GoogleCast) && os(iOS)
import GoogleCast
#endif

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
#if canImport(GoogleCast) && os(iOS)
    let discoveryCriteria = GCKDiscoveryCriteria(
      applicationID: kGCKDefaultMediaReceiverApplicationID
    )
    let castOptions = GCKCastOptions(discoveryCriteria: discoveryCriteria)
    castOptions.disableDiscoveryAutostart = false
    castOptions.startDiscoveryAfterFirstTapOnCastButton = true
    castOptions.suspendSessionsWhenBackgrounded = true
    GCKCastContext.setSharedInstanceWith(castOptions)
#endif

    return true
  }
}
