import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

export default function LecturerDashboard({ user, onLogout }) {
  const [currentTab, setCurrentTab] = useState('overview');
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ total_courses: 0, total_students: 0, pending_grades: 0 });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [courseStudents, setCourseStudents] = useState([]);
  const [courseSubmissions, setCourseSubmissions] = useState([]);
  const [materialPerformance, setMaterialPerformance] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', type: 'MATERIAL', file: null });
  const [gradingForm, setGradingForm] = useState({ submissionId: '', score: '', feedback: '' });
  const [weeklyPlanner, setWeeklyPlanner] = useState({ plans: [], zoom_sessions: [] });
  const [planForm, setPlanForm] = useState({ title: '', course_id: '', plan_date: '', start_time: '', end_time: '', notes: '' });
  const [scheduleFilter, setScheduleFilter] = useState('week');

  useEffect(() => {
    fetchBaseData();
  }, [currentTab]);

  const fetchBaseData = async () => {
    try {
      const [coursesRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/courses/?lecturer_email=${user?.email}`),
        axios.get(`${API_URL}/dashboard/lecturer/?lecturer_email=${user?.email}`),
      ]);
      setCourses(coursesRes.data || []);
      setStats(statsRes.data || { total_courses: 0, total_students: 0, pending_grades: 0 });

      if (currentTab === 'schedule' || currentTab === 'overview') {
        const plannerRes = await axios.get(`${API_URL}/lecturer/weekly-plan/?lecturer_email=${user?.email}`);
        setWeeklyPlanner(plannerRes.data || { plans: [], zoom_sessions: [] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadCourseWorkspace = async (course) => {
    try {
      setSelectedCourse(course);
      const [materialsRes, studentsRes, submissionsRes, perfRes] = await Promise.all([
        axios.get(`${API_URL}/courses/${course.id}/materials/`),
        axios.get(`${API_URL}/lecturer/courses/${course.id}/students/?lecturer_email=${user?.email}`),
        axios.get(`${API_URL}/lecturer/courses/${course.id}/submissions/?lecturer_email=${user?.email}`),
        axios.get(`${API_URL}/lecturer/courses/${course.id}/material-performance/?lecturer_email=${user?.email}`),
      ]);
      setMaterials(materialsRes.data || []);
      setCourseStudents(studentsRes.data || []);
      setCourseSubmissions(submissionsRes.data?.submissions || []);
      setMaterialPerformance(perfRes.data || []);
      setSelectedProfile(null);
      setChatMessages([]);
      setCurrentTab('courses');
    } catch (err) {
      alert('Failed to load class workspace');
    }
  };

  const fetchChat = async (studentEmail) => {
    if (!selectedCourse || !studentEmail) return;
    try {
      const res = await axios.get(`${API_URL}/chat/?user_email=${user?.email}&peer_email=${studentEmail}&course_id=${selectedCourse.id}`);
      setChatMessages(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const sendChat = async () => {
    if (!selectedCourse || !selectedProfile?.student?.email || !chatText.trim()) return;
    try {
      await axios.post(`${API_URL}/chat/`, {
        sender_email: user?.email,
        recipient_email: selectedProfile.student.email,
        course_id: selectedCourse.id,
        message: chatText.trim(),
      });
      setChatText('');
      fetchChat(selectedProfile.student.email);
    } catch (err) {
      alert('Failed to send message');
    }
  };

  const uploadMaterial = async () => {
    if (!selectedCourse?.id || !uploadForm.title) {
      alert('Choose a class and enter a title');
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('material_type', uploadForm.type);
      formData.append('uploader_email', user?.email);
      if (uploadForm.file) formData.append('file', uploadForm.file);
      await axios.post(`${API_URL}/courses/${selectedCourse.id}/materials/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadForm({ title: '', description: '', type: 'MATERIAL', file: null });
      setShowUploadForm(false);
      loadCourseWorkspace(selectedCourse);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload material');
    } finally {
      setLoading(false);
    }
  };

  const gradeSubmission = async () => {
    if (!gradingForm.submissionId || gradingForm.score === '') {
      alert('Enter a score');
      return;
    }
    try {
      await axios.put(`${API_URL}/submissions/${gradingForm.submissionId}/grade/`, {
        score: parseFloat(gradingForm.score),
        feedback: gradingForm.feedback,
      });
      setShowGradeForm(false);
      setGradingForm({ submissionId: '', score: '', feedback: '' });
      if (selectedCourse) loadCourseWorkspace(selectedCourse);
      fetchBaseData();
    } catch (err) {
      alert('Failed to save grade');
    }
  };

  const downloadSubmission = async (submission) => {
    try {
      const response = await axios.get(`${API_URL}/submissions/${submission.id}/download/?lecturer_email=${user?.email}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedCourse?.code || 'course'}-${submission.student_name}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download submission');
    }
  };

  const downloadBundle = async () => {
    if (!selectedCourse) return;
    try {
      const response = await axios.get(`${API_URL}/lecturer/courses/${selectedCourse.id}/submissions/bundle/?lecturer_email=${user?.email}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedCourse.code}-submissions.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download course submissions');
    }
  };

  const createPlan = async () => {
    if (!planForm.title || !planForm.plan_date) {
      alert('Title and date are required');
      return;
    }
    try {
      await axios.post(`${API_URL}/lecturer/weekly-plan/`, {
        ...planForm,
        lecturer_email: user?.email,
      });
      setPlanForm({ title: '', course_id: '', plan_date: '', start_time: '', end_time: '', notes: '' });
      const plannerRes = await axios.get(`${API_URL}/lecturer/weekly-plan/?lecturer_email=${user?.email}`);
      setWeeklyPlanner(plannerRes.data || { plans: [], zoom_sessions: [] });
    } catch (err) {
      alert('Failed to save plan');
    }
  };

  const deletePlan = async (planId) => {
    try {
      await axios.delete(`${API_URL}/lecturer/weekly-plan/`, {
        data: { lecturer_email: user?.email, plan_id: planId },
      });
      const plannerRes = await axios.get(`${API_URL}/lecturer/weekly-plan/?lecturer_email=${user?.email}`);
      setWeeklyPlanner(plannerRes.data || { plans: [], zoom_sessions: [] });
    } catch (err) {
      alert('Failed to delete plan');
    }
  };

  const groupedSubmissions = useMemo(() => {
    return courseSubmissions.reduce((acc, item) => {
      const key = `${item.material_type || 'WORK'} - ${item.assignment_title}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [courseSubmissions]);

  const isInWindow = (dateText) => {
    const itemDate = new Date(`${dateText}T00:00:00`);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(todayStart);
    endOfWeek.setDate(todayStart.getDate() + 7);

    if (scheduleFilter === 'today') {
      return itemDate.getTime() === todayStart.getTime();
    }
    if (scheduleFilter === 'week') {
      return itemDate >= todayStart && itemDate <= endOfWeek;
    }
    return true;
  };

  const renderOverview = () => (
    <div className="body">
      <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Lecturer Overview</div></div></div>
      <div className="stat-grid">
        <div className="stat-c cd" style={{ borderTopColor: '#1b6b3a' }}><div style={{ fontSize: '24px' }}>📚</div><div className="stat-v">{stats.total_courses}</div><div className="stat-l">My Courses</div></div>
        <div className="stat-c cd" style={{ borderTopColor: '#0d47a1' }}><div style={{ fontSize: '24px' }}>👥</div><div className="stat-v">{stats.total_students}</div><div className="stat-l">Students</div></div>
        <div className="stat-c cd" style={{ borderTopColor: '#ff9800' }}><div style={{ fontSize: '24px' }}>📝</div><div className="stat-v">{stats.pending_grades}</div><div className="stat-l">Pending Grading</div></div>
      </div>

      <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#0d47a1' }}></div><div className="st">Upcoming Plans</div></div><div className="sa" style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('schedule')}>Open Planner</div></div>
      {(weeklyPlanner.plans || []).slice(0, 4).map((plan) => (
        <div key={plan.id} style={{ padding: '10px', background: '#fff', borderLeft: '4px solid #0d47a1', margin: '8px 10px', borderRadius: '4px' }}>
          <div style={{ fontWeight: 700, fontSize: '13px' }}>{plan.title}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>{plan.plan_date} {plan.start_time ? `• ${plan.start_time}` : ''}</div>
        </div>
      ))}

      <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">My Classes</div></div></div>
      {courses.map((course) => (
        <div key={course.id} onClick={() => loadCourseWorkspace(course)} style={{ padding: '12px 10px', background: '#fff', borderLeft: '4px solid #1b6b3a', margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }}>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>{course.code}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{course.name}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>{course.enrolled_count} students • {course.completion_percent}% progress</div>
        </div>
      ))}
    </div>
  );

  const renderCourses = () => {
    if (!selectedCourse) {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Class Workspaces</div></div></div>
          {courses.map((course) => (
            <div key={course.id} onClick={() => loadCourseWorkspace(course)} style={{ padding: '12px 10px', background: '#fff', borderLeft: '4px solid #1b6b3a', margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{course.code}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{course.name}</div>
              <div style={{ fontSize: '11px', color: '#999' }}>{course.enrolled_count} students • {course.completion_percent}% progress</div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="body">
        <button onClick={() => { setSelectedCourse(null); setSelectedProfile(null); setChatMessages([]); }} style={{ padding: '8px 14px', background: '#888', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', margin: '10px' }}>← Back to Classes</button>
        <div style={{ margin: '10px', padding: '12px', background: '#fff', borderRadius: '8px' }}>
          <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '18px', fontWeight: 700 }}>{selectedCourse.code}</div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>{selectedCourse.name}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '10px', background: '#f0f4ff', borderRadius: '6px' }}><div style={{ fontSize: '11px', color: '#666' }}>Students</div><div style={{ fontWeight: 700 }}>{selectedCourse.enrolled_count}</div></div>
            <div style={{ padding: '10px', background: '#fff3e0', borderRadius: '6px' }}><div style={{ fontSize: '11px', color: '#666' }}>Progress</div><div style={{ fontWeight: 700 }}>{selectedCourse.completion_percent}%</div></div>
            <div style={{ padding: '10px', background: '#e8f5e9', borderRadius: '6px' }}><div style={{ fontSize: '11px', color: '#666' }}>Submissions</div><div style={{ fontWeight: 700 }}>{courseSubmissions.length}</div></div>
          </div>
        </div>

        <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Materials and Assessments</div></div><button onClick={() => setShowUploadForm(true)} style={{ padding: '6px 10px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 600 }}>+ Upload</button></div>
        {showUploadForm && (
          <div style={{ padding: '12px 10px', background: '#e8f5e9', margin: '10px', borderRadius: '8px', border: '1px solid #81c784' }}>
            <input value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="Title" style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #81c784' }} />
            <select value={uploadForm.type} onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #81c784' }}>
              <option value="MATERIAL">Material</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="CAT">CAT</option>
            </select>
            <textarea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="Description" style={{ width: '100%', minHeight: '60px', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #81c784' }} />
            <input type="file" onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] || null })} style={{ width: '100%', marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={uploadMaterial} disabled={loading} style={{ flex: 1, padding: '8px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '4px' }}>Save</button>
              <button onClick={() => setShowUploadForm(false)} style={{ flex: 1, padding: '8px', background: '#ccc', border: 'none', borderRadius: '4px' }}>Cancel</button>
            </div>
          </div>
        )}
        {materials.map((m) => {
          const perf = materialPerformance.find((item) => item.material_id === m.id);
          return (
            <div key={m.id} style={{ padding: '10px', background: '#fff', borderLeft: '4px solid #0d47a1', margin: '8px 10px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{m.title}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{m.description}</div>
                </div>
                <div style={{ fontSize: '10px', background: '#f0f4ff', color: '#0d47a1', padding: '3px 8px', borderRadius: '10px', height: 'fit-content' }}>{m.material_type}</div>
              </div>
              {perf && <div style={{ fontSize: '11px', color: '#555', marginTop: '6px' }}>Submissions: {perf.submission_count} • Graded: {perf.graded_count} • Avg Score: {perf.average_score ?? 'N/A'}</div>}
            </div>
          );
        })}

        <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#0d47a1' }}></div><div className="st">Students Enrolled</div></div></div>
        {courseStudents.map((entry) => (
          <div key={entry.student.id} onClick={() => { setSelectedProfile(entry); fetchChat(entry.student.email); }} style={{ padding: '10px', background: '#fff', borderLeft: `4px solid ${entry.performance.is_low_performer ? '#c62828' : '#1b6b3a'}`, margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{entry.student.name}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{entry.student.reg_number || entry.student.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#999' }}>Attendance</div>
                <div style={{ fontWeight: 700 }}>{entry.attendance.attendance_rate}%</div>
              </div>
            </div>
          </div>
        ))}

        {selectedProfile && (
          <div style={{ margin: '10px', padding: '12px', background: '#f0f4ff', borderRadius: '8px', border: '1px solid #bbdefb' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>{selectedProfile.student.name} Profile</div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>Email: {selectedProfile.student.email}</div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>Department: {selectedProfile.student.department_name || 'N/A'}</div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>Attendance: {selectedProfile.attendance.attendance_rate}%</div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>GPA: {selectedProfile.performance.gpa}</div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>Predicted Grade: {selectedProfile.performance.predicted_grade}</div>
            <div style={{ fontSize: '12px', color: selectedProfile.performance.is_low_performer ? '#c62828' : '#1b6b3a', marginBottom: '8px' }}>{selectedProfile.performance.advice}</div>
            <div style={{ marginTop: '10px', padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '6px' }}>Text Student</div>
              <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px', padding: '6px', marginBottom: '8px', background: '#fafafa' }}>
                {chatMessages.length === 0 ? <div style={{ fontSize: '11px', color: '#999' }}>No messages yet</div> : chatMessages.map((msg) => <div key={msg.id} style={{ fontSize: '11px', marginBottom: '4px' }}><strong>{msg.sender_name}:</strong> {msg.message}</div>)}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Message student" style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }} />
                <button onClick={sendChat} style={{ padding: '6px 10px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px' }}>Send</button>
              </div>
            </div>
          </div>
        )}

        <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#ff9800' }}></div><div className="st">Grouped Submissions</div></div><button onClick={downloadBundle} style={{ padding: '6px 10px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 600 }}>⬇️ Bundle</button></div>
        {Object.entries(groupedSubmissions).map(([group, items]) => (
          <div key={group} style={{ margin: '8px 10px', padding: '10px', background: '#fff', borderLeft: '4px solid #ff9800', borderRadius: '4px' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px' }}>{group}</div>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid #eee' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>{item.student_name}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{item.status}{item.score !== null ? ` • ${item.score}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => downloadSubmission(item)} style={{ padding: '5px 8px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Download</button>
                  <button onClick={() => { setShowGradeForm(true); setGradingForm({ submissionId: item.id, score: item.score ?? '', feedback: item.feedback || '' }); }} style={{ padding: '5px 8px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Grade</button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {showGradeForm && (
          <div style={{ padding: '12px 10px', background: '#fff3e0', margin: '10px', borderRadius: '8px', border: '1px solid #ffb74d' }}>
            <input type="number" min="0" max="100" value={gradingForm.score} onChange={(e) => setGradingForm({ ...gradingForm, score: e.target.value })} placeholder="Score" style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ffb74d' }} />
            <textarea value={gradingForm.feedback} onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })} placeholder="Feedback" style={{ width: '100%', minHeight: '70px', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ffb74d' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={gradeSubmission} style={{ flex: 1, padding: '8px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px' }}>Save Grade</button>
              <button onClick={() => setShowGradeForm(false)} style={{ flex: 1, padding: '8px', background: '#ccc', border: 'none', borderRadius: '4px' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSchedule = () => (
    <div className="body">
      <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Weekly Planner</div></div></div>
      <div style={{ margin: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
        <input value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} placeholder="Task or class title" style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
        <select value={planForm.course_id} onChange={(e) => setPlanForm({ ...planForm, course_id: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }}>
          <option value="">Optional class</option>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
        </select>
        <input type="date" value={planForm.plan_date} onChange={(e) => setPlanForm({ ...planForm, plan_date: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <input type="time" value={planForm.start_time} onChange={(e) => setPlanForm({ ...planForm, start_time: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
          <input type="time" value={planForm.end_time} onChange={(e) => setPlanForm({ ...planForm, end_time: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
        </div>
        <textarea value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} placeholder="Notes" style={{ width: '100%', minHeight: '60px', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
        <button onClick={createPlan} style={{ padding: '8px 12px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save Plan</button>
      </div>

      <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#5c35a8' }}></div><div className="st">Calendar Timetable</div></div></div>
      <div style={{ margin: '0 10px 10px', display: 'flex', gap: '6px' }}>
        <button onClick={() => setScheduleFilter('today')} style={{ padding: '6px 10px', borderRadius: '4px', border: 'none', background: scheduleFilter === 'today' ? '#0d47a1' : '#e0e0e0', color: scheduleFilter === 'today' ? '#fff' : '#333', fontSize: '11px', cursor: 'pointer' }}>Today</button>
        <button onClick={() => setScheduleFilter('week')} style={{ padding: '6px 10px', borderRadius: '4px', border: 'none', background: scheduleFilter === 'week' ? '#0d47a1' : '#e0e0e0', color: scheduleFilter === 'week' ? '#fff' : '#333', fontSize: '11px', cursor: 'pointer' }}>This Week</button>
        <button onClick={() => setScheduleFilter('all')} style={{ padding: '6px 10px', borderRadius: '4px', border: 'none', background: scheduleFilter === 'all' ? '#0d47a1' : '#e0e0e0', color: scheduleFilter === 'all' ? '#fff' : '#333', fontSize: '11px', cursor: 'pointer' }}>All</button>
        <button onClick={fetchBaseData} style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: '4px', border: 'none', background: '#1b6b3a', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>Refresh</button>
      </div>
      {Object.keys(weeklyPlanner.calendar || {}).length === 0 ? (
        <div style={{ margin: '8px 10px', padding: '10px', background: '#fff', borderRadius: '4px', color: '#999', fontSize: '12px' }}>No calendar entries yet.</div>
      ) : (
        Object.keys(weeklyPlanner.calendar).sort().filter((dateKey) => isInWindow(dateKey)).map((dateKey) => (
          <div key={dateKey} style={{ margin: '8px 10px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '8px 10px', background: '#ede7f6', fontWeight: 700, fontSize: '12px' }}>{dateKey}</div>
            {(weeklyPlanner.calendar[dateKey] || []).map((item) => (
              <div key={item.id} style={{ padding: '8px 10px', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 700, fontSize: '12px' }}>{item.title}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{item.item_type} {item.course_code ? `• ${item.course_code}` : ''} {item.start_time ? `• ${item.start_time}` : ''}</div>
              </div>
            ))}
          </div>
        ))
      )}

      <>
        <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#0d47a1' }}></div><div className="st">Planned Items</div></div></div>
        {weeklyPlanner.plans.map((plan) => (
          <div key={plan.id} style={{ margin: '8px 10px', padding: '10px', background: '#fff', borderLeft: '4px solid #1b6b3a', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{plan.title}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{plan.plan_date}{plan.start_time ? ` • ${plan.start_time}` : ''}{plan.course_code ? ` • ${plan.course_code}` : ''}</div>
              {plan.notes && <div style={{ fontSize: '11px', color: '#888' }}>{plan.notes}</div>}
            </div>
            <button onClick={() => deletePlan(plan.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
          </div>
        ))}

        <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#1565c0' }}></div><div className="st">Zoom Directory</div></div></div>
        {weeklyPlanner.zoom_sessions.map((item) => (
          <div key={item.id} style={{ margin: '8px 10px', padding: '10px', background: '#fff', borderLeft: '4px solid #1565c0', borderRadius: '4px' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{item.title}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>{item.course_code} • {item.scheduled_for}</div>
          </div>
        ))}
      </>
    </div>
  );

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
        {currentTab === 'overview' && renderOverview()}
        {currentTab === 'courses' && renderCourses()}
        {currentTab === 'schedule' && renderSchedule()}
        <div style={{ height: '80px' }}></div>
      </div>

      <div className="tb" id="tb-lecturer">
        <div className="ti" onClick={() => setCurrentTab('overview')}><div className="tic" style={{ opacity: currentTab === 'overview' ? 1 : 0.4 }}>📊</div><div className="tlb">Overview</div></div>
        <div className="ti" onClick={() => setCurrentTab('courses')}><div className="tic" style={{ opacity: currentTab === 'courses' ? 1 : 0.4 }}>📚</div><div className="tlb">Classes</div></div>
        <div className="ti" onClick={() => setCurrentTab('schedule')}><div className="tic" style={{ opacity: currentTab === 'schedule' ? 1 : 0.4 }}>🗓️</div><div className="tlb">Schedule</div></div>
        <div className="ti" onClick={() => onLogout()}><div className="tic" style={{ opacity: 0.4 }}>🚪</div><div className="tlb">Logout</div></div>
      </div>
    </div>
  );
}
