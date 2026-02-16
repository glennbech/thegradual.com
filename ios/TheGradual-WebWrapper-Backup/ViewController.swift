import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {

    private var webView: WKWebView!
    private var activityIndicator: UIActivityIndicatorView!

    // App URL - change to production URL
    private let appURL = "https://thegradual.com"

    override func loadView() {
        // Configure WKWebView
        let webConfiguration = WKWebViewConfiguration()

        // Enable inline media playback
        webConfiguration.allowsInlineMediaPlayback = true
        webConfiguration.mediaTypesRequiringUserActionForPlayback = []

        // Configure data store for persistence (enables cookies, localStorage)
        webConfiguration.websiteDataStore = .default()

        // Set custom User-Agent to identify as Safari (required for Google OAuth)
        // Google blocks embedded webviews, so we need to appear as Safari
        webConfiguration.applicationNameForUserAgent = "Version/17.0 Safari/605.1.15"

        // Enable debugging and preferences for better compatibility
        webConfiguration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        if #available(iOS 16.4, *) {
            webConfiguration.preferences.isElementFullscreenEnabled = true
        }

        // Add script message handlers for native bridge
        let contentController = WKUserContentController()
        contentController.add(self, name: "nativeApp")
        webConfiguration.userContentController = contentController

        // Inject JavaScript to detect iOS app
        let detectScript = WKUserScript(
            source: "window.isNativeApp = true; window.platform = 'ios';",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        contentController.addUserScript(detectScript)

        // Debug script to check for icon loading issues
        let debugScript = WKUserScript(
            source: """
                window.addEventListener('DOMContentLoaded', function() {
                    console.log('[iOS App] Page loaded');
                    console.log('[iOS App] SVG count:', document.querySelectorAll('svg').length);
                    console.log('[iOS App] Icon count:', document.querySelectorAll('[class*="lucide"]').length);

                    // Force repaint after delay (fixes some rendering issues)
                    setTimeout(function() {
                        document.body.style.display = 'none';
                        document.body.offsetHeight; // Force reflow
                        document.body.style.display = '';
                        console.log('[iOS App] Forced repaint');
                    }, 500);
                });
            """,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        contentController.addUserScript(debugScript)

        // Create webview
        webView = WKWebView(frame: .zero, configuration: webConfiguration)
        webView.navigationDelegate = self
        webView.uiDelegate = self

        // CRITICAL: Use automatic content inset to respect safe areas
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic

        // Enable bounce/overscroll for pull-to-refresh feel
        webView.scrollView.bounces = true

        // Inject viewport meta tag and safe area CSS variables
        let viewportScript = """
            // Add viewport meta tag
            var meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
            document.getElementsByTagName('head')[0].appendChild(meta);

            // Add CSS to handle safe areas (notch, home indicator)
            var style = document.createElement('style');
            style.textContent = `
                :root {
                    --safe-area-inset-top: env(safe-area-inset-top);
                    --safe-area-inset-bottom: env(safe-area-inset-bottom);
                    --safe-area-inset-left: env(safe-area-inset-left);
                    --safe-area-inset-right: env(safe-area-inset-right);
                }

                /* Ensure body respects safe areas */
                body {
                    padding-top: max(0px, env(safe-area-inset-top));
                    padding-bottom: max(0px, env(safe-area-inset-bottom));
                    padding-left: max(0px, env(safe-area-inset-left));
                    padding-right: max(0px, env(safe-area-inset-right));
                }

                /* Force SVG icons to render (Lucide React fix) */
                svg {
                    display: inline-block !important;
                    vertical-align: middle !important;
                }
            `;
            document.getElementsByTagName('head')[0].appendChild(style);
        """
        let userScript = WKUserScript(source: viewportScript, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        contentController.addUserScript(userScript)

        view = webView

        // Add activity indicator
        activityIndicator = UIActivityIndicatorView(style: .large)
        activityIndicator.color = .white
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        activityIndicator.hidesWhenStopped = true
        view.addSubview(activityIndicator)

        NSLayoutConstraint.activate([
            activityIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            activityIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // Set background color
        view.backgroundColor = UIColor(red: 17/255, green: 24/255, blue: 39/255, alpha: 1.0) // #111827

        // Load the web app
        loadWebApp()

        // Add pull-to-refresh
        let refreshControl = UIRefreshControl()
        refreshControl.tintColor = .white
        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        webView.scrollView.addSubview(refreshControl)
        webView.scrollView.refreshControl = refreshControl
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    private func loadWebApp() {
        guard let url = URL(string: appURL) else { return }
        let request = URLRequest(url: url)
        activityIndicator.startAnimating()
        webView.load(request)
    }

    @objc private func handleRefresh() {
        webView.reload()
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        activityIndicator.stopAnimating()
        webView.scrollView.refreshControl?.endRefreshing()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        activityIndicator.stopAnimating()
        webView.scrollView.refreshControl?.endRefreshing()
        showError(message: "Failed to load app: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        activityIndicator.stopAnimating()
        webView.scrollView.refreshControl?.endRefreshing()
        showError(message: "Failed to connect: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // Allow all navigation within the app
        if let url = navigationAction.request.url {
            // Allow Google OAuth domains
            let allowedAuthDomains = ["accounts.google.com", "thegradual.com", "api.thegradual.com"]

            if let host = url.host, allowedAuthDomains.contains(where: { host.contains($0) }) {
                // Allow OAuth flows
                decisionHandler(.allow)
                return
            }

            // Handle external links (open in Safari)
            if url.host != URL(string: appURL)?.host && navigationAction.navigationType == .linkActivated {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
        }
        decisionHandler(.allow)
    }

    // MARK: - WKUIDelegate (Handle OAuth popups)

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        // Handle OAuth popup windows (Google Sign-In, etc.)
        if navigationAction.targetFrame == nil {
            // Load popup URL in main webview instead of creating new window
            webView.load(navigationAction.request)
        }
        return nil
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        // Handle messages from JavaScript
        if message.name == "nativeApp" {
            guard let body = message.body as? [String: Any] else { return }

            // Example: Handle vibration request from web app
            if let action = body["action"] as? String {
                switch action {
                case "vibrate":
                    let generator = UIImpactFeedbackGenerator(style: .medium)
                    generator.impactOccurred()
                case "vibrateLight":
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                case "vibrateHeavy":
                    let generator = UIImpactFeedbackGenerator(style: .heavy)
                    generator.impactOccurred()
                default:
                    break
                }
            }
        }
    }

    // MARK: - Error Handling

    private func showError(message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Retry", style: .default) { [weak self] _ in
            self?.loadWebApp()
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }
}
