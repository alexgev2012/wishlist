import React from 'react';
import { Alert, Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Card, EmptyState, Header, PriorityBadge, TagPill } from '@/components/shared';
import { CATEGORY_EMOJI, HIT_SLOP } from '@/constants';
import { useNav } from '@/navigation/NavState';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import { formatDate, formatPrice, generateId } from '@/utils';

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
    const { theme: t } = useApp();
    return (
        <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
            <Text style={{ color: t.textMuted, fontSize: 13, width: 90 }}>{label}</Text>
            <Text style={{ color: t.text, fontSize: 14, flex: 1 }}>{value}</Text>
        </View>
    );
};

const SmallAction: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
    const { theme: t } = useApp();
    return (
        <TouchableOpacity style={[s.smallBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={onPress}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
        </TouchableOpacity>
    );
};

export const ItemDetailScreen: React.FC<{ itemId: string }> = ({ itemId }) => {
    const { state, dispatch, theme: t, deleteItemWithUndo } = useApp();
    const nav = useNav();

    const item = state.items.find((i) => i.id === itemId);
    const list = item ? state.lists.find((l) => l.id === item.listId) : undefined;

    if (!item) {
        return (
            <View style={{ flex: 1, backgroundColor: t.bg }}>
                <Header title="Item" onBack={nav.pop} />
                <EmptyState emoji="🫥" title="Item not found" subtitle="It may have been deleted." />
            </View>
        );
    }

    const moveItem = () => {
        const targets = state.lists.filter((l) => l.id !== item.listId && !l.archived);
        if (targets.length === 0) {
            Alert.alert('No other lists', 'Create another list first.');
            return;
        }
        Alert.alert('Move to…', undefined, [
            ...targets.map((l) => ({
                text: `${l.emoji} ${l.name}`,
                onPress: () => {
                    dispatch({ type: 'MOVE_ITEM', payload: { id: item.id, targetListId: l.id } });
                    nav.pop();
                },
            })),
            { text: 'Cancel', style: 'cancel' as const },
        ]);
    };

    const confirmDelete = () =>
        Alert.alert('Delete item?', `"${item.title}" will be removed.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => { deleteItemWithUndo(item); nav.pop(); },
            },
        ]);

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <Header
                title={item.title}
                onBack={nav.pop}
                right={
                    <TouchableOpacity onPress={() => nav.push({ name: 'itemForm', listId: item.listId, itemId: item.id })} hitSlop={HIT_SLOP}>
                        <Text style={{ fontSize: 17 }}>✏️</Text>
                    </TouchableOpacity>
                }
            />
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={s.detailImage} />
                ) : (
                    <View style={[s.detailPlaceholder, { backgroundColor: t.surfaceAlt }]}>
                        <Text style={{ fontSize: 56 }}>{CATEGORY_EMOJI[item.category]}</Text>
                    </View>
                )}

                <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 26, fontWeight: '900', color: t.accent }}>
                            {formatPrice(item.price * item.quantity, item.currency)}
                        </Text>
                        <PriorityBadge priority={item.priority} />
                    </View>
                    {item.quantity > 1 && (
                        <Text style={{ color: t.textMuted, fontSize: 13 }}>
                            {item.quantity} × {formatPrice(item.price, item.currency)}
                        </Text>
                    )}
                    {item.description && (
                        <Text style={{ color: t.text, fontSize: 15, marginTop: 10, lineHeight: 22 }}>{item.description}</Text>
                    )}
                    {item.tags.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
                            {item.tags.map((tag) => <TagPill key={tag} label={tag} />)}
                        </View>
                    )}
                </Card>

                <Card>
                    <InfoRow label="List" value={list ? `${list.emoji} ${list.name}` : '—'} />
                    <InfoRow label="Category" value={`${CATEGORY_EMOJI[item.category]} ${item.category}`} />
                    <InfoRow label="Added" value={formatDate(item.createdAt)} />
                    {item.purchased && item.purchasedAt && <InfoRow label="Purchased" value={formatDate(item.purchasedAt)} />}
                    {item.notes && <InfoRow label="Notes" value={item.notes} />}
                </Card>

                {item.url && (
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: t.accent }]} onPress={() => Linking.openURL(item.url!)}>
                        <Text style={s.actionText}>🔗 Open store link</Text>
                    </TouchableOpacity>
                )}

                <View style={s.actionsRow}>
                    <SmallAction
                        label={item.purchased ? 'Mark active' : 'Mark bought'}
                        onPress={() => dispatch({ type: 'TOGGLE_PURCHASED', payload: { id: item.id } })}
                    />
                    <SmallAction
                        label={item.favorite ? 'Unfavorite' : 'Favorite'}
                        onPress={() => dispatch({ type: 'TOGGLE_FAVORITE', payload: { id: item.id } })}
                    />
                </View>
                <View style={s.actionsRow}>
                    <SmallAction
                        label="Duplicate"
                        onPress={() => dispatch({ type: 'DUPLICATE_ITEM', payload: { id: item.id, newId: generateId() } })}
                    />
                    <SmallAction label="Move to list…" onPress={moveItem} />
                </View>

                <TouchableOpacity style={{ alignItems: 'center', marginTop: 20, marginBottom: 40 }} onPress={confirmDelete}>
                    <Text style={{ color: t.danger, fontWeight: '700' }}>Delete item</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};
