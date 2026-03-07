import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export default function LecturerDashboard({ user, onLogout }) {
  const [currentTab, setCurrentTab] = useState('overview');
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [pendingGrades, setPendingGrades] = useState(0);
  const [gradingForm, setGradingForm] = useState({ assignment_id: '', student_id: '', score: '', feedback: '' });
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [stats, setStats] = useState({ total_courses: 0, total_students: 0, pending_grades: 0 });
  const [loading, setLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', type: 'LECTURE', file: null });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [courseAttendance, setCourseAttendance] = useState([]);

  useEffect(() => {
    fetchData();
  }, [currentTab]);

  const fetchData = async () => {
    try {
      // Always fetch courses for overview display
      const coursesRes = await axios.get(`${API_URL}/courses/?lecturer_email=${user?.email}`);
      setCourses(coursesRes.data);
      
      if (currentTab === 'grading') {
        const res = await axios.get(`${API_URL}/assignments/pending-grading/?lecturer_email=${user?.email}`);
        setAssignments(res.data);
        setPendingGrades(res.data.length);
      }
      
      const statsRes = await axios.get(`${API_URL}/dashboard/lecturer/?lecturer_email=${user?.email}`);
      setStats(statsRes.data);
      setPendingGrades(statsRes.data.pending_grades || 0);

      // Fetch attendance summary for lecturer's courses
      if (user?.id) {
        try {
          const attendanceRes = await axios.get(`${API_URL}/attendance/summary/?lecturer_id=${user.id}`);
          setAttendanceSummary(attendanceRes.data.summary || []);
        } catch (err) {
          console.log('Could not fetch attendance summary');
        }
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchCourseMaterials = async (courseId) => {
    try {
      const res = await axios.get(`${API_URL}/courses/${courseId}/materials/`);
      setMaterials(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    fetchCourseMaterials(course.id);
  };

  const submitGrade = async () => {
    if (!gradingForm.score) {
      alert('Please enter a score');
      return;
    }
    try {
      setLoading(true);
      const submission = assignments.find(a => a.id == gradingForm.assignment_id);
      await axios.put(`${API_URL}/submissions/${submission.id}/grade/`, {
        score: parseFloat(gradingForm.score),
        feedback: gradingForm.feedback
      });
      setGradingForm({ assignment_id: '', student_id: '', score: '', feedback: '' });
      setShowGradeForm(false);
      fetchData();
    } catch (err) {
      alert('Error submitting grade');
    } finally {
      setLoading(false);
    }
  };

  const uploadMaterial = async () => {
    if (!uploadForm.title || !selectedCourse) {
      alert('Please enter title and select a course');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('material_type', uploadForm.type);
      formData.append('uploader_email', user?.email);
      if (uploadForm.file) {
        formData.append('file', uploadForm.file);
      }

      await axios.post(`${API_URL}/courses/${selectedCourse}/materials/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadForm({ title: '', description: '', type: 'LECTURE', file: null });
      setShowUploadForm(false);
      fetchCourseMaterials(selectedCourse);
      alert('Material uploaded successfully!');
    } catch (err) {
      alert('Error uploading material: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (currentTab === 'overview') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Course Overview</div></div></div>
          <div className="stat-grid">
            <div className="stat-c cd" style={{ borderTopColor: '#1b6b3a' }}>
              <div style={{ fontSize: '24px' }}>📚</div>
              <div className="stat-v">{stats.total_courses}</div>
              <div className="stat-l">My Courses</div>
            </div>
            <div className="stat-c cd" style={{ borderTopColor: '#1b6b3a' }}>
              <div style={{ fontSize: '24px' }}>👥</div>
              <div className="stat-v">{stats.total_students}</div>
              <div className="stat-l">Students</div>
            </div>
            <div className="stat-c cd" style={{ borderTopColor: '#ff9800' }}>
              <div style={{ fontSize: '24px' }}>✅</div>
              <div className="stat-v">{stats.pending_grades}</div>
              <div className="stat-l">Pending Grading</div>
            </div>
          </div>

          <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#ff9800' }}></div><div className="st">Urgent: Pending Grading</div></div></div>
          {stats.pending_grades === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '18px', margin: '10px 0' }}>✅</div>
              <div>All assignments graded!</div>
            </div>
          ) : (
            <div style={{ padding: '10px', background: '#fff3e0', margin: '10px', borderRadius: '8px', border: '1px solid #ffb74d' }}>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>You have {stats.pending_grades} assignment(s) waiting for grades</div>
              <button onClick={() => setCurrentTab('grading')} style={{ padding: '8px 16px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Grade Now →</button>
            </div>
          )}

          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">My Courses</div></div><div className="sa" onClick={() => setCurrentTab('courses')} style={{ cursor: 'pointer', fontSize: '12px' }}>View All</div></div>
          {courses.slice(0, 2).map((c, i) => (
            <div key={i} style={{ padding: '12px 10px', background: '#fff', borderLeft: '4px solid #1b6b3a', margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleSelectCourse(c)}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.code}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{c.name}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{c.enrolled_count} students enrolled</div>
            </div>
          ))}

          <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#0d47a1' }}></div><div className="st">Attendance Tracking</div></div></div>
          {attendanceSummary.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>📋</div>
              <div>No attendance records yet</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Attendance is tracked when students access course materials</div>
            </div>
          ) : (
            attendanceSummary.map((att, i) => (
              <div key={i} style={{ padding: '11px 10px', background: '#fff', borderLeft: '4px solid #0d47a1', margin: '8px 10px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{att.course_code}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{att.course_name}</div>
                    <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                      {att.enrolled_students} students | {att.total_attendance_records} total attendance records
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: '#f0f4ff', borderRadius: '6px', minWidth: '60px' }}>
                    <div style={{ fontSize: '18px' }}>📋</div>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: 600, marginTop: '2px' }}>Records</div>
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
          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">My Courses ({courses.length})</div></div></div>
          {!selectedCourse ? (
            courses.map((c, i) => (
              <div key={i} style={{ padding: '12px 10px', background: '#fff', borderLeft: '4px solid #1b6b3a', margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleSelectCourse(c)}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.code}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{c.enrolled_count} 👤 enrolled</div>
              </div>
            ))
          ) : (
            <div>
              <button onClick={() => { setSelectedCourse(null); setMaterials([]); }} style={{ padding: '8px 16px', background: '#888', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', margin: '10px', fontWeight: 600 }}>← Back to Courses</button>
              
              <div style={{ margin: '10px' }}>
                <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{selectedCourse.code}</div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>{selectedCourse.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '10px', background: '#f0f4ff', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#666' }}>Enrolled</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#1b6b3a' }}>{selectedCourse.enrolled_count}</div>
                  </div>
                  <div style={{ padding: '10px', background: '#fff0f4', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#666' }}>Completion</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#ff9800' }}>{selectedCourse.completion_percent}%</div>
                  </div>
                </div>
              </div>

              <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Course Materials</div></div><button onClick={() => setShowUploadForm(true)} style={{ padding: '6px 10px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 600 }}>+ Upload</button></div>
              
              {showUploadForm && (
                <div style={{ padding: '12px 10px', background: '#e8f5e9', margin: '10px', borderRadius: '8px', border: '1px solid #81c784' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: '#666' }}>Material Title</label>
                    <input type="text" placeholder="e.g., Chapter 5: OOP Concepts" value={uploadForm.title} onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #81c784', boxSizing: 'border-box', fontSize: '12px' }} />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: '#666' }}>Type</label>
                    <select value={uploadForm.type} onChange={(e) => setUploadForm({...uploadForm, type: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #81c784', boxSizing: 'border-box', fontSize: '12px' }}>
                      <option value="LECTURE">Lecture</option>
                      <option value="ASSIGNMENT">Assignment</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: '#666' }}>Description</label>
                    <textarea placeholder="Add description..." value={uploadForm.description} onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #81c784', boxSizing: 'border-box', fontSize: '12px', minHeight: '50px' }}></textarea>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', color: '#666' }}>Attach File (Optional)</label>
                    <input type="file" onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #81c784', boxSizing: 'border-box', fontSize: '12px' }} />
                    {uploadForm.file && <div style={{ fontSize: '10px', color: '#1b6b3a', marginTop: '3px' }}>✓ {uploadForm.file.name}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={uploadMaterial} disabled={loading} style={{ flex: 1, padding: '6px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '11px' }}>Upload</button>
                    <button onClick={() => setShowUploadForm(false)} style={{ flex: 1, padding: '6px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '11px' }}>Cancel</button>
                  </div>
                </div>
              )}
              
              {materials.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>No materials added yet</div>
              ) : (
                materials.map((m, i) => (
                  <div key={i} style={{ padding: '10px', background: '#fff', borderLeft: '4px solid #0D47A1', margin: '8px 10px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.title}</div>
                      <div style={{ fontSize: '10px', background: m.material_type === 'ASSIGNMENT' ? '#fff3e0' : '#f0f4ff', color: m.material_type === 'ASSIGNMENT' ? '#e65100' : '#0d47a1', padding: '2px 8px', borderRadius: '10px' }}>{m.material_type}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{m.description}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      );
    }

    if (currentTab === 'grading') {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#ff9800' }}></div><div className="st">Pending Grading ({assignments.length})</div></div></div>
          
          {showGradeForm && (
            <div style={{ padding: '12px 10px', background: '#fff3e0', margin: '10px', borderRadius: '8px', border: '1px solid #ffb74d' }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#666' }}>Score (0-100)</label>
                <input type="number" min="0" max="100" placeholder="Score" value={gradingForm.score} onChange={(e) => setGradingForm({...gradingForm, score: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ffb74d', boxSizing: 'border-box', fontSize: '13px' }} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#666' }}>Feedback</label>
                <textarea placeholder="Enter feedback" value={gradingForm.feedback} onChange={(e) => setGradingForm({...gradingForm, feedback: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ffb74d', boxSizing: 'border-box', fontSize: '13px', minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={submitGrade} disabled={loading} style={{ flex: 1, padding: '8px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Submit Grade</button>
                <button onClick={() => setShowGradeForm(false)} style={{ flex: 1, padding: '8px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Cancel</button>
              </div>
            </div>
          )}

          {assignments.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>✅</div>
              <div>No pending assignments to grade</div>
            </div>
          ) : (
            assignments.map((a, i) => (
              <div key={i} style={{ padding: '12px 10px', background: '#fff', borderLeft: '4px solid #ff9800', margin: '8px 10px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{a.assignment_title}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{a.student_name}</div>
                  </div>
                  <button onClick={() => { setGradingForm({assignment_id: a.id, student_id: a.student, score: '', feedback: ''}); setShowGradeForm(true); }} style={{ padding: '6px 12px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Grade</button>
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>Submitted: {new Date(a.submission_date).toLocaleDateString()}</div>
              </div>
            ))
          )}
        </div>
      );
    }
  };

  return (
    <div className="sc on">
      <div className="hdr" style={{ background: '#1b5e20' }}>
        <div style={{ paddingBottom: '12px', position: 'relative', zIndex: 1 }}>
          <div className="rp" style={{ background: 'rgba(27,107,58,.2)', borderColor: 'rgba(27,107,58,.4)', color: '#66bb6a', marginBottom: '5px' }}>🎓 LECTURER</div>
          <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '18px', fontWeight: 700, color: '#fff', margin: '4px 0 3px' }}>Course Instructor</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.5)' }}>{user?.email}</div>
        </div>
      </div>

      <div className="scrollable">
        {renderContent()}
        <div style={{ height: '80px' }}></div>
      </div>

      <div className="tb" id="tb-lecturer">
        <div className="ti" onClick={() => setCurrentTab('overview')}><div className="tic" style={{ opacity: currentTab === 'overview' ? 1 : 0.4 }}>📊</div><div className="tlb">Overview</div></div>
        <div className="ti" onClick={() => setCurrentTab('courses')}><div className="tic" style={{ opacity: currentTab === 'courses' ? 1 : 0.4 }}>📚</div><div className="tlb">Courses</div></div>
        <div className="ti" onClick={() => setCurrentTab('grading')}><div className="tic" style={{ opacity: currentTab === 'grading' ? 1 : 0.4 }}>✍️</div><div className="tlb">Grade</div>{stats.pending_grades > 0 && <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#ff9800', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{stats.pending_grades}</div>}</div>
        <div className="ti" onClick={() => onLogout()}><div className="tic" style={{ opacity: 0.4 }}>🚪</div><div className="tlb">Logout</div></div>
      </div>
    </div>
  );
}
