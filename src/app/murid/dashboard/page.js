'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { LogOut, Award, BarChart2, ClipboardList } from 'lucide-react'

export default function MuridDashboard() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [murid, setMurid]       = useState(null)
  const [kelas, setKelas]       = useState(null)
  const [absensi, setAbsensi]   = useState([])
  const [sumatif, setSumatif]   = useState([])
  const [formatif, setFormatif] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab] = useState('absensi')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof?.role !== 'murid') { router.push('/dashboard'); return }
      setProfile(prof)

      const { data: mrd } = await supabase.from('murid').select('*, kelas(*)').eq('user_id', prof.id).single()
      setMurid(mrd)
      setKelas(mrd?.kelas)

      const { data: abs } = await supabase.from('absensi').select('*').eq('murid_id', mrd.id).order('tanggal', { ascending: false }).limit(30)
      setAbsensi(abs || [])

      const { data: sum } = await supabase.from('penilaian_sumatif').select('*').eq('murid_id', mrd.id).order('tanggal', { ascending: false })
      setSumatif(sum || [])

      const { data: form } = await supabase.from('penilaian_formatif').select('*').eq('murid_id', mrd.id).order('tanggal', { ascending: false }).limit(20)
      setFormatif(form || [])

      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const rekapAbsen = { hadir: 0, sakit: 0, izin: 0, alpha: 0 }
  absensi.forEach(a => { rekapAbsen[a.status] = (rekapAbsen[a.status] || 0) + 1 })

  const STATUS_BADGE = {
    hadir: 'badge-hadir', sakit: 'badge-sakit', izin: 'badge-izin', alpha: 'badge-alpha'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy-800 text-white px-4 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-navy-300 text-xs">SDN Pasirkaliki 1</p>
            <h1 className="text-lg font-bold">{profile?.nama}</h1>
            <p className="text-navy-300 text-xs">{kelas?.nama} · {murid?.nis ? `NIS: ${murid.nis}` : ''}</p>
          </div>
          <button onClick={handleLogout} className="text-navy-400 hover:text-white p-1">
            <LogOut size={20} />
          </button>
        </div>

        {/* Rekap absensi */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Object.entries(rekapAbsen).map(([status, jml]) => (
            <div key={status} className="bg-navy-700 rounded-xl p-2 text-center">
              <p className="text-white font-bold text-lg">{jml}</p>
              <p className="text-navy-300 text-xs capitalize">{status}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-100 flex">
        {[['absensi','Absensi', ClipboardList],['nilai','Nilai', Award],['formatif','Formatif', BarChart2]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors border-b-2
              ${tab === key ? 'text-navy-700 border-navy-700' : 'text-gray-400 border-transparent'}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <main className="p-4 space-y-3 pb-8">
        {/* Tab Absensi */}
        {tab === 'absensi' && (
          <>
            <h3 className="text-sm font-semibold text-gray-600">Riwayat Kehadiran</h3>
            {absensi.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data kehadiran.</p>}
            {absensi.map(a => (
              <div key={a.id} className="card flex items-center justify-between">
                <p className="text-sm text-gray-700">{format(new Date(a.tanggal + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id })}</p>
                <span className={STATUS_BADGE[a.status]}>{a.status}</span>
              </div>
            ))}
          </>
        )}

        {/* Tab Nilai Sumatif */}
        {tab === 'nilai' && (
          <>
            <h3 className="text-sm font-semibold text-gray-600">Nilai Ujian & Ulangan</h3>
            {sumatif.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada nilai.</p>}
            {sumatif.map(s => (
              <div key={s.id} className="card flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center">
                  <span className="text-navy-700 font-bold text-lg">{s.nilai}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{s.mata_pelajaran}</p>
                  <p className="text-xs text-gray-500">{s.jenis} · {s.periode}</p>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Tab Formatif */}
        {tab === 'formatif' && (
          <>
            <h3 className="text-sm font-semibold text-gray-600">Penilaian Harian</h3>
            {formatif.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data.</p>}
            {formatif.map(f => (
              <div key={f.id} className="card">
                <p className="text-sm font-bold text-gray-800">{f.mata_pelajaran}</p>
                <p className="text-xs text-gray-500 mb-2">{f.topik} · {format(new Date(f.tanggal + 'T00:00:00'), 'd MMM yyyy', { locale: id })}</p>
                <div className="flex gap-2">
                  {[['Keaktifan', f.keaktifan],['Fokus', f.fokus],['Pemahaman', f.pemahaman]].map(([l, v]) => (
                    <div key={l} className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">{l}</p>
                      <p className="text-base font-bold text-navy-700">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  )
}
