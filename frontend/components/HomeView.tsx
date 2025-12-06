import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { Mic, Send, CheckCircle, Loader2 } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { DriveMailLogo } from './DriveMailLogo';

interface HomeViewProps {
    status: string;
    transcript: string;
    pulseAnim: Animated.Value;
    spin: Animated.AnimatedInterpolation<string | number>;
    onStartListening: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ status, transcript, pulseAnim, spin, onStartListening }) => {
    return (
        <ExpoLinearGradient
            colors={['#0f172a', '#1e293b', '#0f172a']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.centerContent}>

                {status === 'idle' && (
                    <View style={styles.idleState}>
                        <View style={{ opacity: 0.8, marginBottom: 50 }}>
                            <DriveMailLogo width={110} height={110} />
                        </View>
                        <Text style={styles.promptText}>Tippen zum Sprechen</Text>

                        <TouchableOpacity
                            onPress={onStartListening}
                            style={styles.micButtonContainer}
                            activeOpacity={0.8}
                            accessibilityLabel="Tap to start recording"
                            accessibilityRole="button"
                        >
                            <ExpoLinearGradient
                                colors={['#3b82f6', '#2563eb']}
                                style={styles.micGradient}
                                start={{ x: 0.5, y: 0 }}
                                end={{ x: 0.5, y: 1 }}
                            >
                                <Mic color="#fff" size={64} />
                            </ExpoLinearGradient>
                            {/* Glow Effect */}
                            <View style={styles.micGlow} />
                        </TouchableOpacity>

                        <View style={styles.exampleBox}>
                            <Text style={styles.exampleLabel}>Beispiel:</Text>
                            <Text style={styles.exampleText}>"Nachricht an Müller: Angebot folgt morgen."</Text>
                        </View>
                    </View>
                )}

                {status === 'listening' && (
                    <View style={styles.listeningState}>
                        <TouchableOpacity onPress={onStartListening} activeOpacity={0.9}>
                            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
                                <ExpoLinearGradient
                                    colors={['#3b82f6', '#8b5cf6', '#ec4899']}
                                    style={styles.micCircleActive}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Mic color="#fff" size={72} />
                                </ExpoLinearGradient>
                            </Animated.View>
                        </TouchableOpacity>
                        <Text style={styles.statusTextBlue}>Ich höre zu...</Text>
                        <Text style={styles.transcriptLive}>{transcript}</Text>
                    </View>
                )}

                {status === 'processing' && (
                    <View style={styles.processingState}>
                        <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 30 }}>
                            <Loader2 color="#3b82f6" size={80} />
                        </Animated.View>
                        <Text style={styles.statusTextBlue}>Verarbeite...</Text>
                        {transcript ? (
                            <View style={styles.transcriptBox}>
                                <Text style={styles.transcriptLabel}>ERKANNT:</Text>
                                <Text style={styles.transcriptText}>"{transcript}"</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                {status === 'sending' && (
                    <View style={styles.centerState}>
                        <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 20 }}>
                            <Send color="#3b82f6" size={48} />
                        </Animated.View>
                        <Text style={styles.statusTextBlue}>Sende E-Mail...</Text>
                    </View>
                )}

                {status === 'success' && (
                    <View style={styles.centerState}>
                        <View style={styles.successCircle}>
                            <CheckCircle color="#fff" size={72} />
                        </View>
                        <Text style={styles.successText}>Erledigt!</Text>
                    </View>
                )}
            </View>
        </ExpoLinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    idleState: {
        alignItems: 'center',
        width: '100%',
    },
    promptText: {
        color: '#f1f5f9',
        fontSize: 32,
        fontWeight: '400',
        marginBottom: 50,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    micButtonContainer: {
        marginBottom: 50,
        borderRadius: 80,
        width: 160,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        // Shadow
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    micGradient: {
        width: 160,
        height: 160,
        borderRadius: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        zIndex: 2,
    },
    micGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 80,
        backgroundColor: '#3b82f6',
        opacity: 0.3,
        transform: [{ scale: 1.1 }],
        zIndex: 1,
    },
    exampleBox: {
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        paddingVertical: 18,
        paddingHorizontal: 28,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.2)',
        alignItems: 'center',
    },
    exampleLabel: {
        color: '#60a5fa',
        fontWeight: '600',
        marginBottom: 8,
        fontSize: 14,
        letterSpacing: 0.5,
    },
    exampleText: {
        color: '#cbd5e1',
        fontStyle: 'italic',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '500',
    },
    listeningState: {
        alignItems: 'center',
    },
    pulseCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.4)',
    },
    micCircleActive: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
    },
    statusTextBlue: {
        fontSize: 26,
        fontWeight: '600',
        color: '#60a5fa',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    transcriptLive: {
        color: '#e2e8f0',
        marginTop: 20,
        fontSize: 22,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 32,
        fontWeight: '500',
    },
    processingState: {
        alignItems: 'center',
        width: '100%',
    },
    transcriptBox: {
        marginTop: 40,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 24,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
        width: '90%',
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    transcriptLabel: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 12,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    transcriptText: {
        color: '#f1f5f9',
        fontSize: 18,
        lineHeight: 28,
    },
    centerState: {
        alignItems: 'center',
    },
    successCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: '#22c55e',
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    successText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 0.5,
    },
});
