'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, X, Save, Download, Upload, AlertCircle, CheckCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function MuridPage() {
  const router = useRouter()
  const [profile, setProfile]     = useState(null)
  const [kelas, setKelas]         = useState(null)
  const [muridList, setMuridList] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
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

  // Download template Excel
  function downloadTemplate() {
    const template = [
      {
        'Nama Lengkap': 'Contoh: Ahmad Fauzi',
        'NISN': '0123456789',
        'NIS': '2024001',
        'Jenis Kelamin (L/P)': 'L',
        'Tanggal Lahir (YYYY-MM-DD)': '2015-06-15'
      },
      {
        'Nama Lengkap': 'Contoh: Siti Aminah',
        'NISN': '0123456788',
        'NIS': '2024002',
        'Jenis Kelamin (L/P)': 'P',
        'Tanggal Lahir (YYYY-MM-DD)': '2015-03-20'
      }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    ws['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 12 },
      { wch: 22 }, { wch: 28 }
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data Murid')
    XLSX.writeFile(wb, `Template_Data_Murid_${kelas?.nama || 'Kelas'}.xlsx`)
  }

  // Import dari Excel
  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)

        const muridBaru = rows
          .filter(r => r['Nama Lengkap'] && !String(r['Nama Lengkap']).startsWith('Contoh:'))
          .map(r => ({
            nama: String(r['Nama Lengkap'] || '').trim(),
            nisn: String(r['NISN'] || '').trim() || null,
            nis: String(r['NIS'] || '').trim() || null,
            jenis_kelamin: String(r['Jenis Kelamin (L/P)'] || 'L').trim().toUpperCase() === 'P' ? 'P' : 'L',
            tanggal_lahir: r['Tanggal Lahir (YYYY-MM-DD)']
              ? String(r['Tanggal Lahir (YYYY-MM-DD)']).trim()
              : null,
            kelas_id: kelas.id
          }))
          .filter(m => m.nama)

        if (muridBaru.length === 0) {
          setImportResult({ sukses: 0, error: 'Tidak ada data murid valid ditemukan di file.' })
          setImporting(false)
          return
        }

        const { error } = await supabase.from('murid').insert(muridBaru)
        if (error) {
          setImportResult({ sukses: 0, error: 'Gagal menyimpan data. Pastikan format file sesuai template.' })
        } else {
          setImportResult({ sukses: muridBaru.length, error: null })
          loadMurid(kelas.id)
        }
      } catch (err) {
        setImportResult({ sukses: 0, error: 'File tidak dapat dibaca. Gunakan template yang sudah diunduh.' })
      }
      setImporting(false)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Memuat...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Data Murid</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · {muridList.length} Murid Terdaftar</p>
        </div>

        <div className="px-4 -mt-5 mb-4 space-y-2">
          {/* Tombol tambah satu per satu */}
          <button onClick={() => setShowForm(true)}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus size={16} /> Tambah Murid Satu per Satu
          </button>

          {/* Tombol download template */}
          <button onClick={downloadTemplate}
            className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
            <Download size={16} /> Download Template Excel
          </button>

          {/* Tombol upload/import */}
          <label className="cursor-pointer">
            <div className="w-full py-3 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition-colors">
              <Upload size={16} />
              {importing ? 'Mengimpor...' : 'Import dari Excel'}
            </div>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>

          {/* Hasil import */}
          {importResult && (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm
              ${importResult.error
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-green-50 border border-green-200 text-green-700'}`}
            >
              {importResult.error
                ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                : <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />}
              <p>{importResult.error || `${importResult.sukses} murid berhasil diimpor!`}</p>
            </div>
          )}
        </div>

        {/* Panduan singkat */}
        <div className="px-4 mb-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <p className="text-blue-800 text-xs font-semibold mb-1">Cara import data murid:</p>
            <ol className="text-blue-700 text-xs space-y-0.5 list-decimal list-inside">
              <li>Download Template Excel</li>
              <li>Isi data murid sesuai format (hapus baris contoh)</li>
              <li>Simpan file, lalu tekan Import dari Excel</li>
            </ol>
          </div>
        </div>

        {/* Form tambah manual */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-navy-800">Tambah Data Murid</h3>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div>
                <label className="label">Nama Lengkap</label>
                <input className="input" placeholder="Nama murid"
                  value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">NISN</label>
                  <input className="input" placeholder="Nomor Induk Nasional"
                    value={form.nisn} onChange={e => setForm(p => ({ ...p, nisn: e.target.value }))} />
                </div>
                <div>
                  <label className="label">NIS</label>
                  <input className="input" placeholder="Nomor Induk Sekolah"
                    value={form.nis} onChange={e => setForm(p => ({ ...p, nis: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Jenis Kelamin</label>
                  <select className="input" value={form.jenis_kelamin}
                    onChange={e => setForm(p => ({ ...p, jenis_kelamin: e.target.value }))}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tanggal Lahir</label>
                  <input type="date" className="input" value={form.tanggal_lahir}
                    onChange={e => setForm(p => ({ ...p, tanggal_lahir: e.target.value }))} />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Data Murid'}
              </button>
            </div>
          </div>
        )}

        {/* Daftar murid */}
        <div className="px-4 space-y-2">
          {muridList.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Belum ada data murid.</p>
              <p className="text-gray-300 text-xs mt-1">Tambah satu per satu atau import dari Excel.</p>
            </div>
          )}
          {muridList.map((m, idx) => (
            <div key={m.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm
                ${m.jenis_kelamin === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}">
                {idx + 1}
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
