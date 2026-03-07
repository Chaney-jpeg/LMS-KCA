from django.core.management.base import BaseCommand
from lms.models import (
    UserProfile, Course, Notification, LibraryItem, StudentBorrow,
    CourseMaterial, CourseEnrollment, FeesPayment, StudentGrade, AssignmentSubmission
)
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import random


class Command(BaseCommand):
    help = 'Seed database with initial KCAU LMS data'

    def handle(self, *args, **options):
        self.stdout.write('Starting database seed...')

        # Clear existing data
        UserProfile.objects.all().delete()
        Course.objects.all().delete()
        Notification.objects.all().delete()
        LibraryItem.objects.all().delete()
        StudentBorrow.objects.all().delete()
        CourseMaterial.objects.all().delete()
        CourseEnrollment.objects.all().delete()
        FeesPayment.objects.all().delete()
        StudentGrade.objects.all().delete()
        AssignmentSubmission.objects.all().delete()

        # Create Admin User
        admin = UserProfile.objects.create(
            email='admin@kca',
            role='ADMIN',
            name='System Administrator',
            status='active',
            phone='+254712345678'
        )
        self.stdout.write(self.style.SUCCESS(f'CREATED Admin: {admin.email}'))

        # Create Lecturers
        lecturers = []
        lecturer_data = [
            ('lecturer@kca', 'Dr. John Omondi', '+254722111111'),
            ('lecturer2@kca', 'Prof. Sarah Kipchoge', '+254722111112'),
            ('lecturer3@kca', 'Dr. Michael Mucheru', '+254722111113'),
        ]
        for email, name, phone in lecturer_data:
            lecturer = UserProfile.objects.create(
                email=email,
                role='LECTURER',
                name=name,
                status='active',
                phone=phone
            )
            lecturers.append(lecturer)
        self.stdout.write(self.style.SUCCESS(f'CREATED {len(lecturers)} Lecturers'))

        # Create Students
        students = []
        student_names = [
            'Alice Kamau', 'Brian Kipchoge', 'Cynthia Marion', 'David Kiplagat', 'Emma Gathoni',
            'Frank Kimani', 'Grace Njeri', 'Henry Mwangi', 'Iris Juma', 'Jacob Kipondo',
            'Kwame Otieno', 'Lucia Kamwia', 'Martin Kipchoge', 'Nancy Chioma', 'Oscar Kimani',
            'Patricia Kariuki', 'Quinn Kiplagat', 'Rachel Mwathi', 'Samuel Kiplagat', 'Tasha Njoki',
            'Usman Kariuki', 'Vivian Mwangi', 'William Kipchoge', 'Xenia Kimani', 'Yolanda Kiplagat',
            'Zachary Mwangi', 'Amina Kiplagat', 'Benjamin Mwangi', 'Chioma Kipchoge', 'Diana Kariuki',
            'Ethan Mwangi', 'Farah Kiplagat', 'Gabriel Mwangi', 'Hana Kimani', 'Ibrahim Kipchoge',
            'Jasmine Mwangi', 'Karim Kiplagat', 'Leah Kariuki', 'Michael Mwangi', 'Nina Kimani',
            'Omar Kipchoge', 'Pamela Mwangi', 'Qadri Kiplagat', 'Rebecca Kariuki', 'Sophia Kimani',
            'Tariq Mwangi', 'Umulkhayr Kiplagat', 'Victor Wipchoge', 'Wendy Kimani', 'Xavier Kiplagat'
        ]
        for i in range(0, 50):
            student = UserProfile.objects.create(
                email=f'{2000 + i}@kca',
                role='STUDENT',
                name=student_names[i],
                status='active',
                reg_number=f'KCAU/{2000 + i}',
                phone=f'+2547220000{i:02d}'
            )
            students.append(student)
        self.stdout.write(self.style.SUCCESS(f'CREATED {len(students)} Students'))

        # Create Courses
        course_data = [
            ('CS101', 'Introduction to Programming', lecturers[0], 38, 65),
            ('CS102', 'Data Structures', lecturers[0], 32, 72),
            ('CS201', 'Web Development', lecturers[1], 45, 78),
            ('CS202', 'Database Design', lecturers[1], 28, 68),
            ('CS301', 'Software Engineering', lecturers[2], 35, 82),
            ('CS302', 'Mobile Development', lecturers[2], 22, 55),
            ('IT101', 'IT Fundamentals', lecturers[0], 50, 60),
            ('IT202', 'Network Security', lecturers[1], 25, 75),
        ]
        courses = []
        for code, name, lecturer, enrolled, completion in course_data:
            course = Course.objects.create(
                code=code,
                name=name,
                lecturer=lecturer,
                enrolled_count=enrolled,
                completion_percent=completion
            )
            courses.append(course)
        self.stdout.write(self.style.SUCCESS(f'CREATED {len(courses)} Courses'))

        # Create Notifications
        notifications = [
            ('ADMIN', 'System Alert', 'Database backup completed successfully.'),
            ('LECTURER', 'Grading Reminder', 'You have 5 assignments pending grading.'),
            ('STUDENT', 'Enrollment Open', 'New courses available for registration next semester.'),
            ('ADMIN', 'User Activity', '12 new user registrations in the last 24 hours.'),
            ('LECTURER', 'Resource Upload', 'New learning materials uploaded by admin.'),
            ('STUDENT', 'Course Update', 'Your instructor uploaded new lecture notes.'),
            ('ADMIN', 'System Maintenance', 'Scheduled maintenance on Sunday 2 AM - 4 AM.'),
        ]
        for role, title, body in notifications:
            Notification.objects.create(role=role, title=title, body=body, read=False)
        self.stdout.write(self.style.SUCCESS(f'CREATED {len(notifications)} Notifications'))

        # Create Library Items
        library_data = [
            ('Introduction to Algorithms', 'Thomas H. Cormen', '9780262033848', 3, 3),
            ('Clean Code', 'Robert C. Martin', '9780132350884', 2, 1),
            ('Design Patterns', 'Gang of Four', '9780201633610', 4, 4),
            ('The Pragmatic Programmer', 'David Thomas, Andrew Hunt', '9780135957059', 3, 2),
            ('Refactoring', 'Martin Fowler', '9780134757599', 2, 2),
            ('Code Complete', 'Steve McConnell', '9780735619678', 3, 3),
            ('The Art of Computer Programming', 'Donald Knuth', '9780201896831', 1, 1),
            ('Database Design Manual', 'Nilson Roberts', '0201616165', 5, 5),
            ('Web Security Testing Cookbook', 'Paco Hope', '9780596514839', 2, 1),
            ('Effective Java', 'Joshua Bloch', '9780134685991', 4, 3),
            ('Python Crash Course', 'Eric Matthes', '9781593279288', 3, 2),
            ('JavaScript: The Good Parts', 'Douglas Crockford', '9780596517748', 2, 2),
        ]
        library_items = []
        for title, author, isbn, total, available in library_data:
            item = LibraryItem.objects.create(
                title=title,
                author=author,
                isbn=isbn,
                description=f'Academic resource for programming and software engineering',
                publication_year=2020,
                copies_total=total,
                copies_available=available
            )
            library_items.append(item)
        self.stdout.write(self.style.SUCCESS(f'CREATED {len(library_items)} Library Items'))

        # ===== NEW DATA: Course Materials =====
        materials_data = [
            # CS101 Materials
            ('CS101', 'Lecture 1: Python Basics', 'Introduction to Python syntax, variables, and data types', 'LECTURE'),
            ('CS101', 'Lecture 2: Functions', 'Understanding functions, parameters, and return values', 'LECTURE'),
            ('CS101', 'Assignment 1: Hello World', 'Create a simple Python program', 'ASSIGNMENT'),
            ('CS101', 'Assignment 2: Calculator', 'Build a basic calculator with functions', 'ASSIGNMENT'),
            # CS102 Materials
            ('CS102', 'Lecture 1: Arrays & Lists', 'Understanding array structures and list operations', 'LECTURE'),
            ('CS102', 'Assignment 1: List Operations', 'Implement common list algorithms', 'ASSIGNMENT'),
            # CS201 Materials
            ('CS201', 'Module 1: HTML Basics', 'HyperText Markup Language fundamentals', 'LECTURE'),
            ('CS201', 'Module 2: CSS Styling', 'Cascading Style Sheets for web design', 'LECTURE'),
            ('CS201', 'Assignment 1: Portfolio Site', 'Create a personal portfolio website', 'ASSIGNMENT'),
            ('CS201', 'Assignment 2: Responsive Design', 'Make website mobile responsive', 'ASSIGNMENT'),
            # CS202 Materials
            ('CS202', 'Chapter 1: SQL Basics', 'Structured Query Language fundamentals', 'LECTURE'),
            ('CS202', 'Chapter 2: Normalization', 'Database design and normalization principles', 'LECTURE'),
            ('CS202', 'Assignment 1: Database Design', 'Design a relational database schema', 'ASSIGNMENT'),
            # CS301 Materials
            ('CS301', 'Module 1: SDLC Overview', 'Software Development Life Cycle processes', 'LECTURE'),
            ('CS301', 'Assignment 1: Project Plan', 'Create software project documentation', 'ASSIGNMENT'),
            # CS302 Materials
            ('CS302', 'Unit 1: Mobile Development Intro', 'Introduction to mobile app platforms', 'LECTURE'),
            ('CS302', 'Assignment 1: Mobile App', 'Develop a simple mobile application', 'ASSIGNMENT'),
        ]
        
        for course_code, title, description, mtype in materials_data:
            course = Course.objects.get(code=course_code)
            CourseMaterial.objects.create(
                course=course,
                title=title,
                description=description,
                material_type=mtype,
                uploaded_by=course.lecturer
            )
        self.stdout.write(self.style.SUCCESS(f'CREATED {len(materials_data)} Course Materials'))

        # ===== NEW DATA: Course Enrollments =====
        enrollment_count = 0
        for course in courses:
            # Randomly select 20-40 students per course
            selected_students = random.sample(students, k=random.randint(20, 40))
            for student in selected_students:
                enrollment, created = CourseEnrollment.objects.get_or_create(
                    student=student,
                    course=course,
                    defaults={
                        'status': 'ACTIVE',
                        'progress_percent': random.randint(20, 100)
                    }
                )
                if created:
                    enrollment_count += 1
        self.stdout.write(self.style.SUCCESS(f'CREATED {enrollment_count} Course Enrollments'))

        # ===== NEW DATA: Fees Payments =====
        fee_count = 0
        try:
            for i, student in enumerate(students):
                # Create fee payment record
                amount_due = 30000  # 30,000 KES per semester
                payment_status = random.choice(['PAID', 'PARTIAL', 'PENDING', 'OVERDUE'])
                
                if payment_status == 'PAID':
                    amount_paid = amount_due
                elif payment_status == 'PARTIAL':
                    amount_paid = int(amount_due * random.uniform(0.3, 0.8))
                else:  # PENDING or OVERDUE
                    amount_paid = 0
                
                FeesPayment.objects.create(
                    student=student,
                    amount_due=int(amount_due),
                    amount_paid=int(amount_paid),
                    status=payment_status,
                    last_payment_date=timezone.now() - timedelta(days=random.randint(1, 60)) if payment_status != 'PENDING' else None
                )
                fee_count += 1
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Fee creation partial: {fee_count} created before error'))
        self.stdout.write(self.style.SUCCESS(f'CREATED {fee_count} Fee Payments'))

        # ===== NEW DATA: Student Grades =====
        grade_count = 0
        grade_mapping = {
            (90, 100): 'A',
            (80, 89): 'B',
            (70, 79): 'C',
            (60, 69): 'D',
            (0, 59): 'F',
        }
        
        for enrollment in CourseEnrollment.objects.all()[:30]:  # Grade first 30 enrollments
            raw_score = random.randint(55, 98)
            weighted_score = int(raw_score * 0.8)  # 80% weight
            
            # Get grade based on score
            grade = 'F'
            for (min_s, max_s), g in grade_mapping.items():
                if min_s <= raw_score <= max_s:
                    grade = g
                    break
            
            grade_obj, created = StudentGrade.objects.get_or_create(
                student=enrollment.student,
                course=enrollment.course,
                defaults={
                    'raw_score': raw_score,
                    'weighted_score': weighted_score,
                    'grade': grade,
                    'graded_by': enrollment.course.lecturer,
                    'feedback': f'Good performance. {random.choice(["Keep it up!", "Work on exercise questions.", "Excellent understanding.", "Need more practice."])}'
                }
            )
            if created:
                grade_count += 1
        self.stdout.write(self.style.SUCCESS(f'CREATED {grade_count} Student Grades'))

        # ===== NEW DATA: Assignment Submissions =====
        submission_count = 0
        for material in CourseMaterial.objects.filter(material_type='ASSIGNMENT')[:10]:
            # Random students submit the assignment
            for enrollment in CourseEnrollment.objects.filter(course=material.course)[:random.randint(3, 8)]:
                submission_status = random.choice(['SUBMITTED', 'GRADED'])
                
                submission = AssignmentSubmission.objects.create(
                    assignment=material,
                    student=enrollment.student,
                    submission_file='submissions/sample_submission.pdf',
                    status=submission_status,
                    submission_date=timezone.now() - timedelta(days=random.randint(0, 14))
                )
                
                if submission_status == 'GRADED':
                    score = random.randint(55, 100)
                    submission.score = score
                    submission.feedback = random.choice([
                        'Excellent work! Well explained and implemented.',
                        'Good effort. Review the requirements again.',
                        'Solid understanding demonstrated.',
                        'Needs revision. Check the logic flow.',
                    ])
                    submission.graded_date = timezone.now() - timedelta(days=random.randint(0, 7))
                    submission.save()
                
                submission_count += 1
        self.stdout.write(self.style.SUCCESS(f'CREATED {submission_count} Assignment Submissions'))

        self.stdout.write(self.style.SUCCESS('DONE: Database seed complete!'))
        self.stdout.write(self.style.WARNING('\nTEST CREDENTIALS (Login at http://localhost:3000):'))
        self.stdout.write('  ADMIN -> Email: admin@kca')
        self.stdout.write('  LECTURER -> Email: lecturer@kca')
        self.stdout.write('  STUDENT -> Email: 2000@kca (or 2001@kca, 2002@kca, etc. any 50 students)')
        self.stdout.write(self.style.WARNING('\nMOCK DATA SUMMARY:'))
        self.stdout.write(f'  . 1 Admin, 3 Lecturers, 50 Students')
        self.stdout.write(f'  . 8 Courses with {enrollment_count} total enrollments')
        self.stdout.write(f'  . {len(materials_data)} Course Materials (lectures + assignments)')
        self.stdout.write(f'  . {fee_count} Student Fee Records (PAID/PARTIAL/PENDING/OVERDUE)')
        self.stdout.write(f'  . {grade_count} Student Grades across courses')
        self.stdout.write(f'  . {submission_count} Assignment Submissions (SUBMITTED/GRADED)')
        self.stdout.write('')
