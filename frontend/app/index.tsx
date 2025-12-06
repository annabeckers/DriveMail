import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, SafeAreaView, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Audio } from 'expo-av';
import LoginScreen from '../components/LoginScreen';
import ChatScreen from '../components/ChatScreen';

WebBrowser.maybeCompleteAuthSession();

// Use localhost for Web, LAN IP for Native
const BACKEND_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000' 
  : 'http://192.168.179.49:8000'; 

export default function App() {
  // --- Auth State ---
  const [request, response, promptAsync] = Google.useAuthRequest({
    // iosClientId: 'YOUR_IOS_CLIENT_ID',
    // androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    webClientId: '479833791667-fua2rjtjbjv5qrdthe5sdlqaslr613hc.apps.googleusercontent.com',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly', 
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose'
    ],
    redirectUri: makeRedirectUri({
      scheme: 'frontend'
    }),
  });

  const [userInfo, setUserInfo] = useState<any>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // --- Audio State ---
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  // Web Recorder Ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Chat State ---
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleLogin(authentication?.accessToken);
    } else if (response?.type === 'error') {
      setLoginError("Google Sign-In failed.");
    }
  }, [response]);

  const handleLogin = async (token: string | undefined) => {
    if (!token) return;
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
      return;
    }

    // 3. Update State safely
    if (googleUser && dbId) {
      setUserInfo({ ...googleUser, db_id: dbId });
    } else {
      setLoginError("Login incomplete. Please try again.");
    }
  };

  // --- Audio Logic ---
  async function startRecording() {
    try {
      if (Platform.OS === 'web') {
        startWebRecording();
      } else {
        startNativeRecording();
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (Platform.OS === 'web') {
      stopWebRecording();
    } else {
      stopNativeRecording();
    }
  }

  // --- Web Recording Implementation ---
  async function startWebRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        uploadWebAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Web recording error:", err);
    }
  }

  function stopWebRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function uploadWebAudio(blob: Blob) {
    setIsProcessing(true);
    setTranscription('');
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const res = await fetch(`${BACKEND_URL}/speech/transcribe`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.text) {
        setTranscription(data.text);
        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', content: data.text }]);
        // Process Intent
        await processIntent(data.text);
      } else {
        setTranscription('Could not transcribe audio.');
      }
    } catch (e) {
      console.error(e);
      setTranscription('Error uploading audio.');
    } finally {
      setIsProcessing(false);
    }
  }

  // --- Native Recording Implementation ---
  async function startNativeRecording() {
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
    }
  }

  async function stopNativeRecording() {
    setIsRecording(false);
    setRecording(undefined);
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    if (uri) {
      uploadNativeAudio(uri);
    }
  }

  async function uploadNativeAudio(uri: string) {
    setIsProcessing(true);
    setTranscription('');
    
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', {
        uri,
        name: 'recording.m4a',
        type: 'audio/m4a'
      });

      const res = await fetch(`${BACKEND_URL}/speech/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await res.json();
      if (data.text) {
        setTranscription(data.text);
        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', content: data.text }]);
        // Process Intent
        await processIntent(data.text);
      } else {
        setTranscription('Could not transcribe audio.');
      }
    } catch (e) {
      console.error(e);
      setTranscription('Error uploading audio.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function processIntent(text: string) {
    console.log("Processing intent for:", text);
    
    if (!userInfo?.db_id) {
      console.error("User ID not found. Please log in.");
      setMessages(prev => [...prev, { role: 'assistant', content: "Bitte melden Sie sich an, um fortzufahren." }]);
      return;
    }

    try {
      console.log("Sending to backend with user_id:", userInfo.db_id);
      const res = await fetch(`${BACKEND_URL}/ai/process_intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, user_id: userInfo.db_id }),
      });
      
      const data = await res.json();
      console.log("Backend response:", data);
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (e) {
      console.error("Intent processing error:", e);
      setMessages(prev => [...prev, { role: 'assistant', content: "Fehler bei der Verarbeitung." }]);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {!userInfo ? (
        <LoginScreen 
          promptAsync={() => promptAsync()} 
          request={request}
          error={loginError}
        />
      ) : (
        <ChatScreen 
          userInfo={userInfo}
          messages={messages}
          isRecording={isRecording}
          isProcessing={isProcessing}
          startRecording={startRecording}
          stopRecording={stopRecording}
          transcription={transcription}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
});
