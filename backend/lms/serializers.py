from rest_framework import serializers
from .models import UserProfile, Course, Notification, LibraryItem, StudentBorrow, CourseMaterial
from .models import CourseEnrollment, FeesPayment, StudentGrade, AssignmentSubmission, Attendance
from .models import Department, ChatMessage, ZoomClass, LecturerPlan, StudentTimetableEntry


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code']

class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id','name','email','role','status','reg_number','phone','department','department_name','created_at']

class CourseSerializer(serializers.ModelSerializer):
    lecturer_name = serializers.CharField(source='lecturer.name', read_only=True)
    lecturer_id = serializers.IntegerField(source='lecturer.id', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Course
        fields = ['id','code','name','department','department_name','lecturer','lecturer_name','lecturer_id','enrolled_count','completion_percent','unit_fee']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id','role','title','body','time','read']

class LibraryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryItem
        fields = ['id','title','author','isbn','description','publication_year','copies_total','copies_available']

class CourseMaterialSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = CourseMaterial
        fields = ['id','course','title','material_type','description','file','file_url','uploaded_by','uploaded_by_name','uploaded_at']
        read_only_fields = ['file_url','uploaded_by_name','uploaded_at']

    def get_file_url(self, obj):
        request = self.context.get('request') if hasattr(self, 'context') else None
        if obj.file:
            try:
                if request is not None:
                    return request.build_absolute_uri(obj.file.url)
            except Exception:
                return obj.file.url
        return ''

class StudentBorrowSerializer(serializers.ModelSerializer):
    library_item = LibraryItemSerializer(read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = StudentBorrow
        fields = ['id','student','student_name','library_item','borrowed_date','due_date','returned_date','status']

class CourseEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)

    class Meta:
        model = CourseEnrollment
        fields = ['id','student','student_name','course','course_name','course_code','enrolled_date','status','progress_percent']

class FeesPaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    amount_balance = serializers.SerializerMethodField()

    class Meta:
        model = FeesPayment
        fields = ['id','student','student_name','amount_due','amount_paid','amount_balance','status','due_date','last_payment_date','created_at','updated_at']
        read_only_fields = ['created_at','updated_at']

    def get_amount_balance(self, obj):
        return float(obj.amount_due - obj.amount_paid)

class StudentGradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    graded_by_name = serializers.CharField(source='graded_by.name', read_only=True)

    class Meta:
        model = StudentGrade
        fields = ['id','student','student_name','course','course_name','course_code','raw_score','weighted_score','grade','graded_by','graded_by_name','graded_date','feedback','created_at']
        read_only_fields = ['created_at']

class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    assignment_title = serializers.CharField(source='assignment.title', read_only=True)
    submission_file_url = serializers.SerializerMethodField()

    class Meta:
        model = AssignmentSubmission
        fields = ['id','assignment','assignment_title','student','student_name','submission_file','submission_file_url','submission_date','status','score','feedback','graded_date']
        read_only_fields = ['submission_date','graded_date']

    def get_submission_file_url(self, obj):
        request = self.context.get('request') if hasattr(self, 'context') else None
        if obj.submission_file:
            try:
                if request is not None:
                    return request.build_absolute_uri(obj.submission_file.url)
            except Exception:
                return obj.submission_file.url
        return ''

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_reg = serializers.CharField(source='student.reg_number', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id','student','student_name','student_reg','course','course_name','course_code','date','status','check_in_time','remarks']
        read_only_fields = ['check_in_time']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'sender_name', 'recipient', 'recipient_name', 'course', 'course_code', 'message', 'created_at', 'is_read']


class ZoomClassSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    host_name = serializers.CharField(source='host.name', read_only=True)

    class Meta:
        model = ZoomClass
        fields = ['id', 'title', 'course', 'course_code', 'course_name', 'meeting_url', 'meeting_code', 'host', 'host_name', 'scheduled_for', 'created_at']


class LecturerPlanSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)

    class Meta:
        model = LecturerPlan
        fields = ['id', 'lecturer', 'course', 'course_code', 'course_name', 'title', 'plan_date', 'start_time', 'end_time', 'notes', 'created_at']


class StudentTimetableEntrySerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)

    class Meta:
        model = StudentTimetableEntry
        fields = ['id', 'student', 'course', 'course_code', 'course_name', 'title', 'entry_type', 'entry_date', 'start_time', 'end_time', 'notes', 'created_at']
