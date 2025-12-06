import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    // You need to replace these with your actual Client IDs from Google Cloud Console
    // androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: '479833791667-oc2m9vm85lmgfugqle5fgh107vedrhmu.apps.googleusercontent.com',
    webClientId: '479833791667-fua2rjtjbjv5qrdthe5sdlqaslr613hc.apps.googleusercontent.com', // Required for web and often for Expo Go proxy
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
  });

  const [health, setHealth] = useState<string>('Loading...');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [backendResponse, setBackendResponse] = useState<string>('');

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      // Send token to backend
      sendTokenToBackend(authentication?.accessToken);
      getUserInfo(authentication?.accessToken);
    }
  }, [response]);

  const fetchHealth = async () => {
    try {
      // Using LAN IP for device compatibility
      const res = await fetch('http://localhost:8000/health'); 
      const data = await res.json();
      setHealth(JSON.stringify(data));
    } catch (e) {
      setHealth('Error connecting to backend');
      console.error(e);
    }
  };

  const getUserInfo = async (token: string | undefined) => {
    if (!token) return;
    try {
      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await response.json();
      setUserInfo(user);
    } catch (error) {
      console.log(error);
    }
  };

  const sendTokenToBackend = async (token: string | undefined) => {
      if (!token) return;
      try {
          const res = await fetch('http://localhost:8000/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
          });
          const data = await res.json();
          setBackendResponse(JSON.stringify(data));
      } catch (e) {
          setBackendResponse('Error sending token to backend');
          console.error(e);
      }
  }


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>DriveMail</Text>
      
      <View style={styles.section}>
        <Text style={styles.subtitle}>Backend Health:</Text>
        <Text>{health}</Text>
        <Button title="Refresh Health" onPress={fetchHealth} />
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Authentication:</Text>
        {userInfo ? (
          <View>
            <Text>Welcome, {userInfo.name}</Text>
            <Text>Email: {userInfo.email}</Text>
          </View>
        ) : (
          <Button
            disabled={!request}
            title="Sign in with Google"
            onPress={() => promptAsync()}
          />
        )}
      </View>
      
      {backendResponse ? (
          <View style={styles.section}>
              <Text style={styles.subtitle}>Backend Auth Response:</Text>
              <Text>{backendResponse}</Text>
          </View>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  section: {
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
});
