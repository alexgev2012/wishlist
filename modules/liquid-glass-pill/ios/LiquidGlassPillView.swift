import ExpoModulesCore
import SwiftUI

@available(iOS 26.0, *)
private struct GlassPillBackground: View {
  var tint: Color?
  var isInteractive: Bool

  private var glass: Glass {
    let base: Glass = tint.map { Glass.regular.tint($0) } ?? .regular
    return isInteractive ? base.interactive() : base
  }

  var body: some View {
    Color.clear.glassEffect(glass, in: .capsule)
  }
}

public final class LiquidGlassPillView: ExpoView {
  private var hostingController: UIHostingController<AnyView>?
  private var tintColor: UIColor?
  private var interactive = false

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    guard #available(iOS 26.0, *) else { return }

    let hosting = UIHostingController(rootView: AnyView(GlassPillBackground(tint: nil, isInteractive: false)))
    hosting.view.backgroundColor = .clear
    hosting.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    hosting.view.frame = bounds
    addSubview(hosting.view)
    hostingController = hosting
  }

  func setTintColor(_ color: UIColor?) {
    tintColor = color
    updateContent()
  }

  func setInteractive(_ value: Bool) {
    interactive = value
    updateContent()
  }

  private func updateContent() {
    guard #available(iOS 26.0, *), let hostingController else { return }
    let swiftUIColor = tintColor.map { Color($0) }
    hostingController.rootView = AnyView(GlassPillBackground(tint: swiftUIColor, isInteractive: interactive))
  }

  public override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    // hostingController.view (if present) sits at index 0 as the glass background;
    // RN children are layered on top of it.
    let offset = hostingController != nil ? 1 : 0
    insertSubview(childComponentView, at: index + offset)
  }

  public override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    childComponentView.removeFromSuperview()
  }
}
