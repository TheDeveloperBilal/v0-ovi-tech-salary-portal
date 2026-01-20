# How to Create Your First Salary Slip - Complete Guide

## Prerequisites
✅ You have admin access (is_admin = TRUE)
✅ Your app is deployed on Vercel
✅ Supabase database is connected

---

## Step 1: Add an Employee (First Time Only)

### Navigate to Employee Management
```
1. Login to your dashboard
2. Click "Manage Employees" tab
3. Click "Add New Employee" button
```

### Fill Employee Details
```
Employee ID:        EMP001
First Name:         John
Last Name:          Doe
Email:              john@ovitech.co
Phone:              +91-9876543210
Department:         Development
Designation:        Senior Developer
Date of Joining:    2024-01-15
Bank Account:       1234567890123456
Bank IFSC:          SBIN0001234
PAN:                ABCDE1234F
Aadhar:             123456789012
```

### Click Save
```
The employee is now in the system
Status: Employee added successfully ✓
```

---

## Step 2: Create Salary Structure (One Time Per Employee)

The salary structure defines the salary components for an employee.

### Navigate to Salary Slips Tab
```
1. Click "Salary Slips" tab
2. You'll see the salary slip generator
```

### Select Employee
```
Choose: John Doe (or the employee you want)
```

### Enter Salary Components

#### EARNINGS (Add what the employee gets):
```
Basic Salary:              50,000
HRA (House Rent):           7,500
Dearness Allowance:         5,000
Medical Allowance:          2,000
Transport Allowance:        2,500
Other Allowance:            1,000
───────────────────────────
TOTAL EARNINGS:            68,000
```

#### DEDUCTIONS (What gets deducted):
```
PF (Provident Fund):        6,000
ESI (Employment State):        500
Income Tax:                 5,000
Loan Deduction:                 0
Other Deductions:               0
───────────────────────────
TOTAL DEDUCTIONS:          11,500
```

### Calculate Net Salary
```
NET SALARY = EARNINGS - DEDUCTIONS
           = 68,000 - 11,500
           = 56,500
```

---

## Step 3: Generate Salary Slip

### Enter Month & Year
```
Month:  January (or select from dropdown)
Year:   2025
```

### Click "Generate Slip"
```
System calculates:
✓ Total Allowances
✓ Total Deductions
✓ Net Salary
✓ Creates salary slip record
```

### You'll See
```
Salary Slip Successfully Generated ✓

Employee: John Doe
Month: January 2025
Net Salary: 56,500

[Download PDF] [Download Word] [Print]
```

---

## Step 4: Download Salary Slip

### Option 1: Download as PDF
```
1. Click [Download PDF] button
2. File saves as: john_doe_jan_2025.pdf
3. Open with any PDF reader
4. You can print or email it
```

### Option 2: Download as Word
```
1. Click [Download Word] button
2. File saves as: john_doe_jan_2025.docx
3. Open with Microsoft Word or any office app
4. You can edit if needed
5. Print or email it
```

### Option 3: Print Directly
```
1. Click [Print] button
2. Browser print dialog opens
3. Select your printer
4. Click Print
5. Physical copy ready!
```

---

## Complete Salary Slip Format

The generated salary slip will look like:

```
┌────────────────────────────────────────────────┐
│           OVITECH GLOBAL PVT LTD               │
│           SALARY SLIP                          │
├────────────────────────────────────────────────┤
│                                                │
│ Employee: John Doe                            │
│ Emp ID: EMP001                                │
│ Period: January 2025                          │
│ Department: Development                       │
│                                                │
├────────────────────────────────────────────────┤
│ EARNINGS                                       │
├────────────────────────────────────────────────┤
│ Basic Salary          50,000                  │
│ HRA                    7,500                  │
│ Dearness Allow         5,000                  │
│ Medical Allow          2,000                  │
│ Transport Allow        2,500                  │
│ Other Allow            1,000                  │
│ ─────────────────────────────                 │
│ TOTAL EARNINGS:       68,000                  │
│                                                │
├────────────────────────────────────────────────┤
│ DEDUCTIONS                                     │
├────────────────────────────────────────────────┤
│ PF (Provident Fund)    6,000                  │
│ ESI                      500                  │
│ Income Tax             5,000                  │
│ ─────────────────────────────                 │
│ TOTAL DEDUCTIONS:     11,500                  │
│                                                │
├────────────────────────────────────────────────┤
│ NET SALARY: 56,500                            │
├────────────────────────────────────────────────┤
│ Bank: SBI                                     │
│ Acc No: 1234567890123456                     │
│ IFSC: SBIN0001234                            │
│                                                │
│ Generated on: 20-Jan-2025                     │
│ Authorized by: OviTech Admin                  │
└────────────────────────────────────────────────┘
```

