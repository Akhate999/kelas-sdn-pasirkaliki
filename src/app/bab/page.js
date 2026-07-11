'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, X, Save, BookOpen, CheckCircle, ChevronRight } from 'lucide-react'

const MAPEL = ['Pendidikan Agama','PPKn','Bahasa Indonesia','Matematika','IPA','IPS','PJOK','Seni Budaya','Bahasa Inggris','Muatan Lokal']

export default function BabPage() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [kelas, setKelas]       = useState(null)
  const [babList, setBabList]   = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [filterMapel, setFilterMapel] = useState('Semua')
  const [form, setForm] = useState({
    mata_pelajaran: 'Matematika', nomor_bab: '1', judul_bab: '',
    tanggal_mulai: format(new Date(), 'yyyy-MM-dd'),
    tanggal_selesai: '', semester: 'Semester 1', tahun_ajaran: '2025/2026',
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
        setForm(f => ({ ...f, tahun_ajaran: kls.tahun_ajaran || '2025/2026' }))
        loadBab(kls.id)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function loadBab(kelasId) {
    const { data } = await supabase.from('bab_pembelajaran')
      .select('*').eq('kelas_id', kelasId)
      .order('created_at', { ascending: false })
    setBabList(data || [])
  }

  async function handleSave() {
    if (!form.judul_bab.trim()) {
      alert('Judul bab harus diisi.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('bab_pembelajaran').insert({
      mata_pelajaran: form.mata_pelajaran,
      nomor_bab: parseInt(form.nomor_bab) || 1,
      judul_bab: form.judul_bab.trim(),
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai || null,
      semester: form.semester,
      tahun_ajaran: form.tahun_ajaran || kelas?.tahun_ajaran || '2025/2026',
      kelas_id: kelas.id,
      status: 'berlangsung'
    })
    if (error) {
      alert('Gagal menyimpan: ' + error.message)
      setSaving(false)
      return
    }
    setSaving(false)
    setShowForm(false)
    setForm({ mata_pelajaran: 'Matematika', nomor_bab: '1', judul_bab: '', tanggal_mulai: format(new Date(), 'yyyy-MM-dd'), tanggal_selesai: '', semester: 'Semester 1', tahun_ajaran: kelas?.tahun_ajaran || '2025/2026' })
    loadBab(kelas.id)
  }

  async function selesaikanBab(babId) {
    await supabase.from('bab_pembelajaran').update({ status: 'selesai', tanggal_selesai: format(new Date(), 'yyyy-MM-dd') }).eq('id', babId)
    loadBab(kelas.id)
  }

  async function handleDelete(babId) {
    if (!confirm('Hapus bab ini?')) return
    await supabase.from('bab_pembelajaran').delete().eq('id', babId)
    loadBab(kelas.id)
  }

  const filtered = filterMapel === 'Semua' ? babList : babList.filter(b => b.mata_pelajaran === filterMapel)
  const berlangsung = babList.filter(b => b.status === 'berlangsung').length
  const selesai = babList.filter(b => b.status === 'selesai').length

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Bab Pembelajaran</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · Kelola bab per mata pelajaran</p>
        </div>

        <div className="px-4 -mt-5 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 grid grid-cols-2 divide-x">
            <div className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{berlangsung}</p>
              <p className="text-xs text-gray-500">Sedang Berlangsung</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{selesai}</p>
              <p className="text-xs text-gray-500">Selesai</p>
            </div>
          </div>
        </div>

        <div className="px-4 mb-3">
          <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus size={16} /> Tambah Bab Baru
          </button>
        </div>

        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['Semua', ...MAPEL].map(m => (
              <button key={m} onClick={() => setFilterMapel(m)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                  ${filterMapel === m ? 'bg-navy-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 space-y-3">
          {filtered.length === 0 && (
            <div className="card text-center py-8">
              <BookOpen size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Belum ada bab pembelajaran.</p>
            </div>
          )}
          {filtered.map(b => (
            <div key={b.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                      ${b.status === 'selesai' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {b.status === 'selesai' ? '✓ Selesai' : '● Berlangsung'}
                    </span>
                    <span className="text-xs text-gray-400">{b.mata_pelajaran}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800">Bab {b.nomor_bab}: {b.judul_bab}</p>
                  <p className="text-xs text-gray-400 mt-1">{b.semester} · {b.tahun_ajaran}</p>
                  <p className="text-xs text-gray-400">
                    Mulai: {format(new Date(b.tanggal_mulai + 'T00:00:00'), 'd MMM yyyy', { locale: id })}
                    {b.tanggal_selesai ? ` · Selesai: ${format(new Date(b.tanggal_selesai + 'T00:00:00'), 'd MMM yyyy', { locale: id })}` : ''}
                  </p>
                </div>
                <button onClick={() => handleDelete(b.id)} className="text-gray-300 hover:text-red-400 ml-2 flex-shrink-0">
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                {b.status === 'berlangsung' && (
                  <button onClick={() => selesaikanBab(b.id)}
                    className="flex-1 text-xs py-2 rounded-lg bg-green-50 text-green-700 font-semibold border border-green-200 flex items-center justify-center gap-1">
                    <CheckCircle size={12} /> Tandai Selesai
                  </button>
                )}
                <button onClick={() => router.push(`/bab/${b.id}/laporan`)}
                  className="flex-1 text-xs py-2 rounded-lg bg-navy-50 text-navy-700 font-semibold border border-navy-200 flex items-center justify-center gap-1">
                  <ChevronRight size={12} /> Buat Laporan
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-navy-800">Tambah Bab Pembelajaran</h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div>
              <label className="label">Mata Pelajaran</label>
              <select className="input" value={form.mata_pelajaran} onChange={e => setForm(p => ({ ...p, mata_pelajaran: e.target.value }))}>
                {MAPEL.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nomor Bab</label>
                <input type="number" className="input" placeholder="1" min="1"
                  value={form.nomor_bab} onChange={e => setForm(p => ({ ...p, nomor_bab: e.target.value }))} />
              </div>
              <div>
                <label className="label">Semester</label>
                <select className="input" value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}>
                  <option>Semester 1</option>
                  <option>Semester 2</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Judul Bab</label>
              <input className="input" placeholder="Contoh: Rumah dan Lingkunganku"
                value={form.judul_bab} onChange={e => setForm(p => ({ ...p, judul_bab: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tanggal Mulai</label>
              <input type="date" className="input" value={form.tanggal_mulai}
                onChange={e => setForm(p => ({ ...p, tanggal_mulai: e.target.value }))} />
            </div>
            <button onClick={handleSave} disabled={saving}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
              <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Bab'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
