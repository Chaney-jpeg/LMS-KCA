from django.contrib import admin
from .models import UserProfile, Course, Notification, LibraryItem, StudentBorrow, Attendance

admin.site.register(UserProfile)
admin.site.register(Course)
admin.site.register(Notification)
admin.site.register(LibraryItem)
admin.site.register(StudentBorrow)
admin.site.register(Attendance)
