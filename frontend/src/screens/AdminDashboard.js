import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

export default function AdminDashboard({ user, onLogout }) {
  const [currentTab, setCurrentTab] = useState('dash');
  const [stats, setStats] = useState({ total_students: 0, total_lecturers: 0, total_courses: 0, fees_paid_percent: 0, total_fees_due: 0, total_fees_paid: 0 });
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ code: '', name: '', lecturer_id: '' });
  const [studentForm, setStudentForm] = useState({ name: '', email: '', role: 'STUDENT', reg_number: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const lecturers = [
    { id: 1, name: 'Dr. James Mwangi' },
    { id: 2, name: 'Prof. Odhiambo' },
    { id: 3, name: 'Dr. Sarah Kamau' },
  ];

  useEffect(() => {
    fetchDashboardStats();
    if (currentTab === 'courses') fetchCourses();
    if (currentTab === 'students') fetchStudents();
    if (currentTab === 'fees') fetchPayments();
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

  const saveCourse = async () => {
    if (!courseForm.code || !courseForm.name) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${API_URL}/courses/`, courseForm);
      setCourseForm({ code: '', name: '', lecturer_id: '' });
      setShowCourseForm(false);
      fetchCourses();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || 'Failed to save course'));
    } finally {
      setLoading(false);
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
            <button onClick={() => { setShowCourseForm(!showCourseForm); setCourseForm({code:'',name:'',lecturer_id:''}); }} style={{ padding: '12px', background: '#0D1B3E', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>➕ Add Course</button>
            <button onClick={() => { setShowStudentForm(!showStudentForm); setStudentForm({name:'',email:'',role:'STUDENT',reg_number:'',phone:''}); }} style={{ padding: '12px', background: '#1B6B3A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>➕ Add Student</button>
            <button onClick={() => exportReport('fees')} style={{ padding: '12px', background: '#C62828', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>📥 Fee Report</button>
            <button onClick={() => setCurrentTab('fees')} style={{ padding: '12px', background: '#C9A84C', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>💰 View Fees</button>
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
              <select value={courseForm.lecturer_id} onChange={(e) => setCourseForm({...courseForm, lecturer_id: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }}>
                <option value="">-- Assign Lecturer --</option>
                {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
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
                <div style={{ fontSize: '11px', color: '#999' }}>{c.enrolled_count} students</div>
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
              </div>
            ))
          )}
        </div>
      );
    }
  };

  return (
    <div className="sc on">
      <div className="hdr" style={{ background: '#0f2349' }}>
        <div style={{ paddingBottom: '12px', position: 'relative', zIndex: 1 }}>
          <div className="rp" style={{ background: 'rgba(198,40,40,.2)', borderColor: 'rgba(198,40,40,.4)', color: '#ff8a80', marginBottom: '5px' }}>⚙️ ADMIN</div>
          <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '18px', fontWeight: 700, color: '#fff', margin: '4px 0 3px' }}>System Admin</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.5)' }}>{user?.email}</div>
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
        <div className="ti" onClick={() => setCurrentTab('fees')}><div className="tic" style={{ opacity: currentTab === 'fees' ? 1 : 0.4 }}>💰</div><div className="tlb">Fees</div></div>
        <div className="ti" onClick={() => onLogout()}><div className="tic" style={{ opacity: 0.4 }}>🚪</div><div className="tlb">Logout</div></div>
      </div>
    </div>
  );
}
