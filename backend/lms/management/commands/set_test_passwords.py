"""
Management command to set test passwords for all users.
This ensures password authentication works properly.
"""
from django.core.management.base import BaseCommand
from lms.models import UserProfile


class Command(BaseCommand):
    help = 'Set test passwords for all users in the system'

    def handle(self, *args, **options):
        # Test password mapping
        password_map = {
            # Students (numeric prefix)
            '2000@kca': 'student2000',
            '2001@kca': 'student2001',
            '2002@kca': 'student2002',
            # Default for other students starting with digits
            'default_student': 'password123',
            # Lecturers (letter prefix)
            'default_lecturer': 'lecturer123',
            # Admins
            'admin@kcau.ac.ke': 'admin123',
            'admin@admin.com': 'admin123',
            'default_admin': 'admin123',
        }

        users = UserProfile.objects.all()
        updated_count = 0

        for user in users:
            email_prefix = user.email.split('@')[0].lower()
            
            # Determine password based on role and email
            if user.email in password_map:
                password = password_map[user.email]
            elif user.role == 'ADMIN':
                password = password_map['default_admin']
            elif user.role == 'LECTURER':
                password = password_map['default_lecturer']
            elif user.role == 'STUDENT':
                password = password_map['default_student']
            else:
                password = 'password123'
            
            # Set the password using the hashing method
            user.set_password(password)
            user.save()
            updated_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Set password for {user.email} (role: {user.role}) → "{password}"'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Successfully set passwords for {updated_count} users'
            )
        )
        
        # Print login credentials summary
        self.stdout.write(self.style.WARNING('\n' + '='*60))
        self.stdout.write(self.style.WARNING('LOGIN CREDENTIALS FOR TESTING'))
        self.stdout.write(self.style.WARNING('='*60))
        
        by_role = {'STUDENT': [], 'LECTURER': [], 'ADMIN': []}
        for user in users:
            by_role[user.role].append(user.email)
        
        for role in ['ADMIN', 'LECTURER', 'STUDENT']:
            if by_role[role]:
                self.stdout.write(self.style.SUCCESS(f'\n{role}S:'))
                for email in sorted(by_role[role])[:5]:  # Show first 5
                    prefix = email.split('@')[0].lower()
                    if email in password_map:
                        pwd = password_map[email]
                    elif role == 'ADMIN':
                        pwd = password_map['default_admin']
                    elif role == 'LECTURER':
                        pwd = password_map['default_lecturer']
                    else:
                        pwd = password_map['default_student']
                    self.stdout.write(f'  {email} / {pwd}')
