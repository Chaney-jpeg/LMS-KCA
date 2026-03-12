from django.urls import path
from . import views

urlpatterns = [
    # User management
    path('users/', views.users),
    path('users/<int:user_id>/', views.user_detail),
    path('login/', views.login),
    
    # Registration
    path('register/', views.register),
    path('verify-email/', views.verify_email),

    # Department and semester planning
    path('departments/', views.departments),
    path('departments/<int:department_id>/courses/', views.department_courses),
    
    # Course management
    path('courses/', views.courses),
    path('courses/<int:course_id>/', views.course_detail),
    path('courses/<int:course_id>/materials/', views.course_materials),
    path('materials/<int:material_id>/download/', views.download_material),
    
    # Course enrollment
    path('enrollments/', views.course_enrollments),
    
    # Fees and payments
    path('fees/payments/', views.fees_payments),
    path('fees/payments/<int:payment_id>/', views.record_fee_payment),
    path('fees/enforce-status/', views.enforce_user_fee_status),
    
    # Grading
    path('grades/', views.student_grades),
    path('students/performance/', views.student_performance),
    path('lecturer/students/', views.lecturer_students),
    path('lecturer/courses/<int:course_id>/students/', views.lecturer_course_students),
    path('lecturer/courses/<int:course_id>/submissions/', views.lecturer_course_submissions),
    path('lecturer/courses/<int:course_id>/submissions/bundle/', views.download_course_submissions_bundle),
    path('lecturer/courses/<int:course_id>/material-performance/', views.lecturer_course_material_performance),
    path('lecturer/weekly-plan/', views.lecturer_weekly_plan),
    path('profiles/report/', views.user_profile_report),
    path('admin/academic-report/', views.admin_academic_report),
    path('assignments/', views.get_student_assignments),
    path('assignments/pending-grading/', views.get_assignments_for_grading),
    path('assignments/submit/', views.submit_assignment),
    path('submissions/<int:submission_id>/download/', views.download_submission),
    path('submissions/<int:submission_id>/grade/', views.grade_assignment),
    path('student/courses/<int:course_id>/workspace/', views.student_course_workspace),
    
    # Dashboard stats
    path('dashboard/admin/', views.admin_dashboard),
    path('dashboard/lecturer/', views.lecturer_dashboard),
    path('dashboard/student/', views.student_dashboard),
    
    # Notifications and library
    path('notifs/', views.notifs),
    path('notices/manage/', views.notices_manage),
    path('kira/', views.kira),
    path('chat/', views.course_chat),
    path('library/items/', views.library_items),
    path('library/public-books/', views.public_books),
    path('library/borrow/', views.library_borrow),
    path('library/return/', views.library_return),
    path('library/borrows/', views.student_borrows),
    path('students/results/history/', views.student_results_history),
    path('students/fees/report/', views.student_fee_report_download),
    path('students/alerts/', views.academic_alerts),
    path('students/timetable/', views.student_timetable),
    path('students/transcript/download/', views.student_results_transcript_download),
    path('zoom/directory/', views.zoom_directory),
    
    # Attendance tracking
    path('attendance/mark/', views.mark_attendance),
    path('attendance/student/', views.student_attendance),
    path('attendance/course/', views.course_attendance),
    path('attendance/summary/', views.attendance_summary),
]