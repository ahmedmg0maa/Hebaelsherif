'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'
import AdminPageShell from '@/components/admin/AdminPageShell'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { db } from '@/lib/firebase/client'
import type { User, UserRole } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  async function loadUsers() {
    setLoading(true)
    const snap = await getDocs(collection(db, 'users'))
    const loaded = snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })) as unknown as User[]
    loaded.sort((a, b) => String(a.email).localeCompare(String(b.email)))
    setUsers(loaded)
    setLoading(false)
  }

  useEffect(() => {
    loadUsers().catch((error) => {
      console.error('Admin users load error:', error)
      setLoading(false)
    })
  }, [])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) => `${user.name} ${user.email} ${user.phone || ''}`.toLowerCase().includes(q))
  }, [query, users])

  async function changeRole(userId: string, role: UserRole) {
    setUpdatingId(userId)
    try {
      await updateDoc(doc(db, 'users', userId), { role })
      setUsers((current) => current.map((user) => (user.uid === userId ? { ...user, role } : user)))
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <AdminPageShell
      eyebrow="المستخدمون"
      title="إدارة الحسابات والصلاحيات"
      description="عرض المستخدمين، البحث، وتغيير الصلاحيات بين مستخدم عادي ومدير. صلاحيات Firebase Admin الفعلية تُحدث من API seed-admin عند الحاجة."
    >
      <div className="mb-6 rounded-[2rem] border border-sand bg-ivory/90 p-5 shadow-soft">
        <input
          className="premium-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث بالاسم أو البريد أو الهاتف..."
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <PremiumSkeleton className="h-28" />
          <PremiumSkeleton className="h-28" />
          <PremiumSkeleton className="h-28" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <article key={user.uid} className="rounded-3xl border border-sand bg-ivory/90 p-5 shadow-soft">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-black text-charcoal">{user.name || 'مستخدم بدون اسم'}</h3>
                  <p className="mt-1 text-sm text-warm-gray">{user.email}</p>
                  {user.phone ? <p className="mt-1 text-xs font-bold text-warm-gray">{user.phone}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-sand bg-cream px-4 py-2 text-xs font-black text-charcoal">
                    {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                  </span>
                  <PremiumButton
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updatingId === user.uid || user.role === 'admin'}
                    onClick={() => changeRole(user.uid, 'admin')}
                  >
                    تعيين كمدير
                  </PremiumButton>
                  <PremiumButton
                    type="button"
                    size="sm"
                    variant="soft"
                    disabled={updatingId === user.uid || user.role === 'user'}
                    onClick={() => changeRole(user.uid, 'user')}
                  >
                    مستخدم عادي
                  </PremiumButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminPageShell>
  )
}
