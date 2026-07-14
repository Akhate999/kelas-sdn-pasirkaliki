'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { LogOut, Award, BarChart2, ClipboardList, BookMarked, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_BADGE = {
  hadir: 'badge-hadir', sakit: 'badge-sakit', izin: 'badge-izin', alpha: 'badge-alpha'
}
const SKALA_COLOR = { 1: 'text-red-600', 2: 'text-yellow-600', 3: 'text-blue-600', 4: 'text-green-600' }

function NilaiChip({ nilai }) {
  const color = nilai >= 90 ? 'bg-green-100 text-green-700' : nilai >= 75 ? 'bg-blue-100 text-blue-700' : nilai >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${color}`}>{nilai}</span>
}

export default function MuridDashboard() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [murid, setMurid]       = useState(null)
  const [kelas, setKelas]       = useState(null)
  const [absensi, setAbsensi]   = useState([])
  const [sumatif, setSumatif]   = useState([])
  const [formatif, setFormatif] = useState([])
  const [babList, setBabList]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab] = useState('nilai')
  const [expandedBab, setExpandedBab] = useState(null)

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
      const [{ data: abs }, { data: sum }, { data: form }, { data: bab }] = await Promise.all([
        supabase.from('absensi').select('*').eq('murid_id', mrd.id).order('tanggal', { ascending: false }).limit(30),
        supabase.from('penilaian_sumatif').select('*').eq('murid_id', mrd.id).order('tanggal', { ascending: false }),
        supabase.from('penilaian_formatif').select('*').eq('murid_id', mrd.id).order('tanggal', { ascending: false }),
        supabase.from('bab_pembelajaran').select('*').eq('kelas_id', mrd.kelas_id).eq('status', 'selesai').order('created_at', { ascending: false }),
      ])
      setAbsensi(abs || [])
      setSumatif(sum || [])
      setFormatif(form || [])
      setBabList(bab || [])
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

  // Kelompokkan nilai per mapel
  const nilaiPerMapel = sumatif.reduce((acc, s) => {
    if (!acc[s.mata_pelajaran]) acc[s.mata_pelajaran] = []
    acc[s.mata_pelajaran].push(s)
    return acc
  }, {})

  // Kelompokkan formatif per mapel
  const formatifPerMapel = formatif.reduce((acc, f) => {
    if (!acc[f.mata_pelajaran]) acc[f.mata_pelajaran] = []
    acc[f.mata_pelajaran].push(f)
    return acc
  }, {})

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy-800 text-white px-4 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-navy-300 text-xs">SDN Pasirkaliki I</p>
            <h1 className="text-lg font-bold">{profile?.nama}</h1>
            <p className="text-navy-300 text-xs">{kelas?.nama}{murid?.nis ? ` · NIS: ${murid.nis}` : ''}</p>
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

      {/* Tab navigasi */}
      <div className="bg-white border-b border-gray-100 flex">
        {[['nilai','Nilai', Award],['bab','Per Bab', BookMarked],['absensi','Absensi', ClipboardList],['proses','Proses', BarChart2]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold border-b-2 transition-colors
              ${tab === key ? 'text-navy-700 border-navy-700' : 'text-gray-400 border-transparent'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      <main className="p-4 space-y-3 pb-8">

        {/* Tab Nilai per Mapel */}
        {tab === 'nilai' && (
          <>
            {Object.keys(nilaiPerMapel).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada nilai.</p>}
            {Object.entries(nilaiPerMapel).map(([mapel, nilaiList]) => {
              const rata = (nilaiList.reduce((s, n) => s + n.nilai, 0) / nilaiList.length).toFixed(1)
              return (
                <div key={mapel} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-800">{mapel}</p>
                    <NilaiChip nilai={parseFloat(rata)} />
                  </div>
                  <div className="space-y-1">
                    {nilaiList.map(n => (
                      <div key={n.id} className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">{n.jenis}{n.periode ? ` · ${n.periode}` : ''}</p>
                        <NilaiChip nilai={n.nilai} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Tab Rekap Per Bab */}
        {tab === 'bab' && (
          <>
            {babList.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada bab yang selesai.</p>}
            {babList.map(b => {
              const nilaiMapel = sumatif.filter(s => s.mata_pelajaran === b.mata_pelajaran)
              const formatifMapel = formatif.filter(f => f.mata_pelajaran === b.mata_pelajaran &&
                f.tanggal >= b.tanggal_mulai && f.tanggal <= (b.tanggal_selesai || '9999'))
              const isOpen = expandedBab === b.id
              const avgPemahaman = formatifMapel.length > 0
                ? (formatifMapel.reduce((s, f) => s + f.pemahaman, 0) / formatifMapel.length).toFixed(1) : null
              return (
                <div key={b.id} className="card">
                  <button className="w-full flex items-center justify-between text-left" onClick={() => setExpandedBab(isOpen ? null : b.id)}>
                    <div>
                      <p className="text-xs text-gray-400">{b.mata_pelajaran}</p>
                      <p className="text-sm font-bold text-gray-800">Bab {b.nomor_bab}: {b.judul_bab}</p>
                      <p className="text-xs text-gray-400">{b.semester} · {b.tahun_ajaran}</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                      {nilaiMapel.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Nilai Evaluasi</p>
                          {nilaiMapel.map(n => (
                            <div key={n.id} className="flex items-center justify-between">
                              <p className="text-xs text-gray-500">{n.jenis}</p>
                              <NilaiChip nilai={n.nilai} />
                            </div>
                          ))}
                        </div>
                      )}
                      {avgPemahaman && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Rata-rata Pemahaman</p>
                          <p className="text-sm font-bold text-navy-700">{avgPemahaman}/4</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* Tab Absensi */}
        {tab === 'absensi' && (
          <>
            {absensi.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data kehadiran.</p>}
            {absensi.map(a => (
              <div key={a.id} className="card flex items-center justify-between">
                <p className="text-sm text-gray-700">{format(new Date(a.tanggal + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id })}</p>
                <span className={STATUS_BADGE[a.status]}>{a.status}</span>
              </div>
            ))}
          </>
        )}

        {/* Tab Proses (Formatif) */}
        {tab === 'proses' && (
          <>
            {Object.keys(formatifPerMapel).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada data.</p>}
            {Object.entries(formatifPerMapel).map(([mapel, fList]) => {
              const avgK = (fList.reduce((s, f) => s + f.keaktifan, 0) / fList.length).toFixed(1)
              const avgF = (fList.reduce((s, f) => s + f.fokus, 0) / fList.length).toFixed(1)
              const avgP = (fList.reduce((s, f) => s + f.pemahaman, 0) / fList.length).toFixed(1)
              return (
                <div key={mapel} className="card">
                  <p className="text-sm font-bold text-gray-800 mb-3">{mapel}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Keaktifan', avgK], ['Fokus', avgF], ['Pemahaman', avgP]].map(([l, v]) => (
                      <div key={l} className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-gray-500">{l}</p>
                        <p className={`text-lg font-bold ${SKALA_COLOR[Math.round(v)]}`}>{v}</p>
                        <p className="text-xs text-gray-400">/4</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </main>
    </div>
  )
}
