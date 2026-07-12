import { requireNativeViewManager } from 'expo-modules-core';

import { LiquidGlassPillProps } from './LiquidGlassPill.types';

const NativeLiquidGlassPill = requireNativeViewManager<LiquidGlassPillProps>('LiquidGlassPill', 'LiquidGlassPillView');

const LiquidGlassPill = (props: LiquidGlassPillProps) => {
    return <NativeLiquidGlassPill {...props} />;
};

export default LiquidGlassPill;
