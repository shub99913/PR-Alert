@echo off
REM Quick MongoDB Atlas Setup Helper
REM Run this script to create a .env file for development

echo.
echo ========================================
echo PR-Alert Backend - MongoDB Setup Helper
echo ========================================
echo.
echo MongoDB is not running locally. You have two options:
echo.
echo 1. INSTALL MONGODB LOCALLY (Windows)
echo    - Download: https://www.mongodb.com/try/download/community
echo    - Run installer, select "Complete" installation
echo    - MongoDB will run as a Windows service automatically
echo    - Then restart this backend server
echo.
echo 2. USE MONGODB ATLAS (FREE CLOUD - RECOMMENDED)
echo    - Go to: https://cloud.mongodb.com
echo    - Sign up / Log in
echo    - Create a FREE M0 cluster
echo    - Create database user (username/password)
echo    - Allow access from anywhere (0.0.0.0/0) for dev
echo    - Get connection string
echo    - Format: mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/disaster-dashboard
echo.
echo ========================================
echo.
echo After setting up MongoDB:
echo 1. Copy .env.example to .env
echo 2. Edit MONGODB_URI in .env
echo 3. Run: npm run dev
echo.
pause