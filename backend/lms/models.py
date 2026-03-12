from django.db import models
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class UserProfile(models.Model):
    ROLE_CHOICES = [('ADMIN','ADMIN'),('LECTURER','LECTURER'),('STUDENT','STUDENT')]
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128, blank=True, null=True)  # Hashed password
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STUDENT')
    status = models.CharField(max_length=20, default='active')
    reg_number = models.CharField(max_length=50, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
    created_at = models.DateTimeField(default=timezone.now)

    def set_password(self, raw_password):
        """Hash and set the password"""
        self.password = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Verify password"""
        if not self.password:
            return False
        return check_password(raw_password, self.password)

    def __str__(self):
        return f"{self.name} ({self.role})"

class Course(models.Model):
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='courses')
    lecturer = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'LECTURER'})
    enrolled_count = models.IntegerField(default=0)
    completion_percent = models.IntegerField(default=0)
    unit_fee = models.DecimalField(max_digits=10, decimal_places=2, default=10000.00)

    def __str__(self):
        return f"{self.code} - {self.name}"


class CourseMaterial(models.Model):
    TYPE_CHOICES = [('MATERIAL','Material'),('ASSIGNMENT','Assignment'),('CAT','CAT')]
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='materials')
    title = models.CharField(max_length=255)
    material_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='MATERIAL')
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='materials/', blank=True, null=True)
    uploaded_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.course.code} - {self.title} ({self.material_type})"

class Notification(models.Model):
    role = models.CharField(max_length=20)
    title = models.CharField(max_length=255)
    body = models.TextField()
    time = models.CharField(max_length=100, blank=True)
    read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.role}: {self.title}"
class LibraryItem(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=20, unique=True, blank=True, null=True)
    description = models.TextField(blank=True)
    publication_year = models.IntegerField(blank=True, null=True)
    copies_total = models.IntegerField(default=1)
    copies_available = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.author}"

class StudentBorrow(models.Model):
    student = models.ForeignKey(UserProfile, on_delete=models.CASCADE, limit_choices_to={'role': 'STUDENT'})
    library_item = models.ForeignKey(LibraryItem, on_delete=models.CASCADE)
    borrowed_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField()
    returned_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=[('BORROWED', 'Borrowed'), ('RETURNED', 'Returned'), ('OVERDUE', 'Overdue')], default='BORROWED')

    def __str__(self):
        return f"{self.student.name} - {self.library_item.title}"

class CourseEnrollment(models.Model):
    STATUS_CHOICES = [('ACTIVE', 'Active'), ('COMPLETED', 'Completed'), ('WITHDRAWN', 'Withdrawn')]
    student = models.ForeignKey(UserProfile, on_delete=models.CASCADE, limit_choices_to={'role': 'STUDENT'}, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    progress_percent = models.IntegerField(default=0)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.name} - {self.course.code}"

class FeesPayment(models.Model):
    PAYMENT_STATUS = [('PENDING', 'Pending'), ('PAID', 'Paid'), ('PARTIAL', 'Partial'), ('OVERDUE', 'Overdue')]
    student = models.ForeignKey(UserProfile, on_delete=models.CASCADE, limit_choices_to={'role': 'STUDENT'}, related_name='fee_payments')
    amount_due = models.DecimalField(max_digits=10, decimal_places=2, default=150000.00)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='PENDING')
    due_date = models.DateField(blank=True, null=True)
    last_payment_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.name} - KES {self.amount_paid}/{self.amount_due}"

class StudentGrade(models.Model):
    GRADE_CHOICES = [('A', 'A (90-100)'), ('B', 'B (80-89)'), ('C', 'C (70-79)'), ('D', 'D (60-69)'), ('F', 'F (Below 60)'), ('PENDING', 'Pending')]
    student = models.ForeignKey(UserProfile, on_delete=models.CASCADE, limit_choices_to={'role': 'STUDENT'}, related_name='course_grades')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='student_grades')
    raw_score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    weighted_score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    grade = models.CharField(max_length=10, choices=GRADE_CHOICES, default='PENDING')
    graded_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'LECTURER'}, related_name='grades_given')
    graded_date = models.DateTimeField(blank=True, null=True)
    feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.name} - {self.course.code}: {self.grade}"

class AssignmentSubmission(models.Model):
    STATUS_CHOICES = [('SUBMITTED', 'Submitted'), ('GRADED', 'Graded'), ('LATE', 'Late Submission')]
    assignment = models.ForeignKey(CourseMaterial, on_delete=models.CASCADE, limit_choices_to={'material_type': 'ASSIGNMENT'}, related_name='submissions')
    student = models.ForeignKey(UserProfile, on_delete=models.CASCADE, limit_choices_to={'role': 'STUDENT'}, related_name='submissions')
    submission_file = models.FileField(upload_to='submissions/')
    submission_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUBMITTED')
    score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    feedback = models.TextField(blank=True)
    graded_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('assignment', 'student')

    def __str__(self):
        return f"{self.student.name} - {self.assignment.title}"

class EmailVerification(models.Model):
    email = models.EmailField(unique=False)
    code = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    name = models.CharField(max_length=200, blank=True, null=True)
    password = models.CharField(max_length=128, blank=True, null=True)
    role = models.CharField(max_length=20, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    reg_number = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.email} - {'Verified' if self.is_verified else 'Pending'}"

class Attendance(models.Model):
    STATUS_CHOICES = [('PRESENT', 'Present'), ('ABSENT', 'Absent'), ('LATE', 'Late')]
    student = models.ForeignKey(UserProfile, on_delete=models.CASCADE, limit_choices_to={'role': 'STUDENT'}, related_name='attendance_records')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PRESENT')
    check_in_time = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True)

    class Meta:
        unique_together = ('student', 'course', 'date')
        ordering = ['-date', '-check_in_time']

    def __str__(self):
        return f"{self.student.name} - {self.course.code} - {self.date} ({self.status})"


class ChatMessage(models.Model):
    sender = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='received_messages')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_messages')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.email} -> {self.recipient.email}"


class ZoomClass(models.Model):
    title = models.CharField(max_length=255)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='zoom_classes')
    meeting_url = models.URLField()
    meeting_code = models.CharField(max_length=100, blank=True)
    host = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'LECTURER'})
    scheduled_for = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_for']

    def __str__(self):
        return f"{self.title} ({self.course.code})"


class LecturerPlan(models.Model):
    lecturer = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='weekly_plans', limit_choices_to={'role': 'LECTURER'})
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='weekly_plans')
    title = models.CharField(max_length=255)
    plan_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['plan_date', 'start_time']

    def __str__(self):
        return f"{self.lecturer.name} - {self.title}"


class StudentTimetableEntry(models.Model):
    ENTRY_TYPE_CHOICES = [
        ('CLASS', 'Scheduled Class'),
        ('ASSIGNMENT', 'Assignment Deadline'),
        ('CAT', 'CAT / Test'),
        ('PERSONAL', 'Personal Plan'),
        ('EXAM', 'Exam'),
    ]
    student = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='timetable_entries', limit_choices_to={'role': 'STUDENT'})
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_timetable_entries')
    title = models.CharField(max_length=255)
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES, default='PERSONAL')
    entry_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['entry_date', 'start_time']

    def __str__(self):
        return f"{self.student.name} - {self.title} ({self.entry_date})"