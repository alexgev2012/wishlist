import ExpoModulesCore

public final class LiquidGlassPillModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiquidGlassPill")

    View(LiquidGlassPillView.self) {
      Prop("tintColor") { (view, tintColor: UIColor?) in
        view.setTintColor(tintColor)
      }

      Prop("isInteractive") { (view, interactive: Bool?) in
        view.setInteractive(interactive ?? false)
      }
    }
  }
}
