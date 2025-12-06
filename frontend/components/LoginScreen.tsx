import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';

interface LoginScreenProps {
  promptAsync: () => void;
  request: any;
  error?: string | null;
}

export default function LoginScreen({ promptAsync, request, error }: LoginScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>DriveMail</Text>
        <Text style={styles.subtitle}>Voice-First Email Assistant</Text>
        
        <TouchableOpacity 
          style={[styles.loginBtn, !request && styles.loginBtnDisabled]} 
          onPress={() => promptAsync()}
          disabled={!request}
        >
          <Text style={styles.loginText}>Sign in with Google</Text>
        </TouchableOpacity>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '80%',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#000',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 50,
  },
  loginBtn: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginBtnDisabled: {
    backgroundColor: '#A0C0F8',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  errorText: {
    marginTop: 20,
    color: 'red',
    textAlign: 'center',
  }
});
