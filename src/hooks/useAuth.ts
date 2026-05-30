'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
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

async function getUserProfile(firebaseUser: FirebaseUser): Promise<User | null> {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    return null
  }

  return userSnap.data() as User
}

async function createUserProfile(firebaseUser: FirebaseUser, data?: Partial<User>) {
  const userRef = doc(db, 'users', firebaseUser.uid)

  await setDoc(
    userRef,
    {
      uid: firebaseUser.uid,
      name: data?.name || firebaseUser.displayName || 'مستخدمة جديدة',
      email: firebaseUser.email || data?.email || '',
      phone: data?.phone || '',
      role: data?.role || 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    firebaseUser: null,
    loading: true,
  })

  useEffect(() => {
    let mounted = true

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!mounted) return

        if (!firebaseUser) {
          setState({
            user: null,
            firebaseUser: null,
            loading: false,
          })
          return
        }

        let profile = await getUserProfile(firebaseUser)

        if (!profile) {
          await createUserProfile(firebaseUser)
          profile = await getUserProfile(firebaseUser)
        }

        if (!mounted) return

        setState({
          user: profile,
          firebaseUser,
          loading: false,
        })
      } catch (error) {
        console.error('Auth state error:', error)

        if (!mounted) return

        setState({
          user: null,
          firebaseUser,
          loading: false,
        })
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const isAuthenticated = Boolean(state.user)
  const isAdmin = Boolean(state.user && ['owner', 'admin', 'super_admin', 'support', 'content_manager', 'finance', 'viewer'].includes(state.user.role))

  const actions = useMemo(
    () => ({
      async register({ name, email, password, phone }: RegisterInput) {
        const credential = await createUserWithEmailAndPassword(auth, email, password)

        await updateProfile(credential.user, {
          displayName: name,
        })

        await createUserProfile(credential.user, {
          name,
          email,
          phone,
        })

        const profile = await getUserProfile(credential.user)

        setState({
          user: profile,
          firebaseUser: credential.user,
          loading: false,
        })

        return profile
      },

      async login({ email, password }: LoginInput) {
        const credential = await signInWithEmailAndPassword(auth, email, password)

        let profile = await getUserProfile(credential.user)

        if (!profile) {
          await createUserProfile(credential.user, {
            email: credential.user.email || email,
            name: credential.user.displayName || 'مستخدمة جديدة',
          })

          profile = await getUserProfile(credential.user)
        }

        setState({
          user: profile,
          firebaseUser: credential.user,
          loading: false,
        })

        return profile
      },

      async loginWithGoogle() {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({
          prompt: 'select_account',
        })

        const credential = await signInWithPopup(auth, provider)

        let profile = await getUserProfile(credential.user)

        if (!profile) {
          await createUserProfile(credential.user, {
            name: credential.user.displayName || 'مستخدمة جديدة',
            email: credential.user.email || '',
          })

          profile = await getUserProfile(credential.user)
        }

        setState({
          user: profile,
          firebaseUser: credential.user,
          loading: false,
        })

        return profile
      },

      async resetPassword(email: string) {
        await sendPasswordResetEmail(auth, email)
      },

      async logout() {
        await signOut(auth)

        setState({
          user: null,
          firebaseUser: null,
          loading: false,
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