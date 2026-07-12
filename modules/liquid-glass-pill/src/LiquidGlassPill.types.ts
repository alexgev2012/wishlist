import { type ViewProps } from 'react-native';

export type LiquidGlassPillProps = {
  /**
   * Tint color applied to the SwiftUI glassEffect() capsule.
   */
  tintColor?: string;
  /**
   * Whether the glass should react to touch (native Liquid Glass press feedback).
   * @default false
   */
  isInteractive?: boolean;
} & ViewProps;
