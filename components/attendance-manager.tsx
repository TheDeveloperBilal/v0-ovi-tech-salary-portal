'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Search, Download, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const supabase = createClient()

// Type-safe response interface
interface UploadResponse {
  success: boolean
  recordsProcessed?: number
  error?: string
  errors?: string[]
  details?: {
    totalLines: number
    totalErrors: number
    sampleErrors?: string[]
  }
}

// Helper function to safely extract error details
function getErrorDetails(result: unknown): string[] {
  if (!result || typeof result !== 'object') {
    return ['Unknown error']
  }

  const res = result as Record<string, unknown>

  // If errors array exists and is an array, return it
  if (Array.isArray(res.errors)) {
    return res.errors.map(e => String(e))
  }

  // If details has sampleErrors array, return those
  if (res.details && typeof res.details === 'object') {
    const details = res.details as Record<string, unknown>
    if (Array.isArray(details.sampleErrors)) {
      return details.sampleErrors.map(e => String(e))
    }
  }

  // Fallback to error string
  if (res.error && typeof res.error === 'string') {
    return [res.error]
  }

  return ['Unknown error occurred']
}

// Helper function to format error display
function formatErrorDisplay(details: string[], totalErrors?: number): string {
  const displayErrors = details.slice(0, 5).join('\n')
  const errorCountMsg = totalErrors && totalErrors > 5 ? `\n\n...and ${totalErrors - 5} more errors` : ''
  return displayErrors + errorCountMsg
}

// Helper function to validate file before upload (Phase 3: Client-side validation)
async function validateFileStructure(file: File, month: number, year: number): Promise<{ valid: boolean; error?: string; sampleData?: any }> {
  try {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    
    if (lines.length < 2) {
      return { valid: false, error: 'File has less than 2 rows of data' }
    }

    // Basic file size check
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'File size exceeds 10MB limit' }
    }

    // Just verify it's a text file with data - let server handle structure validation
    return {
      valid: true,
      sampleData: {
        totalRows: lines.length,
        fileName: file.name,
        fileSize: file.size
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate file: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

export function AttendanceManager() {
  const { toast } = useToast()
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [records, setRecords] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    late_days: 0,
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
        .eq('month', month)
        .eq('year', year)
        .order('attendance_date')

      if (error) throw error

      setRecords(data || [])

      // Calculate stats
      if (data) {
        const unique = [...new Set(data.map(r => r.attendance_date))]
        const absent = data.filter(r => r.is_absent).length
        const late = data.filter(r => r.is_late && !r.nine_hour_waiver).length

        setStats({
          total_days: unique.length,
          present_days: data.length - absent,
          absent_days: absent,
          late_days: late,
        })
      }
    } catch (error) {
      console.error('Error loading attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)

      // Phase 3: Client-side validation
      console.log('[v0] Validating file structure...')
      const validation = await validateFileStructure(file, month, year)
      
      if (!validation.valid) {
        toast({
          title: 'File Validation Error',
          description: validation.error!,
          variant: 'destructive',
        })
        console.error('[v0] Client validation failed:', validation.error)
        setUploading(false)
        return
      }

      console.log('[v0] File validation passed:', validation.sampleData)
      toast({
        title: 'File Valid',
        description: `Processing ${validation.sampleData?.totalRows} rows...`,
      })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('month', String(month))
      formData.append('year', String(year))

      const response = await fetch('/api/attendance/upload', {
        method: 'POST',
        body: formData,
      })

      const result = (await response.json()) as UploadResponse

      if (result.success) {
        toast({
          title: 'Success',
          description: `Successfully uploaded ${result.recordsProcessed} records`,
        })
        loadAttendanceData()
      } else {
        // Safely extract error details with type guards
        const errorDetails = getErrorDetails(result)
        const formattedMessage = formatErrorDisplay(errorDetails, result.details?.totalErrors)

        toast({
          title: 'Upload Error',
          description: formattedMessage,
          variant: 'destructive',
        })
        console.error('[v0] Upload error details:', result)
      }
    } catch (error) {
      console.error('[v0] Upload error:', error)
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred during upload',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  async function deleteRecord(id: string) {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Record Deleted',
        description: 'Attendance record has been deleted successfully',
      })
      loadAttendanceData()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete record',
        variant: 'destructive',
      })
    }
  }

  const filteredRecords = records.filter(r =>
    r.employee_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header with Month/Year Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Year</label>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger>
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
            </div>

            <div className="flex items-end">
              <Button asChild disabled={uploading}>
                <label className="cursor-pointer flex gap-2">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload File'}
                  <input
                    type="file"
                    accept=".txt,.csv"
                    hidden
                    onChange={handleFileUpload}
                  />
                </label>
              </Button>
            </div>

            <div className="flex items-end">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Days</p>
            <p className="text-2xl font-bold">{stats.total_days}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{stats.present_days}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{stats.absent_days}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Late</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.late_days}</p>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records ({filteredRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No records found for this month</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Employee</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Check In</th>
                    <th className="text-left p-2">Check Out</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-center p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{record.employee_name}</td>
                      <td className="p-2">{record.attendance_date}</td>
                      <td className="p-2">{record.check_in || '-'}</td>
                      <td className="p-2">{record.check_out || '-'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.is_absent ? 'bg-red-100 text-red-800' :
                          record.is_late ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {record.status || 'Present'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecord(record.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
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
