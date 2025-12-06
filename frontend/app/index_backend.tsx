import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

// Use localhost for Web, LAN IP for Native
const BACKEND_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000' 
  : 'http://192.168.179.49:8000'; 

export default function App() {
  // --- Audio State ---
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  // Web Recorder Ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DriveMail</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.micContainer}>
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonActive]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            <Ionicons 
              name={isRecording ? "stop" : "mic"} 
              size={50} 
              color="white" 
            />
          </TouchableOpacity>
          <Text style={styles.statusText}>
            {isRecording ? 'Recording...' : isProcessing ? 'Processing...' : 'Tap to Speak'}
          </Text>
        </View>

        {isProcessing && <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 20}} />}

        {transcription ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Transcription:</Text>
            <Text style={styles.resultText}>{transcription}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  micContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
    transform: [{ scale: 1.1 }],
  },
  statusText: {
    marginTop: 20,
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '500',
  },
  resultCard: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  resultText: {
    fontSize: 18,
    color: '#000',
    lineHeight: 24,
  },
});
