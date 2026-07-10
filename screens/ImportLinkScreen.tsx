import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity } from 'react-native';

import { Header, Label } from '@/components/shared';
import { extractWishFromUrl } from '@/linkImport';
import { useNav } from '@/navigation/NavState';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import { isValidUrl } from '@/utils';

export const ImportLinkScreen: React.FC<{ listId: string }> = ({ listId }) => {
    const { theme: t } = useApp();
    const nav = useNav();

    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const goManual = () => {
        nav.pop();
        nav.push({ name: 'itemForm', listId });
    };

    const fetchDetails = async () => {
        if (!isValidUrl(url)) {
            setError('Paste a full link starting with http(s)://');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const draft = await extractWishFromUrl(url.trim());
            nav.pop();
            nav.push({ name: 'itemForm', listId, draft });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't read that page.");
        } finally {
            setLoading(false);
        }
    };

    const input = [s.input, { backgroundColor: t.surface, borderColor: t.border, color: t.text }];

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Header title="Import from a link" onBack={nav.pop} />
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
                <Label text="Product link" error={error} />
                <TextInput
                    style={input}
                    value={url}
                    onChangeText={(v: string) => { setUrl(v); if (error) setError(''); }}
                    placeholder="https://store.example/product"
                    placeholderTextColor={t.textMuted}
                    autoCapitalize="none"
                    keyboardType="url"
                    editable={!loading}
                />
                <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 8 }}>
                    We'll open the link, pull out the title, price and photo if available, and let you review before saving.
                </Text>

                <TouchableOpacity
                    style={[s.saveBtn, { backgroundColor: t.accent, opacity: loading ? 0.7 : 1 }]}
                    onPress={fetchDetails}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Fetch details</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={{ alignItems: 'center', marginTop: 20 }} onPress={goManual} disabled={loading}>
                    <Text style={{ color: t.accent, fontWeight: '700' }}>Add manually instead</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};
