'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Plus, X, Upload, FileText, Download, Sparkles, Save, Loader, Printer } from 'lucide-react'

const MAPEL = ['Pendidikan Agama','PPKn','Bahasa Indonesia','Matematika','IPAS','PJOK','Seni Budaya','Bahasa Inggris','Muatan Lokal']
const ROMAWI = { 1:'I', 2:'II', 3:'III', 4:'IV', 5:'V', 6:'VI' }
function getFase(tingkat) {
  if (tingkat <= 2) return 'A'
  if (tingkat <= 4) return 'B'
  return 'C'
}
function adaLkpd(teks) {
  if (!teks) return false
  return !/tidak ada lkpd/i.test(teks.trim())
}

function RPPContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const kerangkaIdFromUrl = searchParams.get('kerangkaId')

  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [rppList, setRppList] = useState([])
  const [kerangkaList, setKerangkaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null)
  const [filterMapel, setFilterMapel] = useState('Semua')

  const [judul, setJudul] = useState('')
  const [mapel, setMapel] = useState('Matematika')
  const [tingkat, setTingkat] = useState('')
  const [fileRpp, setFileRpp] = useState(null)
  const [jumlahLkpd, setJumlahLkpd] = useState('1')
  const [lkpdList, setLkpdList] = useState([{ file: null, deskripsi: '' }])
  const [uploading, setUploading] = useState(false)

  const [aiMapel, setAiMapel] = useState('Matematika')
  const [aiKerangkaId, setAiKerangkaId] = useState('')
  const [aiSubBabIdx, setAiSubBabIdx] = useState('')
  const [aiTujuan, setAiTujuan] = useState('')
  const [aiKondisi, setAiKondisi] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHasilRpp, setAiHasilRpp] = useState('')
  const [aiHasilLkpd, setAiHasilLkpd] = useState('')
  const [aiSaving, setAiSaving] = useState(false)
  const [aiError, setAiError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      loadRpp()
      const { data: kerangka } = await supabase.from('modul_bab').select('*').order('mata_pelajaran').order('nomor_bab')
      setKerangkaList(kerangka || [])
      if (kerangkaIdFromUrl) {
        const k = (kerangka || []).find(x => x.id === kerangkaIdFromUrl)
        if (k) { setMode('ai'); setAiMapel(k.mata_pelajaran); setAiKerangkaId(k.id) }
      }
      setLoading(false)
    }
    load()
  }, [router, kerangkaIdFromUrl])

  async function loadRpp() {
    const { data } = await supabase.from('rpp').select('*').order('created_at', { ascending: false })
    setRppList(data || [])
  }

  function handleJumlahLkpdChange(val) {
    setJumlahLkpd(val)
    const n = Math.max(0, parseInt(val) || 0)
    setLkpdList(prev => {
      const list = [...prev]
      while (list.length < n) list.push({ file: null, deskripsi: '' })
      while (list.length > n) list.pop()
      return list
    })
  }
  function updateLkpd(index, field, value) {
    setLkpdList(prev => { const list = [...prev]; list[index] = { ...list[index], [field]: value }; return list })
  }
  function resetUploadForm() {
    setJudul(''); setMapel('Matematika'); setTingkat(''); setFileRpp(null)
    setJumlahLkpd('1'); setLkpdList([{ file: null, deskripsi: '' }])
  }
  function resetAiForm() {
    setAiKerangkaId(''); setAiSubBabIdx(''); setAiTujuan(''); setAiKondisi('')
    setAiHasilRpp(''); setAiHasilLkpd(''); setAiError('')
  }

  async function handleUploadRpp() {
    if (!judul.trim()) { alert('Judul RPP harus diisi.'); return }
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    let fileRppUrl = null
    if (fileRpp) {
      const ext = fileRpp.name.split('.').pop()
      const fileName = `rpp_${Date.now()}_${judul.replace(/\s+/g,'_')}.${ext}`
      const { error } = await supabase.storage.from('modul-ajar').upload(fileName, fileRpp)
      if (!error) { const { data: urlData } = supabase.storage.from('modul-ajar').getPublicUrl(fileName); fileRppUrl = urlData.publicUrl }
    }
    const lkpdData = []
    for (let i = 0; i < lkpdList.length; i++) {
      const item = lkpdList[i]
      if (!item.file) continue
      const ext = item.file.name.split('.').pop()
      const fileName = `lkpd_${Date.now()}_${i}_${judul.replace(/\s+/g,'_')}.${ext}`
      const { error } = await supabase.storage.from('modul-ajar').upload(fileName, item.file)
      if (!error) { const { data: urlData } = supabase.storage.from('modul-ajar').getPublicUrl(fileName); lkpdData.push({ url: urlData.publicUrl, deskripsi: item.deskripsi }) }
    }
    await supabase.from('rpp').insert({
      judul, mata_pelajaran: mapel, tingkat: tingkat ? parseInt(tingkat) : null,
      jenis: 'upload', file_rpp_url: fileRppUrl, lkpd: lkpdData, uploaded_by: user.id
    })
    setUploading(false); setMode(null); resetUploadForm(); loadRpp()
  }

  async function handleBuatAI() {
    const kerangka = kerangkaList.find(k => k.id === aiKerangkaId)
    if (!kerangka) { alert('Pilih Kerangka Bab terlebih dahulu.'); return }
    if (aiSubBabIdx === '') { alert('Pilih Sub-Bab yang akan dibuatkan RPP.'); return }
    const subBab = kerangka.sub_bab[parseInt(aiSubBabIdx)]
    setAiLoading(true); setAiError(''); setAiHasilRpp(''); setAiHasilLkpd('')

    const fase = getFase(kerangka.tingkat)
    const romawi = ROMAWI[kerangka.tingkat] || kerangka.tingkat
    const tahunSekarang = new Date().getFullYear()
    const totalSubBab = kerangka.sub_bab.length
    const nomorPertemuan = parseInt(aiSubBabIdx) + 1

    const prompt = `Kamu adalah ahli pendidikan yang membantu guru SD menyusun Perencanaan Pembelajaran Mendalam (PPM) sesuai kurikulum terbaru.

Berikut kerangka Bab yang menjadi acuan:
- Mata Pelajaran: ${kerangka.mata_pelajaran}
- Kelas: ${kerangka.tingkat} SD (Fase ${fase})
- Bab ${kerangka.nomor_bab}: ${kerangka.judul}
- Latar Belakang: ${kerangka.latar_belakang || '-'}
- Tujuan Pembelajaran (keseluruhan bab): ${kerangka.tujuan_pembelajaran}
- Kerangka Pembelajaran (alur bab): ${kerangka.kerangka_pembelajaran || '-'}

PPM ini KHUSUS untuk satu sub-bab berikut (fokuskan seluruh isi di sini, jangan bahas sub-bab lain):
- Sub-Bab: ${subBab.judul}
- Ringkasan Materi Sub-Bab: ${subBab.ringkasan || '(gunakan judul sub-bab dan tujuan keseluruhan bab sebagai acuan)'}

Gunakan identitas berikut PERSIS seperti ini (jangan diubah/dikarang):
- Penyusun: ${profile?.nama || '-'}
- Instansi: SDN Pasirkaliki I
- Tahun Penyusunan: ${tahunSekarang}
- Jenjang Sekolah: SD
- Fase / Kelas / Bab: ${fase} / ${romawi} (Kelas ${kerangka.tingkat}) / Bab ${kerangka.nomor_bab} (${kerangka.judul})
- Pertemuan: ${nomorPertemuan} dari ${totalSubBab}
- Semester: (tentukan Ganjil atau Genap sesuai konteks umum)
- Alokasi Waktu: (tentukan yang wajar, misal 2 x 35 menit / 1 pertemuan)

Susun PPM lengkap dengan struktur PERSIS seperti berikut (gunakan judul bagian ini apa adanya, boleh pakai heading markdown):

1. IDENTITAS PPM
(tampilkan semua identitas di atas dalam format rapi)

2. IDENTIFIKASI
a. Peserta Didik: (Pengetahuan Dasar, Tingkat Kesiapan sesuai usia kelas ${kerangka.tingkat} SD)
b. Materi Pembelajaran: (Pengetahuan yang Akan Dicapai, Tingkat Kesulitan, unsur Kolaborasi, Kreativitas, Penalaran Kritis \u2014 sesuaikan dengan sub-bab ini)
c. Dimensi Profil Lulusan: (pilih 2-3 dimensi paling relevan dari: Beriman Bertakwa dan Berakhlak Mulia, Berkebinekaan Global, Bergotong Royong, Mandiri, Bernalar Kritis, Kreatif \u2014 jelaskan penerapan konkretnya di sub-bab ini)

3. DESAIN PEMBELAJARAN
a. Capaian Pembelajaran
b. Lintas Disiplin Ilmu
c. Tujuan Pembelajaran
d. Tujuan Pembelajaran Harian
e. Topik Pembelajaran
f. Praktik Pedagogis
g. Kemitraan Pembelajaran
h. Lingkungan Pembelajaran
i. Pemanfaatan Digital

4. PENGALAMAN BELAJAR
A. Awal (tentukan durasi menit): langkah-langkah detail dan konkret
B. Inti (tentukan durasi menit): langkah-langkah detail, boleh dibagi beberapa bagian sesuai materi sub-bab, sertakan metode/media yang cocok untuk anak SD (visual, gerak, kelompok)
C. Penutup (tentukan durasi menit): langkah-langkah detail

5. ASESMEN PEMBELAJARAN
A. Asesmen pada Awal Pembelajaran
B. Asesmen pada Proses Pembelajaran
C. Asesmen pada Akhir Pembelajaran

6. RUBRIK PENILAIAN FORMATIF
a. Identitas Pembelajaran (nama aktivitas yang dinilai)
b. Indikator Penilaian
c. Aktivitas Asesmen

${aiTujuan ? `Catatan tambahan dari guru: ${aiTujuan}` : ''}
${aiKondisi ? `Kondisi kelas yang perlu dipertimbangkan: ${aiKondisi}. Sesuaikan strategi pembelajaran untuk mengatasi kondisi ini.` : ''}

PENTING \u2014 setelah selesai menulis seluruh PPM di atas, tambahkan baris pemisah PERSIS: ===LKPD===
Lalu, JIKA pembelajaran ini memiliki tugas tertulis untuk siswa, buatkan LKPD (Lembar Kerja Peserta Didik) SATU HALAMAN PENUH dengan format:
- Judul LKPD
- Kolom Nama, Kelas, Tanggal (untuk diisi siswa)
- Petunjuk pengerjaan yang jelas dan sesuai usia anak kelas ${kerangka.tingkat} SD
- Soal/tugas dengan ruang jawaban yang cukup (gunakan garis "____________" untuk tempat menulis jika perlu)
Jika TIDAK ada tugas tertulis (misalnya aktivitasnya hanya diskusi/permainan lisan), tulis PERSIS: "Tidak ada LKPD tertulis untuk sub-bab ini."

Gunakan bahasa Indonesia yang jelas, praktis, dan siap pakai untuk guru SD.`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 3500 })
      })
      const data = await res.json()
      if (data.error) {
        setAiError(data.error)
      } else {
        const parts = data.text.split(/===LKPD===/i)
        setAiHasilRpp((parts[0] || '').trim())
        setAiHasilLkpd((parts[1] || '').trim())
      }
    } catch { setAiError('Gagal terhubung ke server AI. Coba lagi.') }
    setAiLoading(false)
  }

  async function simpanRppAI() {
    if (!aiHasilRpp) return
    setAiSaving(true)
    const kerangka = kerangkaList.find(k => k.id === aiKerangkaId)
    const subBab = kerangka.sub_bab[parseInt(aiSubBabIdx)]
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('rpp').insert({
      judul: `${kerangka.judul} - ${subBab.judul}`, mata_pelajaran: aiMapel, tingkat: kerangka.tingkat,
      jenis: 'ai', konten_ai: aiHasilRpp, konten_lkpd: aiHasilLkpd, lkpd: [], uploaded_by: user.id,
      kerangka_bab_id: aiKerangkaId, sub_bab_judul: subBab.judul
    })
    setAiSaving(false); setMode(null); resetAiForm(); loadRpp()
  }

  function cetakRpp(rpp) {
    const halamanLkpd = adaLkpd(rpp.konten_lkpd) ? `
      <div class="page-break"></div>
      <div class="kop-kecil">
        <img src="/logo-sdn.png"/>
        <div><div class="nama-kecil">SDN PASIRKALIKI I</div><div class="sub-kecil">Lembar Kerja Peserta Didik</div></div>
      </div>
      <div class="lkpd-identitas">
        <div>Nama: <span class="garis"></span></div>
        <div>Kelas: <span class="garis"></span></div>
        <div>Tanggal: <span class="garis"></span></div>
      </div>
      <div class="konten">${rpp.konten_lkpd}</div>
    ` : ''

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${rpp.judul}</title>
    <style>
      body{font-family:Arial;padding:30px 40px;color:#222;line-height:1.6}
      .kop{display:flex;align-items:center;gap:16px;border-bottom:3px solid #163a61;padding-bottom:14px;margin-bottom:20px}
      .kop img{width:56px;height:56px}.kop .nama{font-size:16px;font-weight:bold;color:#163a61}
      h1{font-size:15px;color:#163a61;margin-bottom:4px}.sub{font-size:12px;color:#666;margin-bottom:20px}
      .konten{font-size:13px;white-space:pre-wrap}
      .page-break{page-break-before:always}
      .kop-kecil{display:flex;align-items:center;gap:12px;border-bottom:2px solid #163a61;padding-bottom:10px;margin-bottom:16px}
      .kop-kecil img{width:44px;height:44px}
      .nama-kecil{font-size:13px;font-weight:bold;color:#163a61}
      .sub-kecil{font-size:11px;color:#666}
      .lkpd-identitas{display:flex;gap:24px;font-size:12px;margin-bottom:16px}
      .garis{display:inline-block;width:140px;border-bottom:1px solid #333;margin-left:4px}
      @media print{.no-print{display:none}}
    </style></head><body>
    <div class="no-print" style="text-align:center;margin-bottom:16px"><button onclick="window.print()" style="background:#163a61;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer">🖨️ Cetak PDF</button></div>
    <div class="kop"><img src="/logo-sdn.png"/><div><div class="nama">SDN PASIRKALIKI I</div></div></div>
    <h1>PERENCANAAN PEMBELAJARAN MENDALAM (PPM)</h1>
    <p class="sub">${rpp.judul} · ${rpp.mata_pelajaran} · Kelas ${rpp.tingkat || '-'}</p>
    <div class="konten">${rpp.konten_ai}</div>
    ${halamanLkpd}
    </body></html>`
    const win = window.open('', '_blank'); win.document.write(html); win.document.close()
  }

  async function handleDelete(id) {
    if (!confirm('Hapus RPP ini?')) return
    await supabase.from('rpp').delete().eq('id', id)
    loadRpp()
  }

  const filtered = filterMapel === 'Semua' ? rppList : rppList.filter(r => r.mata_pelajaran === filterMapel)
  const kerangkaUntukMapel = kerangkaList.filter(k => k.mata_pelajaran === aiMapel)
  const kerangkaTerpilih = kerangkaList.find(k => k.id === aiKerangkaId)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">RPP</h2>
          <p className="text-navy-300 text-xs">Perencanaan Pembelajaran Mendalam</p>
        </div>

        <div className="px-4 -mt-5 mb-4 grid grid-cols-2 gap-2">
          <button onClick={() => setMode('upload')} className="btn-primary py-3 flex flex-col items-center justify-center gap-1">
            <Upload size={18} /><span className="text-xs">Upload RPP</span>
          </button>
          <button onClick={() => setMode('ai')} className="py-3 flex flex-col items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg">
            <Sparkles size={18} /><span className="text-xs">Buat dengan AI</span>
          </button>
        </div>

        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['Semua', ...MAPEL].map(m => (
              <button key={m} onClick={() => setFilterMapel(m)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                  ${filterMapel === m ? 'bg-navy-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{m}</button>
            ))}
          </div>
        </div>

        {mode === 'upload' && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-navy-800">Upload RPP & LKPD</h3>
                <button onClick={() => { setMode(null); resetUploadForm() }}><X size={20} className="text-gray-400" /></button>
              </div>
              <div><label className="label">Judul RPP</label>
                <input className="input" placeholder="Contoh: RPP Bilangan Cacah" value={judul} onChange={e => setJudul(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Mata Pelajaran</label>
                  <select className="input" value={mapel} onChange={e => setMapel(e.target.value)}>{MAPEL.map(m => <option key={m} value={m}>{m}</option>)}</select>
                </div>
                <div><label className="label">Untuk Kelas</label>
                  <select className="input" value={tingkat} onChange={e => setTingkat(e.target.value)}>
                    <option value="">Semua</option>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>Kelas {n}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">File RPP (PDF)</label>
                <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-navy-300 bg-white">
                  <Upload size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 truncate">{fileRpp ? fileRpp.name : 'Pilih file RPP'}</span>
                  <input type="file" className="hidden" accept=".pdf" onChange={e => setFileRpp(e.target.files[0])} />
                </label>
              </div>
              <div><label className="label">Jumlah LKPD (opsional)</label>
                <input type="number" min="0" max="20" className="input" value={jumlahLkpd} onChange={e => handleJumlahLkpdChange(e.target.value)} />
              </div>
              {lkpdList.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs font-semibold text-navy-700 mb-2">LKPD {idx + 1}</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:border-navy-300 bg-white">
                      <Upload size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500 truncate">{item.file ? item.file.name : 'Pilih File LKPD'}</span>
                      <input type="file" className="hidden" accept=".pdf" onChange={e => updateLkpd(idx, 'file', e.target.files[0])} />
                    </label>
                    <input className="input text-sm" placeholder="Deskripsi LKPD ini..." value={item.deskripsi} onChange={e => updateLkpd(idx, 'deskripsi', e.target.value)} />
                  </div>
                </div>
              ))}
              <button onClick={handleUploadRpp} disabled={uploading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {uploading ? 'Mengupload...' : 'Simpan RPP'}
              </button>
            </div>
          </div>
        )}

        {mode === 'ai' && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-purple-700 flex items-center gap-2"><Sparkles size={18} /> Buat RPP dengan AI</h3>
                <button onClick={() => { setMode(null); resetAiForm() }}><X size={20} className="text-gray-400" /></button>
              </div>

              {!aiHasilRpp && (
                <>
                  <div>
                    <label className="label">Mata Pelajaran</label>
                    <select className="input" value={aiMapel} onChange={e => { setAiMapel(e.target.value); setAiKerangkaId(''); setAiSubBabIdx('') }}>
                      {MAPEL.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="label">Pilih Kerangka Bab (wajib)</label>
                    <select className="input" value={aiKerangkaId} onChange={e => { setAiKerangkaId(e.target.value); setAiSubBabIdx('') }}>
                      <option value="">-- Pilih bab --</option>
                      {kerangkaUntukMapel.map(k => <option key={k.id} value={k.id}>Bab {k.nomor_bab}: {k.judul}</option>)}
                    </select>
                    {kerangkaUntukMapel.length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">Belum ada Kerangka Bab untuk {aiMapel}. <button onClick={() => router.push('/kerangka')} className="underline">Buat kerangka dulu</button></p>
                    )}
                  </div>

                  {kerangkaTerpilih && (
                    <div>
                      <label className="label">Pilih Sub-Bab (wajib)</label>
                      <select className="input" value={aiSubBabIdx} onChange={e => setAiSubBabIdx(e.target.value)}>
                        <option value="">-- Pilih sub-bab --</option>
                        {kerangkaTerpilih.sub_bab?.map((sb, i) => <option key={i} value={i}>{sb.judul}</option>)}
                      </select>
                    </div>
                  )}

                  <div><label className="label">Tujuan Khusus (opsional)</label>
                    <textarea className="input h-16 resize-none" value={aiTujuan} onChange={e => setAiTujuan(e.target.value)} />
                  </div>
                  <div><label className="label">Kondisi Kelas Saat Ini (opsional)</label>
                    <textarea className="input h-16 resize-none" value={aiKondisi} onChange={e => setAiKondisi(e.target.value)} />
                  </div>
                  {aiError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{aiError}</p>}
                  <button onClick={handleBuatAI} disabled={aiLoading || !aiKerangkaId || aiSubBabIdx === ''}
                    className="w-full py-3 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg disabled:opacity-60">
                    {aiLoading ? <><Loader size={16} className="animate-spin" /> AI sedang menyusun PPM...</> : <><Sparkles size={16} /> Buat RPP</>}
                  </button>
                </>
              )}

              {aiHasilRpp && (
                <>
                  <p className="text-xs font-semibold text-navy-700">Isi RPP</p>
                  <textarea className="input h-40 text-xs" value={aiHasilRpp} onChange={e => setAiHasilRpp(e.target.value)} />
                  <p className="text-xs font-semibold text-navy-700">
                    {adaLkpd(aiHasilLkpd) ? 'LKPD (Lembar Kerja \u2014 dicetak halaman terpisah)' : 'LKPD'}
                  </p>
                  <textarea className="input h-32 text-xs" value={aiHasilLkpd} onChange={e => setAiHasilLkpd(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => { setAiHasilRpp(''); setAiHasilLkpd('') }} className="flex-1 text-xs py-2.5 rounded-lg bg-gray-100 text-gray-700 font-semibold">↻ Buat Ulang</button>
                    <button onClick={simpanRppAI} disabled={aiSaving}
                      className="flex-1 text-xs py-2.5 rounded-lg bg-purple-600 text-white font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
                      <Save size={14} /> {aiSaving ? 'Menyimpan...' : 'Simpan RPP'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="px-4 space-y-3">
          {filtered.length === 0 && <div className="card text-center py-8"><p className="text-gray-400 text-sm">Belum ada RPP.</p></div>}
          {filtered.map(r => (
            <div key={r.id} className="card flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.jenis === 'ai' ? 'bg-purple-50' : 'bg-red-50'}`}>
                {r.jenis === 'ai' ? <Sparkles size={18} className="text-purple-500" /> : <FileText size={18} className="text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">{r.mata_pelajaran}{r.tingkat ? ` · Kelas ${r.tingkat}` : ''} · {r.jenis === 'ai' ? 'Dibuat AI' : 'Upload'}</p>
                <p className="text-sm font-bold text-gray-800">{r.judul}</p>
                {r.sub_bab_judul && <p className="text-xs text-gray-400 mt-1">Sub-bab: {r.sub_bab_judul}</p>}
                {adaLkpd(r.konten_lkpd) && <p className="text-xs text-purple-500 mt-1">✓ Dilengkapi LKPD 1 halaman</p>}
                <div className="flex gap-3 mt-2 flex-wrap">
                  {r.file_rpp_url && (
                    <a href={r.file_rpp_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-navy-600 font-semibold hover:underline">
                      <Download size={12} /> Unduh RPP
                    </a>
                  )}
                  {r.konten_ai && (
                    <button onClick={() => cetakRpp(r)} className="inline-flex items-center gap-1 text-xs text-purple-600 font-semibold hover:underline">
                      <Printer size={12} /> Cetak
                    </button>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0"><X size={16} /></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function RPPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>}>
      <RPPContent />
    </Suspense>
  )
}
