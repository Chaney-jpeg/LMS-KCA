import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

export default function StudentDashboard({ user, onLogout }) {
  const [currentTab, setCurrentTab] = useState('overview');
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState({ total_courses: 0, fees_balance: 0, fees_paid: 0 });
  const [performanceProfile, setPerformanceProfile] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [resultsHistory, setResultsHistory] = useState([]);
  const [publicBooks, setPublicBooks] = useState([]);
  const [bookQuery, setBookQuery] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [timetable, setTimetable] = useState({ classes: [], deadlines: [], personal: [], calendar: {} });
  const [submissionForm, setSubmissionForm] = useState({ assignmentId: '', file: null });
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [timetableForm, setTimetableForm] = useState({ title: '', entry_type: 'PERSONAL', entry_date: '', start_time: '', end_time: '', notes: '' });
  const [showTimetableForm, setShowTimetableForm] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState('week');
  const [loading, setLoading] = useState(false);

  const fetchBaseData = useCallback(async () => {
    if (!user?.email) return;
    const [statsRes, perfRes, alertsRes, enrollRes] = await Promise.allSettled([
      axios.get(`${API_URL}/dashboard/student/?email=${user.email}`),
      axios.get(`${API_URL}/students/performance/?student_email=${user.email}`),
      axios.get(`${API_URL}/students/alerts/?student_email=${user.email}`),
      axios.get(`${API_URL}/enrollments/?student_email=${user.email}`),
    ]);

    if (statsRes.status === 'fulfilled') {
      setStats(statsRes.value.data || {});
    } else {
      console.error('Student dashboard stats error:', statsRes.reason);
    }

    if (perfRes.status === 'fulfilled') {
      setPerformanceProfile(perfRes.value.data || null);
    } else {
      console.error('Student performance error:', perfRes.reason);
    }

    if (alertsRes.status === 'fulfilled') {
      setAlerts(alertsRes.value.data?.alerts || []);
    } else {
      console.error('Student alerts error:', alertsRes.reason);
    }

    if (enrollRes.status === 'fulfilled') {
      setEnrollments(Array.isArray(enrollRes.value.data) ? enrollRes.value.data : []);
    } else {
      console.error('Student enrollments error:', enrollRes.reason);
      setEnrollments([]);
    }
  }, [user]);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  useEffect(() => {
    if (!user?.email) return;

    if (currentTab === 'overview') {
      axios.get(`${API_URL}/students/results/history/?student_email=${user.email}`)
        .then((res) => setResultsHistory(Array.isArray(res.data?.history) ? res.data.history : []))
        .catch(() => {});
    }

    if (currentTab === 'library') {
      searchBooks();
    }

    if (currentTab === 'timetable') {
      loadTimetable();
    }

    if (currentTab === 'units') {
      axios.get(`${API_URL}/enrollments/?student_email=${user.email}`)
        .then((res) => setEnrollments(Array.isArray(res.data) ? res.data : []))
        .catch((err) => {
          console.error('Units tab enrollments error:', err);
          setEnrollments([]);
        });
    }
  }, [currentTab, user]);

  const loadTimetable = async () => {
    if (!user?.email) return;
    try {
      const res = await axios.get(`${API_URL}/students/timetable/?student_email=${user.email}`);
      setTimetable(res.data || { classes: [], deadlines: [], personal: [], calendar: {} });
    } catch {
      setTimetable({ classes: [], deadlines: [], personal: [], calendar: {} });
    }
  };

  const downloadFeeReport = async () => {
    try {
      const response = await axios.get(`${API_URL}/students/fees/report/?student_email=${user?.email}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `fee-report-${user?.email}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download fee report');
    }
  };

  const downloadTranscript = async () => {
    try {
      const response = await axios.get(`${API_URL}/students/transcript/download/?student_email=${user?.email}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcript-${user?.email}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download transcript');
    }
  };

  const searchBooks = async () => {
    try {
      const res = await axios.get(`${API_URL}/library/public-books/?q=${encodeURIComponent(bookQuery || 'management')}`);
      setPublicBooks(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPublicBooks([]);
    }
  };

  const openWorkspace = async (enrollment) => {
    try {
      setSelectedEnrollment(enrollment);
      const res = await axios.get(`${API_URL}/student/courses/${enrollment.course}/workspace/?student_email=${user?.email}`);
      setWorkspace(res.data || null);
      setCurrentTab('units');
    } catch {
      alert('Failed to open unit workspace');
    }
  };

  const openWorkspaceFromSchedule = async (courseId, materialId = null) => {
    const picked = enrollments.find((enrollment) => enrollment.course === courseId);
    if (!picked) {
      alert('This unit is not currently in your enrolled list.');
      return;
    }

    await openWorkspace(picked);
    if (materialId) {
      setSubmissionForm({ assignmentId: materialId, file: null });
      setShowSubmissionForm(true);
    }
  };

  const downloadMaterial = async (materialId, fileName) => {
    try {
      const response = await axios.get(`${API_URL}/materials/${materialId}/download/?student_email=${user?.email}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `material-${materialId}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download material');
    }
  };

  const submitAssignment = async () => {
    if (!submissionForm.assignmentId || !submissionForm.file) {
      alert('Choose an assignment and file');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('assignment_id', submissionForm.assignmentId);
      formData.append('student_email', user?.email);
      formData.append('submission_file', submissionForm.file);
      await axios.post(`${API_URL}/assignments/submit/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowSubmissionForm(false);
      setSubmissionForm({ assignmentId: '', file: null });
      if (selectedEnrollment) {
        await openWorkspace(selectedEnrollment);
      }
      if (currentTab === 'timetable') {
        await loadTimetable();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit assignment');
    } finally {
      setLoading(false);
    }
  };

  const addTimetableEntry = async () => {
    if (!timetableForm.title || !timetableForm.entry_date) {
      alert('Title and date are required');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/students/timetable/`, { ...timetableForm, student_email: user?.email });
      setShowTimetableForm(false);
      setTimetableForm({ title: '', entry_type: 'PERSONAL', entry_date: '', start_time: '', end_time: '', notes: '' });
      await loadTimetable();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add planner entry');
    } finally {
      setLoading(false);
    }
  };

  const deleteTimetableEntry = async (entryId) => {
    try {
      await axios.delete(`${API_URL}/students/timetable/?student_email=${user?.email}&entry_id=${entryId}`);
      await loadTimetable();
    } catch {
      alert('Failed to delete entry');
    }
  };

  const gradeColor = (grade) => {
    if (!grade || grade === 'PENDING') return '#9e9e9e';
    if (grade === 'A') return '#1b6b3a';
    if (grade === 'B') return '#0d47a1';
    if (grade === 'C') return '#e65100';
    if (grade === 'D') return '#ff9800';
    return '#c62828';
  };

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
      <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Student Overview</div></div></div>
      <div className="stat-grid">
        <div className="stat-c cd" style={{ borderTopColor: '#1b6b3a' }}><div className="stat-v">{stats.total_courses}</div><div className="stat-l">Units</div></div>
        <div className="stat-c cd" style={{ borderTopColor: stats.fees_balance === 0 ? '#1b6b3a' : '#ff9800' }}><div className="stat-v">KES {stats.fees_balance}</div><div className="stat-l">Balance</div></div>
        <div className="stat-c cd" style={{ borderTopColor: '#0d47a1' }}><div className="stat-v">KES {stats.fees_paid}</div><div className="stat-l">Paid</div></div>
      </div>

      <div style={{ padding: '0 10px 10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={downloadFeeReport} style={{ padding: '8px 12px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Fee Report</button>
        <button onClick={downloadTranscript} style={{ padding: '8px 12px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Download Transcript</button>
      </div>

      {alerts.length > 0 && alerts.map((alert, index) => (
        <div key={index} style={{ padding: '10px', background: '#fff3e0', borderLeft: '4px solid #c62828', margin: '8px 10px', borderRadius: '4px', fontSize: '12px' }}>{alert.message}</div>
      ))}

      <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">My Units</div></div><div className="sa" onClick={() => setCurrentTab('units')} style={{ cursor: 'pointer' }}>Open Units</div></div>
      {enrollments.length === 0 ? (
        <div style={{ padding: '10px', margin: '8px 10px', background: '#fff3e0', borderLeft: '4px solid #ff9800', borderRadius: '4px', fontSize: '12px' }}>No units found for this account. Refresh or contact admin if newly registered.</div>
      ) : enrollments.map((item) => (
        <div key={item.id} onClick={() => openWorkspace(item)} style={{ padding: '12px 10px', background: '#fff', borderLeft: '4px solid #1b6b3a', margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }}>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.course_code}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{item.course_name}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>Progress: {item.progress_percent}%</div>
        </div>
      ))}

      <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#0d47a1' }}></div><div className="st">Past Semester Results</div></div></div>
      {resultsHistory.length === 0 ? (
        <div style={{ padding: '12px', color: '#999', fontSize: '12px' }}>No results history yet.</div>
      ) : resultsHistory.map((term, idx) => (
        <div key={idx} style={{ margin: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', background: '#e3f2fd', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{term.term}</div>
            <div style={{ fontSize: '12px', color: '#0d47a1', fontWeight: 600 }}>Avg: {term.average_score}%</div>
          </div>
          {term.results.map((result, i) => (
            <div key={i} style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>{result.course_code} - {result.course_name}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: gradeColor(result.grade) }}>{result.grade}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderUnits = () => {
    if (!selectedEnrollment || !workspace) {
      return (
        <div className="body">
          <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Unit Workspaces</div></div></div>
            <div style={{ margin: '0 10px 10px' }}>
              <button onClick={fetchBaseData} style={{ padding: '6px 10px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Refresh Units</button>
            </div>
          {enrollments.length === 0 ? (
            <div style={{ padding: '20px', color: '#999', fontSize: '13px', textAlign: 'center' }}>No units enrolled yet.</div>
          ) : enrollments.map((item) => (
            <div key={item.id} onClick={() => openWorkspace(item)} style={{ padding: '12px 10px', background: '#fff', borderLeft: '4px solid #1b6b3a', margin: '8px 10px', borderRadius: '4px', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.course_code}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{item.course_name}</div>
              <div style={{ fontSize: '11px', color: '#999' }}>Tap to access unit workspace</div>
            </div>
          ))}
        </div>
      );
    }

    const grade = workspace.grade_breakdown || {};

    return (
      <div className="body">
        <button onClick={() => { setSelectedEnrollment(null); setWorkspace(null); }} style={{ padding: '8px 14px', background: '#888', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', margin: '10px' }}>Back to Units</button>

        <div style={{ margin: '10px', padding: '12px', background: '#fff', borderRadius: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{workspace.course.code}</div>
          <div style={{ fontSize: '13px', color: '#666' }}>{workspace.course.name}</div>
          <div style={{ fontSize: '12px', marginTop: '6px' }}>Lecturer: {workspace.course.lecturer_name || 'TBA'}</div>
        </div>

        <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#1b6b3a' }}></div><div className="st">Grade Breakdown</div></div></div>
        <div style={{ margin: '8px 10px', padding: '10px', background: '#fff', borderLeft: '4px solid #1b6b3a', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px' }}>CAT (30%): {grade.cat_avg ?? 'N/A'}</div>
          <div style={{ fontSize: '12px' }}>Assignment (40%): {grade.assignment_avg ?? 'N/A'}</div>
          <div style={{ fontSize: '12px' }}>Attendance (30%): {grade.attendance_rate ?? 'N/A'}%</div>
          <div style={{ fontSize: '12px', fontWeight: 700 }}>Weighted Score: {grade.weighted_score ?? 'Pending'}</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: gradeColor(grade.computed_grade) }}>Grade: {grade.computed_grade || 'PENDING'}</div>
        </div>

        {showSubmissionForm && (
          <div style={{ padding: '12px', background: '#f0f4ff', margin: '10px', borderRadius: '8px', border: '1px solid #90caf9' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Submit Assignment/CAT</div>
            <input type="file" onChange={(event) => setSubmissionForm({ ...submissionForm, file: event.target.files?.[0] || null })} style={{ width: '100%', marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={submitAssignment} disabled={loading} style={{ flex: 1, padding: '8px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px' }}>Submit</button>
              <button onClick={() => setShowSubmissionForm(false)} style={{ flex: 1, padding: '8px', background: '#ccc', border: 'none', borderRadius: '4px' }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Materials, Assignments & CATs</div></div></div>
        {(workspace.materials || []).length === 0 ? (
          <div style={{ padding: '12px', margin: '8px 10px', background: '#fff', borderRadius: '4px', color: '#999', fontSize: '12px' }}>No learning resources uploaded for this unit yet.</div>
        ) : (() => {
          const cats = workspace.materials.filter(item => item.material.material_type === 'CAT');
          const assignments = workspace.materials.filter(item => item.material.material_type === 'ASSIGNMENT');
          const notes = workspace.materials.filter(item => !['CAT', 'ASSIGNMENT'].includes(item.material.material_type));
          const sections = [
            { label: '🧪 CATs', items: cats, color: '#7b1fa2' },
            { label: '📝 Assignments', items: assignments, color: '#e65100' },
            { label: '📖 Lecture Notes', items: notes, color: '#1b6b3a' },
          ];
          return sections.map(({ label, items, color }) => items.length === 0 ? null : (
            <div key={label}>
              <div style={{ margin: '12px 10px 4px', fontSize: '12px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              {items.map((item, index) => {
                const material = item.material;
                const submission = item.submission;
                const isCAT = material.material_type === 'CAT';
                const actionable = ['ASSIGNMENT', 'CAT'].includes(material.material_type);
                const borderColor = isCAT ? '#7b1fa2' : (actionable ? '#e65100' : '#1b6b3a');
                const submittedStatus = submission?.status;
                return (
                  <div key={index} style={{ padding: '11px 10px', background: '#fff', borderLeft: `4px solid ${borderColor}`, margin: '4px 10px 8px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', flex: 1 }}>{material.title}</div>
                      {submittedStatus && (
                        <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                          background: submittedStatus === 'GRADED' ? '#e8f5e9' : '#fff3e0',
                          color: submittedStatus === 'GRADED' ? '#2e7d32' : '#e65100',
                          border: `1px solid ${submittedStatus === 'GRADED' ? '#a5d6a7' : '#ffcc80'}` }}>
                          {submittedStatus === 'GRADED' ? `✓ Graded ${submission.score != null ? `(${submission.score})` : ''}` : '⏳ Submitted'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{material.description}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {material.file_url && <button onClick={() => downloadMaterial(material.id, material.title)} style={{ padding: '6px 10px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Download</button>}
                      {actionable && (
                        <button onClick={() => { setSubmissionForm({ assignmentId: material.id, file: null }); setShowSubmissionForm(true); }}
                          style={{ padding: '6px 10px', background: submittedStatus ? '#757575' : borderColor, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                          {submission ? 'Resubmit' : (isCAT ? 'Attempt CAT' : 'Submit')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>
    );
  };

  const renderTimetable = () => {
    const calendarDates = Object.keys(timetable.calendar || {}).sort().filter((date) => isInWindow(date));

    return (
      <div className="body">
        <div className="sh">
          <div className="sr"><div className="sb2" style={{ background: '#5c35a8' }}></div><div className="st">My Unit Schedule</div></div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="sa" onClick={() => loadTimetable()} style={{ cursor: 'pointer' }}>Refresh</div>
            <div className="sa" onClick={() => setShowTimetableForm(!showTimetableForm)} style={{ cursor: 'pointer' }}>+ Add Plan</div>
          </div>
        </div>

        <div style={{ margin: '0 10px 10px', display: 'flex', gap: '6px' }}>
          <button onClick={() => setScheduleFilter('today')} style={{ padding: '6px 10px', borderRadius: '4px', border: 'none', background: scheduleFilter === 'today' ? '#0d47a1' : '#e0e0e0', color: scheduleFilter === 'today' ? '#fff' : '#333', fontSize: '11px', cursor: 'pointer' }}>Today</button>
          <button onClick={() => setScheduleFilter('week')} style={{ padding: '6px 10px', borderRadius: '4px', border: 'none', background: scheduleFilter === 'week' ? '#0d47a1' : '#e0e0e0', color: scheduleFilter === 'week' ? '#fff' : '#333', fontSize: '11px', cursor: 'pointer' }}>This Week</button>
          <button onClick={() => setScheduleFilter('all')} style={{ padding: '6px 10px', borderRadius: '4px', border: 'none', background: scheduleFilter === 'all' ? '#0d47a1' : '#e0e0e0', color: scheduleFilter === 'all' ? '#fff' : '#333', fontSize: '11px', cursor: 'pointer' }}>All</button>
        </div>

        {showTimetableForm && (
          <div style={{ margin: '0 10px 10px', padding: '12px', background: '#f3e5f5', borderRadius: '8px', border: '1px solid #ce93d8' }}>
            <input placeholder="Title *" value={timetableForm.title} onChange={(event) => setTimetableForm({ ...timetableForm, title: event.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ce93d8', marginBottom: '8px' }} />
            <select value={timetableForm.entry_type} onChange={(event) => setTimetableForm({ ...timetableForm, entry_type: event.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ce93d8', marginBottom: '8px' }}>
              <option value="PERSONAL">Personal Plan</option>
              <option value="CLASS">Class Reminder</option>
              <option value="ASSIGNMENT">Assignment Deadline</option>
              <option value="CAT">CAT / Test</option>
              <option value="EXAM">Exam</option>
            </select>
            <input type="date" value={timetableForm.entry_date} onChange={(event) => setTimetableForm({ ...timetableForm, entry_date: event.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ce93d8', marginBottom: '8px' }} />
            <textarea placeholder="Notes" value={timetableForm.notes} onChange={(event) => setTimetableForm({ ...timetableForm, notes: event.target.value })} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ce93d8', marginBottom: '8px' }} />
            <button onClick={addTimetableEntry} disabled={loading} style={{ padding: '8px 12px', background: '#7b1fa2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save Planner Entry</button>
          </div>
        )}

        <div className="sh"><div className="sr"><div className="sb2" style={{ background: '#0d47a1' }}></div><div className="st">Calendar View</div></div></div>
        {calendarDates.length === 0 ? (
          <div style={{ padding: '12px', color: '#999', fontSize: '12px' }}>No schedule items yet.</div>
        ) : calendarDates.map((date) => (
          <div key={date} style={{ margin: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            <div style={{ padding: '8px 10px', background: '#e3f2fd', fontWeight: 700, fontSize: '12px' }}>{date}</div>
            {(timetable.calendar[date] || []).map((item) => (
              <div key={item.id} style={{ padding: '8px 10px', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 700, fontSize: '12px' }}>{item.title}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{item.item_type} {item.course_code ? `• ${item.course_code}` : ''} {item.time ? `• ${item.time}` : ''}</div>
                {(item.item_type === 'ASSIGNMENT' || item.item_type === 'CAT') && item.meta?.course_id && (
                  <div style={{ marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.meta.is_overdue && !item.meta.already_submitted && (
                      <span style={{ padding: '2px 6px', borderRadius: '10px', background: '#c62828', color: '#fff', fontSize: '10px', fontWeight: 700 }}>Overdue</span>
                    )}
                    <button
                      onClick={() => openWorkspaceFromSchedule(item.meta.course_id, item.meta.material_id)}
                      style={{ padding: '6px 10px', background: item.meta.already_submitted ? '#9e9e9e' : (item.meta.is_overdue ? '#c62828' : '#ff9800'), color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      {item.meta.already_submitted ? 'Submitted' : (item.meta.is_overdue ? 'Submit Now' : 'Submit from Unit')}
                    </button>
                  </div>
                )}
                {item.item_type === 'PERSONAL' && item.meta?.id && (
                  <button onClick={() => deleteTimetableEntry(item.meta.id)} style={{ marginTop: '6px', padding: '4px 8px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderLibrary = () => (
    <div className="body">
      <div className="sh"><div className="sr"><div className="sb2"></div><div className="st">Public Library</div></div></div>
      <div style={{ margin: '10px', display: 'flex', gap: '8px' }}>
        <input value={bookQuery} onChange={(event) => setBookQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && searchBooks()} placeholder="Search materials..." style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
        <button onClick={searchBooks} style={{ padding: '8px 12px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Search</button>
      </div>
      {publicBooks.map((book, index) => (
        <div key={index} style={{ padding: '10px', background: '#fff', borderLeft: '4px solid #0d47a1', margin: '8px 10px', borderRadius: '4px' }}>
          <div style={{ fontWeight: 700, fontSize: '13px' }}>{book.title}</div>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>{book.authors}</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {book.read_url && <button onClick={() => window.open(book.read_url, '_blank')} style={{ padding: '6px 10px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Read</button>}
            {book.download_url && <button onClick={() => window.open(book.download_url, '_blank')} style={{ padding: '6px 10px', background: '#1b6b3a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Download</button>}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="sc on">
      <div className="hdr" style={{ background: '#1b5e20' }}>
        <div style={{ paddingBottom: '12px', position: 'relative', zIndex: 1 }}>
          <div className="rp" style={{ background: 'rgba(255,255,255,.15)', borderColor: 'rgba(255,255,255,.25)', color: '#fff', marginBottom: '5px' }}>🎓 STUDENT</div>
          <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '18px', fontWeight: 700, color: '#fff', margin: '4px 0 3px' }}>Learning Workspace</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.65)' }}>{user?.email}</div>
        </div>
      </div>

      <div className="scrollable">
        {currentTab === 'overview' && renderOverview()}
        {currentTab === 'units' && renderUnits()}
        {currentTab === 'timetable' && renderTimetable()}
        {currentTab === 'library' && renderLibrary()}
        <div style={{ height: '80px' }}></div>
      </div>

      <div className="tb" id="tb-student">
        <div className="ti" onClick={() => setCurrentTab('overview')}><div className="tic" style={{ opacity: currentTab === 'overview' ? 1 : 0.5 }}>🏠</div><div className="tlb">Overview</div></div>
        <div className="ti" onClick={() => setCurrentTab('units')}><div className="tic" style={{ opacity: currentTab === 'units' ? 1 : 0.5 }}>📚</div><div className="tlb">Units</div></div>
        <div className="ti" onClick={() => setCurrentTab('timetable')}><div className="tic" style={{ opacity: currentTab === 'timetable' ? 1 : 0.5 }}>🗓️</div><div className="tlb">Schedule</div></div>
        <div className="ti" onClick={() => setCurrentTab('library')}><div className="tic" style={{ opacity: currentTab === 'library' ? 1 : 0.5 }}>📖</div><div className="tlb">Library</div></div>
        <div className="ti" onClick={() => onLogout()}><div className="tic" style={{ opacity: 0.7 }}>🚪</div><div className="tlb">Logout</div></div>
      </div>
    </div>
  );
}
