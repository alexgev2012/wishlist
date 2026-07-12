import React from 'react';
import { View } from 'react-native';

import { LiquidGlassPillProps } from './LiquidGlassPill.types';

export default function LiquidGlassPill(props: LiquidGlassPillProps) {
    const { tintColor, isInteractive, ...rest } = props;
    return <View {...rest} />;
}
