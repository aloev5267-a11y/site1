'use server'

import { redirect } from 'next/navigation'
import {
  comparePassword,
  endSession,
  startSession,
  verifyAdminCredentials,
} from '@/lib/auth'
import { getManagerByEmail } from '@/lib/data'

export interface LoginState {
  error?: string
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Enter both email and password.' }
  }

  // 1) Admin is authenticated via environment variables.
  if (verifyAdminCredentials(email, password)) {
    await startSession({
      sub: 'admin',
      role: 'admin',
      email: email.toLowerCase(),
      name: 'Administrator',
    })
    redirect('/admin')
  }

  // 2) Managers are stored in the database.
  const manager = await getManagerByEmail(email)
  if (!manager) {
    return { error: 'Invalid email or password.' }
  }
  if (manager.status === 'blocked') {
    return { error: 'This account has been blocked. Contact your admin.' }
  }
  const ok = await comparePassword(password, manager.passwordHash)
  if (!ok) {
    return { error: 'Invalid email or password.' }
  }

  await startSession({
    sub: manager.id,
    role: 'manager',
    email: manager.email,
    name: manager.name,
    sv: manager.sessionVersion,
  })
  redirect('/app')
}

export async function logoutAction(): Promise<void> {
  await endSession()
  redirect('/login')
}
