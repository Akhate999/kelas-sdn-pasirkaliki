'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Plus, X, Save, BookOpen, Sparkles, ChevronDown, ChevronUp, ListTree } from 'lucide-react'

const MAPEL = ['Pendidikan Agama','PPKn','Bahasa Indonesia','Matematika','IPAS','PJOK','Seni Budaya','Bahasa Inggris','Muatan Lokal']

export default function KerangkaBabPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [filterMapel, setFilterMapel] = useState('Semua')
  const [expanded, setExpanded] = useState(null)

  const [mapel, setMapel] = useState('Matematika')
  const [tingkat, setTingkat] = useState('3')
  const [nomorBab, setNomorBab] = useState('1')
  const [judulBab, setJudulBab] = useState('')
  const [latarBelakang, setLatarBelakang] = useState('')
  const [tujuanPembelajaran, setTujuanPembelajaran] = useState('')
  const [kerangkaPembelajaran, setKerangkaPembelajaran] = useState('')
  const [jumlahSubBab, setJumlahSubBab] = useState('1')
  const [subBabList, setSubBabList] = useState([{ judul: '', ringkasan: '' }])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      loadList()
      setLoading(false)
    }
    load()
  }, [router])

  async function loadList() {
    const { data } = await supabase.from('modul_bab').select('*').order('mata_pelajaran').order('nomor_bab')
    setList(data || [])
  }

  function handleJumlahSubBabChange(val) {
    setJumlahSubBab(val)
    const n = Math.max(1, parseInt(val) || 1)
    setSubBabList(prev => {
      const list = [...prev]
      while (list.length < n) list.push({ judul: '', ringkasan: '' })
      while (list.length > n) list.pop()
      return list
    })
  }

  function updateSubBab(index, field, value) {
    setSubBabList(prev => { const list = [...prev]; list[index] = { ...list[index], [field]: value }; return list })
  }

  function resetForm() {
    setMapel('Matematika'); setTingkat('3'); setNomorBab('1'); setJudulBab('')
    setLatarBelakang(''); setTujuanPembelajaran(''); setKerangkaPembelajaran('')
    setJumlahSubBab('1'); setSubBabList([{ judul: '', ringkasan: '' }])
  }

  async function handleSave() {
    if (!judulBab.trim()) { alert('Judul bab harus diisi.'); return }
    if (!tujuanPembelajaran.trim()) { alert('Tujuan pembelajaran harus diisi \u2014 ini yang paling penting dibaca AI.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const subBabBersih = subBabList.filter(s => s.judul.trim())
    await supabase.from('modul_bab').insert({
      mata_pelajaran: mapel, tingkat: parseInt(tingkat), nomor_bab: parseInt(nomorBab) || 1,
      judul: judulBab.trim(), latar_belakang: latarBelakang, tujuan_pembelajaran: tujuanPembelajaran,
      kerangka_pembelajaran: kerangkaPembelajaran, sub_bab: subBabBersih, uploaded_by: user.id
    })
    setSaving(false)
    setShowForm(false)
    resetForm()
    loadList()
  }

  async function handleDelete(id) {
    if (!confirm('Hapus kerangka bab ini?')) return
    await supabase.from('modul_bab').delete().eq('id', id)
    loadList()
  }

  const filtered = filterMapel === 'Semua' ? list : list.filter(k => k.mata_pelajaran === filterMapel)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Kerangka Bab</h2>
          <p className="text-navy-300 text-xs">Latar Belakang, Tujuan & Sub-Bab untuk bahan AI</p>
        </div>

        <div className="px-4 -mt-5 mb-4 space-y-2">
          <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus size={16} /> Tambah Kerangka Bab
          </button>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['Semua', ...MAPEL].map(m => (
              <button key={m} onClick={() => setFilterMapel(m)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                  ${filterMapel === m ? 'bg-navy-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{m}</button>
            ))}
          </div>
        </div>

        <div className="px-4 bg-blue-50 border border-blue-100 rounded-xl mx-4 px-4 py-3 mb-4">
          <p className="text-blue-800 text-xs font-semibold mb-1">Kenapa perlu diisi?</p>
          <p className="text-blue-700 text-xs">Kerangka ini yang dibaca AI saat membuat RPP \u2014 bukan file PDF. Isi sekali, bisa dipakai berkali-kali untuk membuat RPP tiap sub-bab.</p>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-navy-800">Tambah Kerangka Bab</h3>
                <button onClick={() => { setShowForm(false); resetForm() }}><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><label className="label">Mata Pelajaran</label>
                  <select className="input" value={mapel} onChange={e => setMapel(e.target.value)}>{MAPEL.map(m => <option key={m} value={m}>{m}</option>)}</select>
                </div>
                <div><label className="label">Kelas</label>
                  <select className="input" value={tingkat} onChange={e => setTingkat(e.target.value)}>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}</select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Nomor Bab</label>
                  <input type="number" min="1" className="input" value={nomorBab} onChange={e => setNomorBab(e.target.value)} />
                </div>
                <div className="col-span-2"><label className="label">Judul Bab</label>
                  <input className="input" placeholder="Contoh: Rumah dan Lingkunganku" value={judulBab} onChange={e => setJudulBab(e.target.value)} />
                </div>
              </div>

              <div><label className="label">Latar Belakang</label>
                <textarea className="input h-20 resize-none" placeholder="Kenapa topik ini penting/relevan dipelajari..." value={latarBelakang} onChange={e => setLatarBelakang(e.target.value)} />
              </div>

              <div><label className="label">Tujuan Pembelajaran <span className="text-red-500">*</span></label>
                <textarea className="input h-24 resize-none" placeholder={"Tulis poin-poin tujuan, contoh:\n1. Murid dapat menjelaskan...\n2. Murid dapat mempraktikkan..."} value={tujuanPembelajaran} onChange={e => setTujuanPembelajaran(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Bagian terpenting yang dibaca AI</p>
              </div>

              <div><label className="label">Kerangka Pembelajaran</label>
                <textarea className="input h-20 resize-none" placeholder="Garis besar alur/urutan materi dalam bab ini..." value={kerangkaPembelajaran} onChange={e => setKerangkaPembelajaran(e.target.value)} />
              </div>

              <div><label className="label">Jumlah Sub-Bab</label>
                <input type="number" min="1" max="15" className="input" value={jumlahSubBab} onChange={e => handleJumlahSubBabChange(e.target.value)} />
              </div>

              {subBabList.map((sb, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                  <p className="text-xs font-semibold text-navy-700">Sub-Bab {idx + 1}</p>
                  <input className="input text-sm" placeholder="Judul sub-bab" value={sb.judul} onChange={e => updateSubBab(idx, 'judul', e.target.value)} />
                  <textarea className="input h-16 resize-none text-sm" placeholder="Ringkasan materi sub-bab ini..." value={sb.ringkasan} onChange={e => updateSubBab(idx, 'ringkasan', e.target.value)} />
                </div>
              ))}

              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Kerangka Bab'}
              </button>
            </div>
          </div>
        )}

        <div className="px-4 space-y-3">
          {filtered.length === 0 && (
            <div className="card text-center py-8">
              <BookOpen size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Belum ada kerangka bab.</p>
            </div>
          )}
          {filtered.map(k => {
            const isOpen = expanded === k.id
            return (
              <div key={k.id} className="card">
                <button className="w-full flex items-start justify-between text-left" onClick={() => setExpanded(isOpen ? null : k.id)}>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">{k.mata_pelajaran} · Kelas {k.tingkat}</p>
                    <p className="text-sm font-bold text-gray-800">Bab {k.nomor_bab}: {k.judul}</p>
                    <p className="text-xs text-gray-400 mt-1">{k.sub_bab?.length || 0} sub-bab</p>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    {k.tujuan_pembelajaran && (
                      <div><p className="text-xs font-semibold text-gray-600 mb-1">Tujuan Pembelajaran</p>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{k.tujuan_pembelajaran}</p></div>
                    )}
                    {k.sub_bab?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1"><ListTree size={12} /> Sub-Bab</p>
                        <ul className="space-y-1">
                          {k.sub_bab.map((sb, i) => <li key={i} className="text-xs text-gray-600">• {sb.judul}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => router.push(`/rpp?kerangkaId=${k.id}`)}
                        className="flex-1 text-xs py-2 rounded-lg bg-purple-50 text-purple-700 font-semibold border border-purple-200 flex items-center justify-center gap-1">
                        <Sparkles size={12} /> Buat RPP dari Bab Ini
                      </button>
                      <button onClick={() => handleDelete(k.id)} className="text-xs py-2 px-3 rounded-lg bg-red-50 text-red-600 font-semibold border border-red-100">
                        Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
