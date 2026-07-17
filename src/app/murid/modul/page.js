'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, BookOpen, FileText, Download } from 'lucide-react'

const MAPEL = ['Pendidikan Agama','PPKn','Bahasa Indonesia','Matematika','IPAS','PJOK','Seni Budaya','Bahasa Inggris','Muatan Lokal']

export default function MuridModulPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [modul, setModul]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filterMapel, setFilterMapel] = useState('Semua')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof?.role !== 'murid') { router.push('/dashboard'); return }
      setProfile(prof)
      const { data } = await supabase.from('modul_ajar').select('*').order('mata_pelajaran').order('urutan')
      setModul(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = filterMapel === 'Semua' ? modul : modul.filter(m => m.mata_pelajaran === filterMapel)
  const mapelTersedia = [...new Set(modul.map(m => m.mata_pelajaran))]

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-800 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/murid/dashboard')} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-navy-300 text-xs">SDN Pasirkaliki I</p>
          <h1 className="text-base font-bold">Modul Ajar</h1>
        </div>
      </header>

      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['Semua', ...mapelTersedia].map(m => (
            <button key={m} onClick={() => setFilterMapel(m)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                ${filterMapel === m ? 'bg-navy-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 space-y-3 pb-8">
        {filtered.length === 0 && (
          <div className="card text-center py-8">
            <BookOpen size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Belum ada modul ajar tersedia.</p>
          </div>
        )}
        {filtered.map(m => (
          <div key={m.id} className="card flex items-start gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">Modul {m.urutan || '-'} · {m.mata_pelajaran}</p>
              <p className="text-sm font-bold text-gray-800">{m.judul}</p>
              {m.deskripsi && <p className="text-xs text-gray-400 mt-1">{m.deskripsi}</p>}
              {m.file_url && (
                <div className="flex gap-3 mt-2">
                  <button onClick={() => router.push(`/modul/${m.id}/baca`)}
                    className="inline-flex items-center gap-1 text-xs text-navy-600 font-semibold hover:underline">
                    <BookOpen size={12} /> Baca
                  </button>
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-500 font-semibold hover:underline">
                    <Download size={12} /> Unduh
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
