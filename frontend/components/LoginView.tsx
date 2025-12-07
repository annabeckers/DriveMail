import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Loader2 } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri, ResponseType } from 'expo-auth-session';

import { DriveMailLogo } from './DriveMailLogo';
import { GoogleIcon } from './GoogleIcon';
import { BackgroundLayout } from './BackgroundLayout';

// Enable WebBrowser for AuthSession
WebBrowser.maybeCompleteAuthSession();

interface LoginViewProps {
    isLoggingIn: boolean;
    spin: Animated.AnimatedInterpolation<string | number>;
    onLogin: (authData: { code: string, redirectUri: string, codeVerifier?: string }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ isLoggingIn, spin, onLogin }) => {

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: '479833791667-fua2rjtjbjv5qrdthe5sdlqaslr613hc.apps.googleusercontent.com',
        scopes: ['https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose'
        ],
        redirectUri: makeRedirectUri({
            scheme: 'frontend'
        }),
        responseType: ResponseType.Code,
        shouldAutoExchangeCode: false,
    });

    useEffect(() => {
        if (request) {
            console.log("Redirect URI:", request.redirectUri);
        }
    }, [request]);

    useEffect(() => {
        // Cleanup any stuck sessions on mount
        WebBrowser.dismissAuthSession();
    }, []);

    useEffect(() => {
        if (response) {
            console.log("Auth Response Type:", response.type);
            console.log("Auth Response Full:", JSON.stringify(response, null, 2));
            if (response.type === 'error') {
                console.log("Auth Error Code:", response.error?.code);
                console.log("Auth Error Desc:", response.error?.description);
            }
        }
        if (response?.type === 'success') {
            if (response.params?.code) {
                onLogin({
                    code: response.params.code,
                    redirectUri: request?.redirectUri || '',
                    codeVerifier: request?.codeVerifier
                });
            }
        }
    }, [response]);

    return (
        <BackgroundLayout animated={true}>
            <View style={styles.container}>
                <View style={styles.safeArea}>

                    {/* Logo Area */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoContainer}>
                            <DriveMailLogo width={160} height={160} />
                        </View>
                        <Text style={styles.title}>DriveMail</Text>
                        <Text style={styles.subtitle}>Voice-First Email for Professionals</Text>
                    </View>

                    {/* Action Area */}
                    <View style={styles.actionSection}>
                        <TouchableOpacity
                            style={styles.loginButton}
                            activeOpacity={0.8}
                            // @ts-ignore: useProxy is deprecated but required for this flow
                            onPress={() => promptAsync()}
                            disabled={!request || isLoggingIn}
                        >
                            <ExpoLinearGradient
                                colors={['#ffffff', '#f1f5f9']}
                                style={styles.buttonGradient}
                            >
                                {isLoggingIn ? (
                                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                        <Loader2 color="#0f172a" size={24} />
                                    </Animated.View>
                                ) : (
                                    <>
                                        <GoogleIcon size={24} />
                                        <Text style={styles.loginText}>Anmelden mit Google</Text>
                                    </>
                                )}
                            </ExpoLinearGradient>
                        </TouchableOpacity>

                        {/* Security Badge */}
                        <View style={styles.securityBadge}>
                            <ShieldCheck color="#60a5fa" size={16} />
                            <Text style={styles.securityText}>Secure & Encrypted • OAuth 2.0</Text>
                        </View>
                    </View>
                </View>
            </View>
        </BackgroundLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Background handled by wrapper
    },
    safeArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 80,
    },
    logoContainer: {
        marginBottom: 30,
        // Glow effect for logo container
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2, // Reduced glow
        shadowRadius: 20,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 1,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        fontWeight: '500',
    },
    actionSection: {
        width: '100%',
        alignItems: 'center',
        gap: 20,
    },
    loginButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonGradient: {
        flex: 1,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loginText: {
        color: '#0f172a',
        fontSize: 18,
        fontWeight: '600',
    },
    securityBadge: {
        marginTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        width: '100%',
        justifyContent: 'center',
    },
    securityText: {
        color: '#64748b',
        fontSize: 12,
    },
});
