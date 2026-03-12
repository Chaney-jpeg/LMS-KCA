from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import UserProfile, Course, Notification, LibraryItem, StudentBorrow, CourseMaterial
from .models import CourseEnrollment, FeesPayment, StudentGrade, AssignmentSubmission, Attendance
from .models import Department, ChatMessage, ZoomClass, LecturerPlan, StudentTimetableEntry
from .serializers import UserSerializer, CourseSerializer, NotificationSerializer, LibraryItemSerializer, StudentBorrowSerializer, CourseMaterialSerializer
from .serializers import CourseEnrollmentSerializer, FeesPaymentSerializer, StudentGradeSerializer, AssignmentSubmissionSerializer, AttendanceSerializer
from .serializers import DepartmentSerializer, ChatMessageSerializer, ZoomClassSerializer, LecturerPlanSerializer, StudentTimetableEntrySerializer
from django.shortcuts import get_object_or_404
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Q
from django.http import FileResponse
from django.http import HttpResponse
from decimal import Decimal
import random
import csv
import os
import requests
import io
import zipfile
from django.utils.text import slugify


def _grade_from_score(score):
    if score is None:
        return 'PENDING'
    score = float(score)
    if score >= 90:
        return 'A'
    if score >= 80:
        return 'B'
    if score >= 70:
        return 'C'
    if score >= 60:
        return 'D'
    return 'F'


def _email_matches_role_pattern(email, role):
    local_part = (email or '').split('@')[0].strip().lower()
    if not local_part:
        return False

    if role == 'STUDENT':
        return local_part[0].isdigit()
    if role == 'LECTURER':
        return local_part[0].isalpha()
    if role == 'ADMIN':
        return local_part.startswith('admin')
    return True


def _role_email_error(role):
    if role == 'STUDENT':
        return 'Student email must start with a number (e.g. 2023001@student.kca.ac.ke)'
    if role == 'LECTURER':
        return 'Lecturer email must start with a name/letter (e.g. sarah.kamau@kca.ac.ke)'
    if role == 'ADMIN':
        return 'Admin email must start with admin (e.g. admin@kca.ac.ke)'
    return 'Invalid email format for role'


def _grade_points(letter):
    mapping = {'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0}
    return mapping.get(letter, 0.0)


def _attendance_metrics(student, course_ids=None):
    attendance_qs = Attendance.objects.filter(student=student)
    if course_ids:
        attendance_qs = attendance_qs.filter(course_id__in=course_ids)

    total_attendance = attendance_qs.count()
    present_count = attendance_qs.filter(status='PRESENT').count()
    late_count = attendance_qs.filter(status='LATE').count()
    weighted_present = present_count + (late_count * 0.5)
    attendance_rate = (weighted_present / total_attendance * 100) if total_attendance > 0 else 0
    return total_attendance, round(attendance_rate, 2)


def _compute_unit_weighted_score(student, course):
    """Compute weighted unit score: CAT 30% + Assignment avg 40% + Attendance 30%"""
    # CAT scores
    cat_submissions = AssignmentSubmission.objects.filter(
        student=student, assignment__course=course,
        assignment__material_type='CAT', status='GRADED', score__isnull=False
    )
    cat_avg = (sum(float(s.score) for s in cat_submissions) / cat_submissions.count()) if cat_submissions.exists() else None

    # Assignment scores
    assign_submissions = AssignmentSubmission.objects.filter(
        student=student, assignment__course=course,
        assignment__material_type='ASSIGNMENT', status='GRADED', score__isnull=False
    )
    assign_avg = (sum(float(s.score) for s in assign_submissions) / assign_submissions.count()) if assign_submissions.exists() else None

    # Attendance
    att_qs = Attendance.objects.filter(student=student, course=course)
    total_att = att_qs.count()
    if total_att > 0:
        present = att_qs.filter(status='PRESENT').count()
        late = att_qs.filter(status='LATE').count()
        att_rate = ((present + late * 0.5) / total_att) * 100
    else:
        att_rate = None

    # Also check StudentGrade for direct raw/weighted score
    sg = StudentGrade.objects.filter(student=student, course=course).first()

    # Weighted combination — only include components that exist
    components = []
    weights = []
    if cat_avg is not None:
        components.append(cat_avg * 0.30)
        weights.append(0.30)
    if assign_avg is not None:
        components.append(assign_avg * 0.40)
        weights.append(0.40)
    if att_rate is not None:
        components.append(att_rate * 0.30)
        weights.append(0.30)

    if components:
        total_weight = sum(weights)
        # Normalize by available component weights so partial data still yields a comparable score.
        weighted_score = min(100.0, float(sum(components) / total_weight))
    elif sg and sg.raw_score is not None:
        weighted_score = float(sg.raw_score)
    else:
        weighted_score = None

    return {
        'cat_avg': round(cat_avg, 1) if cat_avg is not None else None,
        'assignment_avg': round(assign_avg, 1) if assign_avg is not None else None,
        'attendance_rate': round(att_rate, 1) if att_rate is not None else None,
        'weighted_score': round(weighted_score, 1) if weighted_score is not None else None,
        'grade_object': sg,
        'cat_count': cat_submissions.count() if cat_submissions.exists() else 0,
        'assign_count': assign_submissions.count() if assign_submissions.exists() else 0,
    }


def _student_performance_payload(student, course_ids=None):
    enrollments_qs = CourseEnrollment.objects.filter(student=student, status='ACTIVE').select_related('course')
    if course_ids:
        enrollments_qs = enrollments_qs.filter(course_id__in=course_ids)

    total_attendance, attendance_rate = _attendance_metrics(student, course_ids=course_ids)

    # Compute weighted scores per unit
    unit_scores = []
    for enrollment in enrollments_qs:
        unit_data = _compute_unit_weighted_score(student, enrollment.course)
        if unit_data['weighted_score'] is not None:
            unit_scores.append(unit_data['weighted_score'])

    # Also fall through to StudentGrade if no submission-based data
    grades_qs = StudentGrade.objects.filter(student=student)
    if course_ids:
        grades_qs = grades_qs.filter(course_id__in=course_ids)
    graded_objs = [g for g in grades_qs if g.grade and g.grade != 'PENDING']

    if unit_scores:
        avg_score = sum(unit_scores) / len(unit_scores)
        grade_letters = [_grade_from_score(s) for s in unit_scores]
        base_gpa = sum(_grade_points(l) for l in grade_letters) / len(grade_letters)
    elif graded_objs:
        base_gpa = sum(_grade_points(g.grade) for g in graded_objs) / len(graded_objs)
        avg_score = sum(float(g.raw_score or 0) for g in graded_objs) / len(graded_objs)
    else:
        base_gpa = 0
        avg_score = 0

    # Attendance influence on GPA (small adjustment)
    att_adj = ((attendance_rate - 75) / 100) * 0.25
    adjusted_gpa = max(0.0, min(4.0, round(base_gpa + att_adj, 2)))

    # Trajectory GPA: look at grade history across all terms
    all_grades = StudentGrade.objects.filter(student=student, grade__in=['A', 'B', 'C', 'D', 'F']).order_by('created_at')
    term_gpas = {}
    for g in all_grades:
        date_ref = g.graded_date.date() if g.graded_date else g.created_at.date()
        term = _term_label(date_ref)
        term_gpas.setdefault(term, []).append(_grade_points(g.grade))
    term_averages = [(term, sum(pts) / len(pts)) for term, pts in term_gpas.items()]
    term_averages.sort(key=lambda x: x[0])

    # Trend: positive/negative/flat
    if len(term_averages) >= 2:
        recent = term_averages[-1][1]
        previous = term_averages[-2][1]
        trajectory_delta = round(recent - previous, 2)
        trajectory = 'improving' if trajectory_delta > 0.1 else ('declining' if trajectory_delta < -0.1 else 'stable')
    else:
        trajectory_delta = 0
        trajectory = 'insufficient_data'

    # Predicted GPA based on current trajectory
    if trajectory == 'improving':
        predicted_gpa = min(4.0, round(adjusted_gpa + abs(trajectory_delta) * 0.5, 2))
    elif trajectory == 'declining':
        predicted_gpa = max(0.0, round(adjusted_gpa - abs(trajectory_delta) * 0.5, 2))
    else:
        predicted_gpa = adjusted_gpa

    predicted_score = max(0, min(100, avg_score + ((attendance_rate - 70) * 0.25)))
    predicted_grade = _grade_from_score(predicted_score)

    is_low_performer = adjusted_gpa < 2.0 or attendance_rate < 65
    if adjusted_gpa < 1.5:
        advice = 'Performance is at risk. Attend all classes, submit all assignments, and schedule lecturer consultations this week.'
    elif attendance_rate < 65:
        advice = 'Attendance is lowering your GPA. Improve class attendance to increase your predicted grade and final GPA.'
    elif adjusted_gpa < 2.5:
        advice = 'You are close to improvement. Focus on weak courses and complete assignments before deadlines.'
    else:
        advice = 'Good progress. Maintain attendance and continue consistent coursework to sustain GPA growth.'

    return {
        'student_id': student.id,
        'student_name': student.name,
        'student_email': student.email,
        'reg_number': student.reg_number,
        'graded_courses': len(unit_scores) if unit_scores else len(graded_objs),
        'attendance_records': total_attendance,
        'attendance_rate': attendance_rate,
        'base_gpa': round(base_gpa, 2),
        'gpa': adjusted_gpa,
        'predicted_gpa': predicted_gpa,
        'trajectory': trajectory,
        'trajectory_delta': trajectory_delta,
        'term_history': [{'term': t, 'gpa': round(g, 2)} for t, g in term_averages],
        'predicted_score': round(predicted_score, 1),
        'predicted_grade': predicted_grade,
        'is_low_performer': is_low_performer,
        'advice': advice,
    }


CATALOG_TEMPLATE = {
    'BUS': {
        'name': 'Business',
        'courses': [
            'Financial Accounting', 'Managerial Accounting', 'Business Statistics', 'Corporate Finance', 'Microeconomics',
            'Macroeconomics', 'Business Law', 'Strategic Management', 'Marketing Principles', 'Digital Marketing',
            'Operations Management', 'Human Resource Management', 'Entrepreneurship', 'International Business', 'Business Ethics',
            'Project Management', 'Supply Chain Management', 'Investment Analysis', 'Taxation Fundamentals', 'Management Information Systems'
        ]
    },
    'TECH': {
        'name': 'Technology',
        'courses': [
            'Programming Fundamentals', 'Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems',
            'Computer Networks', 'Web Development', 'Mobile Application Development', 'Software Engineering', 'Artificial Intelligence',
            'Machine Learning', 'Cloud Computing', 'Cybersecurity', 'DevOps Engineering', 'Human Computer Interaction',
            'Systems Analysis', 'Data Science', 'Internet of Things', 'Distributed Systems', 'Computer Architecture'
        ]
    },
    'PSY': {
        'name': 'Psychology',
        'courses': [
            'Introduction to Psychology', 'Developmental Psychology', 'Social Psychology', 'Cognitive Psychology', 'Abnormal Psychology',
            'Biopsychology', 'Personality Psychology', 'Psychological Assessment', 'Clinical Psychology', 'Counseling Psychology',
            'Research Methods in Psychology', 'Statistics for Psychology', 'Educational Psychology', 'Health Psychology', 'Industrial Psychology',
            'Forensic Psychology', 'Positive Psychology', 'Behavioral Neuroscience', 'Cross Cultural Psychology', 'Psychology of Learning'
        ]
    }
}


def _ensure_department_catalog():
    lecturer_ids = list(UserProfile.objects.filter(role='LECTURER').values_list('id', flat=True))
    lecturer_pool = [item for item in lecturer_ids if item]
    current_index = 0

    for code, payload in CATALOG_TEMPLATE.items():
        dept, _ = Department.objects.get_or_create(code=code, defaults={'name': payload['name']})
        if dept.name != payload['name']:
            dept.name = payload['name']
            dept.save(update_fields=['name'])

        for index, course_name in enumerate(payload['courses'], start=1):
            course_code = f"{code}{index:03d}"
            defaults = {
                'name': course_name,
                'department': dept,
                'unit_fee': Decimal('10000.00')
            }
            if lecturer_pool:
                defaults['lecturer_id'] = lecturer_pool[current_index % len(lecturer_pool)]
                current_index += 1

            course, created = Course.objects.get_or_create(code=course_code, defaults=defaults)
            if not created:
                changed = False
                if course.department_id != dept.id:
                    course.department = dept
                    changed = True
                if not course.unit_fee:
                    course.unit_fee = Decimal('10000.00')
                    changed = True
                if changed:
                    course.save()


def _semester_fee_total(course_count):
    return (Decimal('10000.00') * Decimal(course_count)) + Decimal('8000.00')


def _term_label(date_obj):
    month = date_obj.month
    if month <= 4:
        return f"{date_obj.year} Term 1"
    if month <= 8:
        return f"{date_obj.year} Term 2"
    return f"{date_obj.year} Term 3"


def _file_extension(path_name):
    return os.path.splitext(path_name or '')[1] or ''


def _friendly_material_filename(material):
    ext = _file_extension(material.file.name if material.file else '')
    return f"{slugify(material.course.code)}-{slugify(material.title)}{ext}"


def _friendly_submission_filename(submission):
    ext = _file_extension(submission.submission_file.name if submission.submission_file else '')
    student_part = slugify(submission.student.reg_number or submission.student.name)
    assignment_part = slugify(submission.assignment.title)
    return f"{slugify(submission.assignment.course.code)}-{student_part}-{assignment_part}{ext}"


def _recalculate_course_progress(course):
    total_materials = CourseMaterial.objects.filter(course=course).count()
    completion_percent = min(100, total_materials * 10)
    if course.completion_percent != completion_percent:
        course.completion_percent = completion_percent
        course.save(update_fields=['completion_percent'])

    CourseEnrollment.objects.filter(course=course, status='ACTIVE').update(progress_percent=completion_percent)


def _assign_missing_departments():
    departments = list(Department.objects.all())
    if not departments:
        return

    for lecturer in UserProfile.objects.filter(role='LECTURER', department__isnull=True):
        taught = Course.objects.filter(lecturer=lecturer, department__isnull=False).first()
        lecturer.department = taught.department if taught else random.choice(departments)
        lecturer.save(update_fields=['department'])

    for student in UserProfile.objects.filter(role='STUDENT', department__isnull=True):
        enrolled = CourseEnrollment.objects.filter(student=student, course__department__isnull=False).select_related('course__department').first()
        student.department = enrolled.course.department if enrolled else random.choice(departments)
        student.save(update_fields=['department'])


def _normalize_student_enrollments(student, min_courses=3, max_courses=6):
    active_qs = CourseEnrollment.objects.filter(student=student, status='ACTIVE').select_related('course').order_by('enrolled_date', 'id')
    active_list = list(active_qs)
    affected_course_ids = set(item.course_id for item in active_list)

    if len(active_list) > max_courses:
        for extra in active_list[max_courses:]:
            extra.status = 'DROPPED'
            extra.save(update_fields=['status'])
            affected_course_ids.add(extra.course_id)
        active_list = active_list[:max_courses]

    if len(active_list) < min_courses:
        department = student.department
        existing_ids = set(item.course_id for item in active_list)
        needed = min_courses - len(active_list)

        candidates = Course.objects.all()
        if department:
            dept_candidates = candidates.filter(department=department)
            if dept_candidates.exists():
                candidates = dept_candidates

        for course in candidates.exclude(id__in=existing_ids)[:needed]:
            enrollment, _ = CourseEnrollment.objects.get_or_create(
                student=student,
                course=course,
                defaults={'status': 'ACTIVE', 'progress_percent': 0}
            )
            if enrollment.status != 'ACTIVE':
                enrollment.status = 'ACTIVE'
                enrollment.save(update_fields=['status'])
            active_list.append(enrollment)
            affected_course_ids.add(course.id)

    if affected_course_ids:
        for course in Course.objects.filter(id__in=affected_course_ids):
            enrolled_count = CourseEnrollment.objects.filter(course=course, status='ACTIVE').count()
            if course.enrolled_count != enrolled_count:
                course.enrolled_count = enrolled_count
                course.save(update_fields=['enrolled_count'])

    return CourseEnrollment.objects.filter(student=student, status='ACTIVE')

@api_view(['GET','POST'])
def users(request):
    if request.method == 'GET':
        _ensure_department_catalog()
        _assign_missing_departments()
        qs = UserProfile.objects.all()
        return Response(UserSerializer(qs, many=True).data)
    elif request.method == 'POST':
        # Create new user
        name = request.data.get('name')
        email = request.data.get('email')
        role = request.data.get('role', 'STUDENT')
        reg_number = request.data.get('reg_number', '')
        phone = request.data.get('phone', '')
        department_id = request.data.get('department_id')
        
        if not name or not email:
            return Response({'error': 'name and email required'}, status=400)
        
        if UserProfile.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=400)

        if not _email_matches_role_pattern(email, role):
            return Response({'error': _role_email_error(role)}, status=400)
        
        department = None
        if department_id:
            department = get_object_or_404(Department, id=department_id)

        if role in ['STUDENT', 'LECTURER'] and not department:
            return Response({'error': 'department_id is required for students and lecturers'}, status=400)

        user = UserProfile.objects.create(
            name=name,
            email=email,
            role=role,
            reg_number=reg_number,
            phone=phone,
            department=department
        )
        
        # If student, create fee payment record
        if role == 'STUDENT':
            FeesPayment.objects.create(student=user)
        
        return Response(UserSerializer(user).data)

