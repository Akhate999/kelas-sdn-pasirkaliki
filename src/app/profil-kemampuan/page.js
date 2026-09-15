'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ProfilKemampuanMurid from '@/components/ProfilKemampuanMurid'
import { ChevronDown, ChevronUp, Loader } from 'lucide-react'

export default function ProfilKemampuanPage() {
  const router = useRouter()
  const [kelas, setKelas] = useState(null)
  const [muridList, setMuridList] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      if (kls) {
        const { data: murid } = await supabase
          .from('murid')
          .select('*')
          .eq('kelas_id', kls.id)
          .eq('status_murid', 'aktif')
          .order('nama')
        setMuridList(murid || [])
      }
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-navy-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <header className="bg-navy-800 text-white px-4 pt-6 pb-8">
        <h1 className="text-lg font-bold">Profil Kemampuan Murid</h1>
        <p className="text-navy-200 text-sm mt-1">
          {kelas?.nama || 'Kelas'} · Klasifikasi otomatis dari nilai Formatif & Sumatif per mata pelajaran
        </p>
      </header>

      <main className="px-4 -mt-4 space-y-3">
        {muridList.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-gray-400 text-sm">Belum ada murid di kelas ini.</p>
          </div>
        )}

        {muridList.map(m => (
          <div key={m.id} className="card">
            <button
              onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
              className="w-full flex items-center justify-between"
            >
              <div className="text-left">
                <p className="text-sm font-bold text-gray-800">{m.nama}</p>
                <p className="text-xs text-gray-400">NISN: {m.nisn || '-'}</p>
              </div>
              {expandedId === m.id ? (
                <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
              )}
            </button>

            {expandedId === m.id && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <ProfilKemampuanMurid muridId={m.id} />
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  )
}
