"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  FileText, Plus, Trash2, Upload, Loader2, CheckCircle, XCircle,
  Eye, Users, ShieldCheck, Download,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { logAudit } from "@/lib/audit"

export function PolicyManager() {
  const [policies, setPolicies] = useState<any[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null)
  const [signatureData, setSignatureData] = useState<{ signed: any[]; unsigned: any[] } | null>(null)
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formRequiresSig, setFormRequiresSig] = useState(true)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => { fetchPolicies() }, [])

  async function fetchPolicies() {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/policies', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setPolicies(data.policies || [])
        setTotalEmployees(data.total_employees || 0)
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!formFile || !formTitle) return
    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const formData = new FormData()
      formData.append('file', formFile)
      formData.append('title', formTitle)
      formData.append('description', formDesc)
      formData.append('requires_signature', String(formRequiresSig))

      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }

      logAudit({
        action: 'upload_policy',
        entity_type: 'company_policy',
        details: { title: formTitle, requires_signature: formRequiresSig },
      })

      toast({ title: 'Policy Uploaded', description: `"${formTitle}" is now available to employees.` })
      setIsFormOpen(false)
      setFormTitle('')
      setFormDesc('')
      setFormFile(null)
      setFormRequiresSig(true)
      fetchPolicies()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(policy: any) {
    if (!confirm(`Delete policy "${policy.title}"? This will also remove all signatures.`)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/policies', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: policy.id }),
      })

      if (!res.ok) throw new Error('Failed to delete')

      logAudit({
        action: 'delete_policy',
        entity_type: 'company_policy',
        entity_id: policy.id,
        details: { title: policy.title },
      })

      toast({ title: 'Deleted', description: 'Policy removed.' })
      setSelectedPolicy(null)
      setSignatureData(null)
      fetchPolicies()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  async function viewSignatures(policy: any) {
    setSelectedPolicy(policy)
    setIsLoadingSignatures(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/policies/sign?policy_id=${policy.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok) setSignatureData(data)
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsLoadingSignatures(false)
    }
  }

  function formatFileSize(bytes: number) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            Office Policies
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload company policies and track employee signatures
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Policy
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-l-4 border-l-purple-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Policies</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{policies.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-l-4 border-l-emerald-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Requiring Signature</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {policies.filter(p => p.requires_signature).length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-l-4 border-l-blue-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Employees</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{totalEmployees}</p>
          </CardContent>
        </Card>
      </div>

      {/* Policies List */}
      {policies.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No policies uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {policies.map(policy => {
            const signedPct = totalEmployees > 0
              ? Math.round(((policy.signature_count || 0) / totalEmployees) * 100)
              : 0
            return (
              <Card key={policy.id} className="glass-card">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                        <h3 className="font-semibold text-foreground">{policy.title}</h3>
                        {policy.requires_signature && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Signature Required
                          </span>
                        )}
                        {!policy.is_active && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                            Inactive
                          </span>
                        )}
                      </div>
                      {policy.description && (
                        <p className="text-sm text-muted-foreground mb-2">{policy.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                        <span>{policy.file_name}</span>
                        <span>{formatFileSize(policy.file_size)}</span>
                        <span>
                          Uploaded {new Date(policy.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Signature progress bar */}
                      {policy.requires_signature && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              {policy.signature_count || 0} / {totalEmployees} employees signed
                            </span>
                            <span className={signedPct === 100 ? 'text-emerald-400' : 'text-amber-400'}>
                              {signedPct}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                signedPct === 100 ? 'bg-emerald-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${signedPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(policy.file_url, '_blank')}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        title="View PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {policy.requires_signature && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewSignatures(policy)}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                          title="View Signatures"
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(policy)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Upload Policy Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-400" />
              Upload Policy
            </DialogTitle>
            <DialogDescription>
              Upload a company policy document for employees to review and sign
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label>Policy Title *</Label>
              <Input
                placeholder="e.g. Company Policy & Code of Conduct"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                placeholder="Brief description of the policy"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
              />
            </div>
            <div>
              <Label>Policy Document (PDF) *</Label>
              <div className="mt-1">
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-input rounded-lg p-6 cursor-pointer hover:border-purple-500/50 transition-colors">
                  {formFile ? (
                    <div className="text-center">
                      <FileText className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                      <p className="text-sm font-medium text-foreground">{formFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(formFile.size)}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Click to select a PDF file</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => setFormFile(e.target.files?.[0] || null)}
                    required={!formFile}
                  />
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formRequiresSig}
                onChange={e => setFormRequiresSig(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm text-foreground">Require employee signature</span>
            </label>
            <Button type="submit" className="w-full" disabled={isSubmitting || !formFile}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Policy
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Signature Compliance Dialog */}
      <Dialog open={!!selectedPolicy} onOpenChange={() => { setSelectedPolicy(null); setSignatureData(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              Signature Compliance — {selectedPolicy?.title}
            </DialogTitle>
            <DialogDescription>
              Track which employees have signed this policy
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            {isLoadingSignatures ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : signatureData ? (
              <>
                {/* Signed */}
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4" />
                    Signed ({signatureData.signed.length})
                  </h4>
                  {signatureData.signed.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-6">No signatures yet</p>
                  ) : (
                    <div className="space-y-2">
                      {signatureData.signed.map((sig: any) => (
                        <div key={sig.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {sig.employees?.first_name} {sig.employees?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sig.employees?.department} · {sig.employees?.designation}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-emerald-400">
                              Signed {new Date(sig.signed_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-muted-foreground/60 italic truncate max-w-[200px]">
                              "{sig.signature_text}"
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unsigned */}
                <div>
                  <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4" />
                    Not Signed ({signatureData.unsigned.length})
                  </h4>
                  {signatureData.unsigned.length === 0 ? (
                    <p className="text-sm text-emerald-400 pl-6">All employees have signed!</p>
                  ) : (
                    <div className="space-y-2">
                      {signatureData.unsigned.map((emp: any) => (
                        <div key={emp.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {emp.department} · {emp.designation}
                            </p>
                          </div>
                          <span className="text-xs text-red-400">Pending</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
