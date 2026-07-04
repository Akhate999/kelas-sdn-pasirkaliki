'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, X, Save, User } from 'lucide-react'

export default function MuridPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [muridList, setMuridList] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({
    nama: '', nisn: '', nis: '', jenis_kelamin: 'L', tanggal_lahir: ''
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      if (kls) loadMurid(kls.id)
      setLoading(false)
    }
    load()
  }, [router])

  async function loadMurid(kelasId) {
    const { data } = await supabase.from('murid').select('*').eq('kelas_id', kelasId).order('nama')
    setMuridList(data || [])
  }

  async function handleSave() {
    if (!form.nama.trim()) return
    setSaving(true)
    await supabase.from('murid').insert({ ...form, kelas_id: kelas.id })
    setSaving(false)
    setShowForm(false)
    setForm({ nama: '', nisn: '', nis: '', jenis_kelamin: 'L', tanggal_lahir: '' })
    loadMurid(kelas.id)
  }

  async function handleDelete(muridId) {
    if (!confirm('Hapus data murid ini?')) return
    await supabase.from('murid').delete().eq('id', muridId)
    loadMurid(kelas.id)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Data Murid</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · {muridList.length} Murid Terdaftar</p>
        </div>

        <div className="px-4 -mt-5 mb-4">
          <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus size={16} /> Tambah Murid
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-navy-800">Tambah Data Murid</h3>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div>
                <label className="label">Nama Lengkap</label>
                <input className="input" placeholder="Nama murid" value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">NISN</label>
                  <input className="input" placeholder="Nomor Induk Siswa Nasional" value={form.nisn} onChange={e => setForm(p => ({ ...p, nisn: e.target.value }))} />
                </div>
                <div>
                  <label className="label">NIS</label>
                  <input className="input" placeholder="Nomor Induk Sekolah" value={form.nis} onChange={e => setForm(p => ({ ...p, nis: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Jenis Kelamin</label>
                  <select className="input" value={form.jenis_kelamin} onChange={e => setForm(p => ({ ...p, jenis_kelamin: e.target.value }))}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tanggal Lahir</label>
                  <input type="date" className="input" value={form.tanggal_lahir} onChange={e => setForm(p => ({ ...p, tanggal_lahir: e.target.value }))} />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Data Murid'}
              </button>
            </div>
          </div>
        )}

        <div className="px-4 space-y-2">
          {muridList.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Belum ada data murid.</p>
              <p className="text-gray-300 text-xs mt-1">Tekan tombol di atas untuk menambahkan.</p>
            </div>
          )}
          {muridList.map((m, idx) => (
            <div key={m.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0">
                <span className="text-navy-700 font-bold text-sm">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{m.nama}</p>
                <p className="text-xs text-gray-500">
                  {m.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                  {m.tanggal_lahir ? ` · ${format(new Date(m.tanggal_lahir + 'T00:00:00'), 'd MMM yyyy', { locale: id })}` : ''}
                </p>
                <p className="text-xs text-gray-400">
                  {m.nisn ? `NISN: ${m.nisn}` : ''}
                  {m.nisn && m.nis ? ' · ' : ''}
                  {m.nis ? `NIS: ${m.nis}` : ''}
                </p>
              </div>
              <button onClick={() => handleDelete(m.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
