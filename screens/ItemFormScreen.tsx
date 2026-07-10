import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Chip, Header, Label } from '@/components/shared';
import { CATEGORIES, CATEGORY_EMOJI, CURRENCIES, CURRENCY_SYMBOL, HIT_SLOP, PRIORITIES } from '@/constants';
import type { LinkWishDraft } from '@/linkImport';
import { useNav } from '@/navigation/NavState';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import type { Category, Currency, Priority, WishItem } from '@/types';
import { generateId, isValidUrl, parseTags, priorityLabel } from '@/utils';

export const ItemFormScreen: React.FC<{ listId: string; itemId?: string; draft?: LinkWishDraft }> = ({ listId, itemId, draft }) => {
    const { state, dispatch, theme: t } = useApp();
    const nav = useNav();

    const editing = itemId ? state.items.find((i) => i.id === itemId) : undefined;

    const [title, setTitle] = useState(editing?.title ?? draft?.title ?? '');
    const [description, setDescription] = useState(editing?.description ?? draft?.description ?? '');
    const [price, setPrice] = useState(editing ? String(editing.price) : draft?.price != null ? String(draft.price) : '');
    const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
    const [currency, setCurrency] = useState<Currency>(editing?.currency ?? draft?.currency ?? state.settings.defaultCurrency);
    const [url, setUrl] = useState(editing?.url ?? draft?.url ?? '');
    const [imageUrl, setImageUrl] = useState(editing?.imageUrl ?? draft?.imageUrl ?? '');
    const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'medium');
    const [category, setCategory] = useState<Category>(editing?.category ?? 'other');
    const [tagsRaw, setTagsRaw] = useState(editing?.tags.join(', ') ?? '');
    const [notes, setNotes] = useState(editing?.notes ?? '');
    const [errors, setErrors] = useState<{ title?: string; price?: string; url?: string }>({});

    const validate = (): boolean => {
        const next: typeof errors = {};
        if (!title.trim()) next.title = 'Name your wish';
        const parsed = parseFloat(price.replace(',', '.'));
        if (price.trim() && (isNaN(parsed) || parsed < 0)) next.price = 'Enter a valid price';
        if (url.trim() && !isValidUrl(url)) next.url = 'Must start with http(s)://';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const save = () => {
        if (!validate()) return;
        const now = Date.now();
        const item: WishItem = {
            id: editing?.id ?? generateId(),
            listId: editing?.listId ?? listId,
            title: title.trim(),
            description: description.trim() || undefined,
            price: parseFloat(price.replace(',', '.')) || 0,
            currency,
            url: url.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
            priority,
            category,
            tags: parseTags(tagsRaw),
            quantity,
            notes: notes.trim() || undefined,
            purchased: editing?.purchased ?? false,
            purchasedAt: editing?.purchasedAt,
            favorite: editing?.favorite ?? false,
            createdAt: editing?.createdAt ?? now,
            updatedAt: now,
        };
        dispatch({ type: editing ? 'UPDATE_ITEM' : 'ADD_ITEM', payload: item });
        nav.pop();
    };

    const input = [s.input, { backgroundColor: t.surface, borderColor: t.border, color: t.text }];

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Header title={editing ? 'Edit item' : 'New item'} onBack={nav.pop} />
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
                <Label text="Title *" error={errors.title} />
                <TextInput style={input} value={title} onChangeText={setTitle} placeholder="What do you wish for?" placeholderTextColor={t.textMuted} />

                <Label text="Description" />
                <TextInput
                    style={[...input, { height: 72, textAlignVertical: 'top' as const }]}
                    value={description} onChangeText={setDescription}
                    placeholder="Color, size, model…" placeholderTextColor={t.textMuted} multiline
                />

                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 2, marginRight: 10 }}>
                        <Label text="Price" error={errors.price} />
                        <TextInput style={input} value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor={t.textMuted} keyboardType="decimal-pad" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Label text="Qty" />
                        <View style={[s.stepper, { backgroundColor: t.surface, borderColor: t.border }]}>
                            <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} hitSlop={HIT_SLOP}>
                                <Text style={{ fontSize: 18, fontWeight: '800', paddingHorizontal: 6, color: t.accent }}>−</Text>
                            </TouchableOpacity>
                            <Text style={{ color: t.text, fontWeight: '700' }}>{quantity}</Text>
                            <TouchableOpacity onPress={() => setQuantity(Math.min(99, quantity + 1))} hitSlop={HIT_SLOP}>
                                <Text style={{ fontSize: 18, fontWeight: '800', paddingHorizontal: 6, color: t.accent }}>＋</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <Label text="Currency" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {CURRENCIES.map((c) => (
                        <Chip key={c} label={`${CURRENCY_SYMBOL[c]} ${c}`} active={currency === c} onPress={() => setCurrency(c)} />
                    ))}
                </ScrollView>

                <Label text="Priority" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                    {PRIORITIES.map((p) => (
                        <Chip key={p} label={p === 'dream' ? '💫 Dream' : priorityLabel(p)} active={priority === p} onPress={() => setPriority(p)} />
                    ))}
                </View>

                <Label text="Category" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                    {CATEGORIES.map((c) => (
                        <Chip key={c} label={`${CATEGORY_EMOJI[c]} ${c}`} active={category === c} onPress={() => setCategory(c)} />
                    ))}
                </View>

                <Label text="Link" error={errors.url} />
                <TextInput style={input} value={url} onChangeText={setUrl} placeholder="https://store.example/item" placeholderTextColor={t.textMuted} autoCapitalize="none" keyboardType="url" />

                <Label text="Image URL" />
                <TextInput style={input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://…/photo.jpg" placeholderTextColor={t.textMuted} autoCapitalize="none" keyboardType="url" />

                <Label text="Tags (comma separated)" />
                <TextInput style={input} value={tagsRaw} onChangeText={setTagsRaw} placeholder="birthday, tech, sale" placeholderTextColor={t.textMuted} autoCapitalize="none" />

                <Label text="Notes" />
                <TextInput
                    style={[...input, { height: 72, textAlignVertical: 'top' as const }]}
                    value={notes} onChangeText={setNotes}
                    placeholder="Anything to remember…" placeholderTextColor={t.textMuted} multiline
                />

                <TouchableOpacity style={[s.saveBtn, { backgroundColor: t.accent }]} onPress={save}>
                    <Text style={s.saveText}>{editing ? 'Save changes' : 'Add to wishlist'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};
