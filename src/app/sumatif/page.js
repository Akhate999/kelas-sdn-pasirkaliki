'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, X, Save } from 'lucide-react'

const MAPEL = ['Pendidikan Agama','PPKn','Bahasa Indonesia','Matematika','IPA','IPS','PJOK','Seni Budaya','Bahasa Inggris','Muatan Lokal']
const JENIS = ['Ulangan Harian','UTS','UAS','Lainnya']

function nilaiColor(n) {
  if (n >= 90) return 'text-green-600 font-bold'
  if (n >= 75) return 'text-blue-600 font-bold'
  if (n >= 60) return 'text-yellow-600 font-bold'
  return 'text-red-600 font-bold'
}

export default function SumatifPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [muridList, setMuridList] = useState([])
  const [penilaian, setPenilaian] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [filterMapel, setFilterMapel] = useState('Semua')
  const [form, setForm] = useState({
    murid_id: '', tanggal: format(new Date(), 'yyyy-MM-dd'),
    mata_pelajaran: 'Matematika', jenis: 'Ulangan Harian',
    nilai: '', periode: 'Semester 1 2025/2026', catatan: ''
  })

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
        loadData(kls.id)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function loadData(kelasId) {
    const { data } = await supabase.from('penilaian_sumatif')
      .select('*, murid(nama)').eq('kelas_id', kelasId)
      .order('tanggal', { ascending: false })
    setPenilaian(data || [])
  }

  async function handleSave() {
    if (!form.murid_id || !form.nilai) return
    setSaving(true)
    await supabase.from('penilaian_sumatif').insert({
      ...form, nilai: parseFloat(form.nilai), kelas_id: kelas.id
    })
    setSaving(false)
    setShowForm(false)
    setForm({ murid_id: '', tanggal: format(new Date(), 'yyyy-MM-dd'), mata_pelajaran: 'Matematika', jenis: 'Ulangan Harian', nilai: '', periode: 'Semester 1 2025/2026', catatan: '' })
    loadData(kelas.id)
  }

  const filtered = filterMapel === 'Semua' ? penilaian : penilaian.filter(p => p.mata_pelajaran === filterMapel)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Penilaian Sumatif</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · Ulangan & Ujian</p>
        </div>

        <div className="px-4 -mt-5 mb-4 space-y-2">
          <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus size={16} /> Tambah Nilai
          </button>
          {/* Filter mapel */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['Semua', ...MAPEL].map(m => (
              <button key={m} onClick={() => setFilterMapel(m)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                  ${filterMapel === m ? 'bg-navy-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-navy-800">Tambah Nilai Sumatif</h3>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
              </div>

              <div>
                <label className="label">Murid</label>
                <select className="input" value={form.murid_id} onChange={e => setForm(p => ({ ...p, murid_id: e.target.value }))}>
                  <option value="">-- Pilih Murid --</option>
                  {muridList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Mata Pelajaran</label>
                  <select className="input" value={form.mata_pelajaran} onChange={e => setForm(p => ({ ...p, mata_pelajaran: e.target.value }))}>
                    {MAPEL.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Jenis</label>
                  <select className="input" value={form.jenis} onChange={e => setForm(p => ({ ...p, jenis: e.target.value }))}>
                    {JENIS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nilai (0–100)</label>
                  <input type="number" min="0" max="100" className="input" placeholder="85" value={form.nilai} onChange={e => setForm(p => ({ ...p, nilai: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Tanggal</label>
                  <input type="date" className="input" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Periode</label>
                <input className="input" placeholder="Semester 1 2025/2026" value={form.periode} onChange={e => setForm(p => ({ ...p, periode: e.target.value }))} />
              </div>
              <div>
                <label className="label">Catatan (opsional)</label>
                <textarea className="input h-20 resize-none" value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Nilai'}
              </button>
            </div>
          </div>
        )}

        <div className="px-4 space-y-2">
          {filtered.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Belum ada nilai sumatif.</p>
            </div>
          )}
          {filtered.map(p => (
            <div key={p.id} className="card flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                <span className={`text-xl ${nilaiColor(p.nilai)}`}>{p.nilai}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{p.murid?.nama}</p>
                <p className="text-xs text-gray-500">{p.mata_pelajaran} · {p.jenis}</p>
                <p className="text-xs text-gray-400">{p.periode}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
