# Probation Feature - Admin Guide

## Where to Access Probation Features

### 1. **Add a New Employee on Probation**
   - Location: **Dashboard → Employee Management → Add Employee button**
   - Steps:
     1. Click "Add Employee" button in the top right
     2. Fill in employee details (ID, name, email, department, designation, etc.)
     3. Scroll down to the **"Probation Period"** section
     4. Check the box: "Mark as Probation Period Employee"
     5. A date picker will appear - set the **Probation End Date** (usually 3 months from hiring)
     6. Click "Add Employee" button to save

### 2. **Mark Existing Employee as on Probation**
   - Location: **Dashboard → Employee Management → Employee Card**
   - Steps:
     1. Find the employee in the list
     2. Click the **"Edit"** button on their card
     3. Scroll down to the **"Probation Period"** section
     4. Check the box to mark as probation
     5. Set the probation end date
     6. Click "Update Employee" to save

### 3. **View Probation Status**
   - Location: **Dashboard → Employee Management → Employee Cards**
   - Look for the **yellow "Probation"** badge next to the employee's name
   - Shows: "Probation" with a warning icon
   - This indicates the employee is on probation period

### 4. **Approve/Convert Employee from Probation to Permanent**
   - Location: **Dashboard → Employee Management → Employee Card (Probation Status Button)**
   - Steps:
     1. Find the probation employee in the list
     2. You will see a **"Probation Status"** button (yellow, with warning icon)
     3. Click the "Probation Status" button
     4. A dialog will appear with options:
        - View probation details
        - **"Convert to Permanent Employee" button**
     5. Click "Convert to Permanent Employee"
     6. Confirm the action
     7. Employee will now be marked as permanent and get paid leave benefits

## How Probation Affects Salary Slips

### For Probation Employees:
- **ALL leaves taken are deducted from salary**
- No paid leave benefits
- Example: If employee takes 5 days leave, 5 days × (Basic Salary ÷ 26) = deduction

### When Creating Salary Slip:
1. Go to **Dashboard → Salary Slip Manager → Create Salary Slip**
2. Select the probation employee
3. Enter leaves deducted (days taken)
4. The salary slip will show:
   - **Yellow Warning Banner**: "Probation Period: This employee is on probation. All leaves are deducted from salary."
   - **Deductions Section**: Shows "Leaves Deducted (X Days) - PKR [amount]"
   - **Net Salary**: Automatically reduced by leave deductions

### After Conversion to Permanent:
- Next salary slip will use the **14-leaf threshold**
- Only deduct leaves AFTER 14 paid leaves are used in a year
- Previous salary slips remain unchanged

## Workflow Example

**Scenario: New Employee Hired on January 1st**

1. **Day 1**: Add employee, mark "Probation Period", set end date to March 31st
2. **January Salary Slip**: Take 5 days leave → All 5 days deducted from salary
3. **February Salary Slip**: Take 3 days leave → All 3 days deducted from salary  
4. **March Salary Slip**: Take 4 days leave → All 4 days deducted from salary
5. **April 1st**: Employee performance approved
   - Click "Probation Status" button → Click "Convert to Permanent Employee"
   - Employee now has 14 paid leaves per year
6. **April Salary Slip**: Takes 2 days leave → NO deduction (12 leaves remaining in annual quota)

## Important Notes

- Probation period typically lasts **3 months** but you can set any date
- During probation: **ZERO paid leave benefits**
- No manual action needed after conversion - system automatically applies new leave rules
- Salary slips display probation status clearly
- All leave deductions are calculated automatically based on basic salary
