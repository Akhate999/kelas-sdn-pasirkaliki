'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleUpdate(e) {
    e.preventDefault()
    if (password !== konfirmasi) {
      setError('Kata sandi tidak cocok. Periksa kembali.')
      return
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Gagal memperbarui kata sandi. Coba lagi.')
      setLoading(false)
      return
    }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="min-h-screen bg-navy-800 flex flex-col">
      <div className="bg-navy-900 py-6 px-4 text-center border-b border-navy-700">
        <div className="flex items-center justify-center gap-4">
          <div className="w-16 h-16 relative flex-shrink-0">
            <Image src="/logo-sdn.png" alt="Logo SDN Pasirkaliki 1" width={64} height={64} className="object-contain" />
          </div>
          <div className="text-left">
            <p className="text-gold-400 text-xs font-semibold tracking-widest uppercase">Sistem Informasi Kelas</p>
            <h1 className="text-white text-lg font-bold">SDN Pasirkaliki I</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-navy-700 px-6 py-4">
              <h2 className="text-white font-semibold text-base">Buat Kata Sandi Baru</h2>
              <p className="text-navy-300 text-xs mt-0.5">Masukkan kata sandi untuk akun Anda</p>
            </div>
            <form onSubmit={handleUpdate} className="px-6 py-5 space-y-4">
              {success ? (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-3 rounded-lg text-center">
                  ✓ Kata sandi berhasil dibuat! Mengalihkan ke dashboard...
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">Kata Sandi Baru</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Konfirmasi Kata Sandi</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="Ulangi kata sandi"
                      value={konfirmasi}
                      onChange={e => setKonfirmasi(e.target.value)}
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
                    className="btn-primary w-full py-2.5 disabled:opacity-60"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
