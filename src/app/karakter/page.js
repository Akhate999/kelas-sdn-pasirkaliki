'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, X, Save } from 'lucide-react'

const KATEGORI = [
  { value: 'beriman', label: 'Beriman, Bertakwa & Berakhlak Mulia' },
  { value: 'kebinekaan', label: 'Berkebinekaan Global' },
  { value: 'gotong_royong', label: 'Bergotong Royong' },
  { value: 'mandiri', label: 'Mandiri' },
  { value: 'bernalar_kritis', label: 'Bernalar Kritis' },
  { value: 'kreatif', label: 'Kreatif' },
]
const KATEGORI_COLOR = {
  beriman: 'bg-purple-100 text-purple-700',
  kebinekaan: 'bg-blue-100 text-blue-700',
  gotong_royong: 'bg-green-100 text-green-700',
  mandiri: 'bg-orange-100 text-orange-700',
  bernalar_kritis: 'bg-cyan-100 text-cyan-700',
  kreatif: 'bg-pink-100 text-pink-700',
}
function labelKategori(val) {
  return KATEGORI.find(k => k.value === val)?.label || val
}

export default function KarakterPage() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [kelas, setKelas]       = useState(null)
  const [muridList, setMuridList] = useState([])
  const [catatan, setCatatan]   = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [filterDimensi, setFilterDimensi] = useState('Semua')
  const [form, setForm] = useState({
    murid_id: '', tanggal: format(new Date(), 'yyyy-MM-dd'),
    kategori: 'beriman', catatan: ''
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
        loadCatatan(kls.id)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function loadCatatan(kelasId) {
    const { data } = await supabase.from('catatan_karakter')
      .select('*, murid(nama)').eq('kelas_id', kelasId)
      .order('tanggal', { ascending: false }).limit(50)
    setCatatan(data || [])
  }

  async function handleSave() {
    if (!form.murid_id || !form.catatan.trim()) return
    setSaving(true)
    await supabase.from('catatan_karakter').insert({ ...form, kelas_id: kelas.id })
    setSaving(false)
    setShowForm(false)
    setForm({ murid_id: '', tanggal: format(new Date(), 'yyyy-MM-dd'), kategori: 'beriman', catatan: '' })
    loadCatatan(kelas.id)
  }

  async function handleDelete(catatanId) {
    await supabase.from('catatan_karakter').delete().eq('id', catatanId)
    loadCatatan(kelas.id)
  }

  const filtered = filterDimensi === 'Semua' ? catatan : catatan.filter(c => c.kategori === filterDimensi)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Catatan Karakter</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · Profil Pelajar Pancasila</p>
        </div>

        <div className="px-4 -mt-5 mb-4">
          <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus size={16} /> Tambah Catatan
          </button>
        </div>

        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setFilterDimensi('Semua')}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                ${filterDimensi === 'Semua' ? 'bg-navy-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              Semua
            </button>
            {KATEGORI.map(k => (
              <button key={k.value} onClick={() => setFilterDimensi(k.value)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                  ${filterDimensi === k.value ? 'bg-navy-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-navy-800">Tambah Catatan Karakter</h3>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div>
                <label className="label">Murid</label>
                <select className="input" value={form.murid_id} onChange={e => setForm(p => ({ ...p, murid_id: e.target.value }))}>
                  <option value="">-- Pilih Murid --</option>
                  {muridList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tanggal</label>
                <input type="date" className="input" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} />
              </div>
              <div>
                <label className="label">Dimensi Profil Pelajar Pancasila</label>
                <select className="input" value={form.kategori} onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}>
                  {KATEGORI.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Catatan Kejadian</label>
                <textarea
                  className="input h-24 resize-none"
                  placeholder="Tuliskan kejadian spesifik yang diamati (bukan kesimpulan/label)..."
                  value={form.catatan}
                  onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
                />
                <p className="text-xs text-gray-400 mt-1">Contoh: &quot;Membantu teman mengerjakan tugas kelompok tanpa diminta&quot;</p>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
            </div>
          </div>
        )}

        <div className="px-4 space-y-3">
          {filtered.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Belum ada catatan karakter.</p>
              <p className="text-gray-300 text-xs mt-1">Tekan tombol di atas untuk menambahkan.</p>
            </div>
          )}
          {filtered.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-bold text-gray-800">{c.murid?.nama}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KATEGORI_COLOR[c.kategori]}`}>
                      {labelKategori(c.kategori)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {format(new Date(c.tanggal + 'T00:00:00'), 'd MMMM yyyy', { locale: id })}
                  </p>
                  <p className="text-sm text-gray-700">{c.catatan}</p>
                </div>
                <button onClick={() => handleDelete(c.id)} className="ml-3 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
