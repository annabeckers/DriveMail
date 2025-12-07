import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, FlatList, Platform } from 'react-native';
import { LogOut, User, Volume2, Zap, Speaker, X, Check } from 'lucide-react-native';
import { GoogleIcon } from './GoogleIcon';

interface SettingsViewProps {
    onLogout: () => void;
}

type SettingKey = 'connection' | 'output' | 'voice' | 'volume' | null;

interface SettingOption {
    label: string;
    value: string;
}

const SETTINGS_OPTIONS: Record<string, SettingOption[]> = {
    connection: [
        { label: 'Automatisch (Smart)', value: 'Automatisch (Smart)' },
        { label: 'Apple CarPlay', value: 'Apple CarPlay' },
        { label: 'Android Auto', value: 'Android Auto' },
        { label: 'Bluetooth', value: 'Bluetooth' },
    ],
    output: [
        { label: 'Fahrzeuglautsprecher', value: 'Fahrzeuglautsprecher' },
        { label: 'Gerät (iPhone/Android)', value: 'Gerät' },
        { label: 'Kopfhörer', value: 'Kopfhörer' },
    ],
    voice: [
        { label: 'Onyx (Männlich, Tief)', value: 'Onyx' },
        { label: 'Nova (Weiblich, Natürlich)', value: 'Nova' },
        { label: 'Alloy (Neutral)', value: 'Alloy' },
        { label: 'Echo (Männlich, Weich)', value: 'Echo' },
        { label: 'Shimmer (Weiblich, Hell)', value: 'Shimmer' },
    ],
    volume: [
        { label: 'System (Standard)', value: 'System' },
        { label: 'Leise', value: 'Leise' },
        { label: 'Laut', value: 'Laut' },
        { label: 'Dynamisch (Fahrtwind)', value: 'Dynamisch' },
    ]
};

const SETTING_TITLES: Record<string, string> = {
    connection: 'Verbindung wählen',
    output: 'Audio-Ausgabe',
    voice: 'Stimme wählen',
    volume: 'Lautstärke-Modus',
};

import { BackgroundLayout } from './BackgroundLayout';

export const SettingsView: React.FC<SettingsViewProps> = ({ onLogout }) => {
    const [settings, setSettings] = useState({
        connection: 'Automatisch (Smart)',
        output: 'Fahrzeuglautsprecher',
        voice: 'Onyx',
        volume: 'System',
    });

    const [modalVisible, setModalVisible] = useState(false);
    const [activeSetting, setActiveSetting] = useState<SettingKey>(null);

    const openSetting = (key: SettingKey) => {
        setActiveSetting(key);
        setModalVisible(true);
    };

    const selectOption = (value: string) => {
        if (activeSetting) {
            setSettings(prev => ({ ...prev, [activeSetting]: value }));
            setModalVisible(false);
            setActiveSetting(null);
        }
    };

    const renderOption = ({ item }: { item: SettingOption }) => {
        const isSelected = activeSetting ? settings[activeSetting as keyof typeof settings] === item.value : false;

        return (
            <TouchableOpacity
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                onPress={() => selectOption(item.value)}
                activeOpacity={0.7}
            >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{item.label}</Text>
                {isSelected && <Check size={20} color="#3b82f6" />}
            </TouchableOpacity>
        );
    };

    return (
        <BackgroundLayout animated={false}>
            <ScrollView contentContainerStyle={styles.settingsContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Konto & Verbindung</Text>
                </View>

                <View style={styles.settingCard}>
                    <View style={styles.accountRow}>
                        <View style={styles.accountInfo}>
                            <View style={styles.accountIcon}>
                                <GoogleIcon />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Verbunden</Text>
                                <Text style={styles.settingValue}>fahrer@example.com</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={onLogout}
                            style={styles.logoutButton}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <LogOut size={22} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                    <Text style={styles.sectionTitle}>Audio & Smart Connect</Text>
                </View>

                <View style={styles.settingCard}>
                    <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => openSetting('connection')}>
                        <View style={styles.settingLeft}>
                            <Zap size={22} color="#94a3b8" />
                            <Text style={styles.settingLabelRaw}>Verbindung</Text>
                        </View>
                        <Text style={styles.settingValue}>{settings.connection}</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => openSetting('output')}>
                        <View style={styles.settingLeft}>
                            <Speaker size={22} color="#94a3b8" />
                            <Text style={styles.settingLabelRaw}>Ausgabe</Text>
                        </View>
                        <Text style={styles.settingValue}>{settings.output}</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => openSetting('voice')}>
                        <View style={styles.settingLeft}>
                            <User size={22} color="#94a3b8" />
                            <Text style={styles.settingLabelRaw}>Stimme</Text>
                        </View>
                        <Text style={styles.settingValue}>{settings.voice}</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => openSetting('volume')}>
                        <View style={styles.settingLeft}>
                            <Volume2 size={22} color="#94a3b8" />
                            <Text style={styles.settingLabelRaw}>Lautstärke</Text>
                        </View>
                        <Text style={styles.settingValue}>{settings.volume}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.versionText}>DriveMail v1.3.0 • Interactive Edition</Text>
            </ScrollView>

            {/* Selection Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {activeSetting ? SETTING_TITLES[activeSetting] : ''}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setModalVisible(false)}
                                    style={styles.closeButton}
                                >
                                    <X size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={activeSetting ? SETTINGS_OPTIONS[activeSetting] : []}
                                renderItem={renderOption}
                                keyExtractor={(item) => item.value}
                                contentContainerStyle={{ paddingVertical: 8 }}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            </Modal>
        </BackgroundLayout>
    );
};

const styles = StyleSheet.create({
    settingsContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionHeader: {
        marginBottom: 12,
        paddingLeft: 4,
    },
    sectionTitle: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    settingCard: {
        backgroundColor: '#0f172a',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1e293b',
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'rgba(30, 58, 138, 0.2)',
    },
    accountInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    accountIcon: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 8,
    },
    settingLabel: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    settingValue: {
        color: '#94a3b8',
        fontSize: 14,
    },
    logoutButton: {
        padding: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingLabelRaw: {
        color: '#e2e8f0',
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#1e293b',
        marginLeft: 16,
    },
    versionText: {
        textAlign: 'center',
        color: '#475569',
        fontSize: 12,
        marginTop: 20,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '50%',
        minHeight: 200,
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#0f172a',
        borderRadius: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    optionRowSelected: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    optionLabel: {
        color: '#cbd5e1',
        fontSize: 16,
    },
    optionLabelSelected: {
        color: '#60a5fa',
        fontWeight: '600',
    },
});
