import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Header, Label } from '@/components/shared';
import { LIST_COLORS, LIST_EMOJIS } from '@/constants';
import { useNav } from '@/navigation/NavState';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import type { WishList } from '@/types';
import { generateId } from '@/utils';

export const ListFormScreen: React.FC<{ listId?: string }> = ({ listId }) => {
    const { state, dispatch, theme: t } = useApp();
    const nav = useNav();

    const editing = listId ? state.lists.find((l) => l.id === listId) : undefined;

    const [name, setName] = useState(editing?.name ?? '');
    const [emoji, setEmoji] = useState(editing?.emoji ?? LIST_EMOJIS[0]);
    const [color, setColor] = useState(editing?.color ?? LIST_COLORS[0]);
    const [budget, setBudget] = useState(editing?.budget != null ? String(editing.budget) : '');
    const [error, setError] = useState('');

    const save = () => {
        if (!name.trim()) { setError('Give your list a name'); return; }
        const parsedBudget = parseFloat(budget.replace(',', '.'));
        const list: WishList = {
            id: editing?.id ?? generateId(),
            name: name.trim(),
            emoji,
            color,
            budget: budget.trim() && !isNaN(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
            archived: editing?.archived ?? false,
            createdAt: editing?.createdAt ?? Date.now(),
        };
        dispatch({ type: editing ? 'UPDATE_LIST' : 'ADD_LIST', payload: list });
        nav.pop();
    };

    const input = [s.input, { backgroundColor: t.surface, borderColor: t.border, color: t.text }];

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Header title={editing ? 'Edit list' : 'New list'} onBack={nav.pop} />
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
                <Label text="Name *" error={error} />
                <TextInput
                    style={input} value={name}
                    onChangeText={(v: string) => { setName(v); if (error) setError(''); }}
                    placeholder="Birthday, Christmas, Dream setup…" placeholderTextColor={t.textMuted}
                />

                <Label text="Emoji" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                    {LIST_EMOJIS.map((e) => (
                        <TouchableOpacity
                            key={e}
                            onPress={() => setEmoji(e)}
                            style={[
                                s.emojiPick,
                                { backgroundColor: emoji === e ? t.accent + '33' : t.surface, borderColor: emoji === e ? t.accent : t.border },
                            ]}
                        >
                            <Text style={{ fontSize: 22 }}>{e}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Label text="Color" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
                    {LIST_COLORS.map((c) => (
                        <TouchableOpacity
                            key={c}
                            onPress={() => setColor(c)}
                            style={[s.colorDot, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: t.text }]}
                        />
                    ))}
                </View>

                <Label text={`Budget (optional, ${state.settings.defaultCurrency})`} />
                <TextInput style={input} value={budget} onChangeText={setBudget} placeholder="e.g. 500" placeholderTextColor={t.textMuted} keyboardType="decimal-pad" />

                <TouchableOpacity style={[s.saveBtn, { backgroundColor: t.accent }]} onPress={save}>
                    <Text style={s.saveText}>{editing ? 'Save changes' : 'Create list'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};
