'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Plus, X, Upload, FileText, Download, Sparkles, Save, Loader, Printer } from 'lucide-react'

const MAPEL = ['Pendidikan Agama','PPKn','Bahasa Indonesia','Matematika','IPAS','PJOK','Seni Budaya','Bahasa Inggris','Muatan Lokal']

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

  // Form upload
  const [judul, setJudul] = useState('')
  const [mapel, setMapel] = useState('Matematika')
  const [tingkat, setTingkat] = useState('')
  const [fileRpp, setFileRpp] = useState(null)
  const [jumlahLkpd, setJumlahLkpd] = useState('1')
  const [lkpdList, setLkpdList] = useState([{ file: null, deskripsi: '' }])
  const [uploading, setUploading] = useState(false)

  // Form AI
  const [aiMapel, setAiMapel] = useState('Matematika')
  const [aiKerangkaId, setAiKerangkaId] = useState('')
  const [aiSubBabIdx, setAiSubBabIdx] = useState('')
  const [aiTujuan, setAiTujuan] = useState('')
  const [aiKondisi, setAiKondisi] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHasil, setAiHasil] = useState('')
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
    setAiKerangkaId(''); setAiSubBabIdx(''); setAiTujuan(''); setAiKondisi(''); setAiHasil(''); setAiError('')
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

    setAiLoading(true); setAiError(''); setAiHasil('')

    const prompt = `Kamu adalah ahli pendidikan yang membantu guru SD menyusun RPP (Rencana Pelaksanaan Pembelajaran) sesuai Kurikulum Merdeka.

Berikut kerangka Bab yang menjadi acuan:
- Mata Pelajaran: ${kerangka.mata_pelajaran}
- Kelas: ${kerangka.tingkat} SD
- Bab ${kerangka.nomor_bab}: ${kerangka.judul}
- Latar Belakang: ${kerangka.latar_belakang || '-'}
- Tujuan Pembelajaran (keseluruhan bab): ${kerangka.tujuan_pembelajaran}
- Kerangka Pembelajaran (alur bab): ${kerangka.kerangka_pembelajaran || '-'}

RPP ini KHUSUS untuk satu sub-bab berikut (fokuskan seluruh RPP di sini, jangan bahas sub-bab lain):
- Sub-Bab: ${subBab.judul}
- Ringkasan Materi Sub-Bab: ${subBab.ringkasan || '(tidak ada ringkasan detail, gunakan judul sub-bab dan konteks tujuan pembelajaran keseluruhan bab)'}

Buatkan RPP lengkap dalam Bahasa Indonesia dengan format berikut:

**IDENTITAS**
- Mata Pelajaran: ${kerangka.mata_pelajaran}
- Kelas/Fase: ${kerangka.tingkat} SD
- Topik/Materi: ${subBab.judul} (Bab ${kerangka.nomor_bab}: ${kerangka.judul})
- Alokasi Waktu: (tentukan yang wajar, misal 2x35 menit)

**TUJUAN PEMBELAJARAN**
(turunkan 3-4 tujuan spesifik untuk sub-bab ini, selaras dengan tujuan pembelajaran keseluruhan bab di atas)

**PEMAHAMAN BERMAKNA**
(1 paragraf singkat)

**KEGIATAN PEMBELAJARAN**
Kegiatan Pembuka (10 menit): ...
Kegiatan Inti (45 menit): (uraikan langkah-langkah detail berdasarkan ringkasan sub-bab di atas, termasuk metode/media yang cocok untuk anak SD kelas ${kerangka.tingkat}, aktivitas yang variatif seperti gerak, visual, kelompok)
Kegiatan Penutup (15 menit): ...

**ASESMEN**
(sebutkan jenis asesmen formatif yang bisa dipakai selama pembelajaran sub-bab ini)

${aiTujuan ? `Catatan tambahan dari guru mengenai tujuan khusus: ${aiTujuan}` : ''}
${aiKondisi ? `Kondisi kelas yang perlu dipertimbangkan: ${aiKondisi}. Sesuaikan strategi pembelajaran untuk mengatasi kondisi ini.` : ''}

Tulis RPP secara lengkap dan siap pakai, gunakan bahasa yang jelas dan praktis untuk guru SD.`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 2200 })
      })
      const data = await res.json()
      if (data.error) setAiError(data.error)
      else setAiHasil(data.text)
    } catch { setAiError('Gagal terhubung ke server AI. Coba lagi.') }
    setAiLoading(false)
  }

  async function simpanRppAI() {
    if (!aiHasil) return
    setAiSaving(true)
    const kerangka = kerangkaList.find(k => k.id === aiKerangkaId)
    const subBab = kerangka.sub_bab[parseInt(aiSubBabIdx)]
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('rpp').insert({
      judul: `${kerangka.judul} - ${subBab.judul}`, mata_pelajaran: aiMapel, tingkat: kerangka.tingkat,
      jenis: 'ai', konten_ai: aiHasil, lkpd: [], uploaded_by: user.id,
      kerangka_bab_id: aiKerangkaId, sub_bab_judul: subBab.judul
    })
    setAiSaving(false); setMode(null); resetAiForm(); loadRpp()
  }

  function cetakRpp(rpp) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${rpp.judul}</title>
    <style>body{font-family:Arial;padding:30px 40px;color:#222;line-height:1.6}
    .kop{display:flex;align-items:center;gap:16px;border-bottom:3px solid #163a61;padding-bottom:14px;margin-bottom:20px}
    .kop img{width:56px;height:56px}.kop .nama{font-size:16px;font-weight:bold;color:#163a61}
    h1{font-size:15px;color:#163a61;margin-bottom:4px}.sub{font-size:12px;color:#666;margin-bottom:20px}
    .konten{font-size:13px;white-space:pre-wrap}
    @media print{.no-print{display:none}}</style></head><body>
    <div class="no-print" style="text-align:center;margin-bottom:16px"><button onclick="window.print()" style="background:#163a61;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer">🖨️ Cetak PDF</button></div>
    <div class="kop"><img src="/logo-sdn.png"/><div><div class="nama">SDN PASIRKALIKI I</div></div></div>
    <h1>RENCANA PELAKSANAAN PEMBELAJARAN</h1>
    <p class="sub">${rpp.judul} · ${rpp.mata_pelajaran} · Kelas ${rpp.tingkat || '-'}</p>
    <div class="konten">${rpp.konten_ai}</div>
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
          <p className="text-navy-300 text-xs">Rencana Pelaksanaan Pembelajaran</p>
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

              {!aiHasil && (
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
                      <p className="text-xs text-gray-400 mt-1">RPP akan fokus pada satu sub-bab (biasanya satu pertemuan)</p>
                    </div>
                  )}

                  <div><label className="label">Tujuan Khusus (opsional)</label>
                    <textarea className="input h-16 resize-none" placeholder="Ada tujuan khusus yang ingin ditekankan?" value={aiTujuan} onChange={e => setAiTujuan(e.target.value)} />
                  </div>
                  <div><label className="label">Kondisi Kelas Saat Ini (opsional)</label>
                    <textarea className="input h-16 resize-none" placeholder="Contoh: Banyak murid kurang fokus di siang hari" value={aiKondisi} onChange={e => setAiKondisi(e.target.value)} />
                  </div>
                  {aiError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{aiError}</p>}
                  <button onClick={handleBuatAI} disabled={aiLoading || !aiKerangkaId || aiSubBabIdx === ''}
                    className="w-full py-3 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg disabled:opacity-60">
                    {aiLoading ? <><Loader size={16} className="animate-spin" /> AI sedang menyusun RPP...</> : <><Sparkles size={16} /> Buat RPP</>}
                  </button>
                </>
              )}

              {aiHasil && (
                <>
                  <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-100 max-h-96 overflow-y-auto">{aiHasil}</div>
                  <textarea className="input h-24 text-xs" value={aiHasil} onChange={e => setAiHasil(e.target.value)} placeholder="Edit hasil RPP di sini jika perlu..." />
                  <div className="flex gap-2">
                    <button onClick={() => setAiHasil('')} className="flex-1 text-xs py-2.5 rounded-lg bg-gray-100 text-gray-700 font-semibold">↻ Buat Ulang</button>
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
                {r.lkpd?.length > 0 && <p className="text-xs text-gray-400 mt-1">{r.lkpd.length} LKPD terlampir</p>}
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
                  {r.lkpd?.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-500 font-semibold hover:underline">
                      <Download size={12} /> LKPD {i+1}
                    </a>
                  ))}
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
