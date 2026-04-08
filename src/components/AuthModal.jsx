import { useState } from 'react'

export default function AuthModal({ open, onClose, onSignIn, onSignUp, onResetPassword }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const reset = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setMessage('')
  }

  const switchMode = (m) => {
    reset()
    setMode(m)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'reset') {
      if (!email.trim()) { setError('Please enter your email'); return }
      setSubmitting(true)
      try {
        await onResetPassword(email.trim())
        setMessage('Password reset email sent! Check your inbox.')
      } catch (err) {
        setError(err.message)
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!email.trim() || !password) {
      setError('Please fill in all fields')
      return
    }

    if (mode === 'signup') {
      if (password.length < 6) { setError('Password must be at least 6 characters'); return }
      if (password !== confirmPassword) { setError('Passwords do not match'); return }
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await onSignIn(email.trim(), password)
        onClose()
      } else {
        const data = await onSignUp(email.trim(), password)
        if (data.user && !data.session) {
          setMessage('Account created! Please check your email to confirm your account.')
        } else {
          onClose()
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const titles = { login: 'Sign In', signup: 'Create Account', reset: 'Reset Password' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">{titles[mode]}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          {error && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              {message}
            </div>
          )}

          <label className="block text-xs font-medium text-gray-600 mb-1 mt-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />

          {mode !== 'reset' && (
            <>
              <label className="block text-xs font-medium text-gray-600 mb-1 mt-3">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </>
          )}

          {mode === 'signup' && (
            <>
              <label className="block text-xs font-medium text-gray-600 mb-1 mt-3">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Please wait...' : titles[mode]}
          </button>

          {/* Footer links */}
          <div className="mt-4 text-center text-xs text-gray-500 space-y-1">
            {mode === 'login' && (
              <>
                <p>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => switchMode('signup')} className="text-blue-600 hover:underline font-medium">
                    Sign up
                  </button>
                </p>
                <p>
                  <button type="button" onClick={() => switchMode('reset')} className="text-blue-600 hover:underline">
                    Forgot password?
                  </button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('login')} className="text-blue-600 hover:underline font-medium">
                  Sign in
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <p>
                <button type="button" onClick={() => switchMode('login')} className="text-blue-600 hover:underline">
                  Back to sign in
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
