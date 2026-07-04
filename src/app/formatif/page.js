'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, X, Save } from 'lucide-react'

const MAPEL = ['Pendidikan Agama','PPKn','Bahasa Indonesia','Matematika','IPA','IPS','PJOK','Seni Budaya','Bahasa Inggris','Muatan Lokal']
const SKALA = [
  { value: 1, label: '1 - Kurang' },
  { value: 2, label: '2 - Cukup' },
  { value: 3, label: '3 - Baik' },
  { value: 4, label: '4 - Sangat Baik' },
]
const SKALA_COLOR = ['','bg-red-100 text-red-700','bg-yellow-100 text-yellow-700','bg-blue-100 text-blue-700','bg-green-100 text-green-700']

export default function FormatifPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [muridList, setMuridList] = useState([])
  const [penilaian, setPenilaian] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({
    murid_id: '', tanggal: format(new Date(), 'yyyy-MM-dd'),
    mata_pelajaran: 'Matematika', topik: '',
    keaktifan: 3, fokus: 3, pemahaman: 3, catatan: ''
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
    const { data } = await supabase.from('penilaian_formatif')
      .select('*, murid(nama)').eq('kelas_id', kelasId)
      .order('tanggal', { ascending: false }).limit(50)
    setPenilaian(data || [])
  }

  async function handleSave() {
    if (!form.murid_id) return
    setSaving(true)
    await supabase.from('penilaian_formatif').insert({ ...form, kelas_id: kelas.id })
    setSaving(false)
    setShowForm(false)
    setForm({ murid_id: '', tanggal: format(new Date(), 'yyyy-MM-dd'), mata_pelajaran: 'Matematika', topik: '', keaktifan: 3, fokus: 3, pemahaman: 3, catatan: '' })
    loadData(kelas.id)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Penilaian Formatif</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · Keaktifan, Fokus & Pemahaman</p>
        </div>

        <div className="px-4 -mt-5 mb-4">
          <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus size={16} /> Tambah Penilaian
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end overflow-y-auto">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-navy-800">Tambah Penilaian Formatif</h3>
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
                  <label className="label">Tanggal</label>
                  <input type="date" className="input" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Mata Pelajaran</label>
                  <select className="input" value={form.mata_pelajaran} onChange={e => setForm(p => ({ ...p, mata_pelajaran: e.target.value }))}>
                    {MAPEL.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Topik / Materi</label>
                <input className="input" placeholder="Contoh: Perkalian Pecahan" value={form.topik} onChange={e => setForm(p => ({ ...p, topik: e.target.value }))} />
              </div>

              {[['keaktifan','Keaktifan'],['fokus','Fokus'],['pemahaman','Pemahaman']].map(([field, label]) => (
                <div key={field}>
                  <label className="label">{label}</label>
                  <div className="flex gap-2">
                    {SKALA.map(s => (
                      <button key={s.value} onClick={() => setForm(p => ({ ...p, [field]: s.value }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all
                          ${form[field] === s.value ? SKALA_COLOR[s.value] + ' border-transparent' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                      >
                        {s.value}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{SKALA.find(s => s.value === form[field])?.label}</p>
                </div>
              ))}

              <div>
                <label className="label">Catatan (opsional)</label>
                <textarea className="input h-20 resize-none" placeholder="Catatan tambahan..." value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Penilaian'}
              </button>
            </div>
          </div>
        )}

        <div className="px-4 space-y-3">
          {penilaian.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Belum ada penilaian formatif.</p>
            </div>
          )}
          {penilaian.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-gray-800">{p.murid?.nama}</p>
                  <p className="text-xs text-gray-500">{p.mata_pelajaran} · {p.topik}</p>
                  <p className="text-xs text-gray-400">{format(new Date(p.tanggal + 'T00:00:00'), 'd MMM yyyy', { locale: id })}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[['Keaktifan', p.keaktifan],['Fokus', p.fokus],['Pemahaman', p.pemahaman]].map(([label, val]) => (
                  <span key={label} className={`text-xs px-2 py-1 rounded-lg font-semibold ${SKALA_COLOR[val]}`}>
                    {label}: {val}
                  </span>
                ))}
              </div>
              {p.catatan && <p className="text-xs text-gray-500 mt-2">{p.catatan}</p>}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
