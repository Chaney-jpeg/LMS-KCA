# LMS-KCA - Learning Management System

A comprehensive Learning Management System built with **React**, **Django REST Framework**, and **PostgreSQL**, designed for mobile-first access with automatic attendance tracking.

## 🚀 Technology Stack

- **Frontend**: React 18.2.0 with Axios
- **Backend**: Django 4.2.9 with Django REST Framework 3.20.1
- **Database**: SQLite (Development) / PostgreSQL (Production)
- **Containerization**: Docker & Docker Compose
- **Mobile**: Completely responsive, optimized for mobile devices

## ✨ Key Features

### For Students
- 📚 **Course Enrollment & Materials** - Access lecture notes, assignments, and CATs
- 📊 **Real-time Grade Tracking** - View grades and performance analytics
- ✅ **Automatic Attendance** - Attendance marked when accessing course materials
- 📝 **Assignment Submission** - Submit work directly through the platform
- 💰 **Fee Management** - Track payments and balances
- 🤖 **KIRA AI Assistant** - Get instant help with your questions

### For Lecturers
- 📖 **Course Management** - Upload materials and manage course content
- ✍️ **Grade Assignments** - Review and grade student submissions
- 👥 **Student Tracking** - Monitor attendance and performance
- 📋 **Attendance Reports** - View detailed attendance statistics

### For Admins
- 👤 **User Management** - Manage students, lecturers, and staff
- 📊 **System Analytics** - Track overall system usage and performance
- 🔧 **Configuration** - System-wide settings and customization

## 📁 Project Structure

```
LMS-KCA/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── screens/            # Dashboard components
│   │   ├── components/         # Reusable components (KIRA AI)
│   │   ├── App.js              # Main application
│   │   └── api.js              # API integration
│   └── package.json
│
├── backend/                     # Django REST API
│   ├── lms/                    # Main application
│   │   ├── models.py           # Database models
│   │   ├── views.py            # API endpoints
│   │   ├── serializers.py      # Data serialization
│   │   └── urls.py             # API routing
│   ├── config/                 # Django settings
│   ├── manage.py
│   └── requirements.txt
│
├── docker-compose.yml          # Docker orchestration
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 16+

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd LMS-KCA
```

2. **Using Docker (Recommended)**
```bash
docker-compose up --build
```
Access at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Admin Panel: http://localhost:8000/admin

3. **Manual Setup**

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## 👥 Default Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@kcau.edu | admin123 |
| Lecturer | lecturer@kcau.edu | lecturer123 |
| Student | student@kcau.edu | student123 |

## 📚 API Documentation

### Authentication
```http
POST /api/login/
Content-Type: application/json

{
  "email": "user@kcau.edu",
  "password": "password123"
}
```

### Course Materials
```http
GET /api/courses/{course_id}/materials/
Authorization: Required
```

### Attendance Tracking
```http
POST /api/attendance/mark/
Content-Type: application/json

{
  "student_id": 1,
  "course_id": 9
}
```

### More Endpoints
- `/api/users/` - User management
- `/api/courses/` - Course listing
- `/api/grades/` - Grade management
- `/api/assignments/` - Assignment submission & grading
- `/api/attendance/summary/` - Attendance statistics

## 🎨 Features in Detail

### Automatic Attendance System
- Tracks attendance when students access course materials
- Real-time attendance statistics for students and lecturers
- Color-coded attendance rates (Green ≥75%, Orange 50-74%, Red <50%)

### KIRA AI Assistant
- Intelligent chatbot for instant help
- Context-aware responses
- Available 24/7 for all users

### Mobile-First Design
- Responsive layout optimized for mobile devices
- Touch-friendly interface
- Progressive Web App capabilities

## 🛠️ Technology Details

### Backend Stack
- **Django 4.2.9** - Web framework
- **Django REST Framework 3.20.1** - API development
- **SQLite/PostgreSQL** - Database
- **Pillow** - Image processing
- **python-dotenv** - Environment management

### Frontend Stack
- **React 18.2.0** - UI framework
- **Axios** - HTTP client
- **React Hooks** - State management
- **CSS3** - Styling with custom design system

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Developed by Chaney - LMS-KCA

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Contact

For questions or support, please contact the development team.

---

**Note**: This is an educational project built for Kenya School of Accountants University.