@api_view(['GET','PUT','DELETE'])
def user_detail(request, user_id):
    user = get_object_or_404(UserProfile, id=user_id)
    
    if request.method == 'GET':
        return Response(UserSerializer(user).data)
    elif request.method == 'PUT':
        # Update user
        new_name = request.data.get('name', user.name)
        new_email = request.data.get('email', user.email)
        new_role = request.data.get('role', user.role)

        if not _email_matches_role_pattern(new_email, new_role):
            return Response({'error': _role_email_error(new_role)}, status=400)

        user.name = new_name
        user.email = new_email
        user.role = new_role
        user.status = request.data.get('status', user.status)
        user.reg_number = request.data.get('reg_number', user.reg_number)
        user.phone = request.data.get('phone', user.phone)
        department_id = request.data.get('department_id')
        if department_id:
            user.department = get_object_or_404(Department, id=department_id)
        user.save()
        return Response(UserSerializer(user).data)
    elif request.method == 'DELETE':
        user.delete()
        return Response({'message': 'User deleted'})

@api_view(['POST'])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    if not email or not password:
        return Response({'error':'email and password required'}, status=400)
    
    try:
        user = UserProfile.objects.get(email=email)
    except UserProfile.DoesNotExist:
        return Response({'error': 'Invalid email or password'}, status=401)

    if user.status and user.status.lower() != 'active':
        return Response({'error': 'Account is temporarily disabled. Contact administration.'}, status=403)
    
    # Verify password for existing users
    if user.password:
        if not user.check_password(password):
            return Response({'error': 'Invalid email or password'}, status=401)
    else:
        return Response({'error': 'Password not set for this account. Reset required.'}, status=401)
    
    return Response({'ok': True, 'user': UserSerializer(user).data, 'role': user.role})

@api_view(['GET','POST'])
def courses(request):
    if request.method == 'GET':
        _ensure_department_catalog()
        # if lecturer_email param is provided, return only courses assigned to that lecturer
        lecturer_email = request.query_params.get('lecturer_email')
        department_id = request.query_params.get('department_id')
        if lecturer_email:
            qs = Course.objects.filter(lecturer__email=lecturer_email)
        else:
            qs = Course.objects.all()
        if department_id:
            qs = qs.filter(department_id=department_id)
        return Response(CourseSerializer(qs, many=True).data)
    elif request.method == 'POST':
        # Create new course (admin only)
        code = request.data.get('code')
        name = request.data.get('name')
        lecturer_id = request.data.get('lecturer_id')
        department_id = request.data.get('department_id')
        unit_fee = request.data.get('unit_fee', 10000)
        
        if not code or not name:
            return Response({'error': 'code and name required'}, status=400)
        
        if Course.objects.filter(code=code).exists():
            return Response({'error': 'Course code already exists'}, status=400)
        
        lecturer = None
        if lecturer_id:
            lecturer = get_object_or_404(UserProfile, id=lecturer_id, role='LECTURER')

        department = None
        if department_id:
            department = get_object_or_404(Department, id=department_id)
        
        course = Course.objects.create(
            code=code,
            name=name,
            lecturer=lecturer,
            department=department,
            unit_fee=unit_fee
        )
        return Response(CourseSerializer(course).data)

