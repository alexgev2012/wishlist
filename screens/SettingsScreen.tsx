import React from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';

import { Card, Chip } from '@/components/shared';
import { CURRENCIES, CURRENCY_SYMBOL } from '@/constants';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';

const SettingRow: React.FC<{ label: string; sub?: string; children: React.ReactNode }> = ({ label, sub, children }) => {
    const { theme: t } = useApp();
    return (
        <View style={s.settingRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
                {sub && <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>{sub}</Text>}
            </View>
            {children}
        </View>
    );
};

export const SettingsScreen: React.FC = () => {
    const { state, dispatch, theme: t } = useApp();
    const settings = state.settings;

    const resetAll = () =>
        Alert.alert('Delete everything?', 'All lists and items will be permanently removed.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete all', style: 'destructive', onPress: () => dispatch({ type: 'RESET_ALL' }) },
        ]);

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <View style={s.homeHeader}>
                <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -0.5, color: t.text }}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                <Card>
                    <SettingRow label="Dark mode" sub="Easier on the eyes at night">
                        <Switch
                            value={settings.darkMode}
                            onValueChange={(v: boolean) => dispatch({ type: 'UPDATE_SETTINGS', payload: { darkMode: v } })}
                            trackColor={{ true: t.accent }}
                        />
                    </SettingRow>
                    <SettingRow label="Compact items" sub="Smaller cards, more on screen">
                        <Switch
                            value={settings.compactMode}
                            onValueChange={(v: boolean) => dispatch({ type: 'UPDATE_SETTINGS', payload: { compactMode: v } })}
                            trackColor={{ true: t.accent }}
                        />
                    </SettingRow>
                </Card>

                <Card>
                    <Text style={{ color: t.text, fontSize: 15, fontWeight: '600', marginBottom: 10 }}>Default currency</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                        {CURRENCIES.map((c) => (
                            <Chip
                                key={c}
                                label={`${CURRENCY_SYMBOL[c]} ${c}`}
                                active={settings.defaultCurrency === c}
                                onPress={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { defaultCurrency: c } })}
                            />
                        ))}
                    </View>
                    <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 10 }}>
                        Used for new items, list budgets and totals.
                    </Text>
                </Card>

                <Card>
                    <TouchableOpacity onPress={resetAll}>
                        <Text style={{ color: t.danger, fontWeight: '700', fontSize: 15 }}>Delete all data</Text>
                        <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>
                            Removes every list and item. Settings are kept.
                        </Text>
                    </TouchableOpacity>
                </Card>

                <Text style={{ color: t.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 }}>
                    Wishly · data stays on your device
                </Text>
            </ScrollView>
        </View>
    );
};
