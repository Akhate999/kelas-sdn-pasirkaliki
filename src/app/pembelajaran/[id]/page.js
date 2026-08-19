'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  ChevronDown, ChevronUp, ClipboardList, BarChart2, Heart, Sprout,
  Save, X, Award, CheckCircle
} from 'lucide-react'

const DPL_LIST = [
  { value: 'keimanan', label: 'Keimanan & Ketakwaan' },
  { value: 'kewargaan', label: 'Kewargaan' },
  { value: 'penalaran_kritis', label: 'Penalaran Kritis' },
  { value: 'kreativitas', label: 'Kreativitas' },
  { value: 'kolaborasi', label: 'Kolaborasi' },
  { value: 'kemandirian', label: 'Kemandirian' },
  { value: 'kesehatan', label: 'Kesehatan' },
  { value: 'komunikasi', label: 'Komunikasi' },
]
function labelDpl(val) { return DPL_LIST.find(d => d.value === val)?.label || val }
const SKALA = [1, 2, 3, 4]

export default function PembelajaranDetailPage() {
  const router = useRouter()
  const params = useParams()
  const babId = params.id

  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [bab, setBab]         = useState(null)
  const [kerangka, setKerangka] = useState(null)
  const [muridList, setMuridList] = useState([])
  const [pertemuanList, setPertemuanList] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSubBab, setExpandedSubBab] = useState(null)

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
        const { data: k } = await supabase.from('modul_bab').select('*').eq('id', babData.kerangka_bab_id).single()
        setKerangka(k)
      }
      if (kls) {
        const { data: murid } = await supabase.from('murid').select('*').eq('kelas_id', kls.id).eq('status_murid', 'aktif').order('nama')
        setMuridList(murid || [])
      }
      const { data: pertemuan } = await supabase.from('pertemuan_bab').select('*').eq('bab_id', babId)
      setPertemuanList(pertemuan || [])
      setLoading(false)
    }
    load()
  }, [babId, router])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  const subBabArr = kerangka?.sub_bab || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <p className="text-navy-300 text-xs">{bab?.mata_pelajaran}</p>
          <h2 className="text-white font-bold text-lg">Bab {bab?.nomor_bab}: {bab?.judul_bab}</h2>
          <p className="text-navy-200 text-xs mt-1">{kelas?.nama}</p>
        </div>

        {subBabArr.length === 0 ? (
          <div className="px-4 -mt-5">
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Bab ini belum tertaut Kerangka Bab, sehingga belum ada sub-bab yang bisa dicatat.</p>
              <button onClick={() => router.push('/kerangka')} className="text-xs text-navy-600 underline mt-2">Atur di Kerangka Bab</button>
            </div>
          </div>
        ) : (
          <div className="px-4 -mt-5 space-y-3">
            {subBabArr.map((sb, idx) => {
              const pertemuan = pertemuanList.find(p => p.sub_bab_judul === sb.judul)
              const isOpen = expandedSubBab === idx
              return (
                <div key={idx} className="card">
                  <button className="w-full flex items-center justify-between text-left" onClick={() => setExpandedSubBab(isOpen ? null : idx)}>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Sub-Bab {idx + 1}{pertemuan ? ` · ${format(new Date(pertemuan.tanggal + 'T00:00:00'), 'd MMM yyyy', { locale: localeId })}` : ' · belum ada pertemuan'}</p>
                      <p className="text-sm font-bold text-gray-800">{sb.judul}</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>

                  {isOpen && (
                    <SubBabDetail
                      subBab={sb} bab={bab} kelas={kelas} muridList={muridList} pertemuan={pertemuan}
                    />
                  )}
                </div>
              )
            })}

            <div className="pt-2">
              <button onClick={() => router.push(`/sumatif?mapel=${encodeURIComponent(bab.mata_pelajaran)}`)}
                className="w-full py-3 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm">
                <Award size={16} /> Evaluasi Sumatif Akhir Bab
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function SubBabDetail({ subBab, bab, kelas, muridList, pertemuan }) {
  const [tab, setTab] = useState('kehadiran')
  const [rekapAbsen, setRekapAbsen] = useState(null)
  const [loadingAbsen, setLoadingAbsen] = useState(false)

  useEffect(() => {
    async function loadAbsen() {
      if (!pertemuan?.tanggal || !kelas) { setRekapAbsen(null); return }
      setLoadingAbsen(true)
      const { data } = await supabase.from('absensi').select('status').eq('kelas_id', kelas.id).eq('tanggal', pertemuan.tanggal)
      const rekap = { hadir: 0, sakit: 0, izin: 0, alpha: 0 }
      ;(data || []).forEach(a => { rekap[a.status] = (rekap[a.status] || 0) + 1 })
      setRekapAbsen(rekap)
      setLoadingAbsen(false)
    }
    loadAbsen()
  }, [pertemuan, kelas])

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {!pertemuan && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-orange-700">Sub-bab ini belum dicatat sebagai pertemuan. Catat dulu di menu Bab & Laporan → Pertemuan & Refleksi supaya tanggalnya tersimpan.</p>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
        {[['kehadiran','Kehadiran', ClipboardList],['formatif','Formatif', BarChart2],['dpl','DPL', Heart],['pengayaan','Pengayaan/Remedial', Sprout]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium
              ${tab === key ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {tab === 'kehadiran' && (
        <div>
          {!pertemuan ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada tanggal pertemuan untuk sub-bab ini.</p>
          ) : loadingAbsen ? (
            <p className="text-xs text-gray-400 text-center py-4">Memuat...</p>
          ) : rekapAbsen ? (
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(rekapAbsen).map(([status, jml]) => (
                <div key={status} className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-navy-700">{jml}</p>
                  <p className="text-xs text-gray-500 capitalize">{status}</p>
                </div>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-gray-400 mt-2">Data ini ditarik otomatis dari Absensi Harian pada tanggal pertemuan. Untuk mengubah, buka menu Absensi Harian.</p>
        </div>
      )}

      {tab === 'formatif' && <FormatifQuick muridList={muridList} bab={bab} pertemuan={pertemuan} subBab={subBab} />}
      {tab === 'dpl' && <DplQuick muridList={muridList} bab={bab} pertemuan={pertemuan} subBab={subBab} />}
      {tab === 'pengayaan' && <PengayaanQuick muridList={muridList} bab={bab} pertemuan={pertemuan} subBab={subBab} />}
    </div>
  )
}

function FormatifQuick({ muridList, bab, pertemuan, subBab }) {
  const [nilai, setNilai] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function setAspek(muridId, aspek, val) {
    setNilai(prev => ({ ...prev, [muridId]: { ...prev[muridId], [aspek]: val } }))
    setSaved(false)
  }

  async function simpanSemua() {
    if (!pertemuan) { alert('Sub-bab ini belum punya tanggal pertemuan.'); return }
    setSaving(true)
    const rows = muridList.filter(m => nilai[m.id]).map(m => ({
      murid_id: m.id, kelas_id: bab.kelas_id, tanggal: pertemuan.tanggal,
      mata_pelajaran: bab.mata_pelajaran, topik: subBab.judul,
      keaktifan: nilai[m.id].keaktifan || 3, fokus: nilai[m.id].fokus || 3, pemahaman: nilai[m.id].pemahaman || 3,
    }))
    if (rows.length > 0) await supabase.from('penilaian_formatif').insert(rows)
    setSaving(false); setSaved(true); setNilai({})
  }

  return (
    <div className="space-y-2">
      {muridList.map(m => (
        <div key={m.id} className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs font-semibold text-gray-700 mb-1">{m.nama}</p>
          <div className="grid grid-cols-3 gap-1">
            {['keaktifan','fokus','pemahaman'].map(aspek => (
              <div key={aspek} className="flex gap-0.5">
                {SKALA.map(v => (
                  <button key={v} onClick={() => setAspek(m.id, aspek, v)}
                    className={`flex-1 text-xs py-1 rounded ${nilai[m.id]?.[aspek] === v ? 'bg-navy-700 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>{v}</button>
                ))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1 mt-0.5">
            <p className="text-xs text-gray-400 text-center">Aktif</p><p className="text-xs text-gray-400 text-center">Fokus</p><p className="text-xs text-gray-400 text-center">Paham</p>
          </div>
        </div>
      ))}
      {saved && <p className="text-xs text-green-600 text-center flex items-center justify-center gap-1"><CheckCircle size={12} /> Tersimpan</p>}
      <button onClick={simpanSemua} disabled={saving} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
        <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan Formatif'}
      </button>
    </div>
  )
}

function DplQuick({ muridList, bab, pertemuan, subBab }) {
  const [dplTersedia, setDplTersedia] = useState(DPL_LIST.map(d => d.value))
  const [muridId, setMuridId] = useState('')
  const [kategori, setKategori] = useState('keimanan')
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)
  const [daftar, setDaftar] = useState([])

  useEffect(() => {
    async function loadDpl() {
      if (!bab?.kerangka_bab_id) return
      const { data } = await supabase.from('rpp').select('dpl_dimensi')
        .eq('kerangka_bab_id', bab.kerangka_bab_id).eq('sub_bab_judul', subBab.judul).maybeSingle()
      if (data?.dpl_dimensi?.length > 0) {
        setDplTersedia(data.dpl_dimensi)
        setKategori(data.dpl_dimensi[0])
      }
    }
    loadDpl()
  }, [bab, subBab])

  useEffect(() => {
    async function load() {
      if (!pertemuan) return
      const { data } = await supabase.from('catatan_karakter').select('*, murid(nama)').eq('kelas_id', bab.kelas_id).eq('tanggal', pertemuan.tanggal)
      setDaftar(data || [])
    }
    load()
  }, [pertemuan, bab])

  async function simpan() {
    if (!pertemuan) { alert('Sub-bab ini belum punya tanggal pertemuan.'); return }
    if (!muridId || !catatan.trim()) { alert('Pilih murid dan isi catatan.'); return }
    setSaving(true)
    await supabase.from('catatan_karakter').insert({
      murid_id: muridId, kelas_id: bab.kelas_id, tanggal: pertemuan.tanggal, kategori, catatan: catatan.trim()
    })
    setSaving(false); setCatatan(''); setMuridId('')
    const { data } = await supabase.from('catatan_karakter').select('*, murid(nama)').eq('kelas_id', bab.kelas_id).eq('tanggal', pertemuan.tanggal)
    setDaftar(data || [])
  }

  return (
    <div className="space-y-3">
      <select className="input text-sm" value={muridId} onChange={e => setMuridId(e.target.value)}>
        <option value="">-- Pilih Murid --</option>
        {muridList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
      </select>
      <select className="input text-sm" value={kategori} onChange={e => setKategori(e.target.value)}>
        {dplTersedia.map(d => <option key={d} value={d}>{labelDpl(d)}</option>)}
      </select>
      <textarea className="input h-16 text-sm resize-none" placeholder="Catatan kejadian..." value={catatan} onChange={e => setCatatan(e.target.value)} />
      <button onClick={simpan} disabled={saving} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
        <Save size={14} /> {saving ? 'Menyimpan...' : 'Tambah Catatan DPL'}
      </button>
      {daftar.length > 0 && (
        <div className="space-y-1 pt-2">
          {daftar.map(d => (
            <div key={d.id} className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-gray-700">{d.murid?.nama} · {labelDpl(d.kategori)}</p>
              <p className="text-xs text-gray-500">{d.catatan}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PengayaanQuick({ muridList, bab, pertemuan, subBab }) {
  const [muridId, setMuridId] = useState('')
  const [jenis, setJenis] = useState('remedial')
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)
  const [daftar, setDaftar] = useState([])

  useEffect(() => {
    async function load() {
      if (!pertemuan) return
      const { data } = await supabase.from('pengayaan_remedial').select('*, murid(nama)').eq('bab_id', bab.id).eq('sub_bab_judul', subBab.judul)
      setDaftar(data || [])
    }
    load()
  }, [pertemuan, bab, subBab])

  async function simpan() {
    if (!pertemuan) { alert('Sub-bab ini belum punya tanggal pertemuan.'); return }
    if (!muridId) { alert('Pilih murid.'); return }
    setSaving(true)
    await supabase.from('pengayaan_remedial').insert({
      murid_id: muridId, bab_id: bab.id, sub_bab_judul: subBab.judul, tanggal: pertemuan.tanggal, jenis, catatan: catatan.trim() || null
    })
    setSaving(false); setCatatan(''); setMuridId('')
    const { data } = await supabase.from('pengayaan_remedial').select('*, murid(nama)').eq('bab_id', bab.id).eq('sub_bab_judul', subBab.judul)
    setDaftar(data || [])
  }

  async function hapus(id) {
    await supabase.from('pengayaan_remedial').delete().eq('id', id)
    const { data } = await supabase.from('pengayaan_remedial').select('*, murid(nama)').eq('bab_id', bab.id).eq('sub_bab_judul', subBab.judul)
    setDaftar(data || [])
  }

  return (
    <div className="space-y-3">
      <select className="input text-sm" value={muridId} onChange={e => setMuridId(e.target.value)}>
        <option value="">-- Pilih Murid --</option>
        {muridList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
      </select>
      <div className="flex gap-2">
        <button onClick={() => setJenis('remedial')} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${jenis === 'remedial' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>Remedial</button>
        <button onClick={() => setJenis('pengayaan')} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${jenis === 'pengayaan' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>Pengayaan</button>
      </div>
      <textarea className="input h-16 text-sm resize-none" placeholder="Catatan (opsional)..." value={catatan} onChange={e => setCatatan(e.target.value)} />
      <button onClick={simpan} disabled={saving} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
        <Save size={14} /> {saving ? 'Menyimpan...' : 'Tambah'}
      </button>
      {daftar.length > 0 && (
        <div className="space-y-1 pt-2">
          {daftar.map(d => (
            <div key={d.id} className="bg-gray-50 rounded-lg px-3 py-2 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">{d.murid?.nama} · <span className={d.jenis === 'remedial' ? 'text-orange-600' : 'text-green-600'}>{d.jenis === 'remedial' ? 'Remedial' : 'Pengayaan'}</span></p>
                {d.catatan && <p className="text-xs text-gray-500">{d.catatan}</p>}
              </div>
              <button onClick={() => hapus(d.id)} className="text-gray-300 hover:text-red-400"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
