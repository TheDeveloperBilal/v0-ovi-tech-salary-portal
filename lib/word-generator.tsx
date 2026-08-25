export function generateWordDocument(
  employee: Record<string, unknown>,
  base: number,
  totalAllowances: number,
  totalDeductions: number,
  netSalary: number,
  month: string,
  year: number,
) {
  const currentDate = new Date().toLocaleDateString()

  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { display: flex; align-items: center; border-bottom: 3px solid #67499E; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { width: 50px; height: 50px; margin-right: 20px; }
          .company-info { flex: 1; }
          .company-name { font-size: 24px; font-weight: bold; color: #67499E; }
          .company-subtitle { font-size: 12px; color: #666; margin-top: 2px; }
          .slip-title { text-align: right; font-weight: bold; }
          .section-title { font-weight: bold; color: #67499E; margin-top: 20px; margin-bottom: 10px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th { background-color: #67499E; color: white; padding: 8px; text-align: left; font-size: 12px; }
          td { padding: 8px; border: 1px solid #ddd; font-size: 11px; }
          .total-row { background-color: #f0f0f0; font-weight: bold; }
          .net-salary { background-color: #f0e6ff; padding: 15px; margin: 20px 0; border: 2px solid #67499E; }
          .net-amount { font-size: 20px; font-weight: bold; color: #67499E; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <div class="company-name">OviTech Global Pvt Ltd</div>
            <div class="company-subtitle">Digital Marketing Agency | UAE</div>
          </div>
          <div class="slip-title">
            <p>SALARY SLIP</p>
            <p style="margin: 0; font-size: 12px;">${month} ${year}</p>
          </div>
        </div>

        <table>
          <tr>
            <td colspan="2"><strong>Employee Information</strong></td>
          </tr>
          <tr>
            <td><strong>Name:</strong> ${employee.employeeName}</td>
            <td><strong>Employee ID:</strong> ${employee.employeeId}</td>
          </tr>
          <tr>
            <td><strong>Email:</strong> ${employee.email || "N/A"}</td>
            <td><strong>Department:</strong> ${employee.department || "N/A"}</td>
          </tr>
          <tr>
            <td><strong>Position:</strong> ${employee.position || "N/A"}</td>
            <td><strong>Joining Date:</strong> ${employee.joinDate || "N/A"}</td>
          </tr>
        </table>

        <p class="section-title">EARNINGS</p>
        <table>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
          <tr>
            <td>Basic Salary</td>
            <td style="text-align: right;">₹${base.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
          </tr>
          ${Object.entries(employee.allowances as Record<string, unknown>)
            .map(([key, value]: [string, unknown]) => {
              const val = Number.parseFloat(String(value)) || 0
              return val > 0
                ? `
              <tr>
                <td>${key.charAt(0).toUpperCase() + key.slice(1)} Allowance</td>
                <td style="text-align: right;">₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
              </tr>
            `
                : ""
            })
            .join("")}
          <tr class="total-row">
            <td>Total Earnings</td>
            <td style="text-align: right;">₹${(base + totalAllowances).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
          </tr>
        </table>

        <p class="section-title">DEDUCTIONS</p>
        <table>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
          ${Object.entries(employee.deductions as Record<string, unknown>)
            .map(([key, value]: [string, unknown]) => {
              const val = Number.parseFloat(String(value)) || 0
              return val > 0
                ? `
              <tr>
                <td>${key === "pf" ? "PF" : key === "esi" ? "ESI" : key.charAt(0).toUpperCase() + key.slice(1)}</td>
                <td style="text-align: right;">₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
              </tr>
            `
                : ""
            })
            .join("")}
          <tr class="total-row">
            <td>Total Deductions</td>
            <td style="text-align: right;">₹${totalDeductions.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
          </tr>
        </table>

        <div class="net-salary">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>NET SALARY</strong>
            <div class="net-amount">₹${netSalary.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
          <p>This is a computer generated salary slip and does not require a signature.</p>
          <p>For queries, please contact HR Department</p>
          <p style="margin-top: 10px; font-weight: bold;">OviTech Global Pvt Ltd | Digital Marketing Services</p>
          <p style="font-size: 10px; margin-top: 10px;">Generated on ${currentDate}</p>
        </div>
      </body>
    </html>
  `

  // Create and download as .doc (actually an HTML saved as .doc)
  const blob = new Blob([htmlContent], { type: "application/msword" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${employee.employeeName}_SalarySlip_${year}_${month}.doc`
  link.click()
  window.URL.revokeObjectURL(url)
}
