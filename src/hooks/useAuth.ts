'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js'
import type { User as SupabaseCompatUser } from '@/lib/supabase/auth-token-compat'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import { isAdminRole } from '@/lib/auth/permissions'
import type { User } from '@/types'

type LegacyTokenUser = SupabaseCompatUser

interface AuthState {
  user: User | null
  sessionUser: LegacyTokenUser | null
  loading: boolean
  session: Session | null
  supabaseUser: SupabaseAuthUser | null
}

interface RegisterInput {
  name: string
  email: string
  password: string
  phone?: string
}

interface LoginInput {
  email: string
  password: string
}

function toLegacyTokenUser(session: Session | null): LegacyTokenUser | null {
  if (!session?.user) return null
  return {
    uid: session.user.id,
    email: session.user.email || null,
    displayName: String(session.user.user_metadata?.full_name || session.user.user_metadata?.name || ''),
    getIdToken: async () => session.access_token,
  } as unknown as LegacyTokenUser
}

function toAppUser(authUser: SupabaseAuthUser, profile?: Record<string, unknown> | null): User {
  return {
    uid: authUser.id,
    name: String(profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'مستخدمة جديدة'),
    email: String(profile?.email || authUser.email || ''),
    phone: String(profile?.phone || authUser.user_metadata?.phone || ''),
    role: String(profile?.role || 'user') as User['role'],
    createdAt: profile?.created_at ? new Date(String(profile.created_at)) : new Date(authUser.created_at),
    updatedAt: profile?.updated_at ? new Date(String(profile.updated_at)) : new Date(),
  }
}

async function getProfile(authUser: SupabaseAuthUser) {
  const supabase = createSupabaseBrowserClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
  return toAppUser(authUser, data as Record<string, unknown> | null)
}

function hasSupabasePublicEnv() {
  const env = getSupabasePublicEnv()
  return Boolean(env.url && env.anonKey)
}

function assertClientAuthConfigured() {
  if (!hasSupabasePublicEnv()) {
    throw new Error('Supabase public environment variables are required for authentication.')
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    sessionUser: null,
    loading: true,
    session: null,
    supabaseUser: null,
  })

  useEffect(() => {
    let mounted = true

    if (!hasSupabasePublicEnv()) {
      setState({
        user: null,
        sessionUser: null,
        loading: false,
        session: null,
        supabaseUser: null,
      })
      return () => {
        mounted = false
      }
    }

    const supabase = createSupabaseBrowserClient()

    async function loadSession() {
      const { data } = await supabase.auth.getSession()
      const session = data.session
      const authUser = session?.user || null
      const appUser = authUser ? await getProfile(authUser) : null

      if (!mounted) return
      setState({
        user: appUser,
        sessionUser: toLegacyTokenUser(session),
        loading: false,
        session,
        supabaseUser: authUser,
      })
    }

    void loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      const authUser = session?.user || null
      const appUser = authUser ? await getProfile(authUser) : null
      if (!mounted) return
      setState({
        user: appUser,
        sessionUser: toLegacyTokenUser(session),
        loading: false,
        session,
        supabaseUser: authUser,
      })
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const isAuthenticated = Boolean(state.user)
  const isAdmin = Boolean(state.user && isAdminRole(state.user.role))

  const actions = useMemo(
    () => ({
      async register({ name, email, password, phone }: RegisterInput) {
        assertClientAuthConfigured()
        const supabase = createSupabaseBrowserClient()
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              name,
              phone: phone || '',
            },
          },
        })

        if (error) throw error

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: name,
            email,
            phone: phone || '',
          })
        }

        if (data.session?.user) {
          const profile = await getProfile(data.session.user)
          setState({
            user: profile,
            sessionUser: toLegacyTokenUser(data.session),
            loading: false,
            session: data.session,
            supabaseUser: data.session.user,
          })
          return profile
        }

        return null
      },

      async login({ email, password }: LoginInput) {
        assertClientAuthConfigured()
        const supabase = createSupabaseBrowserClient()
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!data.session?.user) return null
        const profile = await getProfile(data.session.user)
        setState({
          user: profile,
          sessionUser: toLegacyTokenUser(data.session),
          loading: false,
          session: data.session,
          supabaseUser: data.session.user,
        })
        return profile
      },

      async loginWithGoogle() {
        assertClientAuthConfigured()
        const supabase = createSupabaseBrowserClient()
        const redirectTo = `${window.location.origin}/auth/callback`
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
        if (error) throw error
        return null
      },

      async resetPassword(email: string) {
        assertClientAuthConfigured()
        const supabase = createSupabaseBrowserClient()
        const redirectTo = `${window.location.origin}/auth/reset-password`
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) throw error
      },

      async logout() {
        assertClientAuthConfigured()
        const supabase = createSupabaseBrowserClient()
        await supabase.auth.signOut()
        setState({
          user: null,
          sessionUser: null,
          loading: false,
          session: null,
          supabaseUser: null,
        })
      },
    }),
    [],
  )

  return {
    ...state,
    ...actions,
    isAuthenticated,
    isAdmin,
  }
}
