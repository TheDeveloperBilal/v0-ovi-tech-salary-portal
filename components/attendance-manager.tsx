// components/attendance-manager.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Search, Download, Trash2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

interface SummaryStats {
  total_days: number
  present_days: number
  late_count: number
  early_out_count: number
  absent_count: number
  leaves_deducted: number
}

export function AttendanceManager() {
  const [month, setMonth] = useState<string>(new Date().getMonth() + 1 < 10 ? '0' + (new Date().getMonth() + 1) : String(new Date().getMonth() + 1))
  const [year, setYear] = useState<string>(String(new Date().getFullYear()))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState<SummaryStats>({
    total_days: 0,
    present_days: 0,
    late_count: 0,
    early_out_count: 0,
    absent_count: 0,
    leaves_deducted: 0,
  })

  // Load attendance data
  useEffect(() => {
    loadAttendanceData()
  }, [month, year])

  // Filter records on search
  useEffect(() => {
    if (searchTerm) {
      setFilteredRecords(
        records.filter((r) =>
          r.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    } else {
      setFilteredRecords(records)
    }
  }, [searchTerm, records])

  async function loadAttendanceData() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/attendance/records?month=${month}&year=${year}`
      )
      const { data } = await response.json()

      setRecords(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error loading attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(data: AttendanceRecord[]) {
    const stats: SummaryStats = {
      total_days: data.length > 0 ? new Set(data.map((r) => r.attendance_date)).size : 0,
      present_days: data.filter((r) => r.status !== 'Absent').length,
      late_count: data.filter((r) => r.is_late && !r.nine_hour_waiver).length,
      early_out_count: data.filter((r) => r.is_early_out).length,
      absent_count: data.filter((r) => r.is_absent).length,
      leaves_deducted: Math.floor(
        (data.filter((r) => r.is_absent).length +
          Math.floor((data.filter((r) => r.is_late).length + data.filter((r) => r.is_early_out).length) / 3))
      ),
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
        alert(`Successfully uploaded ${result.recordsProcessed} records`)
        loadAttendanceData()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setUploading(false)
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('Are you sure you want to delete this record?')) return

    try {
      const response = await fetch('/api/attendance/records', {
        method: 'DELETE',
        body: JSON.stringify({ recordId: id }),
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        loadAttendanceData()
      }
    } catch (error) {
      console.error('Error deleting record:', error)
    }
  }

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
          <div className="flex gap-4">
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

            <label className="flex gap-2">
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
            </label>
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
