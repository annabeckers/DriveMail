import React, { ReactNode, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Animated, Easing } from 'react-native';

interface BackgroundLayoutProps {
    children: ReactNode;
    animated?: boolean;
}

export const BackgroundLayout: React.FC<BackgroundLayoutProps> = ({ children, animated = true }) => {
    // Animation Values
    const scale1 = useRef(new Animated.Value(1)).current;
    const translate1 = useRef(new Animated.Value(0)).current;
    const translate2 = useRef(new Animated.Value(0)).current;
    const scale3 = useRef(new Animated.Value(1)).current;
    const rotate3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!animated) {
            // Reset to default if not animated
            scale1.setValue(1);
            translate1.setValue(0);
            translate2.setValue(0);
            scale3.setValue(1);
            rotate3.setValue(0);
            return;
        }

        // Helper for smooth infinite loop
        const floatAnim = (val: Animated.Value, to: number, duration: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(val, {
                        toValue: to,
                        duration: duration,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.sin), // Sine is very smooth
                    }),
                    Animated.timing(val, {
                        toValue: 0, // Assume start is 0 or 1 based on context, here deltas
                        duration: duration,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.sin),
                    }),
                ])
            );
        };

        const scaleAnim = (val: Animated.Value, to: number, duration: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(val, {
                        toValue: to,
                        duration: duration,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.sin),
                    }),
                    Animated.timing(val, {
                        toValue: 1,
                        duration: duration,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.sin),
                    }),
                ])
            );
        };

        // Blob 1: Large slow drift + breathing
        const anim1 = Animated.parallel([
            scaleAnim(scale1, 1.3, 12000), // 12s scale
            floatAnim(translate1, 40, 15000), // 15s float X/Y diagonal influence
        ]);

        // Blob 2: Vertical float (slower)
        const anim2 = floatAnim(translate2, -60, 18000); // 18s float

        // Blob 3: Rotation + Scale
        const anim3 = Animated.parallel([
            scaleAnim(scale3, 1.2, 14000),
            Animated.loop(
                Animated.timing(rotate3, {
                    toValue: 1,
                    duration: 25000, // Very slow rotation
                    useNativeDriver: true,
                    easing: Easing.linear,
                })
            )
        ]);

        anim1.start();
        anim2.start();
        anim3.start();

        return () => {
            // Stop logic if needed, but in standard React unmount cleans up mostly
            // Explicit stop prevents memory leaks on rapid shifts potentially
            scale1.stopAnimation();
            translate1.stopAnimation();
            translate2.stopAnimation();
            scale3.stopAnimation();
            rotate3.stopAnimation();
        };
    }, [animated]);

    const spin = rotate3.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <View style={styles.container}>
            {/* Background Blobs for specific premium vibe */}
            <Animated.View
                style={[
                    styles.blob,
                    { top: -100, left: -100, backgroundColor: '#2563eb', opacity: 0.15 },
                    { transform: [{ scale: scale1 }, { translateX: translate1 }] }
                ]}
            />
            <Animated.View
                style={[
                    styles.blob,
                    { top: '30%', right: -120, backgroundColor: '#1e3a8a', opacity: 0.1 },
                    { transform: [{ translateY: translate2 }] }
                ]}
            />
            <Animated.View
                style={[
                    styles.blob,
                    { bottom: -100, left: -50, backgroundColor: '#1d4ed8', opacity: 0.15 },
                    { transform: [{ scale: scale3 }, { rotate: spin }] }
                ]}
            />

            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617', // Dark slate base
        position: 'relative',
        overflow: 'hidden', // Clip blobs
    },
    blob: {
        position: 'absolute',
        width: 350,
        height: 350,
        borderRadius: 175,
        opacity: 0.2, // Increased opacity for native since blur isn't there
        ...Platform.select({
            web: {
                filter: 'blur(100px)',
            },
            default: {
                // Native specific fallback if needed, or just let it be a sharp circle with low opacity
            }
        }),
    },
    content: {
        flex: 1,
        zIndex: 1, // Ensure content is above background
    },
});
