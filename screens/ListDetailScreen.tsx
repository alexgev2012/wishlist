import React, { useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ItemCard } from '@/components/ItemCard';
import { Chip, EmptyState, FAB, Header, ProgressBar, SearchBar } from '@/components/shared';
import { HIT_SLOP } from '@/constants';
import { useNav } from '@/navigation/NavState';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import type { FilterMode, SortMode, WishItem } from '@/types';
import { computeListStats, filterItems, formatPrice, searchItems, shareList, sortItems } from '@/utils';

const SORT_LABELS: Record<SortMode, string> = {
    newest: 'Newest', oldest: 'Oldest', priceAsc: 'Price ↑',
    priceDesc: 'Price ↓', priority: 'Priority', alphabetical: 'A–Z',
};
const SORT_ORDER: SortMode[] = ['newest', 'oldest', 'priceAsc', 'priceDesc', 'priority', 'alphabetical'];
const FILTERS: { key: FilterMode; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'purchased', label: 'Purchased' },
    { key: 'favorites', label: '❤️ Favorites' },
];

export const ListDetailScreen: React.FC<{ listId: string }> = ({ listId }) => {
    const { state, dispatch, theme: t } = useApp();
    const nav = useNav();
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortMode>('newest');
    const [filter, setFilter] = useState<FilterMode>('all');

    const list = state.lists.find((l) => l.id === listId);

    const items = useMemo(() => {
        let r = state.items.filter((i) => i.listId === listId);
        r = filterItems(r, filter);
        r = searchItems(r, query);
        return sortItems(r, sort);
    }, [state.items, listId, filter, query, sort]);

    if (!list) {
        return (
            <View style={{ flex: 1, backgroundColor: t.bg }}>
                <Header title="List" onBack={nav.pop} />
                <EmptyState emoji="🫥" title="List not found" subtitle="It may have been deleted." />
            </View>
        );
    }

    const stats = computeListStats(list, state.items);
    const cycleSort = () => setSort(SORT_ORDER[(SORT_ORDER.indexOf(sort) + 1) % SORT_ORDER.length]);

    const openAddMenu = () =>
        Alert.alert('New wish', undefined, [
            { text: 'Add manually', onPress: () => nav.push({ name: 'itemForm', listId }) },
            { text: 'Import from a link', onPress: () => nav.push({ name: 'importLink', listId }) },
            { text: 'Cancel', style: 'cancel' },
        ]);

    const clearPurchased = () =>
        Alert.alert('Clear purchased?', 'Removes all purchased items from this list.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: () => dispatch({ type: 'CLEAR_PURCHASED', payload: { listId } }) },
        ]);

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <Header
                title={`${list.emoji} ${list.name}`}
                onBack={nav.pop}
                right={
                    <>
                        <TouchableOpacity onPress={() => shareList(list, state.items)} style={{ marginRight: 14 }} hitSlop={HIT_SLOP}>
                            <Text style={{ fontSize: 17 }}>📤</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => nav.push({ name: 'listForm', listId })} hitSlop={HIT_SLOP}>
                            <Text style={{ fontSize: 17 }}>✏️</Text>
                        </TouchableOpacity>
                    </>
                }
            />

            <View style={{ padding: 16, paddingBottom: 8 }}>
                <View style={[s.summary, { backgroundColor: t.surface, borderColor: t.border }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: t.textMuted, fontSize: 12 }}>Remaining</Text>
                        <Text style={{ color: t.text, fontSize: 20, fontWeight: '900' }}>
                            {formatPrice(stats.remainingValue, state.settings.defaultCurrency)}
                        </Text>
                    </View>
                    <View style={{ flex: 1.4, marginLeft: 12 }}>
                        <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 6 }}>
                            {stats.purchasedItems}/{stats.totalItems} purchased
                        </Text>
                        <ProgressBar progress={stats.progress} color={list.color} height={8} />
                    </View>
                </View>

                <SearchBar value={query} onChange={setQuery} />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ alignItems: 'center' }}>
                    {FILTERS.map((f) => (
                        <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
                    ))}
                    <Chip label={`Sort: ${SORT_LABELS[sort]}`} active={false} onPress={cycleSort} />
                    {stats.purchasedItems > 0 && <Chip label="Clear purchased" active={false} onPress={clearPurchased} />}
                </ScrollView>
            </View>

            <FlatList
                data={items}
                keyExtractor={(i: WishItem) => i.id}
                contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 100 }}
                ListEmptyComponent={
                    <EmptyState
                        emoji={query ? '🔎' : '🌱'}
                        title={query ? 'Nothing found' : 'No items yet'}
                        subtitle={query ? 'Try a different search.' : 'Tap + to add your first wish.'}
                    />
                }
                renderItem={({ item }: { item: WishItem }) => <ItemCard item={item} />}
            />

            <FAB onPress={openAddMenu} />
        </View>
    );
};
