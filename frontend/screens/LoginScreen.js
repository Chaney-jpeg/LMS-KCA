import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      onLogin(email);
      setLoading(false);
    }, 500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>KCAU LMS</Text>
        <Text style={styles.subtitle}>Learning Management System</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>
        
        <Text style={styles.demoText}>Demo Accounts:</Text>
        <Text style={styles.demoInfo}>👤 admin@kcau.ac.ke (Admin)</Text>
        <Text style={styles.demoInfo}>🎓 lecturer@kcau.ac.ke (Lecturer)</Text>
        <Text style={styles.demoInfo}>📚 student@kcau.ac.ke (Student)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f6fa' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 32, elevation: 3 },
  title: { fontSize: 32, marginBottom: 8, textAlign: 'center', fontWeight: 'bold', color: '#1a237e' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#888', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 14, marginBottom: 16, borderRadius: 8, backgroundColor: '#f9f9f9', fontSize: 16 },
  button: { backgroundColor: '#1a237e', padding: 14, borderRadius: 8, marginBottom: 24, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  demoText: { fontSize: 12, fontWeight: 'bold', color: '#888', marginTop: 16 },
  demoInfo: { fontSize: 11, color: '#999', marginVertical: 4 },
});
