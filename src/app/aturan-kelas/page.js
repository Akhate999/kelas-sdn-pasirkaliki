'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Plus, X, Save, ThumbsUp, ThumbsDown, ListChecks, Download } from 'lucide-react'

const KATEGORI = [
  { value: 'beriman', label: 'Beriman, Bertakwa & Berakhlak Mulia' },
  { value: 'kebinekaan', label: 'Berkebinekaan Global' },
  { value: 'gotong_royong', label: 'Bergotong Royong' },
  { value: 'mandiri', label: 'Mandiri' },
  { value: 'bernalar_kritis', label: 'Bernalar Kritis' },
  { value: 'kreatif', label: 'Kreatif' },
]
function labelKategori(val) { return KATEGORI.find(k => k.value === val)?.label || val }

const ATURAN_RESMI_SEKOLAH = [
  ['Terlambat Datang Ke Sekolah', 10, 'mandiri'],
  ['Meledek Dengan Nama Orang Tua', 15, 'beriman'],
  ['Meledek Guru/Teman', 25, 'beriman'],
  ['Keluar Gerbang Sekolah/Pulang Tanpa Izin', 20, 'mandiri'],
  ['Mencelakakan Teman', 25, 'beriman'],
  ['Tidak Membawa Perlengkapan Sekolah', 5, 'mandiri'],
  ['Tidak Berseragam Lengkap', 10, 'mandiri'],
  ['Berambut Gondrong', 15, 'mandiri'],
  ['Pornografi', 30, 'beriman'],
  ['Bawa Mainan / Barang Mewah', 25, 'mandiri'],
  ['Corat-Coret Fasilitas Sekolah/Vandalisme', 30, 'beriman'],
  ['Membuang Sampah Sembarangan', 20, 'gotong_royong'],
  ['Berlaku Tidak Sopan', 15, 'beriman'],
  ['Merusak Fasilitas Sekolah', 25, 'beriman'],
  ['Meminta-minta/Memalak Teman', 15, 'beriman'],
  ['Mengganggu Kelas Lain', 5, 'gotong_royong'],
  ['Merusak Barang Milik Orang Lain dengan Sengaja', 20, 'beriman'],
  ['Merokok & Membawa Rokok', 30, 'mandiri'],
  ['Tidak Piket Sesuai Jadwal', 20, 'gotong_royong'],
  ['Tidak Mengerjakan Tugas/PR', 15, 'mandiri'],
  ['Tidak Mengindahkan Bel Masuk', 10, 'mandiri'],
  ['Nongkrong/Diluar Saat Jam Pelajaran', 15, 'mandiri'],
  ['Berkelahi Dengan Teman', 30, 'beriman'],
]
const AMBANG_BATAS_PANGGIL_ORTU = 100

