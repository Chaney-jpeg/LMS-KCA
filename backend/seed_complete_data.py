"""
Comprehensive mock data seeder for KCA LMS.
Run with: python seed_complete_data.py
Make sure to run from the backend/ directory.
"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.utils import timezone
from datetime import date, timedelta, datetime
from decimal import Decimal
from lms.models import (
    UserProfile, Department, Course, CourseEnrollment, CourseMaterial,
    AssignmentSubmission, StudentGrade, Attendance, FeesPayment,
    ZoomClass, StudentTimetableEntry, Notification
)

print("=== KCA LMS Complete Data Seeder ===\n")

# ─── STEP 1: Departments ─────────────────────────────────────────────────────
print("1. Setting up departments...")
dept_bus, _ = Department.objects.get_or_create(code='BUS', defaults={'name': 'Business'})
dept_tech, _ = Department.objects.get_or_create(code='TECH', defaults={'name': 'Technology'})
dept_psy, _ = Department.objects.get_or_create(code='PSY', defaults={'name': 'Psychology'})
print(f"   Departments: {Department.objects.count()}")

# ─── STEP 2: Lecturers ───────────────────────────────────────────────────────
print("2. Creating lecturers...")
lecturers_data = [
    ('Dr. Sarah Kamau', 'sarah.kamau@kca.ac.ke', 'BUS'),
    ('Prof. James Omondi', 'james.omondi@kca.ac.ke', 'TECH'),
    ('Dr. Aisha Muthoni', 'aisha.muthoni@kca.ac.ke', 'PSY'),
    ('Mr. Kevin Njoroge', 'kevin.njoroge@kca.ac.ke', 'BUS'),
    ('Ms. Grace Wambui', 'grace.wambui@kca.ac.ke', 'TECH'),
]
lecturers = {}
for name, email, dept_code in lecturers_data:
    dept = Department.objects.get(code=dept_code)
    lec, created = UserProfile.objects.get_or_create(
        email=email,
        defaults={'name': name, 'role': 'LECTURER', 'status': 'ACTIVE', 'department': dept}
    )
    if created:
        lec.set_password('Lecturer@123')
        lec.save()
    lecturers[email] = lec
print(f"   Lecturers: {len(lecturers)}")

# ─── STEP 3: Courses ─────────────────────────────────────────────────────────
print("3. Creating courses...")
courses_data = [
    # Business courses
    ('BUS101', 'Financial Accounting', 'BUS', 'sarah.kamau@kca.ac.ke', 18000),
    ('BUS102', 'Managerial Accounting', 'BUS', 'sarah.kamau@kca.ac.ke', 18000),
    ('BUS201', 'Corporate Finance', 'BUS', 'kevin.njoroge@kca.ac.ke', 18000),
    ('BUS202', 'Business Law', 'BUS', 'kevin.njoroge@kca.ac.ke', 18000),
    ('BUS301', 'Strategic Management', 'BUS', 'sarah.kamau@kca.ac.ke', 18000),
    # Technology courses
    ('TECH101', 'Programming Fundamentals', 'TECH', 'james.omondi@kca.ac.ke', 20000),
    ('TECH102', 'Database Systems', 'TECH', 'james.omondi@kca.ac.ke', 20000),
    ('TECH201', 'Web Development', 'TECH', 'grace.wambui@kca.ac.ke', 20000),
    ('TECH202', 'Software Engineering', 'TECH', 'grace.wambui@kca.ac.ke', 20000),
    ('TECH301', 'Machine Learning', 'TECH', 'james.omondi@kca.ac.ke', 20000),
    # Psychology courses
    ('PSY101', 'Introduction to Psychology', 'PSY', 'aisha.muthoni@kca.ac.ke', 16000),
    ('PSY102', 'Developmental Psychology', 'PSY', 'aisha.muthoni@kca.ac.ke', 16000),
    ('PSY201', 'Social Psychology', 'PSY', 'aisha.muthoni@kca.ac.ke', 16000),
]
all_courses = {}
for code, name, dept_code, lecturer_email, fee in courses_data:
    dept = Department.objects.get(code=dept_code)
    lecturer = lecturers.get(lecturer_email)
    course, created = Course.objects.get_or_create(
        code=code,
        defaults={'name': name, 'department': dept, 'lecturer': lecturer, 'unit_fee': fee}
    )
    if not created and course.lecturer != lecturer:
        course.lecturer = lecturer
        course.save(update_fields=['lecturer'])
    all_courses[code] = course
print(f"   Courses: {len(all_courses)}")

# ─── STEP 4: Students ────────────────────────────────────────────────────────
print("4. Creating students...")
students_data = [
    ('John Mwangi', '2023001@student.kca.ac.ke', 'KCA/TECH/2023/001', 'BUS', ['TECH101', 'TECH102', 'BUS101', 'BUS201']),
    ('Alice Njeri', '2023002@student.kca.ac.ke', 'KCA/BUS/2023/002', 'BUS', ['BUS101', 'BUS102', 'BUS201', 'BUS202']),
    ('Peter Otieno', '2023003@student.kca.ac.ke', 'KCA/TECH/2023/003', 'TECH', ['TECH101', 'TECH201', 'TECH202', 'TECH301']),
    ('Mary Akinyi', '2023004@student.kca.ac.ke', 'KCA/PSY/2023/004', 'PSY', ['PSY101', 'PSY102', 'PSY201']),
    ('David Kimani', '2024005@student.kca.ac.ke', 'KCA/BUS/2024/005', 'BUS', ['BUS101', 'BUS202', 'BUS301']),
    # Newly registered student
    ('Faith Wanjiku', '2024006@student.kca.ac.ke', 'KCA/TECH/2024/006', 'TECH', ['TECH101', 'TECH102', 'TECH201']),
]
all_students = {}
for name, email, reg, dept_code, course_codes in students_data:
    dept = Department.objects.get(code=dept_code)
    student, created = UserProfile.objects.get_or_create(
        email=email,
        defaults={'name': name, 'role': 'STUDENT', 'status': 'ACTIVE', 'reg_number': reg, 'department': dept}
    )
    if created:
        student.set_password('Student@123')
        student.save()
    all_students[email] = (student, course_codes)
    # Enroll in courses
    for code in course_codes:
        course = all_courses.get(code)
        if course:
            enrollment, _ = CourseEnrollment.objects.get_or_create(student=student, course=course, defaults={'status': 'ACTIVE', 'progress_percent': 0})
    # Create fee record
    num_courses = len(course_codes)
    amount_due = Decimal(str(sum(all_courses[c].unit_fee for c in course_codes if c in all_courses)))
    fee_paid = amount_due * Decimal('0.6') if created else None
    if created:
        FeesPayment.objects.get_or_create(
            student=student,
            defaults={'amount_due': amount_due, 'amount_paid': fee_paid, 'status': 'PARTIAL' if fee_paid < amount_due else 'PAID'}
        )
print(f"   Students: {len(all_students)}")

# ─── STEP 5: Course Materials ────────────────────────────────────────────────
print("5. Creating course materials...")
materials_created = 0
for code, course in all_courses.items():
    existing = CourseMaterial.objects.filter(course=course).count()
    if existing >= 3:
        continue
    for i, (title, mtype, desc) in enumerate([
        (f'{code} - Week 1 Notes', 'MATERIAL', 'Introduction and overview'),
        (f'{code} - CAT 1', 'CAT', 'Class Assessment Test 1 — covers first 4 weeks'),
        (f'{code} - Assignment 1', 'ASSIGNMENT', 'Submit your first assignment'),
        (f'{code} - Week 5 Notes', 'MATERIAL', 'Mid-semester content'),
        (f'{code} - Assignment 2', 'ASSIGNMENT', 'Research paper submission'),
        (f'{code} - CAT 2', 'CAT', 'Class Assessment Test 2'),
    ]):
        m, created = CourseMaterial.objects.get_or_create(
            course=course,
            title=title,
            defaults={'material_type': mtype, 'description': desc, 'uploaded_by': course.lecturer}
        )
        if created:
            materials_created += 1
print(f"   Materials created: {materials_created}")

# ─── STEP 6: Attendance Records ──────────────────────────────────────────────
print("6. Creating attendance records...")
att_created = 0
today = date.today()
statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT', 'PRESENT']
for email, (student, course_codes) in all_students.items():
    for code in course_codes:
        course = all_courses.get(code)
        if not course:
            continue
        for week in range(12):
            att_date = today - timedelta(weeks=week, days=1)
            status = statuses[week % len(statuses)]
            _, created = Attendance.objects.get_or_create(
                student=student, course=course, date=att_date,
                defaults={'status': status}
            )
            if created:
                att_created += 1
print(f"   Attendance records: {att_created}")

# ─── STEP 7: Assignment Submissions & Grades ─────────────────────────────────
print("7. Creating submissions and grades...")
import random
random.seed(42)
sub_created = 0
grade_created = 0
for email, (student, course_codes) in all_students.items():
    for code in course_codes:
        course = all_courses.get(code)
        if not course:
            continue
        # Create StudentGrade
        raw_score = Decimal(str(random.randint(55, 95)))
        grade_letter = 'A' if raw_score >= 90 else 'B' if raw_score >= 80 else 'C' if raw_score >= 70 else 'D' if raw_score >= 60 else 'F'
        _, created = StudentGrade.objects.get_or_create(
            student=student, course=course,
            defaults={
                'raw_score': raw_score,
                'weighted_score': raw_score,
                'grade': grade_letter,
                'graded_by': course.lecturer,
                'graded_date': timezone.now() - timedelta(days=random.randint(5, 90)),
                'feedback': f'Good work. Keep improving.' if grade_letter in ['A', 'B'] else 'Needs improvement. Review materials.'
            }
        )
        if created:
            grade_created += 1

        # CAT and assignment submissions
        materials = CourseMaterial.objects.filter(course=course, material_type__in=['CAT', 'ASSIGNMENT'])
        for material in materials:
            score = Decimal(str(random.randint(40, 98)))
            status = 'GRADED'
            _, created = AssignmentSubmission.objects.get_or_create(
                assignment=material, student=student,
                defaults={
                    'submission_file': 'submissions/placeholder.txt',
                    'status': status,
                    'score': score,
                    'feedback': 'Graded.' if score >= 50 else 'Below pass mark. Resubmit.',
                    'graded_date': timezone.now() - timedelta(days=random.randint(1, 30))
                }
            )
            if created:
                sub_created += 1
print(f"   Grades: {grade_created}, Submissions: {sub_created}")

# ─── STEP 8: Historical Grades (Past Terms) ───────────────────────────────────
print("8. Creating historical grade records...")
hist_created = 0
for email, (student, course_codes) in all_students.items():
    for i, code in enumerate(course_codes[:2]):  # First 2 courses as past term
        course = all_courses.get(code)
        if not course:
            continue
        # Don't duplicate current StudentGrade — just check if graded_date is already old
        sg = StudentGrade.objects.filter(student=student, course=course).first()
        if sg and sg.graded_date:
            past_date = timezone.now() - timedelta(days=400 + i * 30)
            # Only set as historical if graded_date is recent (we want to add past term data)
            # For demonstration, update to have mixed terms
            if i == 0:
                sg.graded_date = timezone.now() - timedelta(days=365)
                sg.save(update_fields=['graded_date'])
                hist_created += 1
print(f"   Historical entries adjusted: {hist_created}")

# ─── STEP 9: Zoom Classes ────────────────────────────────────────────────────
print("9. Creating Zoom classes...")
zoom_created = 0
future_dates = [timezone.now() + timedelta(days=d) for d in [2, 5, 7, 10, 14]]
zoom_titles = ['Weekly Lecture', 'Tutorial Session', 'Q&A Session', 'Midterm Review', 'Guest Lecture']
for i, (code, course) in enumerate(list(all_courses.items())[:8]):
    future_dt = future_dates[i % len(future_dates)]
    _, created = ZoomClass.objects.get_or_create(
        course=course,
        title=f'{zoom_titles[i % len(zoom_titles)]} — {code}',
        defaults={
            'meeting_url': f'https://zoom.us/j/{900000000 + i}',
            'meeting_code': f'{100000 + i}',
            'host': course.lecturer,
            'scheduled_for': future_dt.replace(hour=9 + (i % 8), minute=0, second=0)
        }
    )
    if created:
        zoom_created += 1
print(f"   Zoom classes: {zoom_created}")

# ─── STEP 10: Timetable Entries ──────────────────────────────────────────────
print("10. Creating student timetable entries...")
tt_created = 0
for email, (student, course_codes) in list(all_students.items())[:3]:
    entries = [
        ('Study Group - Financial Accounting', 'PERSONAL', today + timedelta(days=3), '10:00', '12:00', 'Meet at library room 3'),
        ('CAT 1 Preparation', 'CAT', today + timedelta(days=5), '08:00', '10:00', 'Review chapters 1-4'),
        ('Assignment Deadline Reminder', 'ASSIGNMENT', today + timedelta(days=7), None, None, 'Submit before midnight'),
    ]
    for title, etype, edate, start, end, notes in entries:
        _, created = StudentTimetableEntry.objects.get_or_create(
            student=student, title=title,
            defaults={'entry_type': etype, 'entry_date': edate, 'start_time': start, 'end_time': end, 'notes': notes}
        )
        if created:
            tt_created += 1
print(f"   Timetable entries: {tt_created}")

# ─── STEP 11: Update enrollment progress ─────────────────────────────────────
print("11. Updating enrollment progress...")
for enrollment in CourseEnrollment.objects.all():
    materials_count = CourseMaterial.objects.filter(course=enrollment.course).count()
    submissions_count = AssignmentSubmission.objects.filter(student=enrollment.student, assignment__course=enrollment.course).count()
    if materials_count > 0:
        progress = min(100, int((submissions_count / max(1, materials_count)) * 100))
    else:
        progress = random.randint(20, 80)
    enrollment.progress_percent = progress
    enrollment.save(update_fields=['progress_percent'])

print("\n=== SEEDING COMPLETE ===")
print("\nTest Accounts:")
print("─" * 50)
print("ADMIN:   admin@kca.ac.ke        / Admin@123")
print("─" * 50)
for name, email, dept_code, lecturer_email, _ in courses_data[:1]:
    pass
for name, email, dept_code in lecturers_data:
    print(f"LECTURER: {email:40s} / Lecturer@123")
print("─" * 50)
for name, email, reg, dept_code, _ in students_data:
    print(f"STUDENT:  {email:40s} / Student@123")
print("─" * 50)
