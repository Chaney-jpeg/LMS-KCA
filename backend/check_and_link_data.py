import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from lms.models import UserProfile

User = get_user_model()

print("=== CHECKING EXISTING DATA ===\n")

# Check User objects
users = User.objects.all()
print(f"Total Django Users: {users.count()}")
for u in users:
    print(f"  - {u.username} ({u.email}) - Staff: {u.is_staff}, Super: {u.is_superuser}")

# Check UserProfiles
profiles = UserProfile.objects.all()
print(f"\nTotal UserProfiles: {profiles.count()}")

# Check profiles with users
profiles_with_users = UserProfile.objects.filter(user__isnull=False)
print(f"Profiles linked to users: {profiles_with_users.count()}")

# Check profiles without users
profiles_without_users = UserProfile.objects.filter(user__isnull=True)
print(f"Profiles WITHOUT users: {profiles_without_users.count()}")

if profiles_without_users.count() > 0:
    print("\n=== LINKING PROFILES TO USERS ===")
    
    for profile in profiles_without_users:
        # Create User from profile email
        email = profile.email if hasattr(profile, 'email') and profile.email else f"user{profile.id}@kca"
        username = email.split('@')[0]
        
        # Check if user already exists
        existing_user = User.objects.filter(email=email).first()
        
        if existing_user:
            print(f"Linking existing user {email} to profile {profile.id}")
            profile.user = existing_user
            profile.save()
        else:
            # Create new user
            user = User.objects.create_user(
                username=username,
                email=email,
                password='password123',
                first_name=profile.full_name.split()[0] if hasattr(profile, 'full_name') and profile.full_name else '',
                last_name=' '.join(profile.full_name.split()[1:]) if hasattr(profile, 'full_name') and profile.full_name and len(profile.full_name.split()) > 1 else ''
            )
            print(f"Created user {email} and linked to profile {profile.id}")
            profile.user = user
            profile.save()
    
    print(f"\n✓ Linked {profiles_without_users.count()} profiles to users")

print("\n=== FINAL STATUS ===")
print(f"Total Users: {User.objects.count()}")
print(f"Total Profiles: {UserProfile.objects.count()}")
print(f"Profiles with users: {UserProfile.objects.filter(user__isnull=False).count()}")
print("\nDONE! Refresh Django admin to see all data.")
