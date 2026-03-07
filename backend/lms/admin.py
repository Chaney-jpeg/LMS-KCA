from django.contrib import admin
from django.contrib.auth.models import User, Group
from .models import (
    UserProfile, Course, Notification, LibraryItem, StudentBorrow, 
    Attendance, CourseEnrollment, CourseMaterial, StudentGrade, 
    AssignmentSubmission, FeesPayment, EmailVerification
)

# Unregister default User/Group admin (Python 3.14 compatibility fix)
admin.site.unregister(User)
admin.site.unregister(Group)

# Custom admin classes for better display
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['email', 'name', 'role', 'reg_number', 'status', 'created_at']
    list_filter = ['role', 'status']
    search_fields = ['email', 'name', 'reg_number']

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'lecturer', 'enrolled_count', 'completion_percent']
    search_fields = ['code', 'name']

@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'enrolled_date']
    list_filter = ['course']
    search_fields = ['student__name', 'student__email', 'course__name']

@admin.register(CourseMaterial)
class CourseMaterialAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'material_type', 'uploaded_by', 'uploaded_at']
    list_filter = ['material_type', 'course']
    search_fields = ['title', 'course__name']

@admin.register(StudentGrade)
class StudentGradeAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'grade', 'raw_score', 'weighted_score']
    list_filter = ['course', 'grade']
    search_fields = ['student__name', 'course__name']

@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ['student', 'assignment', 'status', 'submission_date', 'score']
    list_filter = ['status', 'assignment__course']
    search_fields = ['student__name', 'assignment__title']

@admin.register(FeesPayment)
class FeesPaymentAdmin(admin.ModelAdmin):
    list_display = ['student', 'amount_paid', 'amount_due', 'status', 'last_payment_date']
    list_filter = ['status']
    search_fields = ['student__name', 'student__reg_number']

# Register remaining models with default admin
admin.site.register(Notification)
admin.site.register(LibraryItem)
admin.site.register(StudentBorrow)
admin.site.register(Attendance)
admin.site.register(EmailVerification)