export default function AturanKelasPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [aturanList, setAturanList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [tab, setTab] = useState('positif')

  const [judul, setJudul] = useState('')
  const [jenisPoin, setJenisPoin] = useState('positif')
  const [poinAngka, setPoinAngka] = useState('1')
  const [kategori, setKategori] = useState('mandiri')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      if (kls) loadAturan(kls.id)
      setLoading(false)
    }
    load()
  }, [router])

  async function loadAturan(kelasId) {
    const { data } = await supabase.from('aturan_kelas').select('*').eq('kelas_id', kelasId).order('poin', { ascending: false })
    setAturanList(data || [])
  }

  function resetForm() { setJudul(''); setJenisPoin('positif'); setPoinAngka('1'); setKategori('mandiri') }

  async function handleSave() {
    if (!judul.trim()) { alert('Nama aturan harus diisi.'); return }
    setSaving(true)
    const poinFinal = jenisPoin === 'positif' ? Math.abs(parseInt(poinAngka) || 1) : -Math.abs(parseInt(poinAngka) || 1)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('aturan_kelas').insert({ kelas_id: kelas.id, judul: judul.trim(), poin: poinFinal, kategori, dibuat_oleh: user.id })
    setSaving(false); setShowForm(false); resetForm(); loadAturan(kelas.id)
  }

  async function handleDelete(id) {
    if (!confirm('Hapus aturan ini?')) return
    await supabase.from('aturan_kelas').delete().eq('id', id)
    loadAturan(kelas.id)
  }

  async function importAturanResmi() {
    if (!confirm(`Import ${ATURAN_RESMI_SEKOLAH.length} aturan resmi sekolah (Poin Pelanggaran Tata Tertib)?`)) return
    setImporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const judulSudahAda = new Set(aturanList.map(a => a.judul.toLowerCase()))
    const rows = ATURAN_RESMI_SEKOLAH
      .filter(([judul]) => !judulSudahAda.has(judul.toLowerCase()))
      .map(([judul, poin, kategori]) => ({ kelas_id: kelas.id, judul, poin: -Math.abs(poin), kategori, dibuat_oleh: user.id }))
    if (rows.length === 0) { alert('Semua aturan resmi sudah pernah diimpor.'); setImporting(false); return }
    await supabase.from('aturan_kelas').insert(rows)
    setImporting(false)
    loadAturan(kelas.id)
  }

  const aturanPositif = aturanList.filter(a => a.poin > 0)
  const aturanNegatif = aturanList.filter(a => a.poin < 0)
  const tampil = tab === 'positif' ? aturanPositif : aturanNegatif

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Aturan Kelas</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · Poin perilaku positif & negatif</p>
        </div>

        <div className="px-4 -mt-5 mb-4 space-y-2">
          <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus size={16} /> Tambah Aturan
          </button>
          <button onClick={importAturanResmi} disabled={importing}
            className="w-full py-3 flex items-center justify-center gap-2 bg-red-50 text-red-700 font-semibold rounded-lg border border-red-200 disabled:opacity-60">
            <Download size={16} /> {importing ? 'Mengimpor...' : `Import ${ATURAN_RESMI_SEKOLAH.length} Aturan Resmi Sekolah`}
          </button>
        </div>

        <div className="px-4 mb-4">
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
            <p className="text-orange-800 text-xs font-semibold">Ketentuan Sekolah:</p>
            <p className="text-orange-700 text-xs mt-0.5">Jika poin pelanggaran murid mencapai {AMBANG_BATAS_PANGGIL_ORTU}, akan dilakukan pemanggilan orang tua. Peringatan ini otomatis muncul di halaman Catatan Karakter.</p>
          </div>
        </div>

        <div className="bg-white border-b border-gray-100 flex">
          <button onClick={() => setTab('positif')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors
              ${tab === 'positif' ? 'text-green-700 border-green-600' : 'text-gray-400 border-transparent'}`}>
            <ThumbsUp size={16} /> Positif ({aturanPositif.length})
          </button>
          <button onClick={() => setTab('negatif')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors
              ${tab === 'negatif' ? 'text-red-600 border-red-500' : 'text-gray-400 border-transparent'}`}>
            <ThumbsDown size={16} /> Pelanggaran ({aturanNegatif.length})
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-navy-800">Tambah Aturan Kelas</h3>
                <button onClick={() => { setShowForm(false); resetForm() }}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setJenisPoin('positif')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1
                    ${jenisPoin === 'positif' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <ThumbsUp size={14} /> Positif
                </button>
                <button onClick={() => setJenisPoin('negatif')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1
                    ${jenisPoin === 'negatif' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <ThumbsDown size={14} /> Pelanggaran
                </button>
              </div>
              <div><label className="label">Nama Aturan / Perilaku</label>
                <input className="input" placeholder={jenisPoin === 'positif' ? 'Contoh: Membantu teman kesulitan' : 'Contoh: Mengganggu teman belajar'}
                  value={judul} onChange={e => setJudul(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Nilai Poin</label>
                  <input type="number" min="1" max="50" className="input" value={poinAngka} onChange={e => setPoinAngka(e.target.value)} />
                </div>
                <div><label className="label">Dimensi Profil Pelajar</label>
                  <select className="input" value={kategori} onChange={e => setKategori(e.target.value)}>
                    {KATEGORI.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Aturan'}
              </button>
            </div>
          </div>
        )}

        <div className="px-4 mt-4 space-y-2">
          {tampil.length === 0 && (
            <div className="card text-center py-8">
              <ListChecks size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Belum ada aturan {tab === 'positif' ? 'positif' : 'pelanggaran'}.</p>
            </div>
          )}
          {tampil.map(a => (
            <div key={a.id} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm
                ${a.poin > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {a.poin > 0 ? '+' : ''}{a.poin}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{a.judul}</p>
                <p className="text-xs text-gray-400">{labelKategori(a.kategori)}</p>
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0"><X size={16} /></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
