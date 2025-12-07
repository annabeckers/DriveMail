import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  StatusBar,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Settings, ArrowLeft } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Audio } from 'expo-av';

import { DriveMailLogo } from '../components/DriveMailLogo';
import { LoginView } from '../components/LoginView';
import { HomeView } from '../components/HomeView';
import { SettingsView } from '../components/SettingsView';
import { ReviewModal } from '../components/ReviewModal';

WebBrowser.maybeCompleteAuthSession();

// Use localhost for Web, LAN IP for Native
const BACKEND_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000' 
  : 'http://192.168.179.49:8000'; 

export default function App() {
  // --- STATES ---
  const [currentView, setCurrentView] = useState('login'); // login, home, settings
  const [status, setStatus] = useState('idle'); // idle, listening, processing, review, sending, success
  const [transcript, setTranscript] = useState('');
  const [generatedMail, setGeneratedMail] = useState(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- AUTH ---
  // const [request, response, promptAsync] = Google.useAuthRequest({
  //   webClientId: '479833791667-fua2rjtjbjv5qrdthe5sdlqaslr613hc.apps.googleusercontent.com',
  //   scopes: [
  //     'https://www.googleapis.com/auth/gmail.readonly', 
  //     'https://www.googleapis.com/auth/gmail.send',
  //     'https://www.googleapis.com/auth/gmail.compose'
  //   ],
  //   redirectUri: makeRedirectUri({
  //     scheme: 'frontend'
  //   }),
  // });

  // --- AUDIO STATE ---
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [llmResponse, setLlmResponse] = useState('');
  
  // Animations Vars
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Audio Ref for stopping playback
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- EFFECTS ---
  
  // Animation Effect
  useEffect(() => {
    if (status === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }

    if (status === 'processing' || isLoggingIn) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [status, isLoggingIn]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // --- LOGIC ---

  const triggerHaptic = (type: 'Light' | 'Medium' | 'Heavy' | 'Success' = 'Light') => {
    if (Platform.OS !== 'web') {
      if (type === 'Success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle[type]);
      }
    }
  };

  const handleLogin = async (token: string | undefined) => {
    if (!token) return;
    setIsLoggingIn(true);
    setLoginError(null);

    let googleUser = null;
    let dbId = null;

    // 1. Get Google User Info
    try {
      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      googleUser = await response.json();
    } catch (error) {
      console.log("Google User Info Error:", error);
      setLoginError("Failed to fetch Google profile.");
      setIsLoggingIn(false);
      return;
    }

    // 2. Authenticate with Backend & Get DB ID
    try {
      const res = await fetch(`${BACKEND_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      if (!res.ok) {
        throw new Error("Backend auth failed");
      }

      const data = await res.json();
      if (data.user_id) {
        dbId = data.user_id;
      }
    } catch (e) {
      console.error('Backend auth error:', e);
      setLoginError("Failed to connect to backend.");
      setIsLoggingIn(false);
      return;
    }

    // 3. Update State
    if (googleUser && dbId) {
      setUserInfo({ ...googleUser, db_id: dbId });
      setCurrentView('home');
      triggerHaptic('Success');
    } else {
      setLoginError("Login incomplete. Please try again.");
    }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    setUserInfo(null);
    setCurrentView('login');
  };

  // --- RECORDING LOGIC ---

  const toggleRecording = async () => {
    if (isRecording) {
      await stopNativeRecording();
    } else {
      await startNativeRecording();
    }
  };

  async function startNativeRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
        setStatus('listening');
        triggerHaptic('Medium');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopNativeRecording() {
    setIsRecording(false);
    setRecording(undefined);
    setStatus('processing');
    triggerHaptic('Light');

    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    if (uri) {
      uploadNativeAudio(uri);
    }
  }

  async function uploadNativeAudio(uri: string) {
    setTranscript('');
    
    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const ext = blob.type.includes('webm') ? 'webm' : 'm4a';
        formData.append('file', blob, `recording.${ext}`);
      } else {
        // @ts-ignore
        formData.append('file', {
          uri,
          name: 'recording.m4a',
          type: 'audio/m4a'
        });
      }

      const res = await fetch(`${BACKEND_URL}/speech/transcribe`, {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type header for FormData; fetch does it automatically with boundary
      });

      const data = await res.json();
      if (data.text) {
        const cleanText = data.text.trim();
        setTranscript(cleanText);
        // Process Intent
        await processIntent(cleanText);
      } else {
        setTranscript('Could not transcribe audio.');
        setStatus('idle');
      }
    } catch (e) {
      console.error(e);
      setTranscript('Error uploading audio.');
      setStatus('idle');
    }
  }

  async function processIntent(text: string) {
    console.log("Processing intent for:", text);
    
    if (!userInfo?.db_id) {
      console.error("User ID not found.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/ai/process_intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, user_id: userInfo.db_id }),
      });
      
      const data = await res.json();
      console.log("Backend response:", data);
      
      if (data.response) {
        const cleanResponse = data.response.trim();
        setLlmResponse(cleanResponse);
        
        // Use requestAnimationFrame to ensure render cycle is complete
        requestAnimationFrame(() => {
            // Then wait a bit more for the typing to visually start
            setTimeout(() => speakText(cleanResponse), 500);
        });
      }
      setStatus('idle');
    } catch (e) {
      console.error("Intent processing error:", e);
      setStatus('idle');
    }
  }

  async function speakText(text: string) {
    try {
      if (Platform.OS !== 'web') {
        console.log("TTS is currently optimized for Web. Native requires FileSystem.");
        return;
      }

      // Stop any previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const res = await fetch(`${BACKEND_URL}/speech/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new window.Audio(url);
      audioRef.current = audio;
      
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      
      audio.play();
      
    } catch (e) {
      console.error("TTS Error:", e);
      setIsSpeaking(false);
    }
  }

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  // --- RENDER ---

  if (currentView === 'login') {
    return (
      <LoginView
        isLoggingIn={isLoggingIn}
        spin={spin}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          {currentView === 'settings' ? (
            <TouchableOpacity onPress={() => setCurrentView('home')} style={styles.iconButton}>
              <ArrowLeft color="#cbd5e1" size={26} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerTitleRow}>
              <View style={styles.headerLogoBox}>
                <DriveMailLogo width={28} height={28} />
              </View>
              <Text style={styles.headerTitle}>DriveMail</Text>
            </View>
          )}

          {currentView === 'home' && (
            <TouchableOpacity onPress={() => setCurrentView('settings')} style={styles.iconButton}>
              <Settings color="#cbd5e1" size={26} />
            </TouchableOpacity>
          )}

          {currentView === 'settings' && <Text style={styles.headerCenterTitle}>Einstellungen</Text>}
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={styles.mainContent}>

        {/* VIEW: HOME */}
        {currentView === 'home' && (
          <HomeView
            status={status}
            transcript={transcript}
            llmResponse={llmResponse}
            isSpeaking={isSpeaking}
            pulseAnim={pulseAnim}
            spin={spin}
            onStartListening={toggleRecording}
            onStopSpeaking={stopSpeaking}
          />
        )}

        {/* VIEW: SETTINGS */}
        {currentView === 'settings' && (
          <SettingsView onLogout={handleLogout} />
        )}
      </View>

      {/* REVIEW MODAL */}
      <ReviewModal
        visible={status === 'review' && generatedMail !== null}
        generatedMail={generatedMail}
        onCancel={() => setStatus('idle')}
        onEdit={() => {}}
        onSend={() => {}}
      />

    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },

  // Header
  headerSafe: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    height: 60,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#172554',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e3a8a'
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerCenterTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    zIndex: -1,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
  },

  // Main
  mainContent: {
    flex: 1,
  },
});
