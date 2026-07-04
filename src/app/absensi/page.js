'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Save, CheckCircle } from 'lucide-react'

const STATUS_OPTIONS = ['hadir', 'sakit', 'izin', 'alpha']
const STATUS_COLOR = {
  hadir: 'bg-green-500 text-white',
  sakit: 'bg-yellow-400 text-white',
  izin:  'bg-blue-500 text-white',
  alpha: 'bg-red-500 text-white',
}
const STATUS_INACTIVE = {
  hadir: 'bg-green-50 text-green-700 border border-green-200',
  sakit: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  izin:  'bg-blue-50 text-blue-700 border border-blue-200',
  alpha: 'bg-red-50 text-red-700 border border-red-200',
}

export default function AbsensiPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [muridList, setMuridList] = useState([])
  const [absensi, setAbsensi] = useState({})
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      if (kls) {
        const { data: murid } = await supabase.from('murid').select('*').eq('kelas_id', kls.id).order('nama')
        setMuridList(murid || [])
      }
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!kelas) return
    async function loadAbsensi() {
      const { data } = await supabase.from('absensi')
        .select('*').eq('kelas_id', kelas.id).eq('tanggal', tanggal)
      const map = {}
      ;(data || []).forEach(a => { map[a.murid_id] = a.status })
      // default semua hadir kalau belum ada
      muridList.forEach(m => { if (!map[m.id]) map[m.id] = 'hadir' })
      setAbsensi(map)
    }
    loadAbsensi()
  }, [tanggal, kelas, muridList])

  function setStatus(muridId, status) {
    setAbsensi(prev => ({ ...prev, [muridId]: status }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const rows = muridList.map(m => ({
      murid_id: m.id,
      kelas_id: kelas.id,
      tanggal,
      status: absensi[m.id] || 'hadir',
    }))
    const { error } = await supabase.from('absensi').upsert(rows, { onConflict: 'murid_id,tanggal' })
    setSaving(false)
    if (!error) setSaved(true)
  }

  const rekap = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = Object.values(absensi).filter(v => v === s).length
    return acc
  }, {})

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-24">
        {/* Header */}
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Absensi Harian</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · {format(new Date(tanggal + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id })}</p>
          <input
            type="date"
            value={tanggal}
            onChange={e => { setTanggal(e.target.value); setSaved(false) }}
            className="mt-3 bg-navy-700 text-white text-sm rounded-lg px-3 py-2 border border-navy-600 focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>

        {/* Rekap */}
        <div className="px-4 -mt-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 grid grid-cols-4 divide-x">
            {STATUS_OPTIONS.map(s => (
              <div key={s} className="p-2 text-center">
                <p className="text-lg font-bold text-gray-800">{rekap[s] || 0}</p>
                <p className="text-xs text-gray-500 capitalize">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* List murid */}
        <div className="px-4 mt-4 space-y-2">
          {muridList.map((m, idx) => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-bold text-sm flex-shrink-0">
                  {idx + 1}
                </div>
                <p className="text-sm font-semibold text-gray-800 flex-1">{m.nama}</p>
              </div>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(m.id, s)}
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-lg capitalize transition-all
                      ${absensi[m.id] === s ? STATUS_COLOR[s] : STATUS_INACTIVE[s]}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating save button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        {saved && (
          <p className="text-green-600 text-xs text-center mb-2 flex items-center justify-center gap-1">
            <CheckCircle size={14} /> Absensi berhasil disimpan
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Menyimpan...' : 'Simpan Absensi'}
        </button>
      </div>
    </div>
  )
}
