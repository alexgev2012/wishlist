import React, { useEffect } from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
    FadeInDown,
    FadeOutDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { GlassView } from 'expo-glass-effect';

import { HIT_SLOP, PRIORITY_COLORS } from '@/constants';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import type { Priority } from '@/types';
import { priorityLabel } from '@/utils';

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
    const color = PRIORITY_COLORS[priority];
    return (
        <View style={[s.badge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color }}>
                {priority === 'dream' ? '💫 ' : ''}{priorityLabel(priority)}
            </Text>
        </View>
    );
};

export const TagPill: React.FC<{ label: string }> = ({ label }) => {
    const { theme: t } = useApp();
    return (
        <View style={[s.tag, { backgroundColor: t.surfaceAlt }]}>
            <Text style={{ color: t.textMuted, fontSize: 12 }}>#{label}</Text>
        </View>
    );
};

export const ProgressBar: React.FC<{ progress: number; color?: string; height?: number }> = ({ progress, color, height = 6 }) => {
    const { theme: t } = useApp();
    const clamped = Math.min(Math.max(progress, 0), 1);
    const width = useSharedValue(clamped * 100);

    useEffect(() => {
        width.value = withTiming(clamped * 100, { duration: 350 });
    }, [clamped, width]);

    const fillStyle = useAnimatedStyle(() => ({
        width: `${width.value}%`,
        backgroundColor: color ?? t.accent,
        height,
        borderRadius: height / 2,
    }));

    return (
        <View style={[s.progressTrack, { backgroundColor: t.surfaceAlt, height }]}>
            <Animated.View style={fillStyle} />
        </View>
    );
};

export const Chip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => {
    const { theme: t } = useApp();
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[s.chip, { backgroundColor: active ? t.accent : t.surface, borderColor: active ? t.accent : t.border }]}
        >
            <Text style={{ color: active ? '#fff' : t.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
        </TouchableOpacity>
    );
};

export const SearchBar: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
    const { theme: t } = useApp();
    return (
        <View style={[s.search, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={{ fontSize: 15, marginRight: 6 }}>🔍</Text>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Search items, tags, notes…"
                placeholderTextColor={t.textMuted}
                style={{ flex: 1, color: t.text, fontSize: 15, paddingVertical: 10 }}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChange('')} hitSlop={HIT_SLOP}>
                    <Text style={{ color: t.textMuted, fontSize: 15 }}>✕</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export const FAB: React.FC<{ onPress: () => void }> = ({ onPress }) => {
    const { theme: t } = useApp();
    const scale = useSharedValue(1);
    const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const button = (
        <TouchableOpacity
            onPress={onPress}
            onPressIn={() => { scale.value = withSpring(0.88, { damping: 14 }); }}
            onPressOut={() => { scale.value = withSpring(1, { damping: 10 }); }}
            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Add"
        >
            <Text style={{ color: '#fff', fontSize: 26, lineHeight: 30 }}>＋</Text>
        </TouchableOpacity>
    );

    return (
        <Animated.View style={[s.fab, Platform.OS !== 'ios' && { backgroundColor: t.accent }, pressStyle]}>
            {Platform.OS === 'ios' ? (
                <GlassView style={{ flex: 1, borderRadius: 28 }} glassEffectStyle="regular" tintColor={t.accent} isInteractive>
                    {button}
                </GlassView>
            ) : button}
        </Animated.View>
    );
};

export const EmptyState: React.FC<{ emoji: string; title: string; subtitle: string }> = ({ emoji, title, subtitle }) => {
    const { theme: t } = useApp();
    return (
        <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</Text>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '700', marginBottom: 6 }}>{title}</Text>
            <Text style={{ color: t.textMuted, fontSize: 14, textAlign: 'center' }}>{subtitle}</Text>
        </View>
    );
};

export const SnackbarView: React.FC = () => {
    const { theme: t, snackbar, dismissSnackbar } = useApp();
    if (!snackbar) return null;
    return (
        <Animated.View
            entering={FadeInDown.duration(220)}
            exiting={FadeOutDown.duration(180)}
            style={[s.snackbar, { backgroundColor: t.text }]}
        >
            <Text style={{ color: t.bg, flex: 1, fontSize: 14 }} numberOfLines={1}>{snackbar.message}</Text>
            {snackbar.undo && (
                <TouchableOpacity onPress={() => { snackbar.undo!(); dismissSnackbar(); }}>
                    <Text style={{ color: t.warning, fontWeight: '700', marginLeft: 16 }}>UNDO</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => {
    const { theme: t } = useApp();
    return <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>;
};

export const Header: React.FC<{ title: string; onBack?: () => void; right?: React.ReactNode }> = ({ title, onBack, right }) => {
    const { theme: t } = useApp();
    return (
        <View style={[s.header, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
            {onBack ? (
                <TouchableOpacity onPress={onBack} hitSlop={HIT_SLOP} style={{ width: 40 }}>
                    <Text style={{ color: t.accent, fontSize: 24 }}>‹</Text>
                </TouchableOpacity>
            ) : (
                <View style={{ width: 40 }} />
            )}
            <Text style={{ color: t.text, fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' }} numberOfLines={1}>
                {title}
            </Text>
            <View style={{ width: 40, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end' }}>{right}</View>
        </View>
    );
};

export const Label: React.FC<{ text: string; error?: string }> = ({ text, error }) => {
    const { theme: t } = useApp();
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 6 }}>
            <Text style={{ color: t.textMuted, fontSize: 13, fontWeight: '700' }}>{text}</Text>
            {error && <Text style={{ color: t.danger, fontSize: 12 }}>{error}</Text>}
        </View>
    );
};
