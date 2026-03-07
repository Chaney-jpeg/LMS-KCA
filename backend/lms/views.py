from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import UserProfile, Course, Notification, LibraryItem, StudentBorrow, CourseMaterial
from .models import CourseEnrollment, FeesPayment, StudentGrade, AssignmentSubmission, Attendance
from .serializers import UserSerializer, CourseSerializer, NotificationSerializer, LibraryItemSerializer, StudentBorrowSerializer, CourseMaterialSerializer
from .serializers import CourseEnrollmentSerializer, FeesPaymentSerializer, StudentGradeSerializer, AssignmentSubmissionSerializer, AttendanceSerializer
from django.shortcuts import get_object_or_404
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Q
from django.http import FileResponse
import os

@api_view(['GET','POST'])
def users(request):
    if request.method == 'GET':
        qs = UserProfile.objects.all()
        return Response(UserSerializer(qs, many=True).data)
    elif request.method == 'POST':
        # Create new user
        name = request.data.get('name')
        email = request.data.get('email')
        role = request.data.get('role', 'STUDENT')
        reg_number = request.data.get('reg_number', '')
        phone = request.data.get('phone', '')
        
        if not name or not email:
            return Response({'error': 'name and email required'}, status=400)
        
        if UserProfile.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=400)
        
        user = UserProfile.objects.create(name=name, email=email, role=role, reg_number=reg_number, phone=phone)
        
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
        user.name = request.data.get('name', user.name)
        user.email = request.data.get('email', user.email)
        user.role = request.data.get('role', user.role)
        user.status = request.data.get('status', user.status)
        user.reg_number = request.data.get('reg_number', user.reg_number)
        user.phone = request.data.get('phone', user.phone)
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
        # For backwards compatibility, auto-create users with role detection
        prefix = email.split('@')[0]
        role = 'STUDENT'
        if prefix.startswith('admin'):
            role = 'ADMIN'
        elif prefix and prefix[0].isdigit():
            role = 'STUDENT'
        else:
            role = 'LECTURER'
        
        user = UserProfile(name=prefix, email=email, role=role)
        user.set_password(password)  # Hash the password
        user.save()
        return Response({'ok': True, 'user': UserSerializer(user).data, 'role': role})
    
    # Verify password for existing users
    if user.password:
        if not user.check_password(password):
            return Response({'error': 'Invalid email or password'}, status=401)
    else:
        # User exists but no password set (legacy user) - set password now
        user.set_password(password)
        user.save()
    
    return Response({'ok': True, 'user': UserSerializer(user).data, 'role': user.role})

@api_view(['GET','POST'])
def courses(request):
    if request.method == 'GET':
        # if lecturer_email param is provided, return only courses assigned to that lecturer
        lecturer_email = request.query_params.get('lecturer_email')
        if lecturer_email:
            qs = Course.objects.filter(lecturer__email=lecturer_email)
        else:
            qs = Course.objects.all()
        return Response(CourseSerializer(qs, many=True).data)
    elif request.method == 'POST':
        # Create new course (admin only)
        code = request.data.get('code')
        name = request.data.get('name')
        lecturer_id = request.data.get('lecturer_id')
        
        if not code or not name:
            return Response({'error': 'code and name required'}, status=400)
        
        if Course.objects.filter(code=code).exists():
            return Response({'error': 'Course code already exists'}, status=400)
        
        lecturer = None
        if lecturer_id:
            lecturer = get_object_or_404(UserProfile, id=lecturer_id, role='LECTURER')
        
        course = Course.objects.create(code=code, name=name, lecturer=lecturer)
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
        
        lecturer_id = request.data.get('lecturer_id')
        if lecturer_id:
            course.lecturer = get_object_or_404(UserProfile, id=lecturer_id, role='LECTURER')
        
        course.save()
        return Response(CourseSerializer(course).data)
    elif request.method == 'DELETE':
        course.delete()
        return Response({'message': 'Course deleted'})

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
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(material.file.name)}"'
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

@api_view(['GET'])
def library_items(request):
    """Get all library items"""
    qs = LibraryItem.objects.all()
    return Response(LibraryItemSerializer(qs, many=True).data)

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
            qs = qs.filter(student__email=student_email)
        
        return Response(CourseEnrollmentSerializer(qs, many=True).data)
    
    elif request.method == 'POST':
        # Enroll student in course
        student_id = request.data.get('student_id')
        course_id = request.data.get('course_id')
        
        if not student_id or not course_id:
            return Response({'error': 'student_id and course_id required'}, status=400)
        
        student = get_object_or_404(UserProfile, id=student_id, role='STUDENT')
        course = get_object_or_404(Course, id=course_id)
        
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
    return Response(FeesPaymentSerializer(payment, context={'request': request}).data)

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
    
    enrollments = CourseEnrollment.objects.filter(student=student, status='ACTIVE')
    
    fees = FeesPayment.objects.get(student=student)
    
    return Response({
        'total_courses': enrollments.count(),
        'fees_status': fees.status,
        'fees_paid': float(fees.amount_paid),
        'fees_due': float(fees.amount_due),
        'fees_balance': float(fees.amount_due - fees.amount_paid)
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
    name = request.data.get('name', '').strip()
    email = request.data.get('email', '').strip().lower()
    phone = request.data.get('phone', '').strip()
    password = request.data.get('password', '')
    role = request.data.get('role', 'STUDENT')
    reg_number = request.data.get('reg_number', '').strip()
    
    if not all([name, email, password]):
        return Response({'error': 'name, email, and password are required'}, status=400)
    
    if len(password) < 6:
        return Response({'error': 'Password must be at least 6 characters'}, status=400)
    
    if role not in ['STUDENT', 'LECTURER']:
        return Response({'error': 'Role must be STUDENT or LECTURER'}, status=400)
    
    if UserProfile.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=400)
    
    if role == 'STUDENT' and not reg_number:
        return Response({'error': 'Registration number required for students'}, status=400)
    
    # Create user directly without email verification
    user = UserProfile(
        name=name,
        email=email,
        role=role,
        phone=phone,
        reg_number=reg_number if role == 'STUDENT' else ''
    )
    user.set_password(password)  # Hash the password
    user.save()
    
    # Create fees payment record for students
    if role == 'STUDENT':
        FeesPayment.objects.create(student=user)
    
    return Response({
        'message': 'Account created successfully! You can now login.',
        'user': UserSerializer(user).data
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
