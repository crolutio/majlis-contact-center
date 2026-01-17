"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type UserRole = "agent" | "call_agent" | "supervisor" | "admin" | "analyst" | "back_office"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string
  status: "online" | "away" | "busy" | "offline"
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, role?: UserRole) => Promise<void>
  logout: () => void
  switchRole: (role: UserRole) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const demoUsers: Record<UserRole, User> = {
  agent: {
    id: "e66fa391-28b5-44ec-b3a9-4397c2f2d225",
    name: "Omar Al-Farsi",
    email: "sarah.chen@majlisconnect.com",
    role: "agent",
    avatar: "/professional-woman-avatar.png",
    status: "online",
  },
  call_agent: {
    id: "5",
    name: "David Ruiz",
    email: "david.ruiz@majlisconnect.com",
    role: "call_agent",
    avatar: "/professional-man-marcus.jpg",
    status: "online",
  },
  supervisor: {
    id: "2",
    name: "Michael Torres",
    email: "michael.torres@majlisconnect.com",
    role: "supervisor",
    avatar: "/professional-man-avatar.png",
    status: "online",
  },
  admin: {
    id: "3",
    name: "Jessica Park",
    email: "jessica.park@majlisconnect.com",
    role: "admin",
    avatar: "/professional-woman-admin-avatar.jpg",
    status: "online",
  },
  analyst: {
    id: "4",
    name: "David Kim",
    email: "david.kim@majlisconnect.com",
    role: "analyst",
    avatar: "/professional-man-analyst-avatar.jpg",
    status: "online",
  },
  back_office: {
    id: "6",
    name: "Back Office",
    email: "backoffice@majlisconnect.com",
    role: "back_office",
    avatar: "/placeholder-user.jpg",
    status: "online",
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = async (email: string, password: string, role: UserRole = "agent") => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    setUser(demoUsers[role])
  }

  const logout = () => {
    setUser(null)
  }

  const switchRole = (role: UserRole) => {
    setUser(demoUsers[role])
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        switchRole,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
