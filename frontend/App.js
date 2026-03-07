import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';

// Simple inline LoginScreen
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    onLogin(email);
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
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        
        <Text style={styles.demoText}>Demo Accounts:</Text>
        <Text style={styles.demoInfo}>👤 admin@kcau.ac.ke</Text>
        <Text style={styles.demoInfo}>🎓 lecturer@kcau.ac.ke</Text>
        <Text style={styles.demoInfo}>📚 student@kcau.ac.ke</Text>
      </View>
    </View>
  );
}

// Simple inline AdminDashboard
function AdminDashboard({ onLogout, onSwitch }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.rolePill}>⚙️ ADMIN</Text>
        <Text style={styles.headerTitle}>Admin System</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: '#1a237e' }]}> 
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>1,248</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#c9a84c' }]}> 
            <Text style={styles.statIcon}>🎓</Text>
            <Text style={styles.statValue}>47</Text>
            <Text style={styles.statLabel}>Lecturers</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>System Alerts</Text>
        <View style={styles.alertCard}><Text>🚨 3 students have overdue balances</Text></View>
        <View style={styles.alertCard}><Text>⚠️ CS 201 has low submission rate</Text></View>

        <Text style={styles.sectionTitle}>Switch Role</Text>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: '#1b6b3a' }]} onPress={() => onSwitch('lecturer')}>
          <Text style={styles.navButtonText}>🎓 View as Lecturer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: '#1a237e' }]} onPress={() => onSwitch('student')}>
          <Text style={styles.navButtonText}>📚 View as Student</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: '#c62828' }]} onPress={onLogout}>
          <Text style={styles.navButtonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Simple inline LecturerDashboard
function LecturerDashboard({ onLogout, onSwitch }) {
  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: '#1b6b3a' }]}>
        <Text style={styles.rolePill}>🎓 LECTURER</Text>
        <Text style={styles.headerTitle}>Dr. James Mwangi</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>Pending Grading</Text>
        <View style={styles.alertCard}><Text>📝 Research Paper Ch.3 (BIT 301) - 12 new</Text></View>
        <View style={styles.alertCard}><Text>💾 SQL Project Final (CS 201) - 5 new</Text></View>

        <Text style={styles.sectionTitle}>My Courses</Text>
        <View style={styles.alertCard}><Text>BIT 301 - Business Information Technology (76 enrolled)</Text></View>
        <View style={styles.alertCard}><Text>CS 201 - Database Systems & Design (89 enrolled)</Text></View>

        <Text style={styles.sectionTitle}>Switch Role</Text>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: '#1a237e' }]} onPress={() => onSwitch('admin')}>
          <Text style={styles.navButtonText}>⚙️ View as Admin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: '#1a237e' }]} onPress={() => onSwitch('student')}>
          <Text style={styles.navButtonText}>📚 View as Student</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: '#c62828' }]} onPress={onLogout}>
          <Text style={styles.navButtonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Simple inline StudentDashboard
function StudentDashboard({ onLogout, onSwitch }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.rolePill}>📚 STUDENT · 234567</Text>
        <Text style={styles.headerTitle}>John Kariuki</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>My Performance</Text>
        <View style={styles.alertCard}><Text>BIT 301 - 74%</Text></View>
        <View style={styles.alertCard}><Text>CS 201 - 68%</Text></View>
        <View style={styles.alertCard}><Text>BUS 102 - 72%</Text></View>

        <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
        <View style={styles.alertCard}><Text>Research Paper (BIT 301) in 2 days</Text></View>
        <View style={styles.alertCard}><Text>Database Quiz (CS 201) overdue</Text></View>

        <Text style={styles.sectionTitle}>Switch Role</Text>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: '#1a237e' }]} onPress={() => onSwitch('admin')}>
          <Text style={styles.navButtonText}>⚙️ View as Admin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: '#1b6b3a' }]} onPress={() => onSwitch('lecturer')}>
          <Text style={styles.navButtonText}>🎓 View as Lecturer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: '#c62828' }]} onPress={onLogout}>
          <Text style={styles.navButtonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Main App Component
export default function App() {
  const [screen, setScreen] = useState('login');

  const handleLogin = (email) => {
    const role = email.toLowerCase().startsWith('admin') ? 'admin' : 
                 email.toLowerCase().startsWith('lecturer') ? 'lecturer' : 'student';
    if (role === 'admin') setScreen('admin');
    else if (role === 'lecturer') setScreen('lecturer');
    else setScreen('student');
  };

  const handleLogout = () => {
    setScreen('login');
  };

  return (
    <>
      {screen === 'login' && <LoginScreen onLogin={handleLogin} />}
      {screen === 'admin' && <AdminDashboard onLogout={handleLogout} onSwitch={setScreen} />}
      {screen === 'lecturer' && <LecturerDashboard onLogout={handleLogout} onSwitch={setScreen} />}
      {screen === 'student' && <StudentDashboard onLogout={handleLogout} onSwitch={setScreen} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 32, marginTop: 100 },
  title: { fontSize: 32, marginBottom: 8, textAlign: 'center', fontWeight: 'bold', color: '#1a237e' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#888', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 14, marginBottom: 16, borderRadius: 8, backgroundColor: '#f9f9f9', fontSize: 16 },
  button: { backgroundColor: '#1a237e', padding: 14, borderRadius: 8, marginBottom: 24, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  demoText: { fontSize: 12, fontWeight: 'bold', color: '#888', marginTop: 16 },
  demoInfo: { fontSize: 11, color: '#999', marginVertical: 4 },
  header: { padding: 24, backgroundColor: '#1a237e', alignItems: 'flex-start' },
  rolePill: { backgroundColor: '#c62828', color: '#fff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold', marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  body: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 12, color: '#1a237e' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 4, borderTopWidth: 4, marginBottom: 8, alignItems: 'center', elevation: 2 },
  statIcon: { fontSize: 28, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1a237e' },
  statLabel: { fontSize: 12, color: '#888' },
  alertCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginVertical: 4, borderLeftWidth: 4, borderLeftColor: '#c62828', elevation: 1 },
  navButton: { padding: 14, borderRadius: 8, marginVertical: 6, alignItems: 'center' },
  navButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});

