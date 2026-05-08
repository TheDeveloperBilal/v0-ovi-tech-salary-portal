import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get first 20 attendance records to inspect their format
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Analyze the attendance_date formats
    const dateFormats = data?.map(r => ({
      id: r.id,
      attendance_date: r.attendance_date,
      raw_type: typeof r.attendance_date,
      check_in: r.check_in,
      check_out: r.check_out,
      employee_id: r.employee_id
    })) || []

    return NextResponse.json({
      total_records: (data || []).length,
      sample_records: dateFormats,
      date_format_analysis: dateFormats.map(r => {
        const date = String(r.attendance_date)
        if (date.includes('-')) return 'YYYY-MM-DD'
        if (date.includes('/')) return 'M/D/YYYY'
        return 'UNKNOWN'
      })
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
