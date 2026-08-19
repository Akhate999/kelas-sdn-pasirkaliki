'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { BookOpen, ChevronRight, ListTree } from 'lucide-react'

const MAPEL = ['Pendidikan Agama','PPKn','Bahasa Indonesia','Matematika','IPAS','PJOK','Seni Budaya','Bahasa Inggris','Muatan Lokal']

export default function PembelajaranPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [babList, setBabList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterMapel, setFilterMapel] = useState('Semua')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      if (kls) {
        const { data: bab } = await supabase.from('bab_pembelajaran').select('*, kerangka:kerangka_bab_id(sub_bab)').eq('kelas_id', kls.id).order('created_at', { ascending: false })
        setBabList(bab || [])
      }
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = filterMapel === 'Semua' ? babList : babList.filter(b => b.mata_pelajaran === filterMapel)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Pembelajaran</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · Pencatatan tiap sub-bab & evaluasi bab</p>
        </div>

        <div className="px-4 -mt-5 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">Pilih bab yang sedang/sudah diajarkan untuk mencatat perkembangan tiap sub-bab (kehadiran, formatif, DPL, pengayaan/remedial) dan evaluasi sumatif di akhir bab.</p>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['Semua', ...MAPEL].map(m => (
              <button key={m} onClick={() => setFilterMapel(m)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                  ${filterMapel === m ? 'bg-navy-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{m}</button>
            ))}
          </div>
        </div>

        <div className="px-4 space-y-3">
          {filtered.length === 0 && (
            <div className="card text-center py-8">
              <BookOpen size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Belum ada bab pembelajaran.</p>
              <button onClick={() => router.push('/bab')} className="text-xs text-navy-600 underline mt-2">Buat bab dulu di menu Bab & Laporan</button>
            </div>
          )}
          {filtered.map(b => {
            const jumlahSubBab = b.kerangka?.sub_bab?.length || 0
            return (
              <button key={b.id} onClick={() => router.push(`/pembelajaran/${b.id}`)}
                className="card w-full flex items-center gap-3 text-left hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ListTree size={18} className="text-navy-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.status === 'selesai' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {b.status === 'selesai' ? '✓ Selesai' : '● Berlangsung'}
                    </span>
                    <span className="text-xs text-gray-400">{b.mata_pelajaran}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800">Bab {b.nomor_bab}: {b.judul_bab}</p>
                  <p className="text-xs text-gray-400">
                    {jumlahSubBab > 0 ? `${jumlahSubBab} sub-bab` : 'Belum tertaut Kerangka Bab'}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
