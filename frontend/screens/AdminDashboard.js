import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function AdminDashboard({ onLogout, onSwitch }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.rolePill}>⚙️ ADMIN</Text>
        <Text style={styles.headerTitle}>Admin System</Text>
        <Text style={styles.headerEmail}>admin@kcau.ac.ke</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: '#1a237e' }]}> 
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>1,248</Text>
            <Text style={styles.statLabel}>Total Students</Text>
            <Text style={styles.statChange}>+12 this week</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#c9a84c' }]}> 
            <Text style={styles.statIcon}>🎓</Text>
            <Text style={styles.statValue}>47</Text>
            <Text style={styles.statLabel}>Lecturers</Text>
            <Text style={styles.statChange}>3 on leave</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderTopColor: '#4834d4' }]}> 
            <Text style={styles.statIcon}>📚</Text>
            <Text style={styles.statValue}>86</Text>
            <Text style={styles.statLabel}>Active Courses</Text>
            <Text style={styles.statChange}>6 new this sem</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#1b6b3a' }]}> 
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>73%</Text>
            <Text style={styles.statLabel}>Fee Collection</Text>
            <Text style={styles.statChange}>KES 12.4M recv</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>System Alerts</Text>
        <View style={styles.alertCard}><Text>🚨 3 students have overdue balances >90 days</Text></View>
        <View style={styles.alertCard}><Text>⚠️ CS 201 has only 18% assignment submission rate</Text></View>
        <View style={styles.alertCard}><Text>ℹ️ Semester 2 registration opens in 7 days</Text></View>

        <Text style={styles.sectionTitle}>Demo: Switch Role</Text>
        <TouchableOpacity style={[styles.navButton, styles.lecturerButton]} onPress={() => onSwitch('lecturer')}>
          <Text style={styles.navButtonText}>🎓 View as Lecturer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.studentButton]} onPress={() => onSwitch('student')}>
          <Text style={styles.navButtonText}>📚 View as Student</Text>
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
  rolePill: { backgroundColor: '#c62828', color: '#fff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold', marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  headerEmail: { color: '#fff', fontSize: 12, opacity: 0.7 },
  body: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 12, color: '#1a237e' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 4, borderTopWidth: 4, marginBottom: 8, alignItems: 'center', elevation: 2 },
  statIcon: { fontSize: 28, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1a237e' },
  statLabel: { fontSize: 12, color: '#888' },
  statChange: { fontSize: 10, color: '#388e3c', marginTop: 2 },
  alertCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginVertical: 4, borderLeftWidth: 4, borderLeftColor: '#c62828', elevation: 1 },
  navButton: { padding: 14, borderRadius: 8, marginVertical: 6, alignItems: 'center' },
  lecturerButton: { backgroundColor: '#1b6b3a' },
  studentButton: { backgroundColor: '#1a237e' },
  logoutButton: { backgroundColor: '#c62828' },
  navButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
