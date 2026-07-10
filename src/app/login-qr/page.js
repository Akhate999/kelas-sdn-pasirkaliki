'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

function LoginQRContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Memverifikasi QR Code...')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loginOtomatis() {
      const email = searchParams.get('e')
      const password = searchParams.get('p')
      if (!email || !password) {
        setError('QR Code tidak valid.')
        return
      }
      setStatus('Masuk ke akun...')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('QR Code tidak valid atau akun tidak ditemukan.')
        return
      }
      setStatus('Berhasil! Mengalihkan...')
      setTimeout(() => router.push('/murid/dashboard'), 1000)
    }
    loginOtomatis()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-navy-800 flex flex-col items-center justify-center px-4">
      <div className="w-20 h-20 relative mb-4">
        <Image src="/logo-sdn.png" alt="Logo SDN" width={80} height={80} className="object-contain" />
      </div>
      <h1 className="text-white font-bold text-lg mb-1">SDN Pasirkaliki I</h1>
      <p className="text-navy-300 text-xs mb-8">Sistem Informasi Kelas</p>

      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
        {error ? (
          <>
            <div className="text-4xl mb-3">❌</div>
            <p className="text-red-600 font-semibold text-sm">{error}</p>
            <button onClick={() => router.push('/')} className="btn-primary mt-4 w-full py-2">
              Kembali ke Login
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-navy-700 font-semibold text-sm">{status}</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginQRPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-navy-800 flex items-center justify-center">
        <p className="text-white text-sm">Memuat...</p>
      </div>
    }>
      <LoginQRContent />
    </Suspense>
  )
}