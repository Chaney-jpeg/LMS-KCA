import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function StudentDashboard({ onLogout, onSwitch }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.rolePill}>📚 STUDENT · 234567</Text>
        <Text style={styles.headerTitle}>John Kariuki</Text>
        <Text style={styles.headerEmail}>234567@students.kcau.ac.ke</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.alertCard}><Text>My Courses</Text></View>
        <View style={styles.alertCard}><Text>Assignments</Text></View>
        <View style={styles.alertCard}><Text>My Portal</Text></View>
        <View style={styles.alertCard}><Text>Ask KIRA</Text></View>
        <Text style={styles.sectionTitle}>My Performance</Text>
        <View style={styles.alertCard}><Text>BIT 301 - 74%</Text></View>
        <View style={styles.alertCard}><Text>CS 201 - 68%</Text></View>
        <View style={styles.alertCard}><Text>BUS 102 - 72%</Text></View>
        <View style={styles.alertCard}><Text>LAW 205 - 55%</Text></View>
        <View style={styles.alertCard}><Text>MATH 101 - 38%</Text></View>
        <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
        <View style={styles.alertCard}><Text>Research Paper — Chapter 3 (BIT 301) in 2 days</Text></View>
        <View style={styles.alertCard}><Text>Database Normalization Quiz (CS 201) overdue</Text></View>
        <View style={styles.alertCard}><Text>Business Law CAT 2 (LAW 205) in 7 days</Text></View>
        <Text style={styles.sectionTitle}>Announcements</Text>
        <View style={styles.alertCard}><Text>📢 Welcome to Semester 1 2024/25</Text></View>

        <Text style={styles.sectionTitle}>Demo: Switch Role</Text>
        <TouchableOpacity style={[styles.navButton, styles.adminButton]} onPress={() => onSwitch('admin')}>
          <Text style={styles.navButtonText}>⚙️ View as Admin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.lecturerButton]} onPress={() => onSwitch('lecturer')}>
          <Text style={styles.navButtonText}>🎓 View as Lecturer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.logoutButton]} onPress={onLogout}>
          <Text style={styles.navButtonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { padding: 24, backgroundColor: '#1a237e', alignItems: 'flex-start' },
  rolePill: { backgroundColor: '#c9a84c', color: '#fff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold', marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  headerEmail: { color: '#fff', fontSize: 12, opacity: 0.7 },
  body: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 12, color: '#1a237e' },
  alertCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginVertical: 4, borderLeftWidth: 4, borderLeftColor: '#c9a84c', elevation: 1 },
  navButton: { padding: 14, borderRadius: 8, marginVertical: 6, alignItems: 'center' },
  adminButton: { backgroundColor: '#1a237e' },
  lecturerButton: { backgroundColor: '#1b6b3a' },
  logoutButton: { backgroundColor: '#c62828' },
  navButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
