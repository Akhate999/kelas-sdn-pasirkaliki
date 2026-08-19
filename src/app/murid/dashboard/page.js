'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { LogOut, Award, BarChart2, ClipboardList, BookMarked, BookOpen, ChevronDown, ChevronUp, Star, Heart } from 'lucide-react'

const STATUS_BADGE = { hadir: 'badge-hadir', sakit: 'badge-sakit', izin: 'badge-izin', alpha: 'badge-alpha' }
const SKALA_COLOR = { 1: 'text-red-600', 2: 'text-yellow-600', 3: 'text-blue-600', 4: 'text-green-600' }
const KATEGORI_LABEL = {
  keimanan: 'Keimanan & Ketakwaan', kewargaan: 'Kewargaan',
  kolaborasi: 'Kolaborasi', kemandirian: 'Kemandirian',
  penalaran_kritis: 'Penalaran Kritis', kreativitas: 'Kreativitas',
  kesehatan: 'Kesehatan', komunikasi: 'Komunikasi',
}

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
  const [karakter, setKarakter] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab] = useState('poin')
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

      const [{ data: abs }, { data: sum }, { data: form }, { data: bab }, { data: kar }] = await Promise.all([
        supabase.from('absensi').select('*').eq('murid_id', mrd.id).order('tanggal', { ascending: false }).limit(30),
        supabase.from('penilaian_sumatif').select('*').eq('murid_id', mrd.id).order('tanggal', { ascending: false }),
        supabase.from('penilaian_formatif').select('*').eq('murid_id', mrd.id).order('tanggal', { ascending: false }),
        supabase.from('bab_pembelajaran').select('*').eq('kelas_id', mrd.kelas_id).eq('status', 'selesai').order('created_at', { ascending: false }),
        supabase.from('catatan_karakter').select('*').eq('murid_id', mrd.id).order('tanggal', { ascending: false }),
      ])
      setAbsensi(abs || []); setSumatif(sum || []); setFormatif(form || []); setBabList(bab || []); setKarakter(kar || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() { await supabase.auth.signOut(); router.push('/') }

  const rekapAbsen = { hadir: 0, sakit: 0, izin: 0, alpha: 0 }
  absensi.forEach(a => { rekapAbsen[a.status] = (rekapAbsen[a.status] || 0) + 1 })

  const nilaiPerMapel = sumatif.reduce((acc, s) => { (acc[s.mata_pelajaran] ??= []).push(s); return acc }, {})
  const formatifPerMapel = formatif.reduce((acc, f) => { (acc[f.mata_pelajaran] ??= []).push(f); return acc }, {})

  const karakterBerPoin = karakter.filter(k => k.poin !== null && k.poin !== undefined)
  const totalPoin = karakterBerPoin.reduce((s, k) => s + k.poin, 0)
  const poinPositif = karakterBerPoin.filter(k => k.poin > 0)
  const poinPerlu = karakterBerPoin.filter(k => k.poin < 0)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-800 text-white px-4 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-navy-300 text-xs">SDN Pasirkaliki I</p>
            <h1 className="text-lg font-bold">{profile?.nama}</h1>
            <p className="text-navy-300 text-xs">{kelas?.nama}{murid?.nis ? ` · NIS: ${murid.nis}` : ''}</p>
          </div>
          <button onClick={handleLogout} className="text-navy-400 hover:text-white p-1"><LogOut size={20} /></button>
        </div>

        <button onClick={() => router.push('/murid/modul')}
          className="mt-4 w-full bg-navy-700 hover:bg-navy-600 transition-colors rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-gold-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen size={18} className="text-navy-900" />
          </div>
          <div className="text-left flex-1">
            <p className="text-white text-sm font-semibold">Modul Ajar</p>
            <p className="text-navy-300 text-xs">Baca buku pelajaran</p>
          </div>
        </button>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {Object.entries(rekapAbsen).map(([status, jml]) => (
            <div key={status} className="bg-navy-700 rounded-xl p-2 text-center">
              <p className="text-white font-bold text-lg">{jml}</p>
              <p className="text-navy-300 text-xs capitalize">{status}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 flex overflow-x-auto">
        {[['poin','Poin Karakter', Star],['nilai','Nilai', Award],['bab','Per Bab', BookMarked],['absensi','Absensi', ClipboardList],['proses','Proses', BarChart2]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold border-b-2 transition-colors flex-shrink-0 px-2
              ${tab === key ? 'text-navy-700 border-navy-700' : 'text-gray-400 border-transparent'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      <main className="p-4 space-y-3 pb-8">

        {/* Tab Poin Karakter */}
        {tab === 'poin' && (
          <>
            <div className="bg-gradient-to-br from-navy-700 to-navy-800 rounded-2xl p-5 text-center text-white">
              <Star size={28} className="mx-auto mb-2 text-gold-400" fill="#f0c040" />
              <p className="text-3xl font-bold">{totalPoin >= 0 ? totalPoin : 0}</p>
              <p className="text-navy-200 text-xs mt-1">Poin Karakter Terkumpul</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card text-center bg-green-50 border-green-100">
                <p className="text-xl font-bold text-green-600">{poinPositif.length}</p>
                <p className="text-xs text-green-700">Perilaku Baik</p>
              </div>
              <div className="card text-center bg-orange-50 border-orange-100">
                <p className="text-xl font-bold text-orange-500">{poinPerlu.length}</p>
                <p className="text-xs text-orange-700">Bisa Diperbaiki</p>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-600 pt-2">Kejadian Terbaru</h3>
            {karakterBerPoin.length === 0 && (
              <div className="card text-center py-6">
                <Heart size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Belum ada catatan poin.</p>
              </div>
            )}
            {karakterBerPoin.slice(0, 15).map(k => (
              <div key={k.id} className="card flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs
                  ${k.poin > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                  {k.poin > 0 ? '+' : ''}{k.poin}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{k.catatan}</p>
                  <p className="text-xs text-gray-400">{KATEGORI_LABEL[k.kategori] || k.kategori} · {format(new Date(k.tanggal + 'T00:00:00'), 'd MMM yyyy', { locale: id })}</p>
                </div>
              </div>
            ))}
          </>
        )}

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

        {tab === 'bab' && (
          <>
            {babList.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Belum ada bab yang selesai.</p>}
            {babList.map(b => {
              const nilaiMapel = sumatif.filter(s => s.mata_pelajaran === b.mata_pelajaran)
              const formatifMapel = formatif.filter(f => f.mata_pelajaran === b.mata_pelajaran && f.tanggal >= b.tanggal_mulai && f.tanggal <= (b.tanggal_selesai || '9999'))
              const isOpen = expandedBab === b.id
              const avgPemahaman = formatifMapel.length > 0 ? (formatifMapel.reduce((s, f) => s + f.pemahaman, 0) / formatifMapel.length).toFixed(1) : null
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
                        <div><p className="text-xs font-semibold text-gray-600 mb-1">Nilai Evaluasi</p>
                          {nilaiMapel.map(n => (
                            <div key={n.id} className="flex items-center justify-between">
                              <p className="text-xs text-gray-500">{n.jenis}</p><NilaiChip nilai={n.nilai} />
                            </div>
                          ))}
                        </div>
                      )}
                      {avgPemahaman && (
                        <div><p className="text-xs font-semibold text-gray-600 mb-1">Rata-rata Pemahaman</p>
                          <p className="text-sm font-bold text-navy-700">{avgPemahaman}/4</p></div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

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
