'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Sparkles, Share2, ChevronDown, ChevronUp, Loader } from 'lucide-react'

export default function LaporanBabPage() {
  const router = useRouter()
  const params = useParams()
  const babId = params.id

  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [bab, setBab]         = useState(null)
  const [muridList, setMuridList] = useState([])
  const [laporan, setLaporan] = useState({}) // { muridId: { narasi, loading } }
  const [loading, setLoading] = useState(true)
  const [expandedMurid, setExpandedMurid] = useState(null)

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
      if (kls) {
        const { data: murid } = await supabase.from('murid').select('*').eq('kelas_id', kls.id).order('nama')
        setMuridList(murid || [])
      }
      setLoading(false)
    }
    load()
  }, [babId, router])

  async function buatLaporanSatuMurid(murid) {
    setLaporan(prev => ({ ...prev, [murid.id]: { narasi: '', loading: true } }))
    setExpandedMurid(murid.id)

    // Ambil data murid selama periode bab
    const tglMulai = bab.tanggal_mulai
    const tglSelesai = bab.tanggal_selesai || format(new Date(), 'yyyy-MM-dd')

    const [{ data: absensi }, { data: formatif }, { data: sumatif }, { data: karakter }] = await Promise.all([
      supabase.from('absensi').select('*').eq('murid_id', murid.id).gte('tanggal', tglMulai).lte('tanggal', tglSelesai),
      supabase.from('penilaian_formatif').select('*').eq('murid_id', murid.id).eq('mata_pelajaran', bab.mata_pelajaran).gte('tanggal', tglMulai).lte('tanggal', tglSelesai),
      supabase.from('penilaian_sumatif').select('*').eq('murid_id', murid.id).eq('mata_pelajaran', bab.mata_pelajaran),
      supabase.from('catatan_karakter').select('*').eq('murid_id', murid.id).gte('tanggal', tglMulai).lte('tanggal', tglSelesai),
    ])

    // Hitung rekap
    const totalHadir = (absensi || []).filter(a => a.status === 'hadir').length
    const totalAbsen = (absensi || []).length
    const rataFormatif = formatif?.length > 0
      ? { keaktifan: (formatif.reduce((s, f) => s + f.keaktifan, 0) / formatif.length).toFixed(1), fokus: (formatif.reduce((s, f) => s + f.fokus, 0) / formatif.length).toFixed(1), pemahaman: (formatif.reduce((s, f) => s + f.pemahaman, 0) / formatif.length).toFixed(1) }
      : null
    const nilaiEvaluasi = sumatif?.find(s => s.jenis === 'Ulangan Harian' || s.jenis === 'UTS')

    // Panggil Claude API
    const prompt = `Kamu adalah wali kelas SD yang menulis laporan perkembangan murid kepada orang tua. Tulis laporan dalam Bahasa Indonesia yang hangat, mudah dipahami orang tua, dan positif namun jujur.

Data murid:
- Nama: ${murid.nama}
- Kelas: ${kelas.nama}
- Mata Pelajaran: ${bab.mata_pelajaran}
- Bab ${bab.nomor_bab}: ${bab.judul_bab}
- Periode: ${format(new Date(tglMulai + 'T00:00:00'), 'd MMMM', { locale: id })} - ${format(new Date(tglSelesai + 'T00:00:00'), 'd MMMM yyyy', { locale: id })}

Kehadiran: ${totalHadir} dari ${totalAbsen} hari
${rataFormatif ? `Penilaian proses: Keaktifan ${rataFormatif.keaktifan}/4, Fokus ${rataFormatif.fokus}/4, Pemahaman ${rataFormatif.pemahaman}/4` : 'Belum ada data penilaian proses'}
${nilaiEvaluasi ? `Nilai evaluasi: ${nilaiEvaluasi.nilai}` : 'Belum ada nilai evaluasi'}
${karakter?.length > 0 ? `Catatan karakter: ${karakter.map(c => c.catatan).join('; ')}` : 'Tidak ada catatan karakter khusus'}

Tulis laporan singkat (3-4 paragraf) yang mencakup:
1. Pembuka hangat menyebut nama anak dan bab yang dipelajari
2. Perkembangan selama bab berlangsung (kehadiran, keaktifan, fokus, pemahaman)
3. Hasil evaluasi dan catatan karakter jika ada
4. Penutup berisi saran/motivasi untuk orang tua dan anak

Langsung tulis isi laporannya saja tanpa judul.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const narasi = data.content?.[0]?.text || 'Gagal membuat narasi. Coba lagi.'
      setLaporan(prev => ({ ...prev, [murid.id]: { narasi, loading: false } }))
    } catch {
      setLaporan(prev => ({ ...prev, [murid.id]: { narasi: 'Gagal terhubung ke AI. Pastikan sudah mengatur API key.', loading: false } }))
    }
  }

  async function buatSemuaLaporan() {
    for (const murid of muridList) {
      await buatLaporanSatuMurid(murid)
    }
  }

  function bagikanWhatsApp(murid, narasi) {
    const tglSelesai = bab.tanggal_selesai || format(new Date(), 'yyyy-MM-dd')
    const pesan = `*Laporan Perkembangan Belajar*\n*SDN Pasirkaliki I*\n\n*Nama:* ${murid.nama}\n*Kelas:* ${kelas.nama}\n*Mata Pelajaran:* ${bab.mata_pelajaran}\n*Bab ${bab.nomor_bab}:* ${bab.judul_bab}\n\n${narasi}\n\n_Salam hangat,_\n_${profile.nama}_\n_Wali Kelas ${kelas.nama}_`
    const url = `https://wa.me/?text=${encodeURIComponent(pesan)}`
    window.open(url, '_blank')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <p className="text-navy-300 text-xs">{bab?.mata_pelajaran}</p>
          <h2 className="text-white font-bold text-lg">Laporan Bab {bab?.nomor_bab}</h2>
          <p className="text-navy-200 text-sm">{bab?.judul_bab}</p>
          <p className="text-navy-400 text-xs mt-1">
            {bab?.tanggal_mulai && format(new Date(bab.tanggal_mulai + 'T00:00:00'), 'd MMM', { locale: id })}
            {bab?.tanggal_selesai && ` – ${format(new Date(bab.tanggal_selesai + 'T00:00:00'), 'd MMM yyyy', { locale: id })}`}
          </p>
        </div>

        <div className="px-4 -mt-5 mb-4">
          <button onClick={buatSemuaLaporan}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Sparkles size={16} /> Buat Laporan Semua Murid dengan AI
          </button>
        </div>

        <div className="px-4 space-y-3">
          {muridList.map(m => {
            const lap = laporan[m.id]
            const isExpanded = expandedMurid === m.id
            return (
              <div key={m.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{m.nama}</p>
                    <p className="text-xs text-gray-400">{m.nis ? `NIS: ${m.nis}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!lap && (
                      <button onClick={() => buatLaporanSatuMurid(m)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-navy-50 text-navy-700 font-semibold border border-navy-200 flex items-center gap-1">
                        <Sparkles size={12} /> Buat
                      </button>
                    )}
                    {lap && (
                      <button onClick={() => setExpandedMurid(isExpanded ? null : m.id)}
                        className="text-gray-400 hover:text-gray-600">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    )}
                  </div>
                </div>

                {lap?.loading && (
                  <div className="mt-3 flex items-center gap-2 text-navy-600 text-xs">
                    <Loader size={14} className="animate-spin" />
                    <span>AI sedang menulis narasi...</span>
                  </div>
                )}

                {lap?.narasi && isExpanded && (
                  <div className="mt-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-100">
                      {lap.narasi}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => {
                          const el = document.createElement('textarea')
                          el.value = lap.narasi
                          document.body.appendChild(el)
                          el.select()
                          document.execCommand('copy')
                          document.body.removeChild(el)
                          alert('Narasi disalin!')
                        }}
                        className="flex-1 text-xs py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                        Salin Teks
                      </button>
                      <button onClick={() => bagikanWhatsApp(m, lap.narasi)}
                        className="flex-1 text-xs py-2 rounded-lg bg-green-500 text-white font-semibold flex items-center justify-center gap-1">
                        <Share2 size={12} /> Kirim WA
                      </button>
                    </div>
                    <button onClick={() => buatLaporanSatuMurid(m)}
                      className="w-full mt-2 text-xs py-1.5 rounded-lg text-navy-600 font-medium">
                      ↻ Buat ulang narasi
                    </button>
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
