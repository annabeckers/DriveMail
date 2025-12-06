import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

export const DriveMailLogo = ({ width = 100, height = 100 }) => (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Image
            source={require('../assets/images/logo.png')}
            style={{
                width,
                height,
                transform: [{ rotate: '-90deg' }]
            }}
            resizeMode="contain"
        />
    </View>
);