@api_view(['GET','PUT','DELETE'])
def course_detail(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    
    if request.method == 'GET':
        return Response(CourseSerializer(course).data)
    elif request.method == 'PUT':
        # Update course
        course.code = request.data.get('code', course.code)
        course.name = request.data.get('name', course.name)
        course.unit_fee = request.data.get('unit_fee', course.unit_fee)
        
        lecturer_id = request.data.get('lecturer_id')
        if lecturer_id:
            course.lecturer = get_object_or_404(UserProfile, id=lecturer_id, role='LECTURER')

        department_id = request.data.get('department_id')
        if department_id:
            course.department = get_object_or_404(Department, id=department_id)
        
        course.save()
        return Response(CourseSerializer(course).data)
    elif request.method == 'DELETE':
        course.delete()
        return Response({'message': 'Course deleted'})


@api_view(['GET'])
def departments(request):
    _ensure_department_catalog()
    qs = Department.objects.all().order_by('name')
    return Response(DepartmentSerializer(qs, many=True).data)


@api_view(['GET'])
def department_courses(request, department_id):
    _ensure_department_catalog()
    dept = get_object_or_404(Department, id=department_id)
    qs = Course.objects.filter(department=dept).order_by('code')
    return Response(CourseSerializer(qs, many=True).data)


@api_view(['GET'])
def user_profile_report(request):
    user_id = request.query_params.get('user_id')
    if not user_id:
        return Response({'error': 'user_id required'}, status=400)

    target_user = get_object_or_404(UserProfile, id=user_id)
    enrollments = CourseEnrollment.objects.filter(student=target_user).select_related('course') if target_user.role == 'STUDENT' else CourseEnrollment.objects.filter(course__lecturer=target_user).select_related('course', 'student')

    attendance_breakdown = []
    grades_breakdown = []
    if target_user.role == 'STUDENT':
        student_attendance = Attendance.objects.filter(student=target_user).select_related('course')
        for att in student_attendance:
            attendance_breakdown.append({
                'course_code': att.course.code,
                'course_name': att.course.name,
                'date': att.date,
                'status': att.status,
                'remarks': att.remarks
            })

        student_grades = StudentGrade.objects.filter(student=target_user).select_related('course').order_by('-graded_date', '-created_at')
        for grade in student_grades:
            grades_breakdown.append({
                'course_code': grade.course.code,
                'course_name': grade.course.name,
                'raw_score': float(grade.raw_score or 0) if grade.raw_score is not None else None,
                'weighted_score': float(grade.weighted_score or 0) if grade.weighted_score is not None else None,
                'grade': grade.grade,
                'feedback': grade.feedback,
                'graded_date': grade.graded_date
            })

    lecturer_course_details = []
    if target_user.role == 'LECTURER':
        taught_courses = Course.objects.filter(lecturer=target_user)
        for course in taught_courses:
            lecturer_course_details.append({
                'course_id': course.id,
                'course_code': course.code,
                'course_name': course.name,
                'department': course.department.name if course.department else '',
                'student_count': CourseEnrollment.objects.filter(course=course, status='ACTIVE').count(),
                'average_grade_score': round(float(StudentGrade.objects.filter(course=course, raw_score__isnull=False).aggregate(avg=Sum('raw_score'))['avg'] or 0) / max(StudentGrade.objects.filter(course=course, raw_score__isnull=False).count(), 1), 2)
            })

    payload = {
        'profile': UserSerializer(target_user).data,
        'teaching_courses': CourseSerializer(Course.objects.filter(lecturer=target_user), many=True).data if target_user.role == 'LECTURER' else [],
        'enrolled_courses': CourseEnrollmentSerializer(enrollments, many=True).data if target_user.role == 'STUDENT' else [],
        'performance': _student_performance_payload(target_user) if target_user.role == 'STUDENT' else None,
        'grades_breakdown': grades_breakdown,
        'attendance_breakdown': attendance_breakdown,
        'lecturer_course_details': lecturer_course_details,
    }
    return Response(payload)


@api_view(['GET'])
def admin_academic_report(request):
    admin_email = request.query_params.get('admin_email')
    if not admin_email:
        return Response({'error': 'admin_email required'}, status=400)
    get_object_or_404(UserProfile, email=admin_email, role='ADMIN')

    students = UserProfile.objects.filter(role='STUDENT').order_by('name')
    data = []
    for student in students:
        perf = _student_performance_payload(student)
        enrolled = CourseEnrollment.objects.filter(student=student, status='ACTIVE').count()
        data.append({
            'student_id': student.id,
            'student_name': student.name,
            'department': student.department.name if student.department else '',
            'enrolled_courses': enrolled,
            'gpa': perf['gpa'],
            'attendance_rate': perf['attendance_rate'],
            'predicted_grade': perf['predicted_grade'],
            'advice': perf['advice']
        })

    return Response(data)

@api_view(['GET','POST'])
def course_materials(request, course_id):
    """GET: list materials for a course. POST: create a material (lecturer only).
    Accepts multipart/form-data with optional 'file' upload and 'uploader_email' to attribute uploaded_by."""
    course = get_object_or_404(Course, id=course_id)
    if request.method == 'GET':
        qs = CourseMaterial.objects.filter(course=course).order_by('-uploaded_at')
        return Response(CourseMaterialSerializer(qs, many=True, context={'request': request}).data)

    # POST - create
    title = request.data.get('title')
    material_type = request.data.get('material_type', 'MATERIAL')
    description = request.data.get('description', '')
    uploader_email = request.data.get('uploader_email')

    uploader = None
    if uploader_email:
        try:
            uploader = UserProfile.objects.get(email=uploader_email, role='LECTURER')
        except UserProfile.DoesNotExist:
            return Response({'error': 'Uploader must be a valid lecturer'}, status=403)

    file_obj = request.FILES.get('file')

    mat = CourseMaterial.objects.create(
        course=course,
        title=title or 'Untitled',
        material_type=material_type,
        description=description,
        file=file_obj,
        uploaded_by=uploader
    )
    _recalculate_course_progress(course)
    return Response(CourseMaterialSerializer(mat, context={'request': request}).data)

@api_view(['GET'])
def download_material(request, material_id):
    """Download a course material file - only for enrolled students"""
    student_email = request.query_params.get('student_email')
    
    if not student_email:
        return Response({'error': 'student_email parameter required'}, status=400)
    
    material = get_object_or_404(CourseMaterial, id=material_id)
    
    # Verify student is enrolled in the course
    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    enrollment = CourseEnrollment.objects.filter(student=student, course=material.course).first()
    
    if not enrollment:
        return Response({'error': 'You are not enrolled in this course'}, status=403)
    
    if not material.file:
        return Response({'error': 'No file attached to this material'}, status=404)
    
    # Check if file exists
    if not material.file.storage.exists(material.file.name):
        return Response({'error': 'File not found'}, status=404)
    
    try:
        response = FileResponse(material.file.open('rb'))
        response['Content-Disposition'] = f'attachment; filename="{_friendly_material_filename(material)}"'
        return response
    except Exception as e:
        return Response({'error': f'Failed to download file: {str(e)}'}, status=500)

@api_view(['GET'])
def notifs(request):
    role = request.query_params.get('role', 'STUDENT').upper()
    qs = Notification.objects.filter(role=role)
    return Response(NotificationSerializer(qs, many=True).data)

@api_view(['POST'])
def kira(request):
    role = request.data.get('role','STUDENT').upper()
    message = (request.data.get('message') or '').lower()
    # simple mock
    if role=='STUDENT' and ('math' in message or 'plan' in message):
        return Response({'text':'KIRA: Generated a study plan for MATH 101 (mock)'} )
    if role=='LECTURER' and 'draft' in message:
        return Response({'text':'KIRA: Draft message ready for at-risk students.'})
    return Response({'text':'KIRA: I can help with reports, study plans, and messages. Tell me more.'})


@api_view(['GET', 'POST'])
def course_chat(request):
    if request.method == 'GET':
        user_email = request.query_params.get('user_email')
        peer_email = request.query_params.get('peer_email')
        course_id = request.query_params.get('course_id')

        if not user_email:
            return Response({'error': 'user_email required'}, status=400)

        user = get_object_or_404(UserProfile, email=user_email)
        qs = ChatMessage.objects.filter(Q(sender=user) | Q(recipient=user))

        if peer_email:
            peer = get_object_or_404(UserProfile, email=peer_email)
            qs = qs.filter((Q(sender=user) & Q(recipient=peer)) | (Q(sender=peer) & Q(recipient=user)))
        if course_id:
            qs = qs.filter(course_id=course_id)

        return Response(ChatMessageSerializer(qs.order_by('created_at'), many=True).data)

    sender_email = request.data.get('sender_email')
    recipient_email = request.data.get('recipient_email')
    course_id = request.data.get('course_id')
    message = request.data.get('message', '').strip()

    if not sender_email or not recipient_email or not message:
        return Response({'error': 'sender_email, recipient_email and message required'}, status=400)

    sender = get_object_or_404(UserProfile, email=sender_email)
    recipient = get_object_or_404(UserProfile, email=recipient_email)
    course = get_object_or_404(Course, id=course_id) if course_id else None

    # Lecturer <-> student chat guard rails
    if {sender.role, recipient.role} == {'LECTURER', 'STUDENT'} and course:
        lecturer = sender if sender.role == 'LECTURER' else recipient
        student = sender if sender.role == 'STUDENT' else recipient
        if course.lecturer_id != lecturer.id or not CourseEnrollment.objects.filter(student=student, course=course, status='ACTIVE').exists():
            return Response({'error': 'Lecturer and student must share this course'}, status=403)

    msg = ChatMessage.objects.create(
        sender=sender,
        recipient=recipient,
        course=course,
        message=message
    )
    return Response(ChatMessageSerializer(msg).data)

@api_view(['GET'])
def library_items(request):
    """Get all library items"""
    qs = LibraryItem.objects.all()
    return Response(LibraryItemSerializer(qs, many=True).data)


@api_view(['GET'])
def public_books(request):
    query = request.query_params.get('q', 'computer science')
    try:
        response = requests.get('https://gutendex.com/books', params={'search': query}, timeout=10)
        response.raise_for_status()
        docs = response.json().get('results', [])[:12]
        books = []
        for item in docs:
            formats = item.get('formats', {})
            download_url = formats.get('application/epub+zip') or formats.get('application/pdf') or formats.get('text/html') or formats.get('text/plain; charset=utf-8')
            books.append({
                'title': item.get('title'),
                'author': ', '.join([author.get('name', '') for author in item.get('authors', [])[:2]]),
                'year': item.get('copyright'),
                'book_id': item.get('id'),
                'download_url': download_url
            })
        return Response(books)
    except Exception as exc:
        return Response({'error': f'Failed to fetch public books: {exc}'}, status=502)


@api_view(['GET'])
def student_results_history(request):
    student_email = request.query_params.get('student_email')
    if not student_email:
        return Response({'error': 'student_email required'}, status=400)

    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    grades = StudentGrade.objects.filter(student=student, grade__in=['A', 'B', 'C', 'D', 'F']).select_related('course').order_by('-graded_date', '-created_at')

    grouped = {}
    for grade in grades:
        date_ref = grade.graded_date.date() if grade.graded_date else grade.created_at.date()
        term = _term_label(date_ref)
        grouped.setdefault(term, []).append({
            'course_code': grade.course.code,
            'course_name': grade.course.name,
            'raw_score': float(grade.raw_score or 0),
            'grade': grade.grade,
            'feedback': grade.feedback
        })

    terms = []
    for term, records in grouped.items():
        avg_score = sum(item['raw_score'] for item in records) / len(records)
        terms.append({'term': term, 'average_score': round(avg_score, 2), 'results': records})

    return Response({'student': UserSerializer(student).data, 'history': terms})


@api_view(['GET'])
def student_fee_report_download(request):
    student_email = request.query_params.get('student_email')
    if not student_email:
        return Response({'error': 'student_email required'}, status=400)

    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    payments = FeesPayment.objects.filter(student=student).order_by('-created_at')

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="fee-report-{student.id}.csv"'

    writer = csv.writer(response)
    writer.writerow(['Student Name', 'Reg Number', 'Amount Due', 'Amount Paid', 'Balance', 'Status', 'Last Payment Date'])
    for payment in payments:
        writer.writerow([
            student.name,
            student.reg_number or '',
            float(payment.amount_due),
            float(payment.amount_paid),
            float(payment.amount_due - payment.amount_paid),
            payment.status,
            payment.last_payment_date or ''
        ])
    return response


@api_view(['GET'])
def academic_alerts(request):
    student_email = request.query_params.get('student_email')
    if not student_email:
        return Response({'error': 'student_email required'}, status=400)

    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    perf = _student_performance_payload(student)
    pending_assignments = AssignmentSubmission.objects.filter(student=student, status='SUBMITTED').count()

    alerts = []
    if perf['attendance_rate'] < 70:
        alerts.append({'type': 'attendance', 'message': 'Attendance is below 70%. Join classes consistently to protect GPA.'})
    if perf['gpa'] < 2.0:
        alerts.append({'type': 'gpa', 'message': 'GPA is below 2.0. Meet your lecturer and follow a weekly revision plan.'})
    if pending_assignments > 0:
        alerts.append({'type': 'assignments', 'message': f'You have {pending_assignments} submitted assignments pending grading.'})

    return Response({'alerts': alerts})

@api_view(['POST'])
def library_borrow(request):
    """Student borrow a book"""
    student_email = request.data.get('student_email')
    item_id = request.data.get('item_id')
    
    if not student_email or not item_id:
        return Response({'error': 'student_email and item_id required'}, status=400)
    
    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    item = get_object_or_404(LibraryItem, id=item_id)
    
    if item.copies_available <= 0:
        return Response({'error': 'No copies available'}, status=400)
    
    # Create borrow record
    due_date = timezone.now().date() + timedelta(days=14)
    borrow = StudentBorrow.objects.create(
        student=student,
        library_item=item,
        due_date=due_date,
        status='BORROWED'
    )
    
    # Update available copies
    item.copies_available -= 1
    item.save()
    
    return Response(StudentBorrowSerializer(borrow).data)

@api_view(['POST'])
def library_return(request):
    """Student return a book"""
    borrow_id = request.data.get('borrow_id')
    
    if not borrow_id:
        return Response({'error': 'borrow_id required'}, status=400)
    
    borrow = get_object_or_404(StudentBorrow, id=borrow_id)
    
    if borrow.status == 'RETURNED':
        return Response({'error': 'Book already returned'}, status=400)
    
    borrow.returned_date = timezone.now().date()
    borrow.status = 'RETURNED'
    borrow.save()
    
    # Update available copies
    item = borrow.library_item
    item.copies_available += 1
    item.save()
    
    return Response(StudentBorrowSerializer(borrow).data)

@api_view(['GET'])
def student_borrows(request):
    """Get student's borrowed items"""
    student_email = request.query_params.get('student_email')
    
    if not student_email:
        return Response({'error': 'student_email required'}, status=400)
    
    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    qs = StudentBorrow.objects.filter(student=student).order_by('-borrowed_date')
    
    return Response(StudentBorrowSerializer(qs, many=True).data)

# NEW ENDPOINTS FOR COURSE ENROLLMENT
@api_view(['GET','POST'])
def course_enrollments(request):
    if request.method == 'GET':
        course_id = request.query_params.get('course_id')
        student_id = request.query_params.get('student_id')
        student_email = request.query_params.get('student_email')
        
        qs = CourseEnrollment.objects.all()
        if course_id:
            qs = qs.filter(course_id=course_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        if student_email:
            student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
            _normalize_student_enrollments(student)
            qs = qs.filter(student=student, status='ACTIVE')
        
        return Response(CourseEnrollmentSerializer(qs, many=True).data)
    
    elif request.method == 'POST':
        # Enroll student in course
        student_id = request.data.get('student_id')
        course_id = request.data.get('course_id')
        
        if not student_id or not course_id:
            return Response({'error': 'student_id and course_id required'}, status=400)
        
        student = get_object_or_404(UserProfile, id=student_id, role='STUDENT')
        course = get_object_or_404(Course, id=course_id)

        current_active = CourseEnrollment.objects.filter(student=student, status='ACTIVE').count()
        if current_active >= 6:
            return Response({'error': 'Student is already enrolled in the maximum of 6 units'}, status=400)
        
        if CourseEnrollment.objects.filter(student=student, course=course).exists():
            return Response({'error': 'Student already enrolled'}, status=400)
        
        enrollment = CourseEnrollment.objects.create(student=student, course=course)
        course.enrolled_count = course.enrollments.filter(status='ACTIVE').count()
        course.save()
        
        return Response(CourseEnrollmentSerializer(enrollment).data)

# FEES PAYMENT ENDPOINTS
@api_view(['GET'])
def fees_payments(request):
    student_email = request.query_params.get('student_email')
    
    qs = FeesPayment.objects.all()
    if student_email:
        student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
        qs = qs.filter(student=student)
    
    return Response(FeesPaymentSerializer(qs, many=True,context={'request': request}).data)

@api_view(['PUT'])
def record_fee_payment(request, payment_id):
    payment = get_object_or_404(FeesPayment, id=payment_id)
    
    amount_paid = request.data.get('amount_paid')
    if not amount_paid:
        return Response({'error': 'amount_paid required'}, status=400)
    
    amount_paid = float(amount_paid)
    payment.amount_paid += amount_paid
    payment.last_payment_date = timezone.now().date()
    
    # Update status
    if payment.amount_paid >= payment.amount_due:
        payment.status = 'PAID'
    elif payment.amount_paid > 0:
        payment.status = 'PARTIAL'
    else:
        payment.status = 'PENDING'
    
    payment.save()

    # Auto re-enable student when fee is fully paid
    if payment.status == 'PAID' and payment.student.status != 'active':
        payment.student.status = 'active'
        payment.student.save(update_fields=['status'])

    return Response(FeesPaymentSerializer(payment, context={'request': request}).data)


@api_view(['POST'])
def enforce_user_fee_status(request):
    student_id = request.data.get('student_id')
    action = request.data.get('action')

    if not student_id or action not in ['disable', 'enable']:
        return Response({'error': 'student_id and action (disable|enable) required'}, status=400)

    student = get_object_or_404(UserProfile, id=student_id, role='STUDENT')
    payment = FeesPayment.objects.filter(student=student).order_by('-updated_at').first()

    if action == 'disable':
        if payment and payment.status == 'PAID':
            return Response({'error': 'Cannot disable a fully paid student'}, status=400)
        student.status = 'disabled'
    else:
        student.status = 'active'

    student.save(update_fields=['status'])
    return Response({'message': f'User {student.email} set to {student.status}'})


@api_view(['GET', 'POST', 'DELETE'])
def notices_manage(request):
    if request.method == 'GET':
        role = request.query_params.get('role')
        qs = Notification.objects.all().order_by('-id')
        if role:
            qs = qs.filter(role=role.upper())
        return Response(NotificationSerializer(qs, many=True).data)

    if request.method == 'POST':
        role = request.data.get('role', '').upper()
        title = request.data.get('title', '').strip()
        body = request.data.get('body', '').strip()
        if role not in ['STUDENT', 'LECTURER', 'ADMIN'] or not title or not body:
            return Response({'error': 'role, title, body are required'}, status=400)
        notice = Notification.objects.create(role=role, title=title, body=body, time=str(timezone.now()))
        return Response(NotificationSerializer(notice).data)

    notice_id = request.data.get('notice_id')
    notice = get_object_or_404(Notification, id=notice_id)
    notice.delete()
    return Response({'message': 'Notice deleted'})


@api_view(['GET', 'POST', 'DELETE'])
def zoom_directory(request):
    if request.method == 'GET':
        role = request.query_params.get('role', '').upper()
        email = request.query_params.get('email')

        qs = ZoomClass.objects.select_related('course', 'host')
        if role == 'LECTURER' and email:
            qs = qs.filter(host__email=email)
        elif role == 'STUDENT' and email:
            student = get_object_or_404(UserProfile, email=email, role='STUDENT')
            enrolled_ids = CourseEnrollment.objects.filter(student=student, status='ACTIVE').values_list('course_id', flat=True)
            qs = qs.filter(course_id__in=enrolled_ids)

        return Response(ZoomClassSerializer(qs, many=True).data)

    if request.method == 'POST':
        title = request.data.get('title')
        course_id = request.data.get('course_id')
        meeting_url = request.data.get('meeting_url')
        meeting_code = request.data.get('meeting_code', '')
        host_id = request.data.get('host_id')
        scheduled_for = request.data.get('scheduled_for')

        if not all([title, course_id, meeting_url, scheduled_for]):
            return Response({'error': 'title, course_id, meeting_url, scheduled_for required'}, status=400)

        course = get_object_or_404(Course, id=course_id)
        host = get_object_or_404(UserProfile, id=host_id, role='LECTURER') if host_id else course.lecturer
        zoom_item = ZoomClass.objects.create(
            title=title,
            course=course,
            meeting_url=meeting_url,
            meeting_code=meeting_code,
            host=host,
            scheduled_for=scheduled_for
        )
        return Response(ZoomClassSerializer(zoom_item).data)

    zoom_id = request.data.get('zoom_id')
    zoom_item = get_object_or_404(ZoomClass, id=zoom_id)
    zoom_item.delete()
    return Response({'message': 'Zoom class deleted'})

# GRADING ENDPOINTS
@api_view(['GET','POST'])
def student_grades(request):
    if request.method == 'GET':
        student_email = request.query_params.get('student_email')
        course_id = request.query_params.get('course_id')
        
        qs = StudentGrade.objects.all()
        if student_email:
            student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
            qs = qs.filter(student=student)
        if course_id:
            qs = qs.filter(course_id=course_id)
        
        return Response(StudentGradeSerializer(qs, many=True).data)
    
    elif request.method == 'POST':
        # Create or update grade
        student_id = request.data.get('student_id')
        course_id = request.data.get('course_id')
        raw_score = request.data.get('raw_score')
        weighted_score = request.data.get('weighted_score', raw_score)
        grade = request.data.get('grade', 'PENDING')
        feedback = request.data.get('feedback', '')
        graded_by_id = request.data.get('graded_by_id')
        
        if not student_id or not course_id or raw_score is None:
            return Response({'error': 'student_id, course_id, raw_score required'}, status=400)
        
        student = get_object_or_404(UserProfile, id=student_id, role='STUDENT')
        course = get_object_or_404(Course, id=course_id)
        graded_by = get_object_or_404(UserProfile, id=graded_by_id, role='LECTURER') if graded_by_id else None
        
        grade_obj, created = StudentGrade.objects.update_or_create(
            student=student,
            course=course,
            defaults={
                'raw_score': raw_score,
                'weighted_score': weighted_score,
                'grade': grade,
                'feedback': feedback,
                'graded_by': graded_by,
                'graded_date': timezone.now()
            }
        )
        
        return Response(StudentGradeSerializer(grade_obj).data)


@api_view(['GET'])
def student_performance(request):
    student_email = request.query_params.get('student_email')
    lecturer_email = request.query_params.get('lecturer_email')
    admin_email = request.query_params.get('admin_email')

    if student_email:
        student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
        return Response(_student_performance_payload(student))

    if lecturer_email:
        lecturer = get_object_or_404(UserProfile, email=lecturer_email, role='LECTURER')
        taught_courses = list(Course.objects.filter(lecturer=lecturer).values_list('id', flat=True))
        if not taught_courses:
            return Response([])

        students = UserProfile.objects.filter(
            role='STUDENT',
            enrollments__course_id__in=taught_courses,
            enrollments__status='ACTIVE'
        ).distinct().order_by('name')

        data = [_student_performance_payload(student, course_ids=taught_courses) for student in students]
        return Response(data)

    if admin_email:
        get_object_or_404(UserProfile, email=admin_email, role='ADMIN')
        students = UserProfile.objects.filter(role='STUDENT').order_by('name')
        data = [_student_performance_payload(student) for student in students]
        return Response(data)

    return Response({'error': 'Provide student_email, lecturer_email, or admin_email'}, status=400)


@api_view(['GET'])
def lecturer_students(request):
    lecturer_email = request.query_params.get('lecturer_email')
    if not lecturer_email:
        return Response({'error': 'lecturer_email required'}, status=400)

    lecturer = get_object_or_404(UserProfile, email=lecturer_email, role='LECTURER')
    courses = Course.objects.filter(lecturer=lecturer)
    course_ids = list(courses.values_list('id', flat=True))

    students = UserProfile.objects.filter(
        role='STUDENT',
        enrollments__course_id__in=course_ids,
        enrollments__status='ACTIVE'
    ).distinct().order_by('name')

    output = []
    for student in students:
        perf = _student_performance_payload(student, course_ids=course_ids)
        student_courses = CourseEnrollment.objects.filter(student=student, course_id__in=course_ids).select_related('course')
        output.append({
            'student': UserSerializer(student).data,
            'performance': perf,
            'courses': [
                {
                    'course_id': enrollment.course_id,
                    'course_code': enrollment.course.code,
                    'course_name': enrollment.course.name,
                    'progress_percent': enrollment.progress_percent
                } for enrollment in student_courses
            ]
        })

    return Response(output)


@api_view(['GET'])
def lecturer_course_students(request, course_id):
    lecturer_email = request.query_params.get('lecturer_email')
    if not lecturer_email:
        return Response({'error': 'lecturer_email required'}, status=400)

    lecturer = get_object_or_404(UserProfile, email=lecturer_email, role='LECTURER')
    course = get_object_or_404(Course, id=course_id, lecturer=lecturer)

    enrollments = CourseEnrollment.objects.filter(course=course, status='ACTIVE').select_related('student')
    data = []
    for enrollment in enrollments:
        perf = _student_performance_payload(enrollment.student, course_ids=[course.id])
        data.append({
            'student': UserSerializer(enrollment.student).data,
            'enrollment': CourseEnrollmentSerializer(enrollment).data,
            'performance': perf,
            'attendance': student_attendance_summary(enrollment.student.id, course.id)
        })
    return Response(data)


def student_attendance_summary(student_id, course_id):
    qs = Attendance.objects.filter(student_id=student_id, course_id=course_id)
    total_records = qs.count()
    present_count = qs.filter(status='PRESENT').count()
    late_count = qs.filter(status='LATE').count()
    attendance_rate = ((present_count + late_count * 0.5) / total_records * 100) if total_records else 0
    return {
        'total_classes': total_records,
        'attendance_rate': round(attendance_rate, 2)
    }


@api_view(['GET'])
def lecturer_course_material_performance(request, course_id):
    lecturer_email = request.query_params.get('lecturer_email')
    if not lecturer_email:
        return Response({'error': 'lecturer_email required'}, status=400)

    lecturer = get_object_or_404(UserProfile, email=lecturer_email, role='LECTURER')
    course = get_object_or_404(Course, id=course_id, lecturer=lecturer)

    materials = CourseMaterial.objects.filter(course=course).order_by('-uploaded_at')
    data = []
    for material in materials:
        submissions = AssignmentSubmission.objects.filter(assignment=material) if material.material_type in ['ASSIGNMENT', 'CAT'] else AssignmentSubmission.objects.none()
        graded = submissions.filter(status='GRADED', score__isnull=False)
        avg_score = round(sum(float(item.score) for item in graded) / graded.count(), 2) if graded.exists() else None
        data.append({
            'material_id': material.id,
            'title': material.title,
            'material_type': material.material_type,
            'uploaded_at': material.uploaded_at,
            'submission_count': submissions.count(),
            'graded_count': graded.count(),
            'average_score': avg_score
        })
    return Response(data)


@api_view(['GET'])
def lecturer_course_submissions(request, course_id):
    lecturer_email = request.query_params.get('lecturer_email')
    if not lecturer_email:
        return Response({'error': 'lecturer_email required'}, status=400)

    lecturer = get_object_or_404(UserProfile, email=lecturer_email, role='LECTURER')
    course = get_object_or_404(Course, id=course_id, lecturer=lecturer)
    submissions = AssignmentSubmission.objects.filter(assignment__course=course).select_related('student', 'assignment').order_by('assignment__material_type', 'assignment__title', 'student__name')

    data = {
        'course': CourseSerializer(course).data,
        'submissions': AssignmentSubmissionSerializer(submissions, many=True, context={'request': request}).data
    }
    return Response(data)


@api_view(['GET'])
def download_submission(request, submission_id):
    lecturer_email = request.query_params.get('lecturer_email')
    if not lecturer_email:
        return Response({'error': 'lecturer_email required'}, status=400)

    lecturer = get_object_or_404(UserProfile, email=lecturer_email, role='LECTURER')
    submission = get_object_or_404(AssignmentSubmission, id=submission_id, assignment__course__lecturer=lecturer)
    response = FileResponse(submission.submission_file.open('rb'))
    response['Content-Disposition'] = f'attachment; filename="{_friendly_submission_filename(submission)}"'
    return response


@api_view(['GET'])
def download_course_submissions_bundle(request, course_id):
    lecturer_email = request.query_params.get('lecturer_email')
    if not lecturer_email:
        return Response({'error': 'lecturer_email required'}, status=400)

    lecturer = get_object_or_404(UserProfile, email=lecturer_email, role='LECTURER')
    course = get_object_or_404(Course, id=course_id, lecturer=lecturer)
    submissions = AssignmentSubmission.objects.filter(assignment__course=course).select_related('student', 'assignment')

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for submission in submissions:
            subfolder = 'CATs' if submission.assignment.material_type == 'CAT' else 'Assignments'
            filename = _friendly_submission_filename(submission)
            zip_path = f"{slugify(course.code)}-{slugify(course.name)}/{subfolder}/{filename}"
            try:
                with submission.submission_file.open('rb') as fp:
                    zip_file.writestr(zip_path, fp.read())
            except Exception:
                continue

    zip_buffer.seek(0)
    response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="{slugify(course.code)}-submissions.zip"'
    return response


@api_view(['GET', 'POST', 'DELETE'])
def lecturer_weekly_plan(request):
    lecturer_email = request.query_params.get('lecturer_email') or request.data.get('lecturer_email')
    if not lecturer_email:
        return Response({'error': 'lecturer_email required'}, status=400)

    lecturer = get_object_or_404(UserProfile, email=lecturer_email, role='LECTURER')

    if request.method == 'GET':
        plans = LecturerPlan.objects.filter(lecturer=lecturer)
        zoom_sessions = ZoomClass.objects.filter(host=lecturer)
        calendar_items = []

        for plan in plans:
            calendar_items.append({
                'id': f'plan-{plan.id}',
                'item_type': 'PLAN',
                'title': plan.title,
                'course_code': plan.course.code if plan.course else '',
                'course_name': plan.course.name if plan.course else '',
                'date': plan.plan_date.isoformat(),
                'start_time': plan.start_time.strftime('%H:%M') if plan.start_time else '',
                'end_time': plan.end_time.strftime('%H:%M') if plan.end_time else '',
                'notes': plan.notes or ''
            })

        for zoom in zoom_sessions:
            calendar_items.append({
                'id': f'zoom-{zoom.id}',
                'item_type': 'CLASS',
                'title': zoom.title,
                'course_code': zoom.course.code if zoom.course else '',
                'course_name': zoom.course.name if zoom.course else '',
                'date': zoom.scheduled_for.date().isoformat(),
                'start_time': zoom.scheduled_for.strftime('%H:%M'),
                'end_time': '',
                'notes': f"Zoom: {zoom.meeting_url}" if zoom.meeting_url else ''
            })

        calendar_items.sort(key=lambda item: (item['date'], item['start_time'] or '99:99'))

        grouped_calendar = {}
        for item in calendar_items:
            grouped_calendar.setdefault(item['date'], []).append(item)

        return Response({
            'plans': LecturerPlanSerializer(plans, many=True).data,
            'zoom_sessions': ZoomClassSerializer(zoom_sessions, many=True).data,
            'calendar': grouped_calendar
        })

    if request.method == 'POST':
        course_id = request.data.get('course_id')
        course = get_object_or_404(Course, id=course_id, lecturer=lecturer) if course_id else None
        plan = LecturerPlan.objects.create(
            lecturer=lecturer,
            course=course,
            title=request.data.get('title', 'Untitled Plan'),
            plan_date=request.data.get('plan_date'),
            start_time=request.data.get('start_time') or None,
            end_time=request.data.get('end_time') or None,
            notes=request.data.get('notes', '')
        )
        return Response(LecturerPlanSerializer(plan).data)

    plan_id = request.data.get('plan_id')
    plan = get_object_or_404(LecturerPlan, id=plan_id, lecturer=lecturer)
    plan.delete()
    return Response({'message': 'Plan deleted'})


@api_view(['GET'])
def student_course_workspace(request, course_id):
    student_email = request.query_params.get('student_email')
    if not student_email:
        return Response({'error': 'student_email required'}, status=400)

    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    enrollment = get_object_or_404(CourseEnrollment.objects.select_related('course'), student=student, course_id=course_id)
    course = enrollment.course
    materials = CourseMaterial.objects.filter(course=course).order_by('-uploaded_at')
    grades = StudentGrade.objects.filter(student=student, course=course)
    attendance = Attendance.objects.filter(student=student, course=course).order_by('-date')
    submissions = AssignmentSubmission.objects.filter(student=student, assignment__course=course)
    submission_map = {item.assignment_id: item for item in submissions}

    workspace_materials = []
    for material in materials:
        submission = submission_map.get(material.id)
        workspace_materials.append({
            'material': CourseMaterialSerializer(material, context={'request': request}).data,
            'submission': AssignmentSubmissionSerializer(submission, context={'request': request}).data if submission else None
        })

    performance = _student_performance_payload(student, course_ids=[course.id])

    # Detailed grade breakdown for this unit
    breakdown = _compute_unit_weighted_score(student, course)
    grade_breakdown = {
        'cat_avg': breakdown['cat_avg'],
        'cat_count': breakdown['cat_count'],
        'assignment_avg': breakdown['assignment_avg'],
        'assign_count': breakdown['assign_count'],
        'attendance_rate': breakdown['attendance_rate'],
        'weighted_score': breakdown['weighted_score'],
        'computed_grade': _grade_from_score(breakdown['weighted_score']) if breakdown['weighted_score'] is not None else 'PENDING',
        'cat_weight': '30%',
        'assignment_weight': '40%',
        'attendance_weight': '30%',
    }

    # Attendance summary
    total_att = attendance.count()
    present_att = attendance.filter(status='PRESENT').count()
    late_att = attendance.filter(status='LATE').count()
    absent_att = attendance.filter(status='ABSENT').count()

    return Response({
        'student': UserSerializer(student).data,
        'course': CourseSerializer(course).data,
        'enrollment': CourseEnrollmentSerializer(enrollment).data,
        'materials': workspace_materials,
        'grades': StudentGradeSerializer(grades, many=True).data,
        'grade_breakdown': grade_breakdown,
        'attendance': AttendanceSerializer(attendance, many=True).data,
        'attendance_summary': {
            'total': total_att,
            'present': present_att,
            'late': late_att,
            'absent': absent_att,
            'rate': round(((present_att + late_att * 0.5) / total_att * 100), 1) if total_att > 0 else 0
        },
        'performance': performance
    })


@api_view(['GET', 'POST', 'DELETE'])
def student_timetable(request):
    """Student timetable: upcoming classes (ZoomClass), deadlines (CourseMaterial), and personal plans (StudentTimetableEntry)"""
    student_email = request.query_params.get('student_email') or request.data.get('student_email')
    if not student_email:
        return Response({'error': 'student_email required'}, status=400)

    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    active_enrollments = _normalize_student_enrollments(student)

    if request.method == 'DELETE':
        entry_id = request.query_params.get('entry_id')
        if not entry_id:
            return Response({'error': 'entry_id required'}, status=400)
        entry = get_object_or_404(StudentTimetableEntry, id=entry_id, student=student)
        entry.delete()
        return Response({'deleted': True})

    if request.method == 'POST':
        data = request.data
        course_id = data.get('course_id')
        course = None
        if course_id:
            course = Course.objects.filter(id=course_id).first()
        entry = StudentTimetableEntry.objects.create(
            student=student,
            course=course,
            title=data.get('title', 'Personal Plan'),
            entry_type=data.get('entry_type', 'PERSONAL'),
            entry_date=data.get('entry_date'),
            start_time=data.get('start_time') or None,
            end_time=data.get('end_time') or None,
            notes=data.get('notes', ''),
        )
        return Response(StudentTimetableEntrySerializer(entry).data)

    # GET: compile timetable
    enrolled_course_ids = list(active_enrollments.values_list('course_id', flat=True))
    today = timezone.now().date()

    # Upcoming ZoomClass sessions for enrolled courses
    zoom_classes = ZoomClass.objects.filter(
        course_id__in=enrolled_course_ids,
        scheduled_for__gte=timezone.now()
    ).select_related('course', 'host').order_by('scheduled_for')[:20]
    zoom_items = []
    for z in zoom_classes:
        zoom_items.append({
            'id': f'zoom-{z.id}',
            'type': 'CLASS',
            'title': z.title,
            'course_code': z.course.code,
            'course_name': z.course.name,
            'date': z.scheduled_for.date().isoformat(),
            'time': z.scheduled_for.strftime('%H:%M'),
            'meeting_url': z.meeting_url,
            'meeting_code': z.meeting_code,
            'host': z.host.name if z.host else 'TBA',
        })

    # Upcoming course material deadlines (assignments/CATs)
    materials_qs = CourseMaterial.objects.filter(
        course_id__in=enrolled_course_ids,
        material_type__in=['ASSIGNMENT', 'CAT'],
    ).select_related('course').order_by('-uploaded_at')[:30]
    deadline_items = []
    for m in materials_qs:
        already_submitted = AssignmentSubmission.objects.filter(student=student, assignment=m).exists()
        material_date = m.uploaded_at.date()
        is_overdue = (material_date < today) and (not already_submitted)
        deadline_items.append({
            'id': f'material-{m.id}',
            'material_id': m.id,
            'course_id': m.course.id,
            'type': m.material_type,
            'title': m.title,
            'course_code': m.course.code,
            'course_name': m.course.name,
            'date': material_date.isoformat(),
            'description': m.description,
            'already_submitted': already_submitted,
            'is_overdue': is_overdue,
        })

    # Personal plans
    personal_entries = StudentTimetableEntry.objects.filter(
        student=student, entry_date__gte=today
    ).select_related('course').order_by('entry_date', 'start_time')
    personal_items = StudentTimetableEntrySerializer(personal_entries, many=True).data

    # Calendar grouping for classes + deadlines + personal
    calendar_items = []
    for item in zoom_items:
        calendar_items.append({
            'id': item['id'],
            'item_type': 'CLASS',
            'title': item['title'],
            'course_code': item['course_code'],
            'course_name': item['course_name'],
            'date': item['date'],
            'time': item['time'],
            'meta': item,
        })

    for item in deadline_items:
        calendar_items.append({
            'id': item['id'],
            'item_type': item['type'],
            'title': item['title'],
            'course_code': item['course_code'],
            'course_name': item['course_name'],
            'date': item['date'],
            'time': '',
            'meta': item,
        })

    for entry in personal_items:
        calendar_items.append({
            'id': f"personal-{entry['id']}",
            'item_type': entry['entry_type'],
            'title': entry['title'],
            'course_code': entry.get('course_code') or '',
            'course_name': entry.get('course_name') or '',
            'date': entry['entry_date'],
            'time': entry.get('start_time') or '',
            'meta': entry,
        })

    calendar_items.sort(key=lambda item: (item['date'], item['time'] or '99:99'))
    grouped_calendar = {}
    for item in calendar_items:
        grouped_calendar.setdefault(item['date'], []).append(item)

    return Response({
        'classes': zoom_items,
        'deadlines': deadline_items,
        'personal': personal_items,
        'calendar': grouped_calendar,
    })


@api_view(['GET'])
def student_results_transcript_download(request):
    """Download detailed semester transcript as CSV"""
    student_email = request.query_params.get('student_email')
    if not student_email:
        return Response({'error': 'student_email required'}, status=400)

    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    enrollments = CourseEnrollment.objects.filter(student=student).select_related('course', 'course__department', 'course__lecturer')

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="transcript-{student.reg_number or student.id}.csv"'

    writer = csv.writer(response)
    writer.writerow(['KCA University — Official Transcript'])
    writer.writerow([f'Student: {student.name}', f'Reg No: {student.reg_number or "N/A"}', f'Email: {student.email}'])
    writer.writerow([])
    writer.writerow(['Course Code', 'Course Name', 'Department', 'Lecturer', 'CAT Score', 'Assignment Avg', 'Attendance %',
                     'Weighted Score', 'Grade', 'GPA Points', 'Status', 'Enrolled Date'])

    total_gpa_pts = 0
    graded_count = 0

    for enrollment in enrollments:
        course = enrollment.course
        breakdown = _compute_unit_weighted_score(student, course)
        grade_letter = _grade_from_score(breakdown['weighted_score']) if breakdown['weighted_score'] is not None else 'PENDING'
        gpa_pts = _grade_points(grade_letter)
        status = 'PASS' if grade_letter in ['A', 'B', 'C', 'D'] else ('FAIL' if grade_letter == 'F' else 'PENDING')
        if grade_letter in ['A', 'B', 'C', 'D', 'F']:
            total_gpa_pts += gpa_pts
            graded_count += 1
        writer.writerow([
            course.code,
            course.name,
            course.department.name if course.department else 'N/A',
            course.lecturer.name if course.lecturer else 'TBA',
            breakdown['cat_avg'] if breakdown['cat_avg'] is not None else 'N/A',
            breakdown['assignment_avg'] if breakdown['assignment_avg'] is not None else 'N/A',
            f"{breakdown['attendance_rate']}%" if breakdown['attendance_rate'] is not None else 'N/A',
            breakdown['weighted_score'] if breakdown['weighted_score'] is not None else 'N/A',
            grade_letter,
            gpa_pts,
            status,
            enrollment.enrolled_date,
        ])

    writer.writerow([])
    cumulative_gpa = round(total_gpa_pts / graded_count, 2) if graded_count > 0 else 0
    writer.writerow(['', '', '', '', '', '', '', 'Cumulative GPA:', cumulative_gpa, '', f'{graded_count} graded units'])
    return response


# ASSIGNMENT SUBMISSION ENDPOINTS
@api_view(['GET','POST'])
def get_assignments_for_grading(request):
    """Get assignments pending grading for a lecturer"""
    lecturer_email = request.query_params.get('lecturer_email')
    
    if request.method == 'GET':
        if not lecturer_email:
            return Response({'error': 'lecturer_email required'}, status=400)
        
        lecturer = get_object_or_404(UserProfile, email=lecturer_email, role='LECTURER')
        
        # Get courses taught by this lecturer
        courses = Course.objects.filter(lecturer=lecturer)
        
        # Get assignments in these courses
        assignments = CourseMaterial.objects.filter(course__in=courses, material_type='ASSIGNMENT')
        
        # Get submissions for these assignments that are not yet graded
        qs = AssignmentSubmission.objects.filter(assignment__in=assignments, status='SUBMITTED').order_by('-submission_date')
        
        return Response(AssignmentSubmissionSerializer(qs, many=True, context={'request': request}).data)

@api_view(['POST'])
def submit_assignment(request):
    """Student submit an assignment"""
    assignment_id = request.data.get('assignment_id')
    student_email = request.data.get('student_email')
    
    if not assignment_id or not student_email:
        return Response({'error': 'assignment_id and student_email required'}, status=400)
    
    assignment = get_object_or_404(CourseMaterial.objects.filter(material_type__in=['ASSIGNMENT', 'CAT']), id=assignment_id)
    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    
    submission_file = request.FILES.get('submission_file')
    if not submission_file:
        return Response({'error': 'submission_file required'}, status=400)
    
    submission, created = AssignmentSubmission.objects.update_or_create(
        assignment=assignment,
        student=student,
        defaults={
            'submission_file': submission_file,
            'status': 'SUBMITTED'
        }
    )
    
    return Response(AssignmentSubmissionSerializer(submission, context={'request': request}).data)

@api_view(['PUT'])
def grade_assignment(request, submission_id):
    """Lecturer grade an assignment"""
    submission = get_object_or_404(AssignmentSubmission, id=submission_id)
    
    score = request.data.get('score')
    feedback = request.data.get('feedback', '')
    
    if score is None:
        return Response({'error': 'score required'}, status=400)
    
    submission.score = score
    submission.feedback = feedback
    submission.status = 'GRADED'
    submission.graded_date = timezone.now()
    submission.save()
    
    return Response(AssignmentSubmissionSerializer(submission, context={'request': request}).data)

@api_view(['GET'])
def get_student_assignments(request):
    """Get assignments/submissions for a student"""
    student_email = request.query_params.get('student_email')
    
    if not student_email:
        return Response({'error': 'student_email required'}, status=400)
    
    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')

    enrolled_courses = Course.objects.filter(enrollments__student=student).distinct()
    assignments = CourseMaterial.objects.filter(course__in=enrolled_courses, material_type__in=['ASSIGNMENT', 'CAT']).select_related('course', 'uploaded_by').order_by('-uploaded_at')
    submissions = AssignmentSubmission.objects.filter(student=student, assignment__in=assignments).select_related('assignment', 'assignment__course').order_by('-submission_date')

    submission_by_assignment = {submission.assignment_id: submission for submission in submissions}
    data = []

    for assignment in assignments:
        submission = submission_by_assignment.get(assignment.id)
        assignment_file_url = request.build_absolute_uri(assignment.file.url) if assignment.file else None
        if submission:
            data.append({
                'id': submission.id,
                'assignment': assignment.id,
                'assignment_title': assignment.title,
                'material_type': assignment.material_type,
                'course_name': assignment.course.name,
                'uploaded_by_name': assignment.uploaded_by.name if assignment.uploaded_by else '',
                'assignment_file_url': assignment_file_url,
                'student': student.id,
                'student_name': student.name,
                'submission_file': submission.submission_file.url if submission.submission_file else None,
                'status': submission.status,
                'score': submission.score,
                'feedback': submission.feedback,
                'submission_date': submission.submission_date,
                'graded_date': submission.graded_date,
            })
        else:
            data.append({
                'id': f'pending-{assignment.id}',
                'assignment': assignment.id,
                'assignment_title': assignment.title,
                'material_type': assignment.material_type,
                'course_name': assignment.course.name,
                'uploaded_by_name': assignment.uploaded_by.name if assignment.uploaded_by else '',
                'assignment_file_url': assignment_file_url,
                'student': student.id,
                'student_name': student.name,
                'submission_file': None,
                'status': 'PENDING',
                'score': None,
                'feedback': '',
                'submission_date': None,
                'graded_date': None,
            })

    return Response(data)
    
    submission.score = score
    submission.feedback = feedback
    submission.status = 'GRADED'
    submission.graded_date = timezone.now()
    submission.save()
    
    return Response(AssignmentSubmissionSerializer(submission, context={'request': request}).data)

# DASHBOARD STATISTICS
@api_view(['GET'])
def admin_dashboard(request):
    """Get admin dashboard statistics"""
    total_students = UserProfile.objects.filter(role='STUDENT').count()
    total_lecturers = UserProfile.objects.filter(role='LECTURER').count()
    total_courses = Course.objects.count()
    
    fees_payments = FeesPayment.objects.aggregate(
        total_due=Sum('amount_due'),
        total_paid=Sum('amount_paid')
    )
    
    fees_paid_percent = 0
    if fees_payments['total_due'] and fees_payments['total_due'] > 0:
        fees_paid_percent = int((fees_payments['total_paid'] / fees_payments['total_due']) * 100)
    
    return Response({
        'total_students': total_students,
        'total_lecturers': total_lecturers,
        'total_courses': total_courses,
        'fees_paid_percent': fees_paid_percent,
        'total_fees_due': float(fees_payments['total_due'] or 0),
        'total_fees_paid': float(fees_payments['total_paid'] or 0)
    })

@api_view(['GET'])
def lecturer_dashboard(request):
    """Get lecturer dashboard statistics"""
    lecturer_email = request.query_params.get('lecturer_email')
    if not lecturer_email:
        return Response({'error': 'lecturer_email required'}, status=400)
    
    lecturer = get_object_or_404(UserProfile, email=lecturer_email, role='LECTURER')
    
    courses = Course.objects.filter(lecturer=lecturer)
    total_students = CourseEnrollment.objects.filter(course__in=courses).count()
    
    pending_grades = AssignmentSubmission.objects.filter(
        assignment__course__in=courses,
        status='SUBMITTED'
    ).count()
    
    return Response({
        'total_courses': courses.count(),
        'total_students': total_students,
        'pending_grades': pending_grades
    })

@api_view(['GET'])
def student_dashboard(request):
    """Get student dashboard statistics"""
    student_email = request.query_params.get('student_email')
    if not student_email:
        return Response({'error': 'student_email required'}, status=400)
    
    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')

    enrollments = _normalize_student_enrollments(student)
    
    fees = FeesPayment.objects.get(student=student)
    
    performance = _student_performance_payload(student)

    return Response({
        'total_courses': enrollments.count(),
        'fees_status': fees.status,
        'fees_paid': float(fees.amount_paid),
        'fees_due': float(fees.amount_due),
        'fees_balance': float(fees.amount_due - fees.amount_paid),
        'gpa': performance['gpa'],
        'predicted_grade': performance['predicted_grade'],
        'attendance_rate': performance['attendance_rate'],
        'advice': performance['advice']
    })
def library_borrow(request):
    """Student borrow a book"""
    student_email = request.data.get('student_email')
    item_id = request.data.get('item_id')
    
    if not student_email or not item_id:
        return Response({'error': 'student_email and item_id required'}, status=400)
    
    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    item = get_object_or_404(LibraryItem, id=item_id)
    
    if item.copies_available <= 0:
        return Response({'error': 'No copies available'}, status=400)
    
    # Create borrow record
    due_date = timezone.now().date() + timedelta(days=14)
    borrow = StudentBorrow.objects.create(
        student=student,
        library_item=item,
        due_date=due_date,
        status='BORROWED'
    )
    
    # Update available copies
    item.copies_available -= 1
    item.save()
    
    return Response(StudentBorrowSerializer(borrow).data)

@api_view(['POST'])
def library_return(request):
    """Student return a book"""
    borrow_id = request.data.get('borrow_id')
    
    if not borrow_id:
        return Response({'error': 'borrow_id required'}, status=400)
    
    borrow = get_object_or_404(StudentBorrow, id=borrow_id)
    
    if borrow.status == 'RETURNED':
        return Response({'error': 'Book already returned'}, status=400)
    
    borrow.returned_date = timezone.now().date()
    borrow.status = 'RETURNED'
    borrow.save()
    
    # Update available copies
    item = borrow.library_item
    item.copies_available += 1
    item.save()
    
    return Response(StudentBorrowSerializer(borrow).data)

@api_view(['GET'])
def student_borrows(request):
    """Get student's borrowed items"""
    student_email = request.query_params.get('student_email')
    
    if not student_email:
        return Response({'error': 'student_email required'}, status=400)
    
    student = get_object_or_404(UserProfile, email=student_email, role='STUDENT')
    qs = StudentBorrow.objects.filter(student=student).order_by('-borrowed_date')
    
    return Response(StudentBorrowSerializer(qs, many=True).data)


@api_view(['POST'])
def register(request):
    """Register a new user (STUDENT or LECTURER) - creates account immediately"""
    _ensure_department_catalog()

    name = request.data.get('name', '').strip()
    email = request.data.get('email', '').strip().lower()
    phone = request.data.get('phone', '').strip()
    password = request.data.get('password', '')
    role = request.data.get('role', 'STUDENT')
    reg_number = request.data.get('reg_number', '').strip()
    department_id = request.data.get('department_id')
    selected_course_ids = request.data.get('selected_course_ids', [])
    
    if not all([name, email, password]):
        return Response({'error': 'name, email, and password are required'}, status=400)
    
    if len(password) < 6:
        return Response({'error': 'Password must be at least 6 characters'}, status=400)
    
    if role not in ['STUDENT', 'LECTURER']:
        return Response({'error': 'Role must be STUDENT or LECTURER'}, status=400)

    if not _email_matches_role_pattern(email, role):
        return Response({'error': _role_email_error(role)}, status=400)
    
    if UserProfile.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=400)
    
    if role == 'STUDENT' and not reg_number:
        return Response({'error': 'Registration number required for students'}, status=400)

    department = None
    if department_id:
        department = get_object_or_404(Department, id=department_id)

    if role == 'STUDENT':
        if not isinstance(selected_course_ids, list):
            return Response({'error': 'selected_course_ids must be a list'}, status=400)
        if len(selected_course_ids) < 3 or len(selected_course_ids) > 6:
            return Response({'error': 'Students must select between 3 and 6 courses'}, status=400)
        if not department:
            return Response({'error': 'Students must select a department'}, status=400)

        valid_course_count = Course.objects.filter(id__in=selected_course_ids, department=department).count()
        if valid_course_count != len(selected_course_ids):
            return Response({'error': 'Selected courses must belong to the chosen department'}, status=400)

    if role == 'LECTURER' and not department:
        return Response({'error': 'Lecturers must select a department'}, status=400)
    
    # Create user directly without email verification
    user = UserProfile(
        name=name,
        email=email,
        role=role,
        phone=phone,
        reg_number=reg_number if role == 'STUDENT' else '',
        department=department
    )
    user.set_password(password)  # Hash the password
    user.save()
    
    # Create fees payment record for students
    if role == 'STUDENT':
        selected_courses = Course.objects.filter(id__in=selected_course_ids)
        for course in selected_courses:
            CourseEnrollment.objects.get_or_create(
                student=user,
                course=course,
                defaults={'status': 'ACTIVE', 'progress_percent': 0}
            )

        total_due = _semester_fee_total(selected_courses.count())
        FeesPayment.objects.create(
            student=user,
            amount_due=total_due,
            amount_paid=Decimal('0.00'),
            status='PENDING'
        )

        for course in selected_courses:
            course.enrolled_count = course.enrollments.filter(status='ACTIVE').count()
            course.save(update_fields=['enrolled_count'])
    
    return Response({
        'message': 'Account created successfully! You can now login.',
        'user': UserSerializer(user).data,
        'selected_courses': selected_course_ids,
        'semester_fee_due': float(_semester_fee_total(len(selected_course_ids))) if role == 'STUDENT' else 0
    }, status=201)

@api_view(['POST'])
def verify_email(request):
    """Verify email and create user account"""
    from .models import EmailVerification
    
    email = request.data.get('email', '').strip().lower()
    code = request.data.get('code', '').strip()
    
    if not all([email, code]):
        return Response({'error': 'email and code are required'}, status=400)
    
    try:
        verification = EmailVerification.objects.get(email=email, code=code, is_verified=False)
    except EmailVerification.DoesNotExist:
        return Response({'error': 'Invalid or expired verification code'}, status=400)
    
    # Retrieve stored registration data
    name = verification.name or email.split('@')[0].title()
    role = verification.role or 'STUDENT'
    phone = verification.phone or ''
    reg_number = verification.reg_number or ''
    password = verification.password or 'default123'  # Fallback password
    
    verification.is_verified = True
    verification.save()
    
    # Create user with hashed password
    user = UserProfile(
        name=name,
        email=email,
        role=role,
        phone=phone,
        reg_number=reg_number if role == 'STUDENT' else ''
    )
    user.set_password(password)  # Hash the password
    user.save()
    
    if role == 'STUDENT':
        FeesPayment.objects.create(student=user)
    
    return Response({
        'message': 'Email verified and account created successfully!',
        'user': UserSerializer(user).data
    }, status=201)

# ═══════════════════════════════════════════════════════════════
# ATTENDANCE MANAGEMENT
# ═══════════════════════════════════════════════════════════════

@api_view(['POST'])
def mark_attendance(request):
    """Automatically mark attendance when student accesses course materials"""
    student_id = request.data.get('student_id')
    course_id = request.data.get('course_id')
    
    if not student_id or not course_id:
        return Response({'error': 'student_id and course_id required'}, status=400)
    
    try:
        student = UserProfile.objects.get(id=student_id, role='STUDENT')
        course = Course.objects.get(id=course_id)
    except (UserProfile.DoesNotExist, Course.DoesNotExist):
        return Response({'error': 'Student or Course not found'}, status=404)
    
    # Check if student is enrolled in the course
    if not CourseEnrollment.objects.filter(student=student, course=course, status='ACTIVE').exists():
        return Response({'error': 'Student not enrolled in this course'}, status=400)
    
    # Get today's date
    today = timezone.now().date()
    
    # Check if attendance already marked for today
    attendance, created = Attendance.objects.get_or_create(
        student=student,
        course=course,
        date=today,
        defaults={'status': 'PRESENT'}
    )
    
    if created:
        message = 'Attendance marked successfully'
    else:
        message = 'Attendance already marked for today'
    
    return Response({
        'message': message,
        'attendance': AttendanceSerializer(attendance).data
    }, status=201 if created else 200)

@api_view(['GET'])
def student_attendance(request):
    """Get attendance records for a student"""
    student_id = request.query_params.get('student_id')
    course_id = request.query_params.get('course_id')
    
    if not student_id:
        return Response({'error': 'student_id required'}, status=400)
    
    qs = Attendance.objects.filter(student_id=student_id)
    
    if course_id:
        qs = qs.filter(course_id=course_id)
    
    # Calculate attendance statistics
    total_records = qs.count()
    present_count = qs.filter(status='PRESENT').count()
    attendance_rate = (present_count / total_records * 100) if total_records > 0 else 0
    
    serializer = AttendanceSerializer(qs, many=True)
    
    return Response({
        'records': serializer.data,
        'statistics': {
            'total_classes': total_records,
            'attended': present_count,
            'attendance_rate': round(attendance_rate, 2)
        }
    })

@api_view(['GET'])
def course_attendance(request):
    """Get attendance records for all students in a course (for lecturers)"""
    course_id = request.query_params.get('course_id')
    date = request.query_params.get('date')
    
    if not course_id:
        return Response({'error': 'course_id required'}, status=400)
    
    qs = Attendance.objects.filter(course_id=course_id)
    
    if date:
        qs = qs.filter(date=date)
    
    serializer = AttendanceSerializer(qs, many=True)
    
    # Calculate course statistics
    enrolled_count = CourseEnrollment.objects.filter(course_id=course_id, status='ACTIVE').count()
    present_count = qs.filter(status='PRESENT').count() if date else None
    
    response_data = {
        'records': serializer.data,
        'course_info': {
            'enrolled_students': enrolled_count
        }
    }
    
    if date:
        response_data['attendance_summary'] = {
            'date': date,
            'present': present_count,
            'absent': enrolled_count - present_count,
            'attendance_rate': round((present_count / enrolled_count * 100), 2) if enrolled_count > 0 else 0
        }
    
    return Response(response_data)

@api_view(['GET'])
def attendance_summary(request):
    """Get attendance summary for all courses (for students or lecturers)"""
    student_id = request.query_params.get('student_id')
    lecturer_id = request.query_params.get('lecturer_id')
    
    if student_id:
        # Get enrolled courses
        enrollments = CourseEnrollment.objects.filter(student_id=student_id, status='ACTIVE')
        summary = []
        
        for enrollment in enrollments:
            attendance_records = Attendance.objects.filter(student_id=student_id, course=enrollment.course)
            total = attendance_records.count()
            present = attendance_records.filter(status='PRESENT').count()
            
            summary.append({
                'course_id': enrollment.course.id,
                'course_code': enrollment.course.code,
                'course_name': enrollment.course.name,
                'total_classes': total,
                'attended': present,
                'attendance_rate': round((present / total * 100), 2) if total > 0 else 0
            })
        
        return Response({'summary': summary})
    
    elif lecturer_id:
        # Get courses taught by lecturer
        courses = Course.objects.filter(lecturer_id=lecturer_id)
        summary = []
        
        for course in courses:
            enrolled = CourseEnrollment.objects.filter(course=course, status='ACTIVE').count()
            total_attendance_records = Attendance.objects.filter(course=course).count()
            
            summary.append({
                'course_id': course.id,
                'course_code': course.code,
                'course_name': course.name,
                'enrolled_students': enrolled,
                'total_attendance_records': total_attendance_records
            })
        
        return Response({'summary': summary})
    
    else:
        return Response({'error': 'student_id or lecturer_id required'}, status=400)
