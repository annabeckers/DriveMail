import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform, ScrollView, Easing } from 'react-native';
import { Mic, Send, CheckCircle, Loader2 } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { DriveMailLogo } from './DriveMailLogo';

interface HomeViewProps {
    status: string;
    transcript: string;
    llmResponse?: string;
    isSpeaking: boolean;
    pulseAnim: Animated.Value;
    spin: Animated.AnimatedInterpolation<string | number>;
    onStartListening: () => void;
}

const TypewriterText = ({ text, style }: { text: string, style: any }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        setDisplayedText('');
        let i = 0;
        const timer = setInterval(() => {
            if (i <= text.length) {
                setDisplayedText(text.slice(0, i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, 20); // Slightly faster typing

        return () => clearInterval(timer);
    }, [text]);

    return <Text style={style}>{displayedText}</Text>;
};

const Waveform = () => {
    const scale1 = useRef(new Animated.Value(1)).current;
    const scale2 = useRef(new Animated.Value(1)).current;
    const scale3 = useRef(new Animated.Value(1)).current;
    const scale4 = useRef(new Animated.Value(1)).current;
    const scale5 = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const animate = (anim: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 2.5,
                        duration: 400 + Math.random() * 200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                        delay: delay
                    }),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 400 + Math.random() * 200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    })
                ])
            ).start();
        };

        animate(scale1, 0);
        animate(scale2, 100);
        animate(scale3, 200);
        animate(scale4, 300);
        animate(scale5, 400);
    }, []);

    const barStyle = {
        width: 6,
        height: 20,
        backgroundColor: '#60a5fa',
        borderRadius: 3,
        marginHorizontal: 3,
    };

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 60, justifyContent: 'center', marginBottom: 20 }}>
            <Animated.View style={[barStyle, { transform: [{ scaleY: scale1 }] }]} />
            <Animated.View style={[barStyle, { transform: [{ scaleY: scale2 }] }]} />
            <Animated.View style={[barStyle, { transform: [{ scaleY: scale3 }] }]} />
            <Animated.View style={[barStyle, { transform: [{ scaleY: scale4 }] }]} />
            <Animated.View style={[barStyle, { transform: [{ scaleY: scale5 }] }]} />
        </View>
    );
};

export const HomeView: React.FC<HomeViewProps> = ({ status, transcript, llmResponse, isSpeaking, pulseAnim, spin, onStartListening }) => {
    return (
        <ExpoLinearGradient
            colors={['#0f172a', '#1e293b', '#0f172a']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.mainLayout}>
                
                {/* 1. Top Section: Logo */}
                <View style={styles.topSection}>
                    <View style={{ opacity: 0.8 }}>
                        <DriveMailLogo width={80} height={80} />
                    </View>
                </View>

                {/* 2. Middle Section: Conversation Card */}
                <View style={styles.middleSection}>
                    {(transcript || llmResponse) ? (
                        <View style={styles.card}>
                            <ScrollView 
                                style={styles.scrollArea}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                showsVerticalScrollIndicator={true}
                            >
                                {transcript ? <Text style={styles.userText}>You: {transcript}</Text> : null}
                                
                                {status === 'processing' && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                                        <Text style={[styles.aiText, { color: '#60a5fa' }]}>AI is thinking...</Text>
                                    </View>
                                )}

                                {llmResponse ? (
                                    <View style={{ flexDirection: 'row', marginTop: 10 }}>
                                        <Text style={[styles.aiText, { marginRight: 5 }]}>AI:</Text>
                                        <View style={{ flex: 1 }}>
                                            <TypewriterText text={llmResponse} style={styles.aiText} />
                                        </View>
                                    </View>
                                ) : null}
                            </ScrollView>
                        </View>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Text style={styles.promptText}>Tippen zum Sprechen</Text>
                            <View style={styles.exampleBox}>
                                <Text style={styles.exampleLabel}>Beispiel:</Text>
                                <Text style={styles.exampleText}>"Nachricht an Müller: Angebot folgt morgen."</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* 3. Bottom Section: Controls */}
                <View style={styles.bottomSection}>
                    {status === 'idle' && (
                        <>
                            {isSpeaking && <Waveform />}
                            <TouchableOpacity
                                onPress={onStartListening}
                                style={styles.micButtonContainer}
                                activeOpacity={0.8}
                            >
                                <ExpoLinearGradient
                                    colors={['#3b82f6', '#2563eb']}
                                    style={styles.micGradient}
                                    start={{ x: 0.5, y: 0 }}
                                    end={{ x: 0.5, y: 1 }}
                                >
                                    <Mic color="#fff" size={64} />
                                </ExpoLinearGradient>
                                <View style={styles.micGlow} />
                            </TouchableOpacity>
                        </>
                    )}

                    {status === 'listening' && (
                        <View style={{ alignItems: 'center' }}>
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
                        </View>
                    )}

                    {status === 'processing' && (
                        <View style={{ alignItems: 'center' }}>
                            <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 20 }}>
                                <Loader2 color="#3b82f6" size={80} />
                            </Animated.View>
                            <Text style={styles.statusTextBlue}>Verarbeite...</Text>
                        </View>
                    )}

                    {status === 'sending' && (
                        <View style={{ alignItems: 'center' }}>
                            <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 20 }}>
                                <Send color="#3b82f6" size={48} />
                            </Animated.View>
                            <Text style={styles.statusTextBlue}>Sende E-Mail...</Text>
                        </View>
                    )}

                    {status === 'success' && (
                        <View style={{ alignItems: 'center' }}>
                            <View style={styles.successCircle}>
                                <CheckCircle color="#fff" size={72} />
                            </View>
                            <Text style={styles.successText}>Erledigt!</Text>
                        </View>
                    )}
                </View>

            </View>
        </ExpoLinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainLayout: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingTop: 60, // Space for header
        paddingBottom: 40,
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 20,
        height: 100,
        justifyContent: 'center',
    },
    middleSection: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    bottomSection: {
        height: 220, // Fixed height for controls to prevent jumping
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        maxHeight: '100%',
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    scrollArea: {
        flexGrow: 0,
    },
    placeholderContainer: {
        alignItems: 'center',
        width: '100%',
    },
    promptText: {
        color: '#f1f5f9',
        fontSize: 28,
        fontWeight: '400',
        marginBottom: 30,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    micButtonContainer: {
        borderRadius: 80,
        width: 160,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
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
        width: '100%',
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
        fontSize: 16,
        fontWeight: '500',
    },
    pulseCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
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
        fontSize: 24,
        fontWeight: '600',
        color: '#60a5fa',
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
    successCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: '#22c55e',
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
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
    userText: {
        color: '#94a3b8',
        fontSize: 16,
        marginBottom: 12,
        fontStyle: 'italic',
        lineHeight: 24,
    },
    aiText: {
        color: '#e2e8f0',
        fontSize: 18,
        fontWeight: '500',
        lineHeight: 28,
    },
});
