'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, X, Save, Download, Upload, AlertCircle, CheckCircle, Users, CreditCard, FileSpreadsheet } from 'lucide-react'
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
  const [buatAkunLoading, setBuatAkunLoading] = useState(false)
  const [akunResult, setAkunResult] = useState(null)
  const [tab, setTab] = useState('daftar')
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

  function downloadTemplate() {
    const template = [
      { 'Nama Lengkap': 'Contoh: Ahmad Fauzi', 'NISN': '0123456789', 'NIS': '2024001', 'Jenis Kelamin (L/P)': 'L', 'Tanggal Lahir (YYYY-MM-DD)': '2015-06-15' },
      { 'Nama Lengkap': 'Contoh: Siti Aminah', 'NISN': '0123456788', 'NIS': '2024002', 'Jenis Kelamin (L/P)': 'P', 'Tanggal Lahir (YYYY-MM-DD)': '2015-03-20' }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 22 }, { wch: 28 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data Murid')
    XLSX.writeFile(wb, `Template_Data_Murid_${kelas?.nama || 'Kelas'}.xlsx`)
  }

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
            tanggal_lahir: r['Tanggal Lahir (YYYY-MM-DD)'] ? String(r['Tanggal Lahir (YYYY-MM-DD)']).trim() : null,
            kelas_id: kelas.id
          })).filter(m => m.nama)
        if (muridBaru.length === 0) {
          setImportResult({ sukses: 0, error: 'Tidak ada data valid ditemukan.' })
          setImporting(false)
          return
        }
        const { error } = await supabase.from('murid').insert(muridBaru)
        if (error) {
          setImportResult({ sukses: 0, error: 'Gagal menyimpan. Pastikan format sesuai template.' })
        } else {
          setImportResult({ sukses: muridBaru.length, error: null })
          loadMurid(kelas.id)
        }
      } catch {
        setImportResult({ sukses: 0, error: 'File tidak dapat dibaca.' })
      }
      setImporting(false)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // Buat akun semua murid sekaligus
  async function handleBuatAkun() {
    if (!confirm(`Buat akun login untuk ${muridList.filter(m => !m.user_id).length} murid yang belum punya akun?`)) return
    setBuatAkunLoading(true)
    setAkunResult(null)
    try {
      const muridTanpaAkun = muridList.filter(m => !m.user_id)
      const res = await fetch('/api/murid-akun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muridList: muridTanpaAkun, kelasNama: kelas.nama })
      })
      const data = await res.json()
      const berhasil = data.hasil?.filter(h => h.status === 'berhasil').length || 0
      const error = data.hasil?.filter(h => h.status === 'error').length || 0
      setAkunResult({ berhasil, error, detail: data.hasil })
      loadMurid(kelas.id)
    } catch {
      setAkunResult({ berhasil: 0, error: 1, detail: [] })
    }
    setBuatAkunLoading(false)
  }

  // Export daftar akun ke Excel
  async function exportAkun() {
    const kelasSlug = kelas.nama.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    const rows = muridList.map((m, idx) => {
      const namaSlug = m.nama.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')
      const email = m.user_id
        ? `${namaSlug}.${kelasSlug}@sdn1pasirkaliki.id`
        : '(belum punya akun)'
      const password = `Sdn${m.nis || m.nisn || '12345'}!`
      return {
        'No': idx + 1,
        'Nama Murid': m.nama,
        'NIS': m.nis || '-',
        'NISN': m.nisn || '-',
        'Email Login': email,
        'Password': m.user_id ? password : '(belum punya akun)',
        'Status Akun': m.user_id ? '✓ Aktif' : '✗ Belum dibuat'
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 38 }, { wch: 18 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Akun Murid')
    XLSX.writeFile(wb, `Akun_Murid_${kelas.nama}.xlsx`)
  }

  // Cetak kartu pelajar dengan QR
  function cetakKartu() {
    const kelasSlug = kelas.nama.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    const muridAktif = muridList.filter(m => m.user_id)
    if (muridAktif.length === 0) {
      alert('Belum ada murid yang punya akun. Buat akun terlebih dahulu.')
      return
    }
    const kartuHTML = muridAktif.map(m => {
      const namaSlug = m.nama.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')
      const email = `${namaSlug}.${kelasSlug}@sdn1pasirkaliki.id`
      const password = `Sdn${m.nis || m.nisn || '12345'}!`
      const loginUrl = `https://kelas-sdn-pasirkaliki.vercel.app/login-qr?e=${encodeURIComponent(email)}&p=${encodeURIComponent(password)}`
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(loginUrl)}`
      return `
        <div class="kartu">
          <div class="kartu-header">
            <div class="sekolah-nama">SDN PASIRKALIKI I</div>
            <div class="kartu-judul">KARTU PELAJAR</div>
          </div>
          <div class="kartu-body">
            <div class="info">
              <div class="nama">${m.nama}</div>
              <div class="detail">Kelas: ${kelas.nama}</div>
              <div class="detail">NIS: ${m.nis || '-'}</div>
              <div class="detail">NISN: ${m.nisn || '-'}</div>
              <div class="detail tahun">Tahun Ajaran: ${kelas.tahun_ajaran}</div>
            </div>
            <div class="qr-section">
              <img src="${qrUrl}" alt="QR Login" />
              <div class="qr-label">Scan untuk login</div>
            </div>
          </div>
        </div>`
    }).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Kartu Pelajar ${kelas.nama}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #f0f0f0; padding: 20px; }
  h2 { text-align: center; margin-bottom: 20px; color: #1e3a5f; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 900px; margin: 0 auto; }
  .kartu { background: white; border-radius: 12px; overflow: hidden; border: 2px solid #1e3a5f; width: 100%; }
  .kartu-header { background: #1e3a5f; color: white; text-align: center; padding: 8px 4px; }
  .sekolah-nama { font-size: 9px; font-weight: bold; letter-spacing: 1px; }
  .kartu-judul { font-size: 11px; font-weight: bold; color: #f0c040; margin-top: 2px; }
  .kartu-body { display: flex; padding: 8px; gap: 8px; align-items: center; }
  .info { flex: 1; }
  .nama { font-size: 11px; font-weight: bold; color: #1e3a5f; margin-bottom: 4px; line-height: 1.3; }
  .detail { font-size: 9px; color: #555; margin-bottom: 2px; }
  .tahun { margin-top: 4px; }
  .qr-section { text-align: center; flex-shrink: 0; }
  .qr-section img { width: 80px; height: 80px; }
  .qr-label { font-size: 8px; color: #888; margin-top: 2px; }
  @media print {
    body { background: white; padding: 10px; }
    .grid { gap: 10px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="no-print" style="text-align:center;margin-bottom:16px">
  <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer">🖨️ Cetak Kartu</button>
</div>
<div class="grid">${kartuHTML}</div>
</body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  const sudahAkun = muridList.filter(m => m.user_id).length
  const belumAkun = muridList.filter(m => !m.user_id).length

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Data Murid</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · {muridList.length} Murid Terdaftar</p>
        </div>

        {/* Tab navigasi */}
        <div className="bg-white border-b border-gray-100 flex -mt-0">
          {[['daftar','Daftar Murid', Users],['akun','Kelola Akun', CreditCard]].map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors
                ${tab === key ? 'text-navy-700 border-navy-700' : 'text-gray-400 border-transparent'}`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </div>

        {/* Tab Daftar Murid */}
        {tab === 'daftar' && (
          <div className="px-4 mt-4 space-y-3">
            <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              <Plus size={16} /> Tambah Murid Satu per Satu
            </button>
            <button onClick={downloadTemplate} className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
              <Download size={16} /> Download Template Excel
            </button>
            <label className="cursor-pointer">
              <div className="w-full py-3 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition-colors">
                <Upload size={16} />{importing ? 'Mengimpor...' : 'Import dari Excel'}
              </div>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
            {importResult && (
              <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm
                ${importResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                {importResult.error ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> : <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />}
                <p>{importResult.error || `${importResult.sukses} murid berhasil diimpor!`}</p>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-blue-800 text-xs font-semibold mb-1">Cara import data murid:</p>
              <ol className="text-blue-700 text-xs space-y-0.5 list-decimal list-inside">
                <li>Download Template Excel</li>
                <li>Isi data murid (hapus baris contoh)</li>
                <li>Simpan file, lalu tekan Import dari Excel</li>
              </ol>
            </div>
            <div className="space-y-2 mt-2">
              {muridList.length === 0 && (
                <div className="card text-center py-8">
                  <p className="text-gray-400 text-sm">Belum ada data murid.</p>
                </div>
              )}
              {muridList.map((m, idx) => (
                <div key={m.id} className="card flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm
                    ${m.jenis_kelamin === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-800">{m.nama}</p>
                      {m.user_id && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">akun ✓</span>}
                    </div>
                    <p className="text-xs text-gray-500">
                      {m.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                      {m.tanggal_lahir ? ` · ${format(new Date(m.tanggal_lahir + 'T00:00:00'), 'd MMM yyyy', { locale: id })}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      {m.nisn ? `NISN: ${m.nisn}` : ''}{m.nisn && m.nis ? ' · ' : ''}{m.nis ? `NIS: ${m.nis}` : ''}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(m.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Kelola Akun */}
        {tab === 'akun' && (
          <div className="px-4 mt-4 space-y-3">
            {/* Rekap status akun */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card text-center">
                <p className="text-2xl font-bold text-green-600">{sudahAkun}</p>
                <p className="text-xs text-gray-500">Sudah punya akun</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-bold text-orange-500">{belumAkun}</p>
                <p className="text-xs text-gray-500">Belum punya akun</p>
              </div>
            </div>

            {/* Tombol aksi */}
            {belumAkun > 0 && (
              <button onClick={handleBuatAkun} disabled={buatAkunLoading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Users size={16} />
                {buatAkunLoading ? 'Membuat akun...' : `Buat Akun untuk ${belumAkun} Murid`}
              </button>
            )}

            {akunResult && (
              <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm
                ${akunResult.error > 0 && akunResult.berhasil === 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p>{akunResult.berhasil} akun berhasil dibuat{akunResult.error > 0 ? `, ${akunResult.error} gagal` : ''}.</p>
              </div>
            )}

            <button onClick={exportAkun} className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
              <FileSpreadsheet size={16} /> Export Daftar Akun (Excel)
            </button>

            <button onClick={cetakKartu} className="w-full py-3 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-sm transition-colors">
              <CreditCard size={16} /> Cetak Kartu Pelajar + QR Code
            </button>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-blue-800 text-xs font-semibold mb-1">Format akun murid:</p>
              <p className="text-blue-700 text-xs">Email: <span className="font-mono">nama.kelas@sdn1pasirkaliki.id</span></p>
              <p className="text-blue-700 text-xs">Password: <span className="font-mono">Sdn[NIS]!</span> (contoh: Sdn242501001!)</p>
            </div>
          </div>
        )}
      </main>

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
              <input className="input" placeholder="Nama murid" value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">NISN</label>
                <input className="input" placeholder="Nomor Induk Nasional" value={form.nisn} onChange={e => setForm(p => ({ ...p, nisn: e.target.value }))} />
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
    </div>
  )
}
