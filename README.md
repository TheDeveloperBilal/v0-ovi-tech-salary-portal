# OviTech Salary Portal

Professional PHP-based Salary Slip Generator for OviTech Global Pvt Ltd

## Features

- Employee Management (Add, Edit, View)
- Dynamic Salary Slip Generation
- PDF & Word Document Export
- Bulk Salary Processing
- Admin Dashboard with Statistics
- Secure Login System
- Database Management with phpMyAdmin
- Responsive Design

## Installation

1. **Upload to cPanel:**
   - Extract the ZIP file to your public_html folder or a subdomain
   - Ensure PHP 7.4+ is installed

2. **Setup Database:**
   - Go to phpMyAdmin in your cPanel
   - Create a new database called "ovitech_salary"
   - Import the SQL file (database/ovitech_salary.sql)
   - Update credentials in config/database.php

3. **Configure Database Connection:**
   - Edit `config/database.php`
   - Update DB_USER and DB_PASS with your cPanel database credentials
   - Update BASE_URL in `config/constants.php` with your domain

4. **Upload Logo:**
   - Place your OviTech logo in the `assets/` folder
   - Name it `ovitech-logo.png`

5. **Set File Permissions:**
   - chmod 755 on all folders
   - chmod 644 on all PHP files

## Default Login

- **Email:** admin@ovitech.co
- **Password:** admin123

## File Structure

```
ovitech-salary/
├── config/
│   ├── database.php      # Database configuration
│   ├── constants.php     # Application constants
│   └── session.php       # Session management
├── includes/
│   └── functions.php     # Reusable functions
├── database/
│   └── ovitech_salary.sql # Database schema
├── assets/
│   └── ovitech-logo.png  # Company logo
├── login.php             # Login page
├── dashboard.php         # Admin dashboard
├── add-employee.php      # Add employee form
├── edit-employee.php     # Edit employee form
├── salary-slip.php       # Salary slip generator
├── download-pdf.php      # PDF export
├── download-word.php     # Word export
├── bulk-salary.php       # Bulk salary processing
├── settings.php          # Company settings
├── logout.php            # Logout
└── index.php             # Redirect to login/dashboard
```

## Usage

1. Login with admin credentials
2. Add employees from the dashboard
3. Go to employee's salary slip
4. Enter salary components
5. Download as PDF or Word
6. Print directly from browser

## Security Features

- Password hashing with bcrypt
- SQL injection prevention with prepared statements
- CSRF token protection
- Session timeout management
- Input sanitization

## Support

For issues, please contact: info@ovitech.co

---
Made with ❤️ for OviTech Global Pvt Ltd
