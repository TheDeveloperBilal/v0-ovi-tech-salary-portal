'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface ProbationManagerProps {
  employee: any
  onUpdate: () => void
}

export function ProbationManager({ employee, onUpdate }: ProbationManagerProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isProbation, setIsProbation] = useState(employee?.is_probation || false)
  const [probationEndDate, setProbationEndDate] = useState(
    employee?.probation_end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const handleConvertToPermanent = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          is_probation: false,
          probation_end_date: null
        })
        .eq('id', employee.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `${employee.first_name} ${employee.last_name} has been converted to permanent employee.`
      })
      onUpdate()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateProbation = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          is_probation: isProbation,
          probation_end_date: isProbation ? probationEndDate : null
        })
        .eq('id', employee.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Probation status updated successfully.'
      })
      setShowDialog(false)
      onUpdate()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!employee) return null

  return (
    <>
      {/* Probation Status Card */}
      <Card className="border-2 border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {employee.is_probation ? (
              <>
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400">On Probation</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400">Permanent Employee</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {employee.is_probation && (
            <>
              <div>
                <p className="text-sm text-slate-400">Probation End Date:</p>
                <p className="font-semibold text-slate-100">
                  {employee.probation_end_date
                    ? new Date(employee.probation_end_date).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
              <Button
                onClick={handleConvertToPermanent}
                disabled={isLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900"
              >
                {isLoading ? 'Converting...' : 'Convert to Permanent Employee'}
              </Button>
            </>
          )}
          {!employee.is_probation && (
            <Button
              onClick={() => setShowDialog(true)}
              variant="outline"
              className="w-full"
            >
              Mark as On Probation
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Edit Probation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Probation Period</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-200">Probation End Date</label>
              <Input
                type="date"
                value={probationEndDate}
                onChange={(e) => setProbationEndDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Employee will have no paid leaves until this date
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProbation}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Set Probation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
