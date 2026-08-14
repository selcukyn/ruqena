'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, ArrowRight, Lock, Mail, User } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      router.push('/onboarding')
    }, 500)
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
