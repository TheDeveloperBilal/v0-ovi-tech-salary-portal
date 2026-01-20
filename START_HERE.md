# OviTech Salary Portal - START HERE

## Welcome!

You now have a complete, professional salary slip management system ready for deployment on your cPanel hosting.

## What You Have

✅ Complete PHP application with 15+ pages
✅ MySQL database schema with 7 tables
✅ Professional UI with OviTech branding
✅ PDF and Word document export
✅ Security features (bcrypt passwords, SQL injection prevention)
✅ Comprehensive documentation

## Quick Start (5 Minutes)

### Step 1: Verify Hosting
1. Upload `setup-check.php` to your public_html
2. Visit: `https://your-domain.com/setup-check.php`
3. If all green ✓, continue to Step 2

### Step 2: Create Database
1. Go to cPanel > phpMyAdmin
2. Create database: `ovitech_salary`
3. Import: `database/ovitech_salary.sql`
4. Create user: `ovitech_user` with strong password

### Step 3: Configure App
1. Edit: `config/database.php`
2. Change:
   - `DB_USER` = your database user
   - `DB_PASS` = your database password
3. Save file

### Step 4: Upload Files
1. cPanel File Manager > public_html
2. Upload all files (except setup-check.php after testing)
3. Set permissions: 755 for folders, 644 for files

### Step 5: Test
1. Visit: `https://your-domain.com`
2. Login: `admin@ovitech.co` / `admin123`
3. Change password immediately!

## Important Files

| File | Purpose | Action |
|------|---------|--------|
| INSTALLATION_GUIDE.md | Step-by-step setup | READ FIRST |
| QUICK_SETUP.md | 5-minute checklist | Use as reference |
| TECHNICAL_REFERENCE.md | Developer docs | For advanced users |
| config/database.php | Database config | **MUST EDIT** |
| database/ovitech_salary.sql | Database schema | Import in phpMyAdmin |
| setup-check.php | Verify hosting | Use then delete |

## Common Questions

**Q: How do I upload files to cPanel?**
A: Use cPanel File Manager or FTP. See INSTALLATION_GUIDE.md

**Q: Where do I get my database credentials?**
A: cPanel > MySQL Database Wizard

**Q: How do I change the admin password?**
A: Login > Settings > Change Password

**Q: How do I add my company logo?**
A: Place PNG file in assets/ovitech-logo.png

**Q: How do I download salary slips?**
A: Generate slip > Click Download PDF or Word

**Q: Is this secure?**
A: Yes! Bcrypt passwords, SQL injection prevention, session security

## File Structure

```
ovitech-salary-portal/
├── Login & Dashboard Pages
│   ├── index.php
│   ├── login.php
│   ├── dashboard.php
│   └── logout.php
│
├── Employee Management
│   ├── add-employee.php
│   ├── edit-employee.php
│   └── bulk-salary.php
│
├── Salary Operations
│   ├── salary-slip.php
│   ├── download-pdf.php
│   ├── download-word.php
│   └── settings.php
│
├── System Files
│   ├── config/ (database config)
│   ├── includes/ (helper functions)
│   ├── database/ (SQL schema)
│   └── assets/ (company logo)
│
└── Documentation
    ├── START_HERE.md (this file)
    ├── INSTALLATION_GUIDE.md
    ├── QUICK_SETUP.md
    ├── TECHNICAL_REFERENCE.md
    └── README.md
```

## Default Login

```
Email:    admin@ovitech.co
Password: admin123
```

⚠️ CHANGE THIS IMMEDIATELY AFTER LOGIN!

## Minimum Requirements

- PHP 7.4 or higher
- MySQL 5.7 or higher
- cPanel with phpMyAdmin
- 100MB disk space
- Modern web browser

## Next Steps

1. **Read**: INSTALLATION_GUIDE.md (detailed setup)
2. **Prepare**: Database credentials from cPanel
3. **Upload**: All application files
4. **Configure**: config/database.php with credentials
5. **Test**: Visit your domain and login
6. **Secure**: Change default admin password
7. **Customize**: Update company settings and logo

## Support & Documentation

- **Detailed Setup**: See INSTALLATION_GUIDE.md
- **Quick Checklist**: See QUICK_SETUP.md
- **Technical Info**: See TECHNICAL_REFERENCE.md
- **General Info**: See README.md

## Security Checklist

- [ ] Change default admin password
- [ ] Set file permissions (755/644)
- [ ] Enable HTTPS/SSL on domain
- [ ] Regular database backups
- [ ] Update PHP version
- [ ] Update MySQL version
- [ ] Monitor error logs

## Features Overview

### Employee Management
- Add unlimited employees
- Store complete information
- Edit/update records
- Track employee history

### Salary Processing
- Generate professional slips
- Calculate earnings & deductions
- Support multiple components
- Track monthly records

### Export & Print
- Download as PDF
- Download as Word (.docx)
- Print-ready formatting
- Email distribution ready

### Admin Tools
- Dashboard with statistics
- Bulk processing
- Company settings
- Audit logging

### Security
- Secure login system
- Password hashing
- SQL injection prevention
- XSS protection
- Role-based access

## Troubleshooting

**Can't connect to database?**
→ Check config/database.php credentials match phpMyAdmin

**Blank page?**
→ Check cPanel error logs and verify PHP version

**Logo not showing?**
→ Ensure assets/ovitech-logo.png exists

**Can't download files?**
→ Set folder permissions to 755

See INSTALLATION_GUIDE.md for more troubleshooting.

---

## You're Ready! 🚀

Your professional salary slip system is ready to deploy.

**Next Step**: Read INSTALLATION_GUIDE.md and follow the detailed setup instructions.

**Questions?** All documentation is included. Check START_HERE.md, INSTALLATION_GUIDE.md, or TECHNICAL_REFERENCE.md.

**Ready?** Let's deploy! →
