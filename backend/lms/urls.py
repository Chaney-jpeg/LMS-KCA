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
    
    # Grading
    path('grades/', views.student_grades),
    path('assignments/', views.get_student_assignments),
    path('assignments/pending-grading/', views.get_assignments_for_grading),
    path('assignments/submit/', views.submit_assignment),
    path('submissions/<int:submission_id>/grade/', views.grade_assignment),
    
    # Dashboard stats
    path('dashboard/admin/', views.admin_dashboard),
    path('dashboard/lecturer/', views.lecturer_dashboard),
    path('dashboard/student/', views.student_dashboard),
    
    # Notifications and library
    path('notifs/', views.notifs),
    path('kira/', views.kira),
    path('library/items/', views.library_items),
    path('library/borrow/', views.library_borrow),
    path('library/return/', views.library_return),
    path('library/borrows/', views.student_borrows),
    
    # Attendance tracking
    path('attendance/mark/', views.mark_attendance),
    path('attendance/student/', views.student_attendance),
    path('attendance/course/', views.course_attendance),
    path('attendance/summary/', views.attendance_summary),
]