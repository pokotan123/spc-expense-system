import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MemberRole } from '@/lib/constants'

interface AuthData {
  readonly accessToken: string
  readonly memberId: string
  readonly memberName: string
  readonly role: MemberRole
}

interface AuthState {
  readonly accessToken: string | null
  readonly memberId: string | null
  readonly memberName: string | null
  readonly role: MemberRole | null
  readonly isAuthenticated: boolean
  readonly setAuth: (data: AuthData) => void
  readonly clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      memberId: null,
      memberName: null,
      role: null,
      isAuthenticated: false,
      setAuth: (data: AuthData) =>
        set({
          accessToken: data.accessToken,
          memberId: data.memberId,
          memberName: data.memberName,
          role: data.role,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          accessToken: null,
          memberId: null,
          memberName: null,
          role: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'spc-auth',
    },
  ),
)
