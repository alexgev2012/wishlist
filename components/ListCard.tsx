import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { ProgressBar } from '@/components/shared';
import { useNav } from '@/navigation/NavState';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import type { WishList } from '@/types';
import { computeListStats, formatPrice, shareList } from '@/utils';

export const ListCard: React.FC<{ list: WishList }> = ({ list }) => {
    const { state, dispatch, theme: t } = useApp();
    const nav = useNav();
    const stats = computeListStats(list, state.items);
    const currency = state.settings.defaultCurrency;

    const openMenu = () => {
        Alert.alert(list.name, undefined, [
            { text: 'Edit', onPress: () => nav.push({ name: 'listForm', listId: list.id }) },
            { text: 'Share', onPress: () => shareList(list, state.items) },
            {
                text: list.archived ? 'Unarchive' : 'Archive',
                onPress: () => dispatch({ type: 'TOGGLE_ARCHIVE_LIST', payload: { id: list.id } }),
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () =>
                    Alert.alert('Delete list?', 'All items inside will be deleted too.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_LIST', payload: { id: list.id } }) },
                    ]),
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    return (
        <Animated.View
            entering={FadeInDown.duration(240)}
            exiting={FadeOutUp.duration(200)}
            layout={LinearTransition.springify().damping(18)}
        >
            <TouchableOpacity
                onPress={() => nav.push({ name: 'listDetail', listId: list.id })}
                onLongPress={openMenu}
                activeOpacity={0.7}
                style={[s.listCard, { backgroundColor: t.surface, borderColor: t.border }]}
            >
                <View style={{ width: 6, backgroundColor: list.color }} />
                <View style={{ flex: 1, padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 22, marginRight: 8 }}>{list.emoji}</Text>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: t.text, flexShrink: 1 }} numberOfLines={1}>
                            {list.name}
                        </Text>
                        {list.archived && <Text style={{ color: t.textMuted, fontSize: 11, marginLeft: 8 }}>archived</Text>}
                    </View>

                    <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 2 }}>
                        {stats.purchasedItems}/{stats.totalItems} purchased · {formatPrice(stats.remainingValue, currency)} to go
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                        <ProgressBar progress={stats.progress} color={list.color} />
                        <Text style={{ color: t.textMuted, fontSize: 12, marginLeft: 8 }}>{Math.round(stats.progress * 100)}%</Text>
                    </View>

                    {list.budget != null && (
                        <Text style={{ color: stats.overBudget ? t.danger : t.textMuted, fontSize: 12, marginTop: 6 }}>
                            Budget: {formatPrice(stats.totalValue, currency)} / {formatPrice(list.budget, currency)}
                            {stats.overBudget ? ' — over budget!' : ''}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};
