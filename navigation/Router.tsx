import React, { useRef } from 'react';
import { Platform, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from 'react-native-reanimated';
import { GlassView } from 'expo-glass-effect';

import { SnackbarView } from '@/components/shared';
import { useNav } from '@/navigation/NavState';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import type { TabName } from '@/navigation/NavState';

import { HomeScreen } from '@/screens/HomeScreen';
import { ImportLinkScreen } from '@/screens/ImportLinkScreen';
import { ItemDetailScreen } from '@/screens/ItemDetailScreen';
import { ItemFormScreen } from '@/screens/ItemFormScreen';
import { ListDetailScreen } from '@/screens/ListDetailScreen';
import { ListFormScreen } from '@/screens/ListFormScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { StatsScreen } from '@/screens/StatsScreen';

const TABS: { key: TabName; label: string; emoji: string }[] = [
    { key: 'home', label: 'Lists', emoji: '📝' },
    { key: 'stats', label: 'Stats', emoji: '📊' },
    { key: 'settings', label: 'Settings', emoji: '⚙️' },
];

export const TabBar: React.FC = () => {
    const { theme: t } = useApp();
    const nav = useNav();

    const tabs = TABS.map((tab) => {
        const active = nav.tab === tab.key;
        return (
            <TouchableOpacity
                key={tab.key}
                style={s.tabBtn}
                onPress={() => { nav.setTab(tab.key); nav.popToRoot(); }}
            >
                <Text style={{ fontSize: 20, opacity: active ? 1 : 0.4 }}>{tab.emoji}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2, color: active ? t.accent : t.textMuted }}>
                    {tab.label}
                </Text>
            </TouchableOpacity>
        );
    });

    if (Platform.OS === 'ios') {
        return (
            <GlassView style={[s.tabBar, { borderTopColor: t.border }]} glassEffectStyle="regular">
                {tabs}
            </GlassView>
        );
    }

    return (
        <View style={[s.tabBar, { backgroundColor: t.surface, borderTopColor: t.border }]}>
            {tabs}
        </View>
    );
};

export const Router: React.FC = () => {
    const nav = useNav();
    const top = nav.stack[nav.stack.length - 1];

    const depth = nav.stack.length;
    const prevDepthRef = useRef(depth);
    const prevDepth = prevDepthRef.current;
    const forward = depth >= prevDepth;
    prevDepthRef.current = depth;

    let screenKey: string;
    let content: React.ReactNode;

    if (top) {
        switch (top.name) {
            case 'listDetail':
                screenKey = `listDetail-${top.listId}`;
                content = <ListDetailScreen listId={top.listId} />;
                break;
            case 'itemDetail':
                screenKey = `itemDetail-${top.itemId}`;
                content = <ItemDetailScreen itemId={top.itemId} />;
                break;
            case 'itemForm':
                screenKey = `itemForm-${top.listId}-${top.itemId ?? 'new'}`;
                content = <ItemFormScreen listId={top.listId} itemId={top.itemId} draft={top.draft} />;
                break;
            case 'listForm':
                screenKey = `listForm-${top.listId ?? 'new'}`;
                content = <ListFormScreen listId={top.listId} />;
                break;
            case 'importLink':
                screenKey = `importLink-${top.listId}`;
                content = <ImportLinkScreen listId={top.listId} />;
                break;
        }
    } else {
        switch (nav.tab) {
            case 'stats':
                screenKey = 'tab-stats';
                content = <StatsScreen />;
                break;
            case 'settings':
                screenKey = 'tab-settings';
                content = <SettingsScreen />;
                break;
            default:
                screenKey = 'tab-home';
                content = <HomeScreen />;
        }
    }

    const isTabSwitch = depth === 0 && prevDepth === 0;
    const entering = isTabSwitch ? FadeIn.duration(160) : forward ? SlideInRight.duration(220) : SlideInLeft.duration(220);
    const exiting = isTabSwitch ? FadeOut.duration(120) : forward ? SlideOutLeft.duration(180) : SlideOutRight.duration(180);

    return (
        <Animated.View key={screenKey} entering={entering} exiting={exiting} style={{ flex: 1 }}>
            {content}
        </Animated.View>
    );
};

export const AppShell: React.FC = () => {
    const { theme: t, hydrated, state } = useApp();
    const nav = useNav();
    const showTabBar = nav.stack.length === 0;

    if (!hydrated) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 40 }}>✨</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
            <StatusBar barStyle={state.settings.darkMode ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />
            <View style={{ flex: 1 }}>
                <Router />
                <SnackbarView />
            </View>
            {showTabBar && <TabBar />}
        </SafeAreaView>
    );
};
