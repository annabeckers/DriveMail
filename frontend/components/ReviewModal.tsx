import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Volume2, X, Send, Pencil } from 'lucide-react-native';

interface ReviewModalProps {
    visible: boolean;
    generatedMail: any;
    onCancel: () => void;
    onEdit: () => void;
    onSend: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ visible, generatedMail, onCancel, onEdit, onSend }) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            statusBarTranslucent={true} // Allow modal to cover status bar
        >
            <BlurView intensity={20} style={styles.modalBlur} tint="dark">
                <View style={styles.modalContent}>
                    {/* Audio Header */}
                    <ExpoLinearGradient colors={['#172554', '#0f172a']} style={styles.modalHeader}>
                        <Volume2 color="#60a5fa" size={24} />
                        <Text style={styles.readingText}>Lese Entwurf vor...</Text>
                    </ExpoLinearGradient>

                    <ScrollView style={styles.emailScroll} contentContainerStyle={{ paddingBottom: 100 }}>
                        <View style={styles.emailField}>
                            <Text style={styles.emailLabel}>BETREFF</Text>
                            <Text style={styles.emailSubject}>{generatedMail?.subject}</Text>
                        </View>
                        <View style={styles.emailField}>
                            <Text style={styles.emailLabel}>NACHRICHT</Text>
                            <View style={styles.emailBodyBox}>
                                <Text style={styles.emailBody}>{generatedMail?.body}</Text>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <View style={styles.actionGroupLeft}>
                            <TouchableOpacity
                                onPress={onEdit}
                                style={styles.actionButtonSecondary}
                                activeOpacity={0.8}
                            >
                                <Pencil size={24} color="#cbd5e1" />
                                <Text style={styles.actionTextSec}>Bearbeiten</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={onCancel}
                                style={styles.actionButtonSecondary}
                                activeOpacity={0.8}
                            >
                                <X size={24} color="#cbd5e1" />
                                <Text style={styles.actionTextSec}>Verwerfen</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={onSend}
                            style={styles.actionButtonPrimary}
                            activeOpacity={0.8}
                        >
                            <ExpoLinearGradient
                                colors={['#2563eb', '#1d4ed8']}
                                style={styles.gradientButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Send size={26} color="#fff" />
                                <Text style={styles.actionTextPri}>Senden</Text>
                            </ExpoLinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBlur: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)', // Fallback / darken for Android mainly
    },
    modalContent: {
        height: '85%',
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1e293b',
        // Elevation for the modal content itself to pop
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1e3a8a',
    },
    readingText: {
        color: '#dbeafe',
        fontWeight: '500',
        fontSize: 15,
    },
    emailScroll: {
        flex: 1,
        padding: 24,
    },
    emailField: {
        marginBottom: 24,
    },
    emailLabel: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    emailSubject: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 28,
    },
    emailBodyBox: {
        backgroundColor: 'rgba(2, 6, 23, 0.5)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    emailBody: {
        color: '#cbd5e1',
        lineHeight: 26,
        fontSize: 16,
    },
    modalActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        gap: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        elevation: 5,
    },
    actionGroupLeft: {
        flex: 1.5,
        flexDirection: 'row',
        gap: 8,
    },
    actionButtonSecondary: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: '#334155',
        elevation: 2,
    },
    actionTextSec: {
        color: '#cbd5e1',
        fontWeight: '600',
        fontSize: 12,
    },
    actionButtonPrimary: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    gradientButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    actionTextPri: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
