import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatScreenProps {
  userInfo: any;
  messages: any[];
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  transcription?: string;
}

export default function ChatScreen({ 
  userInfo, 
  messages, 
  isRecording, 
  isProcessing, 
  startRecording, 
  stopRecording,
  transcription 
}: ChatScreenProps) {
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DriveMail</Text>
        <View style={styles.userInfo}>
          <Text style={styles.userText}>Hi, {userInfo?.given_name}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView style={styles.chatContainer} contentContainerStyle={{ paddingBottom: 20 }}>
          {messages.map((msg, index) => (
            <View key={index} style={[
              styles.messageBubble, 
              msg.role === 'user' ? styles.userBubble : styles.assistantBubble
            ]}>
              <Text style={msg.role === 'user' ? styles.userTextMsg : styles.assistantTextMsg}>
                {msg.content}
              </Text>
            </View>
          ))}
        </ScrollView>

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

        {/* Debug: View Transcription */}
        {transcription ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Debug: Extracted Text</Text>
            <Text style={styles.resultText}>{transcription}</Text>
          </View>
        ) : null}
      </View>
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingTop: 50, // Adjust for status bar
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },
  userInfo: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  userText: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  chatContainer: {
    flex: 1,
    marginBottom: 20,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  userTextMsg: {
    color: '#fff',
    fontSize: 16,
  },
  assistantTextMsg: {
    color: '#000',
    fontSize: 16,
  },
  micContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    marginTop: 10,
    fontSize: 16,
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
