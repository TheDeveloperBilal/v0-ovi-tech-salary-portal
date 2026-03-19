"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function CompanySettings() {
  const [formData, setFormData] = useState({
    company_name: "OviTech Global Pvt Ltd",
    company_address: "",
    company_phone: "",
    company_email: "",
    company_website: "",
    bank_name: "",
    bank_account: "",
    ifsc_code: "",
    cin: "",
    pan: "",
    esi_code: "",
    pf_code: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const { data, error } = await supabase.from("company_settings").select("*").single()

    if (data) {
      // Ensure all values are strings, not null
      setFormData({
        company_name: data.company_name || "OviTech Global Pvt Ltd",
        company_address: data.company_address || "",
        company_phone: data.company_phone || "",
        company_email: data.company_email || "",
        company_website: data.company_website || "",
        bank_name: data.bank_name || "",
        bank_account: data.bank_account || "",
        ifsc_code: data.ifsc_code || "",
        cin: data.cin || "",
        pan: data.pan || "",
        esi_code: data.esi_code || "",
        pf_code: data.pf_code || "",
      })
    } else if (error) {
      console.log("Creating new settings...")
    }
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    const { data: existing } = await supabase.from("company_settings").select("id").single()

    if (existing) {
      const { error } = await supabase.from("company_settings").update(formData).eq("id", existing.id)
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Settings saved successfully" })
      }
    } else {
      const { error } = await supabase.from("company_settings").insert([formData])
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Settings saved successfully" })
      }
    }

    setIsSaving(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Company Settings</h2>
        <p className="text-muted-foreground">Manage company information and bank details</p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-8">
            <p className="text-center text-muted-foreground">Loading settings...</p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="company_phone">Phone</Label>
                  <Input
                    id="company_phone"
                    value={formData.company_phone}
                    onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="company_address">Address</Label>
                  <Input
                    id="company_address"
                    value={formData.company_address}
                    onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="company_email">Email</Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={formData.company_email}
                    onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="company_website">Website</Label>
                  <Input
                    id="company_website"
                    value={formData.company_website}
                    onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cin">CIN</Label>
                  <Input
                    id="cin"
                    value={formData.cin}
                    onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pan">PAN</Label>
                  <Input
                    id="pan"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="esi_code">ESI Code</Label>
                  <Input
                    id="esi_code"
                    value={formData.esi_code}
                    onChange={(e) => setFormData({ ...formData, esi_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pf_code">PF Code</Label>
                  <Input
                    id="pf_code"
                    value={formData.pf_code}
                    onChange={(e) => setFormData({ ...formData, pf_code: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="bank_account">Account Number</Label>
                  <Input
                    id="bank_account"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ifsc_code">IFSC Code</Label>
                  <Input
                    id="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      )}
    </div>
  )
}
