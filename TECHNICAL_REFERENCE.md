# OviTech Salary Portal - Technical Reference

## Database Schema Overview

### Tables Structure

#### users
- Stores admin and employee login credentials
- Fields: id, email, password (hashed), name, role, is_active

#### employees
- Employee personal and professional information
- Fields: id, user_id, employee_id, first_name, last_name, email, phone, designation, department, date_of_joining, bank details, is_active

#### salary_structures
- Salary components and deductions for each month
- Fields: id, employee_id, month, year, base_salary, allowances, deductions
- Supports calculations for: HRA, Dearness Allowance, Medical, Transport, PF, ESI, Tax, Loan deductions

#### company_settings
- Dynamic company configuration
- Key-value pairs for: company name, email, phone, address, PF%, ESI%, financial year start, logo URL

#### deduction_rules
- Pre-defined deduction rules for automated calculations
- Supports both percentage and fixed amount deductions

#### salary_logs
- Audit trail for salary slip modifications
- Tracks all changes with user and timestamp

## Security Features

### Authentication
- Passwords hashed with bcrypt (2y$10)
- Session-based authentication
- Automatic logout on inactivity
- Protected pages require login

### Data Protection
- Prepared statements prevent SQL injection
- Input sanitization on all user inputs
- XSS protection with output escaping
- CSRF tokens on forms

### Access Control
- Role-based access (admin/employee)
- Admin-only pages protected
- Employee can view own records only
- Activity logging and audit trails

## PHP Requirements

```
PHP Version:    7.4 or higher
Extensions:     PDO, PDO_MYSQL, GD (for images)
Settings:       max_upload_size ≥ 10MB
                post_max_size ≥ 10MB
                memory_limit ≥ 128MB
```

## File Permissions

```
Directories:    755 (rwxr-xr-x)
Files:          644 (rw-r--r--)
config/:        755
database/:      755
assets/:        755
```

## Calculation Logic

### Gross Salary
```
Gross = Base + HRA + Dearness + Medical + Transport + Other Allowances
```

### Net Salary
```
Net = Gross - (PF + ESI + Income Tax + Loan + Other Deductions)
```

### Automatic Calculations
- PF: 12% of base salary (configurable)
- ESI: 0.75% of gross salary (configurable)
- Can be set per employee in salary structure

## Export Formats

### PDF Export
- Uses HTML2PDF library
- Professional formatting
- Includes company logo
- Page break for multiple slips
- Print-ready layout

### Word Export (.docx)
- Uses PHPWord library
- Professional formatting
- Embedded company logo
- Editable format
- Compatible with MS Word 2007+

## API Endpoints (Server Actions)

### Login
```
POST /login.php
Parameters: email, password
Response: Redirect to dashboard or error message
```

### Add Employee
```
POST /add-employee.php
Parameters: employee_id, first_name, last_name, email, phone, etc.
Response: Success message or error
```

### Generate Salary Slip
```
POST /salary-slip.php
Parameters: employee_id, month, year, salary components
Response: Slip HTML or error
```

### Download PDF
```
GET /download-pdf.php?id=salary_structure_id
Response: PDF file download
```

## Session Variables

```php
$_SESSION['user_id']     // Unique user ID
$_SESSION['email']       // User email
$_SESSION['name']        // User full name
$_SESSION['role']        // admin or employee
```

## Helper Functions

### Authentication
- `isLoggedIn()` - Check if user is logged in
- `requireAdmin()` - Require admin access
- `requireLogin()` - Require any login
- `verifyPassword()` - Verify password hash
- `hashPassword()` - Create password hash

### Data Operations
- `sanitize()` - Sanitize string input
- `validateEmail()` - Validate email format
- `getAllEmployees()` - Fetch with pagination
- `getEmployeeCount()` - Get total employees
- `getSalaryStructure()` - Fetch salary slip
- `calculateSalary()` - Auto-calculate salary

### Display
- `formatCurrency()` - Format numbers as currency
- `formatDate()` - Format dates
- `getPaginationData()` - Get pagination info

## Database Backup & Recovery

### Backup via cPanel
1. cPanel > Backup Wizard
2. Select Full Backup or partial
3. Download .tar.gz file

### Manual SQL Export
1. phpMyAdmin > ovitech_salary database
2. Export > Select SQL format
3. Click "Go" to download

### Restore Database
1. phpMyAdmin > Import tab
2. Select backed up .sql file
3. Click "Import"
4. Wait for completion message

## Performance Optimization

### Database Indexes
- employee_id indexed for fast lookups
- month, year indexed for salary searches
- email indexed for user search

### Query Optimization
- Prepared statements prevent full table scans
- Pagination limits result sets
- JSON used for audit logging

### Caching
- Session data cached in $_SESSION
- Settings cached in memory
- Consider adding Redis for high-traffic sites

## Troubleshooting Guide

### Common Errors

**"Cannot connect to database"**
- Check DB_HOST, DB_USER, DB_PASS in config/database.php
- Verify user has database access in cPanel
- Ensure MySQL service running

**"Class 'PDO' not found"**
- Enable PDO extension in cPanel PHP settings
- Restart PHP service

**"Undefined offset" errors**
- Check POST/GET parameter names match
- Verify form field names

**"Permission denied" on file upload**
- Set folder permissions to 755
- Check tmp folder permissions
- Increase PHP upload limits

## Maintenance Tasks

### Weekly
- Review error logs
- Check employee records updated

### Monthly
- Backup database
- Review salary processing accuracy
- Update employee contact info

### Quarterly
- Review audit logs
- Archive old salary records
- Test disaster recovery

## Future Enhancement Ideas

- Employee portal (view own slip)
- Attendance integration
- Payroll calendar
- Email delivery of slips
- Multi-currency support
- Advanced reporting
- Mobile app
- API for third-party integration

---

**For technical support:** support@ovitech.co
