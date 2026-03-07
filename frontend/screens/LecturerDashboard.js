import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function LecturerDashboard({ onLogout, onSwitch }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.rolePill}>🎓 LECTURER</Text>
        <Text style={styles.headerTitle}>Dr. James Mwangi</Text>
        <Text style={styles.headerEmail}>james.mwangi@kcau.ac.ke</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>Pending Grading</Text>
        <View style={styles.alertCard}><Text>📝 Research Paper Ch.3 (BIT 301) - 12 new</Text></View>
        <View style={styles.alertCard}><Text>💾 SQL Project Final (CS 201) - 5 new</Text></View>
        <Text style={styles.sectionTitle}>Students Needing Support</Text>
        <View style={styles.alertCard}><Text>Mary Wanjiku (32%) - Below 40% — missed 3 assignments</Text></View>
        <View style={styles.alertCard}><Text>Peter Ochieng (38%) - Low CAT score, attendance 60%</Text></View>
        <View style={styles.alertCard}><Text>Grace Mutiso (41%) - Struggling with SQL joins</Text></View>
        <Text style={styles.sectionTitle}>My Schedule</Text>
        <View style={styles.alertCard}><Text>08:00-10:00 BIT 301 Lecture 📍 LH-12</Text></View>
        <View style={styles.alertCard}><Text>14:00-16:00 CS 201 Lab Session 📍 Lab B</Text></View>
        <Text style={styles.sectionTitle}>My Courses</Text>
        <View style={styles.alertCard}><Text>BIT 301 - Business Information Technology (76 enrolled, 72%)</Text></View>
        <View style={styles.alertCard}><Text>CS 201 - Database Systems & Design (89 enrolled, 85%)</Text></View>
        <View style={styles.alertCard}><Text>CS 401 - Advanced Software Engineering (34 enrolled, 90%)</Text></View>

        <Text style={styles.sectionTitle}>Demo: Switch Role</Text>
        <TouchableOpacity style={[styles.navButton, styles.adminButton]} onPress={() => onSwitch('admin')}>
          <Text style={styles.navButtonText}>⚙️ View as Admin</Text>
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
  header: { padding: 24, backgroundColor: '#1b6b3a', alignItems: 'flex-start' },
  rolePill: { backgroundColor: '#388e3c', color: '#fff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold', marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  headerEmail: { color: '#fff', fontSize: 12, opacity: 0.7 },
  body: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 12, color: '#1b6b3a' },
  alertCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginVertical: 4, borderLeftWidth: 4, borderLeftColor: '#388e3c', elevation: 1 },
  navButton: { padding: 14, borderRadius: 8, marginVertical: 6, alignItems: 'center' },
  adminButton: { backgroundColor: '#1a237e' },
  studentButton: { backgroundColor: '#c9a84c' },
  logoutButton: { backgroundColor: '#c62828' },
  navButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
