'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronDown, ChevronUp, User } from 'lucide-react'

const SKALA_LABEL = { 1: 'Kurang', 2: 'Cukup', 3: 'Baik', 4: 'Sangat Baik' }
const SKALA_COLOR = { 1: 'text-red-600', 2: 'text-yellow-600', 3: 'text-blue-600', 4: 'text-green-600' }

function NilaiBar({ nilai }) {
  const pct = (nilai / 100) * 100
  const color = nilai >= 90 ? 'bg-green-500' : nilai >= 75 ? 'bg-blue-500' : nilai >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700 w-8 text-right">{nilai}</span>
    </div>
  )
}

export default function RekapBabPage() {
  const router = useRouter()
  const params = useParams()
  const babId = params.id

  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [bab, setBab]         = useState(null)
  const [muridList, setMuridList] = useState([])
  const [rekapData, setRekapData] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      const { data: babData } = await supabase.from('bab_pembelajaran').select('*').eq('id', babId).single()
      setBab(babData)
      if (kls && babData) {
        const { data: murid } = await supabase.from('murid').select('*').eq('kelas_id', kls.id).order('nama')
        setMuridList(murid || [])
        await loadSemuaRekap(murid || [], babData)
      }
      setLoading(false)
    }
    load()
  }, [babId, router])

  async function loadSemuaRekap(murid, babData) {
    const tglMulai = babData.tanggal_mulai
    const tglSelesai = babData.tanggal_selesai || format(new Date(), 'yyyy-MM-dd')
    const rekap = {}
    for (const m of murid) {
      const [{ data: absensi }, { data: formatif }, { data: sumatif }, { data: karakter }] = await Promise.all([
        supabase.from('absensi').select('*').eq('murid_id', m.id).gte('tanggal', tglMulai).lte('tanggal', tglSelesai),
        supabase.from('penilaian_formatif').select('*').eq('murid_id', m.id).eq('mata_pelajaran', babData.mata_pelajaran).gte('tanggal', tglMulai).lte('tanggal', tglSelesai),
        supabase.from('penilaian_sumatif').select('*').eq('murid_id', m.id).eq('mata_pelajaran', babData.mata_pelajaran),
        supabase.from('catatan_karakter').select('*').eq('murid_id', m.id).gte('tanggal', tglMulai).lte('tanggal', tglSelesai),
      ])
      const totalHari = (absensi || []).length
      const hadir = (absensi || []).filter(a => a.status === 'hadir').length
      const sakit = (absensi || []).filter(a => a.status === 'sakit').length
      const izin = (absensi || []).filter(a => a.status === 'izin').length
      const alpha = (absensi || []).filter(a => a.status === 'alpha').length
      const avg = (arr, key) => arr?.length > 0 ? (arr.reduce((s, f) => s + (f[key] || 0), 0) / arr.length) : null
      rekap[m.id] = {
        absensi: { totalHari, hadir, sakit, izin, alpha },
        formatif: {
          keaktifan: avg(formatif, 'keaktifan'),
          fokus: avg(formatif, 'fokus'),
          pemahaman: avg(formatif, 'pemahaman'),
          jumlahPertemuan: (formatif || []).length
        },
        sumatif: sumatif || [],
        karakter: karakter || [],
      }
    }
    setRekapData(rekap)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat rekap...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <p className="text-navy-300 text-xs">{bab?.mata_pelajaran} · Rekap Per Murid</p>
          <h2 className="text-white font-bold text-lg">Bab {bab?.nomor_bab}: {bab?.judul_bab}</h2>
          <p className="text-navy-400 text-xs mt-1">
            {bab?.tanggal_mulai && format(new Date(bab.tanggal_mulai + 'T00:00:00'), 'd MMM', { locale: id })}
            {bab?.tanggal_selesai && ` – ${format(new Date(bab.tanggal_selesai + 'T00:00:00'), 'd MMM yyyy', { locale: id })}`}
          </p>
        </div>

        <div className="px-4 mt-4 space-y-3">
          {muridList.map((m, idx) => {
            const r = rekapData[m.id]
            const isOpen = expanded === m.id
            if (!r) return null

            const nilaiEval = r.sumatif.find(s => s.jenis === 'Ulangan Harian') || r.sumatif[0]
            const pctHadir = r.absensi.totalHari > 0 ? Math.round((r.absensi.hadir / r.absensi.totalHari) * 100) : 0

            return (
              <div key={m.id} className="card overflow-hidden">
                {/* Header murid */}
                <button className="w-full flex items-center gap-3 text-left" onClick={() => setExpanded(isOpen ? null : m.id)}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm
                    ${m.jenis_kelamin === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{m.nama}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500">Hadir: <span className="font-semibold text-green-600">{r.absensi.hadir}/{r.absensi.totalHari}</span></span>
                      {nilaiEval && <span className="text-xs text-gray-500">Nilai: <span className="font-semibold text-navy-600">{nilaiEval.nilai}</span></span>}
                      {r.formatif.pemahaman && <span className="text-xs text-gray-500">Pemahaman: <span className="font-semibold text-blue-600">{parseFloat(r.formatif.pemahaman).toFixed(1)}/4</span></span>}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                </button>

                {/* Detail rekap */}
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-4">

                    {/* Kehadiran */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Kehadiran ({pctHadir}%)</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[['Hadir', r.absensi.hadir, 'bg-green-50 text-green-700'],
                          ['Sakit', r.absensi.sakit, 'bg-yellow-50 text-yellow-700'],
                          ['Izin', r.absensi.izin, 'bg-blue-50 text-blue-700'],
                          ['Alpha', r.absensi.alpha, 'bg-red-50 text-red-700']].map(([label, val, cls]) => (
                          <div key={label} className={`rounded-lg p-2 text-center ${cls}`}>
                            <p className="text-lg font-bold">{val}</p>
                            <p className="text-xs">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Penilaian Formatif */}
                    {r.formatif.jumlahPertemuan > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Penilaian Proses ({r.formatif.jumlahPertemuan} pertemuan)</p>
                        <div className="space-y-2">
                          {[['Keaktifan', r.formatif.keaktifan], ['Fokus', r.formatif.fokus], ['Pemahaman', r.formatif.pemahaman]].map(([label, val]) => (
                            <div key={label} className="flex items-center gap-2">
                              <p className="text-xs text-gray-500 w-20">{label}</p>
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div className="h-2 rounded-full bg-navy-500" style={{ width: `${(val / 4) * 100}%` }} />
                              </div>
                              <span className={`text-xs font-bold w-12 text-right ${SKALA_COLOR[Math.round(val)]}`}>
                                {val ? parseFloat(val).toFixed(1) : '-'} ({SKALA_LABEL[Math.round(val)]})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nilai Sumatif */}
                    {r.sumatif.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Nilai Evaluasi</p>
                        <div className="space-y-2">
                          {r.sumatif.map(s => (
                            <div key={s.id}>
                              <div className="flex justify-between mb-1">
                                <p className="text-xs text-gray-600">{s.jenis}</p>
                              </div>
                              <NilaiBar nilai={s.nilai} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Catatan Karakter */}
                    {r.karakter.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Catatan Karakter ({r.karakter.length})</p>
                        <div className="space-y-1">
                          {r.karakter.map(c => (
                            <div key={c.id} className="flex items-start gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 capitalize
                                ${c.kategori === 'disiplin' ? 'bg-blue-100 text-blue-700' :
                                  c.kategori === 'akhlak' ? 'bg-green-100 text-green-700' :
                                  'bg-purple-100 text-purple-700'}`}>
                                {c.kategori}
                              </span>
                              <p className="text-xs text-gray-600">{c.catatan}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tombol aksi */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => router.push(`/bab/${babId}/laporan`)}
                        className="flex-1 text-xs py-2 rounded-lg bg-navy-50 text-navy-700 font-semibold border border-navy-200">
                        Buat Laporan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
