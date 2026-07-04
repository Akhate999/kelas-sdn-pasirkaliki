'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau kata sandi salah. Silakan coba lagi.')
      setLoading(false)
      return
    }

    // Ambil role pengguna
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'murid') {
      router.push('/murid/dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-navy-800 flex flex-col">
      {/* Header sekolah */}
      <div className="bg-navy-900 py-6 px-4 text-center border-b border-navy-700">
        <div className="flex items-center justify-center gap-3 mb-2">
          {/* Emblem placeholder */}
          <div className="w-14 h-14 bg-gold-400 rounded-full flex items-center justify-center">
            <span className="text-navy-900 font-bold text-xl">S</span>
          </div>
          <div className="text-left">
            <p className="text-gold-400 text-xs font-semibold tracking-widest uppercase">Sistem Informasi Kelas</p>
            <h1 className="text-white text-lg font-bold leading-tight">SDN Pasirkaliki 1</h1>
            <p className="text-navy-300 text-xs">Kota Bandung</p>
          </div>
        </div>
      </div>

      {/* Form login */}
      <div className="flex-1 flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-navy-700 px-6 py-4">
              <h2 className="text-white font-semibold text-base">Masuk ke Akun Anda</h2>
              <p className="text-navy-300 text-xs mt-0.5">Gunakan akun yang diberikan oleh wali kelas</p>
            </div>
            <form onSubmit={handleLogin} className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Alamat Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="contoh@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Kata Sandi</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 mt-2 disabled:opacity-60"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          </div>

          <p className="text-navy-400 text-xs text-center mt-6">
            Lupa kata sandi? Hubungi wali kelas Anda.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-navy-500 text-xs">
        © {new Date().getFullYear()} SDN Pasirkaliki 1 · Sistem Informasi Kelas
      </div>
    </div>
  )
}
