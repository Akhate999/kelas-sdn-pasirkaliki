'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, X, Save, NotebookPen, Calendar } from 'lucide-react'

export default function PertemuanBabPage() {
  const router = useRouter()
  const params = useParams()
  const babId = params.id

  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [bab, setBab]         = useState(null)
  const [kerangka, setKerangka] = useState(null)
  const [pertemuanList, setPertemuanList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)

  const [subBabTerpilih, setSubBabTerpilih] = useState('')
  const [subBabManual, setSubBabManual] = useState('')
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [refleksi, setRefleksi] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      const { data: babData } = await supabase.from('bab_pembelajaran').select('*').eq('id', babId).single()
      setBab(babData)
      if (babData?.kerangka_bab_id) {
        const { data: kerangkaData } = await supabase.from('modul_bab').select('*').eq('id', babData.kerangka_bab_id).single()
        setKerangka(kerangkaData)
      }
      loadPertemuan()
      setLoading(false)
    }
    load()
  }, [babId, router])

  async function loadPertemuan() {
    const { data } = await supabase.from('pertemuan_bab').select('*').eq('bab_id', babId).order('tanggal', { ascending: false })
    setPertemuanList(data || [])
  }

  function resetForm() {
    setSubBabTerpilih(''); setSubBabManual(''); setTanggal(format(new Date(), 'yyyy-MM-dd')); setRefleksi('')
  }

  async function handleSave() {
    const judulSubBab = subBabTerpilih || subBabManual.trim()
    if (!judulSubBab) { alert('Isi atau pilih sub-bab yang diajarkan.'); return }
    setSaving(true)
    await supabase.from('pertemuan_bab').insert({
      bab_id: babId, tanggal, sub_bab_judul: judulSubBab, refleksi: refleksi.trim() || null
    })
    setSaving(false)
    setShowForm(false)
    resetForm()
    loadPertemuan()
  }

  async function handleDelete(id) {
    if (!confirm('Hapus catatan pertemuan ini?')) return
    await supabase.from('pertemuan_bab').delete().eq('id', id)
    loadPertemuan()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <p className="text-navy-300 text-xs">{bab?.mata_pelajaran}</p>
          <h2 className="text-white font-bold text-lg">Pertemuan & Refleksi</h2>
          <p className="text-navy-200 text-sm">Bab {bab?.nomor_bab}: {bab?.judul_bab}</p>
        </div>

        <div className="px-4 -mt-5 mb-4">
          <button onClick={() => setShowForm(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus size={16} /> Catat Pertemuan Baru
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-purple-700 flex items-center gap-2"><NotebookPen size={18} /> Catat Pertemuan</h3>
                <button onClick={() => { setShowForm(false); resetForm() }}><X size={20} className="text-gray-400" /></button>
              </div>

              <div><label className="label">Tanggal Pertemuan</label>
                <input type="date" className="input" value={tanggal} onChange={e => setTanggal(e.target.value)} />
              </div>

              {kerangka?.sub_bab?.length > 0 ? (
                <div>
                  <label className="label">Sub-Bab yang Diajarkan</label>
                  <select className="input" value={subBabTerpilih} onChange={e => setSubBabTerpilih(e.target.value)}>
                    <option value="">-- Pilih sub-bab --</option>
                    {kerangka.sub_bab.map((sb, i) => <option key={i} value={sb.judul}>{sb.judul}</option>)}
                  </select>
                </div>
              ) : (
                <div><label className="label">Sub-Bab / Materi yang Diajarkan</label>
                  <input className="input" placeholder="Contoh: Aku, Keluargaku, dan Temanku" value={subBabManual} onChange={e => setSubBabManual(e.target.value)} />
                </div>
              )}

              <div>
                <label className="label">Catatan Refleksi Pembelajaran</label>
                <textarea className="input h-32 resize-none" placeholder={"Apa yang berjalan baik?\nApa kendala yang dihadapi?\nApa rencana perbaikan untuk pertemuan berikutnya?"}
                  value={refleksi} onChange={e => setRefleksi(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Opsional, tapi sangat membantu evaluasi pembelajaran ke depan</p>
              </div>

              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Pertemuan'}
              </button>
            </div>
          </div>
        )}

        <div className="px-4 space-y-3">
          {pertemuanList.length === 0 && (
            <div className="card text-center py-8">
              <NotebookPen size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Belum ada catatan pertemuan.</p>
            </div>
          )}
          {pertemuanList.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <Calendar size={12} />
                    {format(new Date(p.tanggal + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id })}
                  </div>
                  <p className="text-sm font-bold text-gray-800">{p.sub_bab_judul}</p>
                </div>
                <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0 ml-2"><X size={16} /></button>
              </div>
              {p.refleksi && (
                <div className="bg-purple-50 rounded-lg p-3 mt-2">
                  <p className="text-xs font-semibold text-purple-700 mb-1">Refleksi:</p>
                  <p className="text-xs text-purple-800 whitespace-pre-wrap">{p.refleksi}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
