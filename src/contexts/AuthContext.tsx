import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Membership } from '@/types/database'

export interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  isSuperAdmin: boolean
  membership: Membership | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isSuperAdmin?: boolean; hasActiveMembership?: boolean }>
  signOut: () => Promise<void>
  refreshAccessContext: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Request counter to prevent stale async responses from overwriting current state
  const currentRequestIdRef = useRef<number>(0)

  // Fetch access context (profile, system_admin, membership) for a given user ID
  const fetchAccessContext = useCallback(async (userId: string | null) => {
    const requestId = ++currentRequestIdRef.current

    if (!userId) {
      if (requestId === currentRequestIdRef.current) {
        setProfile(null)
        setIsSuperAdmin(false)
        setMembership(null)
        setIsLoading(false)
      }
      return
    }

    try {
      // Run queries in parallel
      const [profileRes, adminRes, membershipRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('system_admins')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('memberships')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle(),
      ])

      // Only update state if this request is still the latest one
      if (requestId === currentRequestIdRef.current) {
        if (profileRes.data) {
          setProfile(profileRes.data as Profile)
        } else {
          setProfile(null)
        }

        setIsSuperAdmin(Boolean(adminRes.data))

        if (membershipRes.data) {
          setMembership(membershipRes.data as Membership)
        } else {
          setMembership(null)
        }
      }
    } catch (err) {
      console.error('Error fetching access context:', err)
      if (requestId === currentRequestIdRef.current) {
        setProfile(null)
        setIsSuperAdmin(false)
        setMembership(null)
      }
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  // Initial session recovery & auth state listener
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (isMounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          if (initialSession?.user) {
            await fetchAccessContext(initialSession.user.id)
          } else {
            setIsLoading(false)
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return

      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (event === 'SIGNED_OUT' || !newSession?.user) {
        fetchAccessContext(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Trigger fetch asynchronously without directly awaiting inside the callback
        setTimeout(() => {
          if (isMounted && newSession.user) {
            fetchAccessContext(newSession.user.id)
          }
        }, 0)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchAccessContext])

  const refreshAccessContext = useCallback(async () => {
    if (user) {
      await fetchAccessContext(user.id)
    }
  }, [user, fetchAccessContext])

  // Sign in function with explicit credentials and role determination
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        return { error }
      }

      const signedInUser = data.user
      if (!signedInUser) {
        return { error: new Error('User data missing after login') }
      }

      // Fetch authorization details
      const [adminRes, membershipRes, profileRes] = await Promise.all([
        supabase
          .from('system_admins')
          .select('user_id')
          .eq('user_id', signedInUser.id)
          .maybeSingle(),
        supabase
          .from('memberships')
          .select('*')
          .eq('user_id', signedInUser.id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', signedInUser.id)
          .maybeSingle(),
      ])

      const isSysAdmin = Boolean(adminRes.data)
      const hasMembership = Boolean(membershipRes.data)

      setProfile(profileRes.data as Profile ?? null)
      setIsSuperAdmin(isSysAdmin)
      setMembership(membershipRes.data as Membership ?? null)

      return {
        error: null,
        isSuperAdmin: isSysAdmin,
        hasActiveMembership: hasMembership,
      }
    } catch (err: any) {
      return { error: err }
    }
  }

  // Sign out function
  const signOut = async () => {
    currentRequestIdRef.current++
    setProfile(null)
    setIsSuperAdmin(false)
    setMembership(null)
    setSession(null)
    setUser(null)
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user,
    profile,
    isSuperAdmin,
    membership,
    isAuthenticated: Boolean(session && user),
    isLoading,
    signIn,
    signOut,
    refreshAccessContext,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
