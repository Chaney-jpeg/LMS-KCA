import React, { useState, useEffect } from 'react';
import axios from 'axios';
import KIRA from '../components/KIRA';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

export default function AdminDashboard({ user, onLogout }) {
  const [currentTab, setCurrentTab] = useState('dash');
  const [stats, setStats] = useState({ total_students: 0, total_lecturers: 0, total_courses: 0, fees_paid_percent: 0, total_fees_due: 0, total_fees_paid: 0 });
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [performanceProfiles, setPerformanceProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedUserReport, setSelectedUserReport] = useState(null);
  const [academicReport, setAcademicReport] = useState([]);
  const [notices, setNotices] = useState([]);
  const [noticeForm, setNoticeForm] = useState({ role: 'STUDENT', title: '', body: '' });
  const [zoomSessions, setZoomSessions] = useState([]);
  const [zoomForm, setZoomForm] = useState({ title: '', course_id: '', host_id: '', meeting_url: '', meeting_code: '', scheduled_for: '' });
  const [showHeaderDetails, setShowHeaderDetails] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ code: '', name: '', lecturer_id: '', department_id: '', unit_fee: 10000 });
  const [studentForm, setStudentForm] = useState({ name: '', email: '', role: 'STUDENT', reg_number: '', phone: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchLecturers();
    fetchDepartments();
    if (currentTab === 'courses') fetchCourses();
    if (currentTab === 'students') fetchStudents();
    if (currentTab === 'fees') fetchPayments();
    if (currentTab === 'performance') fetchPerformanceProfiles();
    if (currentTab === 'profiles') fetchProfilesReport();
    if (currentTab === 'notices') fetchNotices();
    if (currentTab === 'zoom') { fetchZoomSessions(); fetchCourses(); }
  }, [currentTab]);

  const fetchDashboardStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard/admin/`);
      setStats(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get(`${API_URL}/courses/`);
      setCourses(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchLecturers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/`);
      setLecturers(res.data.filter((u) => u.role === 'LECTURER'));
      setAllUsers(res.data.filter((u) => u.role === 'STUDENT' || u.role === 'LECTURER'));
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_URL}/departments/`);
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/`);
      setStudents(res.data.filter(u => u.role === 'STUDENT'));
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API_URL}/fees/payments/`);
      setPayments(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchPerformanceProfiles = async () => {
    try {
      const res = await axios.get(`${API_URL}/students/performance/?admin_email=${user?.email}`);
      setPerformanceProfiles(res.data || []);
      if (!selectedProfile && res.data?.length > 0) {
        setSelectedProfile(res.data[0]);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchProfilesReport = async () => {
    try {
      const reportRes = await axios.get(`${API_URL}/admin/academic-report/?admin_email=${user?.email}`);
      setAcademicReport(reportRes.data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchNotices = async () => {
    try {
      const res = await axios.get(`${API_URL}/notices/manage/`);
      setNotices(res.data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchZoomSessions = async () => {
    try {
      const res = await axios.get(`${API_URL}/zoom/directory/?role=ADMIN`);
      setZoomSessions(res.data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchSingleProfileReport = async (userId) => {
    try {
      const res = await axios.get(`${API_URL}/profiles/report/?user_id=${userId}`);
      setSelectedUserReport(res.data);
    } catch (err) {
      alert('Failed to load profile report');
    }
  };

  const exportAcademicReport = () => {
    let csv = 'Student,Department,Enrolled Courses,GPA,Attendance Rate,Predicted Grade,Advice\n';
    academicReport.forEach((row) => {
      csv += `"${row.student_name}","${row.department}",${row.enrolled_courses},${row.gpa},${row.attendance_rate},${row.predicted_grade},"${row.advice}"\n`;
    });
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `academic-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const saveCourse = async () => {
    if (!courseForm.code || !courseForm.name) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${API_URL}/courses/`, courseForm);
      setCourseForm({ code: '', name: '', lecturer_id: '', department_id: '', unit_fee: 10000 });
      setShowCourseForm(false);
      fetchCourses();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || 'Failed to save course'));
    } finally {
      setLoading(false);
    }
  };

  const transferCourse = async (courseId, lecturerId) => {
    try {
      await axios.put(`${API_URL}/courses/${courseId}/`, { lecturer_id: lecturerId });
      fetchCourses();
      alert('Course transferred successfully');
    } catch (err) {
      alert('Failed to transfer course');
    }
  };

  const deleteCourse = async (id) => {
    if (window.confirm('Delete this course?')) {
      try {
        await axios.delete(`${API_URL}/courses/${id}/`);
        fetchCourses();
      } catch (err) {
        alert('Error deleting course');
      }
    }
  };

  const saveStudent = async () => {
    if (!studentForm.name || !studentForm.email) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${API_URL}/users/`, studentForm);
      setStudentForm({ name: '', email: '', role: 'STUDENT', reg_number: '', phone: '' });
      setShowStudentForm(false);
      fetchStudents();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || 'Failed to save student'));
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (id) => {
    if (window.confirm('Delete this student?')) {
      try {
        await axios.delete(`${API_URL}/users/${id}/`);
        fetchStudents();
      } catch (err) {
        alert('Error deleting student');
      }
    }
  };

  const toggleUserStatus = async (studentId, action) => {
    try {
      await axios.post(`${API_URL}/fees/enforce-status/`, { student_id: studentId, action });
      fetchStudents();
      fetchPayments();
      alert(`User ${action}d successfully`);
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} user`);
    }
  };

  const postNotice = async () => {
    if (!noticeForm.title || !noticeForm.body) {
      alert('Title and body required');
      return;
    }
    try {
      await axios.post(`${API_URL}/notices/manage/`, noticeForm);
      setNoticeForm({ role: 'STUDENT', title: '', body: '' });
      fetchNotices();
    } catch (err) {
      alert('Failed to post notice');
    }
  };

  const deleteNotice = async (noticeId) => {
    try {
      await axios.delete(`${API_URL}/notices/manage/`, { data: { notice_id: noticeId } });
      fetchNotices();
    } catch (err) {
      alert('Failed to delete notice');
    }
  };

  const createZoomSession = async () => {
    if (!zoomForm.title || !zoomForm.course_id || !zoomForm.meeting_url || !zoomForm.scheduled_for) {
      alert('Please fill required zoom fields');
      return;
    }
    try {
      await axios.post(`${API_URL}/zoom/directory/`, zoomForm);
      setZoomForm({ title: '', course_id: '', host_id: '', meeting_url: '', meeting_code: '', scheduled_for: '' });
      fetchZoomSessions();
    } catch (err) {
      alert('Failed to create zoom session');
    }
  };

  const deleteZoomSession = async (zoomId) => {
    try {
      await axios.delete(`${API_URL}/zoom/directory/`, { data: { zoom_id: zoomId } });
      fetchZoomSessions();
    } catch (err) {
      alert('Failed to delete zoom session');
    }
  };

  const exportReport = (type) => {
    let csv = '', filename = '';
    if (type === 'fees') {
      csv = 'Student Name,Email,Amount Due,Amount Paid,Balance,Status\n';
      payments.forEach(p => {
        csv += `"${p.student_name}",${p.student},${p.amount_due},${p.amount_paid},${p.amount_balance},${p.status}\n`;
      });
      filename = `fee-report-${new Date().toISOString().split('T')[0]}.csv`;
    }
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', filename);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderContent = () => {
    if (currentTab === 'dash') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">System Overview</div></div></div>
          <div className="stat-grid">
            <div className="stat-c cd" style={{ borderTopColor: '#0D1B3E' }}>
              <div style={{ fontSize: '24px' }}>👥</div>
              <div className="stat-v">{stats.total_students}</div>
              <div className="stat-l">Students</div>
            </div>
            <div className="stat-c cd" style={{ borderTopColor: '#C9A84C' }}>
              <div style={{ fontSize: '24px' }}>🎓</div>
              <div className="stat-v">{stats.total_lecturers}</div>
              <div className="stat-l">Lecturers</div>
            </div>
            <div className="stat-c cd" style={{ borderTopColor: '#0D47A1' }}>
              <div style={{ fontSize: '24px' }}>📚</div>
              <div className="stat-v">{stats.total_courses}</div>
              <div className="stat-l">Courses</div>
            </div>
            <div className="stat-c cd" style={{ borderTopColor: '#1B6B3A' }}>
              <div style={{ fontSize: '24px' }}>💰</div>
              <div className="stat-v">{stats.fees_paid_percent}%</div>
              <div className="stat-l">Fees Paid</div>
            </div>
          </div>

          <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#1B5E20' }}></div><div className="st">Fee Collection</div></div></div>
          <div style={{ padding: '15px', margin: '0 10px 10px', background: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
              <span>Progress</span>
              <span>{stats.fees_paid_percent}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#ddd', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ width: `${stats.fees_paid_percent}%`, height: '100%', background: '#1B6B3A' }}></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
              <div><div style={{ color: '#666', marginBottom: '4px' }}>Total Due</div><div style={{ fontSize: '16px', fontWeight: 700, color: '#C62828' }}>KES {(stats.total_fees_due/1000000).toFixed(2)}M</div></div>
              <div><div style={{ color: '#666', marginBottom: '4px' }}>Total Paid</div><div style={{ fontSize: '16px', fontWeight: 700, color: '#1B6B3A' }}>KES {(stats.total_fees_paid/1000000).toFixed(2)}M</div></div>
            </div>
          </div>

          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Quick Actions</div></div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px' }}>
            <button onClick={() => { setCurrentTab('courses'); setShowCourseForm(true); setCourseForm({code:'',name:'',lecturer_id:'',department_id:'',unit_fee:10000}); }} style={{ padding: '12px', background: '#0D1B3E', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>➕ Add Course</button>
            <button onClick={() => { setCurrentTab('students'); setShowStudentForm(true); setStudentForm({name:'',email:'',role:'STUDENT',reg_number:'',phone:''}); }} style={{ padding: '12px', background: '#1B6B3A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>➕ Add Student</button>
            <button onClick={() => exportReport('fees')} style={{ padding: '12px', background: '#C62828', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>📥 Fee Report</button>
            <button onClick={() => setCurrentTab('fees')} style={{ padding: '12px', background: '#C9A84C', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>💰 Manage Fees</button>
          </div>
        </div>
      );
    }

    if (currentTab === 'courses') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Courses ({courses.length})</div></div><div className="sa" onClick={() => setShowCourseForm(!showCourseForm)} style={{ cursor: 'pointer' }}>+ Add</div></div>
          {showCourseForm && (
            <div style={{ padding: '12px 10px', background: '#f9f9f9', margin: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <input type="text" placeholder="Code (e.g., CS 201)" value={courseForm.code} onChange={(e) => setCourseForm({...courseForm, code: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }} />
              <input type="text" placeholder="Name (e.g., Database Systems)" value={courseForm.name} onChange={(e) => setCourseForm({...courseForm, name: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }} />
              <select value={courseForm.department_id} onChange={(e) => setCourseForm({...courseForm, department_id: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }}>
                <option value="">-- Department --</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={courseForm.lecturer_id} onChange={(e) => setCourseForm({...courseForm, lecturer_id: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }}>
                <option value="">-- Assign Lecturer --</option>
                {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <input type="number" placeholder="Unit Fee" value={courseForm.unit_fee} onChange={(e) => setCourseForm({...courseForm, unit_fee: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={saveCourse} disabled={loading} style={{ flex: 1, padding: '8px', background: '#1B6B3A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Save</button>
                <button onClick={() => setShowCourseForm(false)} style={{ flex: 1, padding: '8px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Cancel</button>
              </div>
            </div>
          )}
          {courses.map((c, i) => (
            <div key={i} style={{ padding: '10px', background: '#fff', borderLeft: '4px solid #0D1B3E', margin: '8px 10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.code}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>Dept: {c.department_name || 'N/A'} | Lecturer: {c.lecturer_name || 'Unassigned'}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>{c.enrolled_count} students</div>
                <select defaultValue="" onChange={(e) => e.target.value && transferCourse(c.id, e.target.value)} style={{ marginTop: '6px', padding: '4px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '11px' }}>
                  <option value="">Transfer to lecturer...</option>
                  {lecturers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <button onClick={() => deleteCourse(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
            </div>
          ))}
        </div>
      );
    }

    if (currentTab === 'students') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Students ({students.length})</div></div><div className="sa" onClick={() => setShowStudentForm(!showStudentForm)} style={{ cursor: 'pointer' }}>+ Add</div></div>
          {showStudentForm && (
            <div style={{ padding: '12px 10px', background: '#f9f9f9', margin: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <input type="text" placeholder="Full Name" value={studentForm.name} onChange={(e) => setStudentForm({...studentForm, name: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }} />
              <input type="email" placeholder="Email" value={studentForm.email} onChange={(e) => setStudentForm({...studentForm, email: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }} />
              <input type="text" placeholder="Registration Number" value={studentForm.reg_number} onChange={(e) => setStudentForm({...studentForm, reg_number: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }} />
              <input type="tel" placeholder="Phone" value={studentForm.phone} onChange={(e) => setStudentForm({...studentForm, phone: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={saveStudent} disabled={loading} style={{ flex: 1, padding: '8px', background: '#1B6B3A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Save</button>
                <button onClick={() => setShowStudentForm(false)} style={{ flex: 1, padding: '8px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Cancel</button>
              </div>
            </div>
          )}
          {students.map((s, i) => (
            <div key={i} style={{ padding: '10px', background: '#fff', borderLeft: '4px solid #1B6B3A', margin: '8px 10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{s.email}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>Reg: {s.reg_number}</div>
              </div>
              <button onClick={() => deleteStudent(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
            </div>
          ))}
        </div>
      );
    }

    if (currentTab === 'fees') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#C62828' }}></div><div className="st">Fee Payments ({payments.length})</div></div><div className="sa" onClick={() => exportReport('fees')} style={{ cursor: 'pointer', color: '#C62828', fontSize: '12px' }}>📥 Export</div></div>
          {payments.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>💰</div>
              <div>No fee payments yet</div>
            </div>
          ) : (
            payments.map((p, i) => (
              <div key={i} style={{ padding: '10px', background: '#fff', borderLeft: '4px solid #C62828', margin: '8px 10px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 600 }}>{p.student_name}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, background: p.status === 'PAID' ? '#c8e6c9' : '#ffccbc', color: p.status === 'PAID' ? '#1b5e20' : '#bf360c', padding: '2px 8px', borderRadius: '10px' }}>{p.status}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Paid: KES {parseFloat(p.amount_paid).toFixed(0)} / Due: KES {parseFloat(p.amount_due).toFixed(0)}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: parseFloat(p.amount_balance) > 0 ? '#C62828' : '#1B6B3A' }}>Balance: KES {parseFloat(p.amount_balance).toFixed(0)}</div>
                <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                  <button onClick={() => toggleUserStatus(p.student, 'disable')} style={{ padding: '5px 8px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Disable</button>
                  <button onClick={() => toggleUserStatus(p.student, 'enable')} style={{ padding: '5px 8px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Enable</button>
                </div>
              </div>
            ))
          )}
        </div>
      );
    }

    if (currentTab === 'performance') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#0D47A1' }}></div><div className="st">Student Performance Profiles</div></div></div>
          {performanceProfiles.length === 0 ? (
            <div style={{ padding: '20px', color: '#999', textAlign: 'center' }}>No profiles available</div>
          ) : (
            <>
              {performanceProfiles.map((profile) => (
                <div key={profile.student_id} style={{ padding: '10px', background: '#fff', borderLeft: `4px solid ${profile.is_low_performer ? '#C62828' : '#1B6B3A'}`, margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setSelectedProfile(profile)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{profile.student_name}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{profile.reg_number || profile.student_email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#999' }}>GPA</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: profile.is_low_performer ? '#C62828' : '#1B6B3A' }}>{profile.gpa}</div>
                    </div>
                  </div>
                </div>
              ))}

              {selectedProfile && (
                <div style={{ padding: '12px', margin: '10px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <div style={{ fontWeight: 700, marginBottom: '8px' }}>{selectedProfile.student_name} Insights</div>
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>Attendance: <strong>{selectedProfile.attendance_rate}%</strong></div>
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>Current GPA (attendance-adjusted): <strong>{selectedProfile.gpa}</strong></div>
                  <div style={{ fontSize: '12px', marginBottom: '8px' }}>Predicted Grade: <strong>{selectedProfile.predicted_grade}</strong> ({selectedProfile.predicted_score}%)</div>
                  <div style={{ fontSize: '12px', color: selectedProfile.is_low_performer ? '#C62828' : '#1B6B3A' }}>Advice: {selectedProfile.advice}</div>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    if (currentTab === 'profiles') {
      return (
        <div className="body">
          <div className="sh">
            <div className="sr"><div className="sb2" style={{ background: '#5D4037' }}></div><div className="st">Profiles & Reports</div></div>
            <div className="sa" onClick={exportAcademicReport} style={{ cursor: 'pointer', color: '#5D4037' }}>📥 Export Report</div>
          </div>

          {allUsers.map((entry) => (
            <div key={entry.id} style={{ padding: '10px', background: '#fff', borderLeft: `4px solid ${entry.role === 'LECTURER' ? '#1B6B3A' : '#0D47A1'}`, margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => fetchSingleProfileReport(entry.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{entry.name}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{entry.email}</div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>{entry.role}</div>
              </div>
            </div>
          ))}

          {selectedUserReport && (
            <div style={{ margin: '10px', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>{selectedUserReport.profile.name} Profile</div>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>Role: {selectedUserReport.profile.role}</div>
              <div style={{ fontSize: '12px', marginBottom: '8px' }}>Department: {selectedUserReport.profile.department_name || 'N/A'}</div>
              {selectedUserReport.performance && (
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>Performance: GPA {selectedUserReport.performance.gpa} | Attendance {selectedUserReport.performance.attendance_rate}% | Predicted {selectedUserReport.performance.predicted_grade}</div>
              )}
              {selectedUserReport.enrolled_courses?.length > 0 && (
                <div style={{ fontSize: '12px', marginBottom: '6px' }}>Enrolled Courses: {selectedUserReport.enrolled_courses.length}</div>
              )}
              {selectedUserReport.teaching_courses?.length > 0 && (
                <div style={{ fontSize: '12px', marginBottom: '6px' }}>Teaching Courses: {selectedUserReport.teaching_courses.length}</div>
              )}
              {selectedUserReport.lecturer_course_details?.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Lecturer Course Performance</div>
                  {selectedUserReport.lecturer_course_details.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: '#555' }}>
                      {item.course_code} • {item.student_count} students • Avg: {item.average_grade_score}
                    </div>
                  ))}
                </div>
              )}
              {selectedUserReport.grades_breakdown?.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Grades by Unit</div>
                  {selectedUserReport.grades_breakdown.slice(0, 8).map((grade, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: '#555' }}>{grade.course_code}: {grade.grade} ({grade.raw_score ?? '-'})</div>
                  ))}
                </div>
              )}
              {selectedUserReport.attendance_breakdown?.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Attendance Records</div>
                  {selectedUserReport.attendance_breakdown.slice(0, 8).map((att, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: '#555' }}>{att.course_code} - {att.date}: {att.status}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (currentTab === 'notices') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#6a1b9a' }}></div><div className="st">School Notices</div></div></div>
          <div style={{ margin: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
            <select value={noticeForm.role} onChange={(e) => setNoticeForm({ ...noticeForm, role: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }}>
              <option value="STUDENT">Students</option>
              <option value="LECTURER">Lecturers</option>
              <option value="ADMIN">Admins</option>
            </select>
            <input value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} placeholder="Notice title" style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
            <textarea value={noticeForm.body} onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })} placeholder="Notice body" style={{ width: '100%', minHeight: '70px', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
            <button onClick={postNotice} style={{ padding: '8px 12px', background: '#6a1b9a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Post Notice</button>
          </div>
          {notices.map((n) => (
            <div key={n.id} style={{ padding: '10px', margin: '8px 10px', background: '#fff', borderLeft: '4px solid #6a1b9a', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{n.title}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>For: {n.role}</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>{n.body}</div>
                </div>
                <button onClick={() => deleteNotice(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (currentTab === 'zoom') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#1565c0' }}></div><div className="st">Zoom Directory</div></div></div>
          <div style={{ margin: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
            <input value={zoomForm.title} onChange={(e) => setZoomForm({ ...zoomForm, title: e.target.value })} placeholder="Class title" style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
            <select value={zoomForm.course_id} onChange={(e) => setZoomForm({ ...zoomForm, course_id: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }}>
              <option value="">Select course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
            <select value={zoomForm.host_id} onChange={(e) => setZoomForm({ ...zoomForm, host_id: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }}>
              <option value="">Host lecturer</option>
              {lecturers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input value={zoomForm.meeting_url} onChange={(e) => setZoomForm({ ...zoomForm, meeting_url: e.target.value })} placeholder="Meeting URL" style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
            <input value={zoomForm.meeting_code} onChange={(e) => setZoomForm({ ...zoomForm, meeting_code: e.target.value })} placeholder="Meeting code (optional)" style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
            <input type="datetime-local" value={zoomForm.scheduled_for} onChange={(e) => setZoomForm({ ...zoomForm, scheduled_for: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
            <button onClick={createZoomSession} style={{ padding: '8px 12px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Create Zoom Entry</button>
          </div>
          {zoomSessions.map((z) => (
            <div key={z.id} style={{ padding: '10px', margin: '8px 10px', background: '#fff', borderLeft: '4px solid #1565c0', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{z.title}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{z.course_code} • {z.host_name || 'Host N/A'}</div>
                <a href={z.meeting_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#1565c0' }}>Open meeting</a>
              </div>
              <button onClick={() => deleteZoomSession(z.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
            </div>
          ))}
        </div>
      );
    }

    if (currentTab === 'kira') {
      return <KIRA role="ADMIN" onClose={() => setCurrentTab('dash')} />;
    }
  };

  return (
    <div className="sc on">
      <div className="hdr" style={{ background: '#0f2349' }}>
        <div style={{ paddingBottom: '12px', position: 'relative', zIndex: 1 }}>
          <div className="rp" style={{ background: 'rgba(198,40,40,.2)', borderColor: 'rgba(198,40,40,.4)', color: '#ff8a80', marginBottom: '5px' }}>⚙️ ADMIN</div>
          <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '18px', fontWeight: 700, color: '#fff', margin: '4px 0 3px' }}>System Admin</div>
          <div style={{ marginTop: '6px' }}>
            <button onClick={() => setShowHeaderDetails(!showHeaderDetails)} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', color: '#fff', fontSize: '10px', borderRadius: '12px', padding: '4px 8px', cursor: 'pointer' }}>
              {showHeaderDetails ? '▲ Hide Details' : '▼ Show Details'}
            </button>
            {showHeaderDetails && (
              <div style={{ marginTop: '6px', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '8px', padding: '8px', fontSize: '10px', color: 'rgba(255,255,255,.85)' }}>
                <div>Email: {user?.email}</div>
                <div>Role: ADMIN</div>
                <div>Session: Active</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="scrollable">
        {renderContent()}
        <div style={{ height: '80px' }}></div>
      </div>

      <div className="tb" id="tb-admin">
        <div className="ti" onClick={() => setCurrentTab('dash')}><div className="tic" style={{ opacity: currentTab === 'dash' ? 1 : 0.4 }}>📊</div><div className="tlb">Dashboard</div></div>
        <div className="ti" onClick={() => setCurrentTab('courses')}><div className="tic" style={{ opacity: currentTab === 'courses' ? 1 : 0.4 }}>📚</div><div className="tlb">Courses</div></div>
        <div className="ti" onClick={() => setCurrentTab('students')}><div className="tic" style={{ opacity: currentTab === 'students' ? 1 : 0.4 }}>👥</div><div className="tlb">Students</div></div>
        <div className="ti" onClick={() => setCurrentTab('performance')}><div className="tic" style={{ opacity: currentTab === 'performance' ? 1 : 0.4 }}>📈</div><div className="tlb">Performance</div></div>
        <div className="ti" onClick={() => setCurrentTab('profiles')}><div className="tic" style={{ opacity: currentTab === 'profiles' ? 1 : 0.4 }}>🧾</div><div className="tlb">Profiles</div></div>
        <div className="ti" onClick={() => setCurrentTab('fees')}><div className="tic" style={{ opacity: currentTab === 'fees' ? 1 : 0.4 }}>💰</div><div className="tlb">Fees</div></div>
        <div className="ti" onClick={() => setCurrentTab('notices')}><div className="tic" style={{ opacity: currentTab === 'notices' ? 1 : 0.4 }}>📢</div><div className="tlb">Notices</div></div>
        <div className="ti" onClick={() => setCurrentTab('zoom')}><div className="tic" style={{ opacity: currentTab === 'zoom' ? 1 : 0.4 }}>🎥</div><div className="tlb">Zoom</div></div>
        <div className="ti" onClick={() => setCurrentTab('kira')}><div className="tic" style={{ opacity: currentTab === 'kira' ? 1 : 0.4 }}>🤖</div><div className="tlb">KIRA</div></div>
        <div className="ti" onClick={() => onLogout()}><div className="tic" style={{ opacity: 0.4 }}>🚪</div><div className="tlb">Logout</div></div>
      </div>
    </div>
  );
}
