'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, X, Save, ChevronDown } from 'lucide-react'

const KATEGORI = ['disiplin', 'akhlak', 'sosial', 'lainnya']
const KATEGORI_COLOR = {
  disiplin: 'bg-blue-100 text-blue-700',
  akhlak:   'bg-green-100 text-green-700',
  sosial:   'bg-purple-100 text-purple-700',
  lainnya:  'bg-gray-100 text-gray-700',
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
  const [form, setForm] = useState({
    murid_id: '', tanggal: format(new Date(), 'yyyy-MM-dd'),
    kategori: 'disiplin', catatan: ''
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
    await supabase.from('catatan_karakter').insert({
      ...form, kelas_id: kelas.id
    })
    setSaving(false)
    setShowForm(false)
    setForm({ murid_id: '', tanggal: format(new Date(), 'yyyy-MM-dd'), kategori: 'disiplin', catatan: '' })
    loadCatatan(kelas.id)
  }

  async function handleDelete(catatanId) {
    await supabase.from('catatan_karakter').delete().eq('id', catatanId)
    loadCatatan(kelas.id)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Catatan Karakter</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · Disiplin & Akhlak Murid</p>
        </div>

        <div className="px-4 -mt-5 mb-4">
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Tambah Catatan
          </button>
        </div>

        {/* Form tambah catatan */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4">
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
                <label className="label">Kategori</label>
                <select className="input" value={form.kategori} onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}>
                  {KATEGORI.map(k => <option key={k} value={k} className="capitalize">{k}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Catatan</label>
                <textarea
                  className="input h-24 resize-none"
                  placeholder="Tuliskan catatan karakter murid..."
                  value={form.catatan}
                  onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
                />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
            </div>
          </div>
        )}

        {/* List catatan */}
        <div className="px-4 space-y-3">
          {catatan.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Belum ada catatan karakter.</p>
              <p className="text-gray-300 text-xs mt-1">Tekan tombol di atas untuk menambahkan.</p>
            </div>
          )}
          {catatan.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-800">{c.murid?.nama}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${KATEGORI_COLOR[c.kategori]}`}>
                      {c.kategori}
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
