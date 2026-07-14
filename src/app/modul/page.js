'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Plus, X, Upload, FileText, Download, BookOpen } from 'lucide-react'

const MAPEL = ['Pendidikan Agama','PPKn','Bahasa Indonesia','Matematika','IPA','IPS','PJOK','Seni Budaya','Bahasa Inggris','Muatan Lokal']

export default function ModulPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [modul, setModul]     = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filterMapel, setFilterMapel] = useState('Semua')
  const [form, setForm] = useState({ judul: '', mata_pelajaran: 'Matematika', tingkat: '', urutan: '1', deskripsi: '' })
  const [file, setFile] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      loadModul()
      setLoading(false)
    }
    load()
  }, [router])

  async function loadModul() {
    const { data } = await supabase.from('modul_ajar').select('*').order('mata_pelajaran').order('urutan')
    setModul(data || [])
  }

  async function handleUpload() {
    if (!form.judul.trim()) return
    setUploading(true)
    let fileUrl = null
    if (file) {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}_${form.judul.replace(/\s+/g,'_')}.${ext}`
      const { error: uploadError } = await supabase.storage.from('modul-ajar').upload(fileName, file)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('modul-ajar').getPublicUrl(fileName)
        fileUrl = urlData.publicUrl
      }
    }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('modul_ajar').insert({
      ...form,
      tingkat: form.tingkat ? parseInt(form.tingkat) : null,
      urutan: parseInt(form.urutan) || 1,
      file_url: fileUrl,
      uploaded_by: user.id
    })
    setUploading(false)
    setShowForm(false)
    setForm({ judul: '', mata_pelajaran: 'Matematika', tingkat: '', urutan: '1', deskripsi: '' })
    setFile(null)
    loadModul()
  }

  async function handleDelete(modulId, fileUrl) {
    if (!confirm('Hapus modul ini?')) return
    if (fileUrl) {
      const fileName = fileUrl.split('/').pop()
      await supabase.storage.from('modul-ajar').remove([fileName])
    }
    await supabase.from('modul_ajar').delete().eq('id', modulId)
    loadModul()
  }

  const filtered = filterMapel === 'Semua' ? modul : modul.filter(m => m.mata_pelajaran === filterMapel)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Modul Ajar</h2>
          <p className="text-navy-300 text-xs">Buku & Bahan Ajar Digital</p>
        </div>

        <div className="px-4 -mt-5 mb-4 space-y-2">
          <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus size={16} /> Upload Modul Baru
          </button>
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

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-navy-800">Upload Modul Ajar</h3>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div>
                <label className="label">Judul Modul</label>
                <input className="input" placeholder="Contoh: Bilangan Cacah" value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Mata Pelajaran</label>
                  <select className="input" value={form.mata_pelajaran} onChange={e => setForm(p => ({ ...p, mata_pelajaran: e.target.value }))}>
                    {MAPEL.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Untuk Kelas</label>
                  <select className="input" value={form.tingkat} onChange={e => setForm(p => ({ ...p, tingkat: e.target.value }))}>
                    <option value="">Semua</option>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Kelas {n}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Modul ke- (urutan tampil)</label>
                <input type="number" min="1" className="input" placeholder="1" value={form.urutan} onChange={e => setForm(p => ({ ...p, urutan: e.target.value }))} />
                <p className="text-xs text-gray-400 mt-1">Menentukan urutan modul di daftar isi e-book</p>
              </div>
              <div>
                <label className="label">Deskripsi (opsional)</label>
                <textarea className="input h-20 resize-none" value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} />
              </div>
              <div>
                <label className="label">File PDF</label>
                <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-navy-300 transition-colors">
                  <Upload size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-500">{file ? file.name : 'Pilih file PDF'}</span>
                  <input type="file" className="hidden" accept=".pdf" onChange={e => setFile(e.target.files[0])} />
                </label>
              </div>
              <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Upload size={16} /> {uploading ? 'Mengupload...' : 'Simpan Modul'}
              </button>
            </div>
          </div>
        )}

        <div className="px-4 space-y-3">
          {filtered.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Belum ada modul ajar.</p>
            </div>
          )}
          {filtered.map(m => (
            <div key={m.id} className="card flex items-start gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Modul {m.urutan || '-'}</p>
                <p className="text-sm font-bold text-gray-800">{m.judul}</p>
                <p className="text-xs text-gray-500">{m.mata_pelajaran}{m.tingkat ? ` · Kelas ${m.tingkat}` : ''}</p>
                {m.deskripsi && <p className="text-xs text-gray-400 mt-1">{m.deskripsi}</p>}
                <div className="flex gap-3 mt-2">
                  {m.file_url && (
                    <>
                      <button onClick={() => router.push(`/modul/${m.id}/baca`)}
                        className="inline-flex items-center gap-1 text-xs text-navy-600 font-semibold hover:underline">
                        <BookOpen size={12} /> Baca
                      </button>
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gray-500 font-semibold hover:underline">
                        <Download size={12} /> Unduh
                      </a>
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(m.id, m.file_url)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
