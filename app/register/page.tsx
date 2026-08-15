'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, ArrowRight, Lock, Mail, User } from 'lucide-react'

import { useAuth } from '@/components/providers/AuthProvider'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, resendConfirmationEmail, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isConfirmationRequired, setIsConfirmationRequired] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!isConfigured) {
      setLoading(false)
      router.push('/onboarding')
      return
    }

    const calculatedUsername = username.trim() || name.toLowerCase().replace(/\s+/g, '_') || 'user'
    const { error: err, user, session } = await signUp(email, password, {
      display_name: name,
      username: calculatedUsername,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    })

    if (err) {
      console.error('Register submit error details:', {
        message: err.message,
        status: (err as any).status,
        code: (err as any).code,
      })

      const status = (err as any).status
      const msg = (err.message || '').toLowerCase()

      if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
        setError('Çok fazla kayıt veya e-posta isteği gönderildi. Lütfen biraz bekleyip tekrar deneyin.')
      } else if (status === 422 || msg.includes('unprocessable') || msg.includes('redirect')) {
        setError('Kayıt isteği işlenemedi. Lütfen e-posta adresinizi kontrol edin veya tekrar deneyin.')
      } else {
        setError(err.message || 'Kayıt olunurken bir hata oluştu.')
      }
      setLoading(false)
    } else {
      setLoading(false)
      setSubmittedEmail(email)
      if (user && !session) {
        // Email confirmation is enabled in Supabase Auth! Show confirmation UI state
        setIsConfirmationRequired(true)
      } else {
        // Active session immediately established (email confirmation disabled)
        router.push('/onboarding')
      }
    }
  }

  const handleResend = async () => {
    if (!submittedEmail) return
    setResendLoading(true)
    setResendMessage(null)
    const { error: err } = await resendConfirmationEmail(submittedEmail)
    setResendLoading(false)
    if (err) {
      setError(err.message || 'E-posta tekrar gönderilirken hata oluştu.')
    } else {
      setResendMessage('Doğrulama e-postası tekrar gönderildi. Lütfen gelen kutunuzu kontrol edin.')
    }
  }

  if (isConfirmationRequired) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center py-6">
        <div className="w-full max-w-md bg-[#121826]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
            <Mail className="w-8 h-8 stroke-[2]" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Kayıt Başarılı! 📩</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Hesabınızı aktifleştirmek için <span className="font-bold text-emerald-400">{submittedEmail}</span> adresine bir doğrulama e-postası gönderdik.
          </p>
          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl text-xs text-slate-400 text-left space-y-1.5">
            <p>1. E-posta kutunuzu (ve gereksiz/spam klasörünü) kontrol edin.</p>
            <p>2. E-postadaki doğrulama bağlantısına tıklayın.</p>
            <p>3. Bağlantı sizi otomatik olarak profilinizi tamamlamanız için yönlendirecektir.</p>
          </div>
          {resendMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              {resendMessage}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
            >
              {resendLoading ? 'E-posta Gönderiliyor...' : 'Doğrulama E-postasını Tekrar Gönder'}
            </button>
            <Link
              href="/login"
              className="block w-full py-3 px-4 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Giriş Yap Sayfasına Git
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-6">
      <div className="w-full max-w-md bg-[#121826]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black mb-3 shadow-lg shadow-emerald-500/20">
            <Activity className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Topluluğa Katıl 🚀</h1>
          <p className="text-xs text-slate-400 mt-1">Gruptaki arkadaşlarına sen de ilham ver.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Adın Soyadın</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Can Yılmaz"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-posta Adresi</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="can@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span>Hesap Oluşturuluyor...</span>
            ) : (
              <>
                <span>Devam Et</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Zaten hesabın var mı?{' '}
          <Link href="/login" className="text-emerald-400 font-semibold hover:underline">
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  )
}
