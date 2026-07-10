import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginRight: 6, marginBottom: 6 },
    progressTrack: { borderRadius: 999, overflow: 'hidden', flex: 1 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, marginRight: 8 },
    search: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
    fab: {
        position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center', elevation: 5,
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    },
    empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
    snackbar: {
        position: 'absolute', left: 16, right: 16, bottom: 24, borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', elevation: 6,
    },
    card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
        paddingVertical: 12, borderBottomWidth: 1,
    },
    homeHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    },
    itemCard: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
        padding: 12, marginBottom: 10,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 11, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    itemImage: { width: 52, height: 52, borderRadius: 12 },
    emojiBox: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    listCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
    summary: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
        padding: 14, marginBottom: 12,
    },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
    stepper: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9,
    },
    saveBtn: { marginTop: 28, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    detailImage: { width: '100%', height: 220, borderRadius: 20, marginBottom: 14 },
    detailPlaceholder: {
        width: '100%', height: 160, borderRadius: 20, alignItems: 'center',
        justifyContent: 'center', marginBottom: 14,
    },
    actionBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
    actionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    smallBtn: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
    emojiPick: {
        width: 48, height: 48, borderRadius: 12, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center', marginRight: 8,
    },
    colorDot: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    statBox: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
    settingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 8,
    },
    tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, paddingBottom: 6 },
    tabBtn: { flex: 1, alignItems: 'center' },
});
