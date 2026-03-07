# DEPLOYMENT GUIDE - Deploy KCAU LMS to Public URLs

## Option 1: Backend on Render + Frontend on Vercel (RECOMMENDED - FREE)

### **Deploy Backend (Django) to Render**

#### Step 1: Prepare Backend for Render
1. Go to https://render.com and sign up (free tier)
2. Create a new "Web Service"
3. Connect your GitHub repo: `https://github.com/Chaney-jpeg/KCAU-KMS`
4. Select the `main` branch
5. Configuration:
   - **Name:** kcau-lms-backend
   - **Environment:** Python 3
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `cd backend && gunicorn config.wsgi:application`
   - **Port:** 8000

#### Step 2: Add Environment Variables in Render
In the Render dashboard, set:
```
DEBUG=0
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=kcau-lms-backend.onrender.com,localhost
```

#### Step 3: Update Django Settings
Edit `backend/config/settings.py`:
```python
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')
DEBUG = False  # For production
```

#### Step 4: Install Gunicorn
Run in backend directory:
```bash
pip install gunicorn
pip freeze > backend/requirements.txt
```

#### Your Backend URL will be:
```
https://kcau-lms-backend.onrender.com
```

---

### **Deploy Frontend (React) to Vercel**

#### Step 1: Prepare Frontend for Vercel
1. Create `frontend/.env.production`:
```
REACT_APP_API_URL=https://kcau-lms-backend.onrender.com
```

2. Update `frontend/api.js`:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

#### Step 2: Deploy to Vercel
1. Go to https://vercel.com and sign up (free tier)
2. Click "Import Project"
3. Select your GitHub repo
4. Configure:
   - **Framework:** Create React App
   - **Root Directory:** `./frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
5. Add Environment Variables:
   ```
   REACT_APP_API_URL=https://kcau-lms-backend.onrender.com
   ```

#### Your Frontend URL will be:
```
https://kcau-lms.vercel.app
```

---

## Option 2: Heroku (if available in your region)

Heroku has limited free tier now but:
1. Sign up at https://www.heroku.com
2. Install Heroku CLI
3. Create Procfile in root:
```
web: cd backend && gunicorn config.wsgi:application
```

4. Deploy:
```bash
heroku login
heroku create kcau-lms
git push heroku main
heroku config:set DEBUG=0
```

---

## Option 3: Railway.app (Free credits)

1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project → Deploy from GitHub repo
4. Select the repo and branch
5. Add environment variables
6. Railway auto-detects Django and deploys

**Backend URL:** `https://kcau-lms-production.railway.app`

---

## Option 4: PythonAnywhere (Beginner-Friendly)

1. Go to https://www.pythonanywhere.com
2. Sign up (free tier available)
3. Upload code via Git
4. Configure web app for Django 5.2
5. Set environment variables in Web tab
6. Reload app

---

## Testing Deployed URLs

After deployment, test your live admin:

```bash
# Backend Admin
https://kcau-lms-backend.onrender.com/admin/
Login: admin / Admin123!

# Frontend
https://kcau-lms.vercel.app/
Try login with: admin@kca / password123
```

---

## Important Notes

### Database for Production
- Current: SQLite (development only, won't work on Render)
- For production: Use Render PostgreSQL addon
  
Add to Render Web Service:
```
PostgreSQL Add-on → Create Database
Then set DATABASE_URL environment variable
```

### Update Django Settings for PostgreSQL
```python
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600
    )
}
```

### CORS Configuration
Update `backend/config/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "https://kcau-lms.vercel.app",
    "http://localhost:3000",
]
```

### Static Files
Enable WhiteNoise in `backend/config/settings.py`:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add this
    ...
]

STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

Then run:
```bash
pip install whitenoise
python manage.py collectstatic
```

---

## Quick Deployment Checklist

- [ ] Update `requirements.txt` with `gunicorn` and `whitenoise`
- [ ] Create `.env.production` for frontend
- [ ] Update Django `ALLOWED_HOSTS` in settings
- [ ] Add CORS allowed origins for frontend domain
- [ ] Disable DEBUG in production settings
- [ ] Sign up on Render and Vercel
- [ ] Connect GitHub repo to both platforms
- [ ] Set environment variables in dashboards
- [ ] Test admin panel on deployed URL
- [ ] Test frontend login on deployed URL
- [ ] Share deployed URLs with assessor

---

## Live URLs After Deployment

Share these with your assessor:

- **Admin Dashboard:** https://kcau-lms-backend.onrender.com/admin/
- **Frontend App:** https://kcau-lms.vercel.app/
- **GitHub Code:** https://github.com/Chaney-jpeg/KCAU-KMS
- **Credentials:**
  - Admin: admin@kca / password123
  - Student: 2000@kca / password123
  - Lecturer: lecturer@kca / password123