---

## Create Multiple Salary Slips

### Same Employee, Different Month
```
1. Go to "Salary Slips" tab
2. Select: John Doe
3. Change Month to: February
4. Change Year to: 2025
5. Enter same salary components
6. Click "Generate Slip"
7. New slip created for February
```

### Different Employee, Same Month
```
1. Go to "Salary Slips" tab
2. Select: Jane Smith
3. Month: January
4. Year: 2025
5. Enter Jane's salary components
6. Click "Generate Slip"
7. Jane's slip created
```

---

## Bulk Create Salary Slips

To create salary slips for all employees at once:

```
1. Go to "Salary Slips" tab
2. Click "Generate Bulk Slips" (if available)
3. Select Month & Year
4. System creates slips for all employees
5. Download all PDFs at once
```

---

## View Previously Created Slips

### See All Salary Slips
```
1. Go to "Salary Slips" tab
2. Scroll down to "Previous Slips"
3. You'll see list of all created slips:
   - Employee name
   - Month & Year
   - Net Salary
   - Creation date
```

### Re-download Existing Slip
```
1. Find the slip in the list
2. Click [Download PDF] or [Download Word]
3. File downloads again
```

### Edit Existing Slip
```
1. Click on the slip to edit
2. Change salary components
3. Click "Update Slip"
4. New version saved
```

---

## Salary Slip Formula

The system automatically calculates:

```
STEP 1: Calculate Total Earnings
Earnings = Basic + HRA + DA + Medical + Transport + Other

STEP 2: Calculate Total Deductions
Deductions = PF + ESI + Tax + Loan + Other

STEP 3: Calculate Net Salary
Net Salary = Earnings - Deductions

STEP 4: Create PDF/Word
Format slip with all details and company info
```

---

## Typical Salary Components

### Common Allowances
```
HRA (House Rent Allowance)      = 10-15% of basic
Dearness Allowance              = 5-10% of basic
Medical Allowance               = Fixed amount
Transport Allowance             = Fixed amount
City Allowance                  = Fixed amount
Performance Bonus               = Monthly bonus
```

### Common Deductions
```
PF (Provident Fund)             = 12% of basic
ESI (Employment State)          = 0.75% of basic
Income Tax                      = As per slab
Professional Tax                = Fixed
Loan EMI                        = As agreed
Insurance Premium               = As agreed
```

---

## Example Salary Slip Creation (End-to-End)

### Scenario: Create January 2025 salary for John Doe

**1. Open App**
```
Login → Dashboard
```

**2. Go to Salary Slips**
```
Click "Salary Slips" tab
```

**3. Enter Details**
```
Employee: John Doe
Month: January
Year: 2025
```

**4. Add Earnings**
```
Basic Salary: 50000
HRA: 7500
Dearness Allowance: 5000
Medical Allowance: 2000
Transport Allowance: 2500
Other Allowance: 1000
TOTAL: 68000
```

**5. Add Deductions**
```
PF: 6000
ESI: 500
Income Tax: 5000
TOTAL: 11500
```

**6. Generate**
```
Click "Generate Slip"
System shows: Net Salary = 56,500
```

**7. Download**
```
Click "Download PDF"
john_doe_jan_2025.pdf created
```

**8. Send to Employee**
```
Email or print the PDF
Employee receives salary slip
```

---

## Troubleshooting

### Q: No employees showing?
**A:** Add employee first from "Manage Employees" tab

### Q: Can't find "Generate Slip" button?
**A:** Make sure you're admin (is_admin = TRUE)

### Q: Downloaded file is blank?
**A:** Try different format (PDF vs Word)

### Q: Salary calculations wrong?
**A:** Check you entered correct amounts

### Q: Can't edit existing slip?
**A:** Create a new slip for the month instead

---

## Tips & Best Practices

1. **Create Salary Structure Once**: Set it once per employee, reuse monthly
2. **Same Structure Monthly**: Usually salary components stay same
3. **Maintain Records**: Keep copies of all slips
4. **Email to Employees**: Send PDF directly
5. **Backup Data**: Supabase auto-backs up, but keep local copies
6. **Monthly Routine**: 
   - Generate all slips on 25th of month
   - Send to employees
   - Keep records

---

## You're All Set! 🎉

You can now:
✅ Add employees
✅ Create salary slips
✅ Download as PDF/Word
✅ Manage company settings
✅ Promote other users to admin

**Create your first salary slip now!**
