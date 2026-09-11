import UIKit
import Capacitor
import WebKit

final class ShiftPilotBridgeViewController: CAPBridgeViewController {
    private let launchOverlay = UIView()
    private var progressObservation: NSKeyValueObservation?
    private var loadingObservation: NSKeyValueObservation?
    private var minimumDisplayElapsed = false
    private var dismissalScheduled = false
    private var overlayDismissed = false

    override func viewDidLoad() {
        super.viewDidLoad()
        installLaunchOverlay()
        observeInitialWebLoad()

        // Keep the native brand visible long enough to avoid a flash between
        // Apple's launch screen and the first meaningful web frame, but do not
        // make a fast launch feel artificially slow.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { [weak self] in
            self?.minimumDisplayElapsed = true
            self?.scheduleDismissIfReady()
        }

        // Never trap the user behind the overlay on a broken/offline request.
        DispatchQueue.main.asyncAfter(deadline: .now() + 8.0) { [weak self] in
            self?.dismissLaunchOverlay()
        }
    }

    deinit {
        progressObservation?.invalidate()
        loadingObservation?.invalidate()
    }

    private func installLaunchOverlay() {
        launchOverlay.translatesAutoresizingMaskIntoConstraints = false
        launchOverlay.backgroundColor = UIColor(red: 6 / 255, green: 24 / 255, blue: 55 / 255, alpha: 1)
        launchOverlay.isUserInteractionEnabled = false
        launchOverlay.accessibilityIdentifier = "shiftpilot-native-launch-overlay"

        let brandLabel = UILabel()
        brandLabel.translatesAutoresizingMaskIntoConstraints = false
        brandLabel.text = "ShiftPilot"
        brandLabel.textColor = .white
        brandLabel.textAlignment = .center
        brandLabel.font = .systemFont(ofSize: 39, weight: .bold)
        brandLabel.adjustsFontSizeToFitWidth = true
        brandLabel.minimumScaleFactor = 0.8

        let taglineLabel = UILabel()
        taglineLabel.translatesAutoresizingMaskIntoConstraints = false
        taglineLabel.text = "THE EASY WAY TO YOUR NEXT SHIFT"
        taglineLabel.textColor = UIColor.white.withAlphaComponent(0.68)
        taglineLabel.textAlignment = .center
        taglineLabel.font = .systemFont(ofSize: 10.5, weight: .semibold)
        taglineLabel.adjustsFontSizeToFitWidth = true
        taglineLabel.minimumScaleFactor = 0.75

        let loadingIndicator = UIActivityIndicatorView(style: .medium)
        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        loadingIndicator.color = UIColor.white.withAlphaComponent(0.72)
        loadingIndicator.startAnimating()

        let content = UIStackView(arrangedSubviews: [brandLabel, taglineLabel, loadingIndicator])
        content.translatesAutoresizingMaskIntoConstraints = false
        content.axis = .vertical
        content.alignment = .center
        content.spacing = 12

        view.addSubview(launchOverlay)
        launchOverlay.addSubview(content)

        NSLayoutConstraint.activate([
            launchOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            launchOverlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            launchOverlay.topAnchor.constraint(equalTo: view.topAnchor),
            launchOverlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            content.centerXAnchor.constraint(equalTo: launchOverlay.centerXAnchor),
            content.centerYAnchor.constraint(equalTo: launchOverlay.centerYAnchor, constant: -8),
            content.leadingAnchor.constraint(greaterThanOrEqualTo: launchOverlay.leadingAnchor, constant: 32),
            content.trailingAnchor.constraint(lessThanOrEqualTo: launchOverlay.trailingAnchor, constant: -32)
        ])
    }

    private func observeInitialWebLoad() {
        guard let webView else {
            dismissLaunchOverlay()
            return
        }

        progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] _, _ in
            DispatchQueue.main.async {
                self?.scheduleDismissIfReady()
            }
        }

        loadingObservation = webView.observe(\.isLoading, options: [.new]) { [weak self] _, _ in
            DispatchQueue.main.async {
                self?.scheduleDismissIfReady()
            }
        }
    }

    private func scheduleDismissIfReady() {
        guard !overlayDismissed, !dismissalScheduled, minimumDisplayElapsed, let webView else { return }
        guard webView.url != nil, !webView.isLoading, webView.estimatedProgress >= 1.0 else { return }

        dismissalScheduled = true
        // /app redirects to /workspace or /login. Recheck after a tiny grace
        // period so the overlay never disappears in the gap between redirects.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) { [weak self] in
            guard let self else { return }
            self.dismissalScheduled = false
            guard let currentWebView = self.webView,
                  currentWebView.url != nil,
                  !currentWebView.isLoading,
                  currentWebView.estimatedProgress >= 1.0 else {
                return
            }
            self.dismissLaunchOverlay()
        }
    }

    private func dismissLaunchOverlay() {
        guard !overlayDismissed else { return }
        overlayDismissed = true
        progressObservation?.invalidate()
        loadingObservation?.invalidate()
        progressObservation = nil
        loadingObservation = nil

        UIView.animate(
            withDuration: 0.24,
            delay: 0,
            options: [.curveEaseOut, .allowUserInteraction],
            animations: {
                self.launchOverlay.alpha = 0
                self.launchOverlay.transform = CGAffineTransform(scaleX: 1.015, y: 1.015)
            },
            completion: { _ in
                self.launchOverlay.removeFromSuperview()
            }
        )
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ShiftPilotBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
