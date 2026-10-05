'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { Shield, Users } from 'lucide-react'

const ROLES = ['admin', 'hr', 'manager', 'employee'] as const
type Role = typeof ROLES[number]

const ROLE_CONFIG: Record<Role, { label: string; color: string; border: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400', border: 'border-purple-500/20' },
  hr: { label: 'HR', color: 'bg-blue-500/10 text-blue-400', border: 'border-blue-500/20' },
  manager: { label: 'Manager', color: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/20' },
  employee: { label: 'Employee', color: 'bg-slate-500/10 text-slate-400', border: 'border-slate-500/20' },
}

interface User {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  role?: Role
  created_at: string
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getUserRole = (user: User): Role => {
    if (user.role && ROLES.includes(user.role)) return user.role
    return user.is_admin ? 'admin' : 'employee'
  }

  const updateRole = async (userId: string, newRole: Role) => {
    setUpdatingId(userId)
    try {
      const isAdmin = newRole === 'admin'
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, is_admin: isAdmin })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole, is_admin: isAdmin } : u
      ))

      toast({
        title: 'Role updated',
        description: `User role changed to ${ROLE_CONFIG[newRole].label}`,
      })
    } catch {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' })
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">Loading users...</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Manage Users & Roles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found</p>
          ) : (
            users.map((user) => {
              const currentRole = getUserRole(user)
              const config = ROLE_CONFIG[currentRole]
              const isUpdating = updatingId === user.id

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.full_name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${config.color} ${config.border}`}>
                      {config.label}
                    </div>
                    <Select
                      value={currentRole}
                      onValueChange={(v) => updateRole(user.id, v as Role)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(role => (
                          <SelectItem key={role} value={role}>
                            {ROLE_CONFIG[role].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
