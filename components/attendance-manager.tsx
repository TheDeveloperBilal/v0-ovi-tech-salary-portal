'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Search, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AttendanceRecord {
  id: string
  employee_name: string
  attendance_date: string
  check_in: string | null
  check_out: string | null
  work_hours: number
  status: string
  is_late: boolean
  is_early_out: boolean
  is_absent: boolean
  nine_hour_waiver: boolean
}

interface AttendanceSummary {
  total_days: number
  present_days: number
  late_count: number
  early_out_count: number
  absent_count: number
  leaves_deducted: number
}

export function AttendanceManager() {
  const supabase = createClient()
  const { toast } = useToast()
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState<AttendanceSummary>({
    total_days: 0,
    present_days: 0,
    late_count: 0,
    early_out_count: 0,
    absent_count: 0,
    leaves_deducted: 0,
  })

  useEffect(() => {
    loadAttendanceData()
  }, [month, year])

  async function loadAttendanceData() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('month', parseInt(month))
        .eq('year', parseInt(year))
        .order('attendance_date', { ascending: true })

      if (error) throw error

      setRecords((data || []) as AttendanceRecord[])
      calculateStats(data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load attendance data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(data: any[]) {
    const stats: AttendanceSummary = {
      total_days: data.length,
      present_days: data.filter(r => r.status === 'On Time').length,
      late_count: data.filter(r => r.is_late && !r.nine_hour_waiver).length,
      early_out_count: data.filter(r => r.is_early_out).length,
      absent_count: data.filter(r => r.is_absent).length,
      leaves_deducted: Math.floor((data.filter(r => r.is_absent).length + Math.floor(data.filter(r => r.is_late || r.is_early_out).length / 3)) || 0),
    }
    setStats(stats)
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('month', month)
      formData.append('year', year)

      const response = await fetch('/api/attendance/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Success',
          description: `Successfully uploaded ${result.recordsProcessed} records`,
        })
        loadAttendanceData()
      } else {
        toast({
          title: 'Error',
          description: `Error: ${result.error}`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  async function calculateAndApplyLeaves() {
    try {
      setLoading(true)

      const uniqueEmployees = [...new Set(records.map(r => r.employee_name))]

      if (uniqueEmployees.length === 0) {
        toast({
          title: 'No Data',
          description: 'No attendance records found for this month',
          variant: 'destructive',
        })
        return
      }

      const results = await Promise.all(
        uniqueEmployees.map(employeeId =>
          fetch('/api/attendance/calculate-leaves', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: parseInt(month), year: parseInt(year), employeeId }),
          }).then(res => res.json())
        )
      )

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      toast({
        title: 'Leaves Applied',
        description: `Successfully applied leaves for ${successful} employee(s)${failed > 0 ? `. ${failed} failed.` : '.'}`,
      })

      loadAttendanceData()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to calculate leaves',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function deleteRecord(id: string) {
    try {
      const response = await fetch('/api/attendance/records', {
        method: 'DELETE',
        body: JSON.stringify({ recordId: id }),
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        toast({
          title: 'Record Deleted',
          description: 'Attendance record has been deleted successfully',
        })
        loadAttendanceData()
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete record',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete record',
        variant: 'destructive',
      })
    }
  }

  const filteredRecords = records.filter(r =>
    r.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const statusColor: Record<string, string> = {
    'On Time': 'text-green-600 bg-green-50',
    Late: 'text-red-600 bg-red-50',
    'Early Out': 'text-yellow-600 bg-yellow-50',
    Absent: 'text-gray-600 bg-gray-50',
  }

  return (
    <div className="space-y-6">
      {/* Month/Year Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Month & Year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const m = i + 1
                  return (
                    <SelectItem key={m} value={String(m).padStart(2, '0')}>
                      {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - 2 + i
                  return (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            <Button asChild disabled={uploading}>
              <label className="cursor-pointer flex gap-2">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload File'}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  hidden
                  onChange={handleFileUpload}
                />
              </label>
            </Button>

            {records.length > 0 && (
              <Button
                onClick={calculateAndApplyLeaves}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? 'Calculating...' : 'Apply Leaves to Payroll'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Days</p>
              <p className="text-2xl font-bold">{stats.total_days}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">{stats.present_days}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Late</p>
              <p className="text-2xl font-bold text-red-600">{stats.late_count}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Early Out</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.early_out_count}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-gray-600">{stats.absent_count}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Leaves Deducted</p>
              <p className="text-2xl font-bold text-purple-600">{stats.leaves_deducted}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Box */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Search className="w-4 h-4 text-gray-400 mt-3" />
            <Input
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : filteredRecords.length === 0 ? (
            <p className="text-center text-gray-500">
              No records found. Upload an attendance file to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="text-left p-3">Employee</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Check In</th>
                    <th className="text-left p-3">Check Out</th>
                    <th className="text-left p-3">Work Hours</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{record.employee_name}</td>
                      <td className="p-3">{record.attendance_date}</td>
                      <td className="p-3">{record.check_in || '-'}</td>
                      <td className="p-3">{record.check_out || '-'}</td>
                      <td className="p-3">{record.work_hours.toFixed(2)} hrs</td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[record.status]}`}>
                          {record.status}
                          {record.nine_hour_waiver && ' (9hr rule)'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
