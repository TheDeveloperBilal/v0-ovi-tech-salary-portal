# Quick Setup Checklist - OviTech Salary Portal

## 5-Minute Setup Guide

### 1. Database Setup (2 minutes)
```
cPanel → phpMyAdmin
├─ Create Database: ovitech_salary
├─ Import: database/ovitech_salary.sql
└─ Create User: ovitech_user
```

### 2. Upload Files (2 minutes)
```
cPanel File Manager
└─ Upload all files to public_html/
```

### 3. Configuration (1 minute)
```
Edit: config/database.php
Change:
  DB_USER = 'ovitech_user'
  DB_PASS = 'your_password'
  DB_NAME = 'ovitech_salary'
```

### 4. Test
```
Browser: https://your-domain.com
Login: admin@ovitech.co / admin123
```

---

## Credentials Management

### Database Credentials (From cPanel)
- **Database Name:** ovitech_salary
- **Database User:** ovitech_user (or cpanel_username_user)
- **Host:** localhost (always for cPanel)

### Default Login Credentials
- **Email:** admin@ovitech.co
- **Password:** admin123
- **Change immediately after first login!**

---

## File Paths Reference

```
Website URL:           https://your-domain.com/
Login Page:            https://your-domain.com/login.php
Dashboard:             https://your-domain.com/dashboard.php
Add Employee:          https://your-domain.com/add-employee.php
View Salary Slip:      https://your-domain.com/salary-slip.php
Settings:              https://your-domain.com/settings.php
```

---

## Common Tasks

### Add New Employee
1. Dashboard > + Add Employee
2. Fill employee details
3. Click "Save Employee"
4. Employee now visible in employee list

### Generate Salary Slip
1. Dashboard > Select Employee
2. Choose Month/Year
3. Enter salary components (Base, HRA, Deductions, etc.)
4. Click "Generate Slip"
5. View/Print/Download as PDF or Word

### Download Salary Slip
1. After generating slip
2. Click "Download PDF" or "Download Word"
3. File saves to your computer

### Change Company Settings
1. Dashboard > Settings
2. Update company info
3. Upload company logo
4. Click "Save Settings"

### Backup Database
1. cPanel > Backup Wizard
2. Download database backup
3. Store safely

---

## Important Reminders

⚠️ Always change default admin password
⚠️ Keep database credentials safe
⚠️ Regular backups recommended
⚠️ Set proper file permissions
⚠️ Use strong passwords (12+ chars)
⚠️ Keep PHP and MySQL updated

---

**You're Ready to Go!** 🚀
Access your application at: https://your-domain.com
