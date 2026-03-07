import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

export default function StudentDashboard({ user, onLogout }) {
  const [currentTab, setCurrentTab] = useState('overview');
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [stats, setStats] = useState({ total_courses: 0, fees_paid: 0, fees_due: 0, fees_balance: 0 });
  const [submissionForm, setSubmissionForm] = useState({ file: null, assignmentId: '' });
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState([]);

  useEffect(() => {
    fetchData();
  }, [currentTab]);

  const fetchData = async () => {
    try {
      // Get dashboard stats
      const statsRes = await axios.get(`${API_URL}/dashboard/student/?student_email=${user?.email}`);
      setStats(statsRes.data);

      // Always fetch enrollments for overview tab
      const enrollRes = await axios.get(`${API_URL}/enrollments/?student_email=${user?.email}`);
      setEnrollments(enrollRes.data);

      const assignRes = await axios.get(`${API_URL}/assignments/?student_email=${user?.email}`);
      setAssignments(assignRes.data);

      // Fetch attendance summary
      if (user?.id) {
        const attendanceRes = await axios.get(`${API_URL}/attendance/summary/?student_id=${user.id}`);
        setAttendanceSummary(attendanceRes.data.summary || []);
      }

      if (currentTab === 'performance') {
        const gradesRes = await axios.get(`${API_URL}/grades/?student_email=${user?.email}`);
        setGrades(gradesRes.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const fetchCourseMaterials = async (courseId) => {
    try {
      const res = await axios.get(`${API_URL}/courses/${courseId}/materials/`);
      setMaterials(res.data);
      
      // Automatically mark attendance when accessing course materials
      if (user?.id && courseId) {
        try {
          await axios.post(`${API_URL}/attendance/mark/`, {
            student_id: user.id,
            course_id: courseId
          });
          // Refresh attendance summary after marking
          const attendanceRes = await axios.get(`${API_URL}/attendance/summary/?student_id=${user.id}`);
          setAttendanceSummary(attendanceRes.data.summary || []);
        } catch (attendErr) {
          console.log('Attendance marking:', attendErr.response?.data?.message || 'Error');
        }
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    }
  };

  const handleSelectCourse = (enrollment) => {
    setSelectedCourse(enrollment.course);
    fetchCourseMaterials(enrollment.course);
  };

  const handleFileChange = (e) => {
    setSubmissionForm({ ...submissionForm, file: e.target.files[0] });
  };

  const openFile = (url) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const downloadMaterial = async (materialId, fileName) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/materials/${materialId}/download/?student_email=${user?.email}`, {
        responseType: 'blob'
      });
      
      // Create a blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || `material-${materialId}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading file: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const submitAssignment = async () => {
    if (!submissionForm.file || !submissionForm.assignmentId) {
      alert('Please select both assignment and file');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('assignment_id', submissionForm.assignmentId);
      formData.append('student_email', user?.email);
      formData.append('submission_file', submissionForm.file);

      await axios.post(`${API_URL}/assignments/submit/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmissionForm({ file: null, assignmentId: '' });
      setShowSubmissionForm(false);
      fetchData();
      alert('Assignment submitted successfully!');
    } catch (err) {
      alert('Error submitting assignment: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (currentTab === 'overview') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">My Dashboard</div></div></div>
          <div className="stat-grid">
            <div className="stat-c cd" style={{ borderTopColor: '#1b6b3a' }}>
              <div style={{ fontSize: '24px' }}>📚</div>
              <div className="stat-v">{stats.total_courses}</div>
              <div className="stat-l">Enrolled Courses</div>
            </div>
            <div className="stat-c cd" style={{ borderTopColor: '#1b6b3a', background: stats.fees_balance === 0 ? '#e8f5e9' : '#fff3e0' }}>
              <div style={{ fontSize: '24px' }}>💰</div>
              <div className="stat-v" style={{ color: stats.fees_balance === 0 ? '#1b6b3a' : '#ff9800' }}>KES {stats.fees_balance}</div>
              <div className="stat-l">Fees Balance</div>
            </div>
            <div className="stat-c cd" style={{ borderTopColor: '#1b6b3a' }}>
              <div style={{ fontSize: '24px' }}>✅</div>
              <div className="stat-v">KES {stats.fees_paid}</div>
              <div className="stat-l">Paid</div>
            </div>
          </div>

          {stats.fees_balance > 0 && (
            <div style={{ padding: '12px 10px', background: '#fff3e0', margin: '10px', borderRadius: '8px', border: '1px solid #ffb74d' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>⚠️ Fee Balance Outstanding</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>You have a balance of KES {stats.fees_balance} due</div>
              <button style={{ padding: '6px 12px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Pay Now</button>
            </div>
          )}

          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Enrolled Courses</div></div><div className="sa" onClick={() => setCurrentTab('courses')} style={{ cursor: 'pointer', fontSize: '12px' }}>View All</div></div>
          {enrollments.slice(0, 2).map((e, i) => (
            <div key={i} style={{ padding: '12px 10px', background: '#fff', borderLeft: '4px solid #1b6b3a', margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleSelectCourse(e)}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{e.course_code}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{e.course_name}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Progress: {e.progress_percent}%</div>
              <div style={{ marginTop: '6px', background: '#e8f5e9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ background: '#1b6b3a', height: '100%', width: `${e.progress_percent}%` }}></div>
              </div>
            </div>
          ))}

          <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#ff9800' }}></div><div className="st">Pending Assignment Submissions</div></div></div>
          {assignments.filter(a => a.status === 'SUBMITTED').length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>✅</div>
              <div>No pending submissions</div>
            </div>
          ) : (
            assignments.filter(a => a.status === 'SUBMITTED').map((a, i) => (
              <div key={i} style={{ padding: '11px 10px', background: '#fff3e0', borderLeft: '4px solid #ff9800', margin: '8px 10px', borderRadius: '4px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{a.assignment_title}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{a.course_name}</div>
                <div style={{ fontSize: '11px', color: '#ff9800', marginTop: '4px' }}>⏳ Awaiting Grade</div>
              </div>
            ))
          )}

          <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#0d47a1' }}></div><div className="st">Attendance Summary</div></div></div>
          {attendanceSummary.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>📋</div>
              <div>No attendance records yet</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Access your course materials to mark attendance</div>
            </div>
          ) : (
            attendanceSummary.map((att, i) => (
              <div key={i} style={{ padding: '11px 10px', background: '#fff', borderLeft: '4px solid #0d47a1', margin: '8px 10px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{att.course_code}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{att.course_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: att.attendance_rate >= 75 ? '#1b6b3a' : att.attendance_rate >= 50 ? '#ff9800' : '#c62828' }}>
                      {att.attendance_rate}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#999' }}>{att.attended}/{att.total_classes} classes</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      );
    }

    if (currentTab === 'courses') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">My Courses ({enrollments.length})</div></div></div>
          {!selectedCourse ? (
            enrollments.map((e, i) => (
              <div key={i} style={{ padding: '12px 10px', background: '#fff', borderLeft: '4px solid #1b6b3a', margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleSelectCourse(e)}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{e.course_code}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{e.course_name}</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Progress: {e.progress_percent}%</div>
                <div style={{ marginTop: '6px', background: '#e8f5e9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ background: '#1b6b3a', height: '100%', width: `${e.progress_percent}%` }}></div>
                </div>
              </div>
            ))
          ) : (
            <div>
              <button onClick={() => { setSelectedCourse(null); setMaterials([]); }} style={{ padding: '8px 16px', background: '#888', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', margin: '10px', fontWeight: 600 }}>← Back</button>
              
              <div style={{ margin: '10px' }}>
                <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{enrollments.find(e => e.course === selectedCourse)?.course_code}</div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>{enrollments.find(e => e.course === selectedCourse)?.course_name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <div style={{ padding: '10px', background: '#f0f4ff', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#666' }}>Status</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d47a1' }}>ACTIVE</div>
                  </div>
                  <div style={{ padding: '10px', background: '#e8f5e9', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#666' }}>Progress</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1b6b3a' }}>{enrollments.find(e => e.course === selectedCourse)?.progress_percent}%</div>
                  </div>
                </div>
              </div>

              <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Course Materials</div></div></div>
              {materials.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>No materials available yet</div>
              ) : (
                materials.map((m, i) => (
                  <div key={i} style={{ padding: '11px 10px', background: '#fff', borderLeft: m.material_type === 'ASSIGNMENT' ? '4px solid #ff9800' : '4px solid #0d47a1', margin: '8px 10px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.title}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{m.description}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {m.file_url && (
                          <>
                            <button onClick={() => downloadMaterial(m.id, m.title)} style={{ padding: '6px 10px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              ⬇️ Download
                            </button>
                          </>
                        )}
                        {(m.material_type === 'ASSIGNMENT' || m.material_type === 'CAT') && <button onClick={() => { setSubmissionForm({assignmentId: m.id, file: null}); setShowSubmissionForm(true); }} style={{ padding: '6px 10px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>Submit</button>}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Published by: {m.uploaded_by_name || 'Lecturer'}</div>
                    <div style={{ fontSize: '10px', background: m.material_type === 'ASSIGNMENT' ? '#fff3e0' : '#f0f4ff', color: m.material_type === 'ASSIGNMENT' ? '#e65100' : '#0d47a1', padding: '3px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '4px' }}>{m.material_type}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      );
    }

    if (currentTab === 'assignments') {
      return (
        <div className="body">
          {showSubmissionForm && (
            <div style={{ padding: '12px 10px', background: '#f0f4ff', margin: '10px', borderRadius: '8px', border: '1px solid #90caf9' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#666' }}>Select File</label>
                <input type="file" onChange={handleFileChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #90caf9', boxSizing: 'border-box', fontSize: '13px', cursor: 'pointer' }} />
                {submissionForm.file && <div style={{ fontSize: '11px', color: '#0d47a1', marginTop: '4px' }}>✓ {submissionForm.file.name}</div>}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={submitAssignment} disabled={loading} style={{ flex: 1, padding: '8px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Submit</button>
                <button onClick={() => setShowSubmissionForm(false)} style={{ flex: 1, padding: '8px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">My Assignments ({assignments.length})</div></div></div>
          {assignments.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📋</div>
              <div>No assignments yet</div>
            </div>
          ) : (
            assignments.map((a, i) => {
              const statusColor = a.status === 'GRADED' ? '#1b6b3a' : a.status === 'SUBMITTED' ? '#ff9800' : '#0d47a1';
              const statusBg = a.status === 'GRADED' ? '#e8f5e9' : a.status === 'SUBMITTED' ? '#fff3e0' : '#f0f4ff';
              return (
                <div key={i} style={{ padding: '12px 10px', background: '#fff', borderLeft: `4px solid ${statusColor}`, margin: '8px 10px', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{a.assignment_title}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{a.course_name}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Published by: {a.uploaded_by_name || 'Lecturer'}</div>
                    </div>
                    {a.status === 'GRADED' && <div style={{ fontSize: '11px', fontWeight: 700, color: '#1b6b3a', background: '#e8f5e9', padding: '4px 8px', borderRadius: '4px' }}>{a.score}/100</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    {a.assignment_file_url && <button onClick={() => openFile(a.assignment_file_url)} style={{ padding: '5px 8px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 600 }}>Open Brief</button>}
                    {a.status === 'PENDING' && <button onClick={() => { setSubmissionForm({assignmentId: a.assignment, file: null}); setShowSubmissionForm(true); }} style={{ padding: '5px 8px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 600 }}>Submit Work</button>}
                  </div>
                  <div style={{ fontSize: '11px', background: statusBg, color: statusColor, padding: '3px 8px', borderRadius: '10px', display: 'inline-block' }}>{a.status}</div>
                  {a.feedback && <div style={{ fontSize: '11px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>💬 {a.feedback}</div>}
                </div>
              );
            })
          )}
        </div>
      );
    }

    if (currentTab === 'performance') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">My Grades ({grades.length} courses)</div></div></div>
          {grades.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📊</div>
              <div>No grades yet</div>
            </div>
          ) : (
            <div>
              <div style={{ padding: '10px' }}>
                {grades.map((g, i) => {
                  const gradeColor = g.grade === 'A' || g.grade === 'B' ? '#1b6b3a' : g.grade === 'C' ? '#ff9800' : '#d32f2f';
                  return (
                    <div key={i} style={{ padding: '12px 10px', background: '#fff', borderLeft: `4px solid ${gradeColor}`, margin: '8px 0', borderRadius: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{g.course_code}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{g.course_name}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#999' }}>Raw Score</div>
                          <div style={{ fontSize: '16px', fontWeight: 700 }}>{g.raw_score}</div>
                        </div>
                        <div style={{ textAlign: 'center', background: `${gradeColor}20`, padding: '8px 12px', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: '#666' }}>Grade</div>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: gradeColor }}>{g.grade}</div>
                        </div>
                      </div>
                      {g.feedback && <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>📝 {g.feedback}</div>}
                    </div>
                  );
                })}
              </div>

              <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Overall Statistics</div></div></div>
              <div style={{ padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '12px', background: '#e8f5e9', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Average Score</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1b6b3a' }}>{(grades.reduce((sum, g) => sum + g.raw_score, 0) / grades.length).toFixed(1)}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#f0f4ff', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Best Grade</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#0d47a1' }}>{['A', 'B', 'C', 'D', 'F'].find(letter => grades.some(g => g.grade === letter)) || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="sc on">
      <div className="hdr" style={{ background: '#0d47a1' }}>
        <div style={{ paddingBottom: '12px', position: 'relative', zIndex: 1 }}>
          <div className="rp" style={{ background: 'rgba(13,71,161,.2)', borderColor: 'rgba(13,71,161,.4)', color: '#42a5f5', marginBottom: '5px' }}>🎓 STUDENT</div>
          <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '18px', fontWeight: 700, color: '#fff', margin: '4px 0 3px' }}>Learning Dashboard</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.5)' }}>{user?.email}</div>
        </div>
      </div>

      <div className="scrollable">
        {renderContent()}
        <div style={{ height: '80px' }}></div>
      </div>

      <div className="tb" id="tb-student">
        <div className="ti" onClick={() => setCurrentTab('overview')}><div className="tic" style={{ opacity: currentTab === 'overview' ? 1 : 0.4 }}>📊</div><div className="tlb">Overview</div></div>
        <div className="ti" onClick={() => setCurrentTab('courses')}><div className="tic" style={{ opacity: currentTab === 'courses' ? 1 : 0.4 }}>📚</div><div className="tlb">Courses</div></div>
        <div className="ti" onClick={() => setCurrentTab('assignments')}><div className="tic" style={{ opacity: currentTab === 'assignments' ? 1 : 0.4 }}>📝</div><div className="tlb">Assign</div></div>
        <div className="ti" onClick={() => setCurrentTab('performance')}><div className="tic" style={{ opacity: currentTab === 'performance' ? 1 : 0.4 }}>📈</div><div className="tlb">Grade</div></div>
        <div className="ti" onClick={() => onLogout()}><div className="tic" style={{ opacity: 0.4 }}>🚪</div><div className="tlb">Logout</div></div>
      </div>
    </div>
  );
}
