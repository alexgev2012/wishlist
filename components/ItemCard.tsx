import React, { useEffect } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeInDown,
    FadeOutUp,
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { PriorityBadge, TagPill } from '@/components/shared';
import { CATEGORY_EMOJI, HIT_SLOP } from '@/constants';
import { useNav } from '@/navigation/NavState';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import type { WishItem } from '@/types';
import { formatPrice, relativeDate } from '@/utils';

export const ItemCard: React.FC<{ item: WishItem }> = ({ item }) => {
    const { state, dispatch, theme: t } = useApp();
    const nav = useNav();
    const compact = state.settings.compactMode;
    const total = item.price * item.quantity;

    const checkScale = useSharedValue(1);
    useEffect(() => {
        checkScale.value = withSequence(withTiming(1.25, { duration: 120 }), withTiming(1, { duration: 120 }));
    }, [item.purchased, checkScale]);
    const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

    return (
        <Animated.View
            entering={FadeInDown.duration(220)}
            exiting={FadeOutUp.duration(180)}
            layout={LinearTransition.springify().damping(18)}
        >
            <TouchableOpacity
                onPress={() => nav.push({ name: 'itemDetail', itemId: item.id })}
                activeOpacity={0.7}
                style={[s.itemCard, { backgroundColor: t.surface, borderColor: t.border, opacity: item.purchased ? 0.55 : 1 }]}
            >
                <TouchableOpacity
                    onPress={() => dispatch({ type: 'TOGGLE_PURCHASED', payload: { id: item.id } })}
                    style={{ marginRight: 10 }}
                    hitSlop={HIT_SLOP}
                >
                    <Animated.View
                        style={[
                            s.checkbox,
                            { borderColor: item.purchased ? t.success : t.border, backgroundColor: item.purchased ? t.success : 'transparent' },
                            checkStyle,
                        ]}
                    >
                        {item.purchased && <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>}
                    </Animated.View>
                </TouchableOpacity>

                {!compact && item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={s.itemImage} />
                ) : (
                    <View style={[s.emojiBox, { backgroundColor: t.surfaceAlt }]}>
                        <Text style={{ fontSize: compact ? 16 : 22 }}>{CATEGORY_EMOJI[item.category]}</Text>
                    </View>
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text
                            numberOfLines={1}
                            style={{
                                fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8,
                                color: t.text, textDecorationLine: item.purchased ? 'line-through' : 'none',
                            }}
                        >
                            {item.title}
                        </Text>
                        <TouchableOpacity onPress={() => dispatch({ type: 'TOGGLE_FAVORITE', payload: { id: item.id } })} hitSlop={HIT_SLOP}>
                            <Text style={{ fontSize: 16 }}>{item.favorite ? '❤️' : '🤍'}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={{ color: t.accent, fontSize: 14, fontWeight: '700', marginTop: 2 }}>
                        {formatPrice(total, item.currency)}
                        {item.quantity > 1 && (
                            <Text style={{ color: t.textMuted, fontWeight: '400', fontSize: 12 }}>
                                {'  '}({item.quantity} × {formatPrice(item.price, item.currency)})
                            </Text>
                        )}
                    </Text>

                    {!compact && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                            <PriorityBadge priority={item.priority} />
                            <Text style={{ color: t.textMuted, fontSize: 11 }}>{relativeDate(item.createdAt)}</Text>
                        </View>
                    )}

                    {!compact && item.tags.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                            {item.tags.slice(0, 3).map((tag) => <TagPill key={tag} label={tag} />)}
                            {item.tags.length > 3 && <Text style={{ color: t.textMuted, fontSize: 12 }}>+{item.tags.length - 3}</Text>}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};
