import React, { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { Chip, EmptyState, FAB } from '@/components/shared';
import { ListCard } from '@/components/ListCard';
import { useNav } from '@/navigation/NavState';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import type { WishList } from '@/types';

export const HomeScreen: React.FC = () => {
    const { state, theme: t } = useApp();
    const nav = useNav();
    const [showArchived, setShowArchived] = useState(false);

    const lists = useMemo(
        () =>
            state.lists
                .filter((l) => (showArchived ? l.archived : !l.archived))
                .sort((a, b) => b.createdAt - a.createdAt),
        [state.lists, showArchived]
    );

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <View style={s.homeHeader}>
                <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -0.5, color: t.text }}>Wishly</Text>
                <View style={{ flexDirection: 'row' }}>
                    <Chip label="Active" active={!showArchived} onPress={() => setShowArchived(false)} />
                    <Chip label="Archived" active={showArchived} onPress={() => setShowArchived(true)} />
                </View>
            </View>

            <FlatList
                data={lists}
                keyExtractor={(l: WishList) => l.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={
                    <EmptyState
                        emoji={showArchived ? '🗄️' : '🎁'}
                        title={showArchived ? 'No archived lists' : 'No lists yet'}
                        subtitle={showArchived ? 'Archived lists will appear here.' : 'Create your first wishlist with the + button. Long-press a list for more actions.'}
                    />
                }
                renderItem={({ item }: { item: WishList }) => <ListCard list={item} />}
            />

            <FAB onPress={() => nav.push({ name: 'listForm' })} />
        </View>
    );
};
