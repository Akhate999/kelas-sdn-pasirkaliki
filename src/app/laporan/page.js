'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format, differenceInYears, differenceInMonths, startOfMonth, endOfMonth } from 'date-fns'
import { id } from 'date-fns/locale'
import { FileSpreadsheet, Calendar, Users2, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function LaporanPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [kelas, setKelas]     = useState(null)
  const [muridList, setMuridList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('absensi')
  const [bulan, setBulan] = useState(new Date().getMonth())
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [rekapAbsen, setRekapAbsen] = useState([])
  const [rekapUsia, setRekapUsia] = useState([])
  const [loadingRekap, setLoadingRekap] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: kls } = await supabase.from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)
      if (kls) {
        const { data: murid } = await supabase.from('murid').select('*').eq('kelas_id', kls.id).eq('status_murid', 'aktif').order('nama')
        setMuridList(murid || [])
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function generateRekapAbsen() {
    if (!kelas) return
    setLoadingRekap(true)
    const awal = format(startOfMonth(new Date(tahun, bulan)), 'yyyy-MM-dd')
    const akhir = format(endOfMonth(new Date(tahun, bulan)), 'yyyy-MM-dd')
    const { data } = await supabase.from('absensi').select('*').eq('kelas_id', kelas.id).gte('tanggal', awal).lte('tanggal', akhir)

    const rekap = muridList.map(m => {
      const absenMurid = (data || []).filter(a => a.murid_id === m.id)
      return {
        nama: m.nama, nis: m.nis || '-', nisn: m.nisn || '-',
        hadir: absenMurid.filter(a => a.status === 'hadir').length,
        sakit: absenMurid.filter(a => a.status === 'sakit').length,
        izin: absenMurid.filter(a => a.status === 'izin').length,
        alpha: absenMurid.filter(a => a.status === 'alpha').length,
        total: absenMurid.length
      }
    })
    setRekapAbsen(rekap)
    setLoadingRekap(false)
  }

  async function generateRekapUsia() {
    setLoadingRekap(true)
    const tglPelaporan = new Date(tahun, bulan, 1)
    const rekap = muridList.map(m => {
      if (!m.tanggal_lahir) return { nama: m.nama, nis: m.nis || '-', usia: '-', usiaTahun: null, kategori: 'Tidak diketahui' }
      const lahir = new Date(m.tanggal_lahir + 'T00:00:00')
      const tahunUsia = differenceInYears(tglPelaporan, lahir)
      const totalBulan = differenceInMonths(tglPelaporan, lahir)
      const bulanSisa = totalBulan - (tahunUsia * 12)
      let kategori = ''
      if (tahunUsia < 7) kategori = '< 7 tahun'
      else if (tahunUsia <= 9) kategori = '7-9 tahun'
      else if (tahunUsia <= 12) kategori = '10-12 tahun'
      else kategori = '> 12 tahun'
      return { nama: m.nama, nis: m.nis || '-', usia: `${tahunUsia} th ${bulanSisa} bln`, usiaTahun: tahunUsia, kategori }
    })
    setRekapUsia(rekap)
    setLoadingRekap(false)
  }

  useEffect(() => {
    if (!loading && muridList.length > 0) {
      if (tab === 'absensi') generateRekapAbsen()
      if (tab === 'usia') generateRekapUsia()
    }
  }, [tab, bulan, tahun, loading, muridList])

  function exportAbsenExcel() {
    const rows = rekapAbsen.map((r, i) => ({
      'No': i + 1, 'Nama': r.nama, 'NIS': r.nis, 'NISN': r.nisn,
      'Hadir': r.hadir, 'Sakit': r.sakit, 'Izin': r.izin, 'Alpha': r.alpha, 'Total Hari': r.total,
      'Persentase Hadir': r.total > 0 ? `${Math.round((r.hadir / r.total) * 100)}%` : '-'
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{wch:4},{wch:26},{wch:12},{wch:14},{wch:8},{wch:8},{wch:8},{wch:8},{wch:10},{wch:14}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Absensi')
    XLSX.writeFile(wb, `Rekap_Absensi_${kelas.nama}_${BULAN[bulan]}_${tahun}.xlsx`)
  }

  function exportUsiaExcel() {
    const rows = rekapUsia.map((r, i) => ({ 'No': i + 1, 'Nama': r.nama, 'NIS': r.nis, 'Usia': r.usia, 'Kategori Usia': r.kategori }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{wch:4},{wch:26},{wch:12},{wch:16},{wch:16}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Usia')
    XLSX.writeFile(wb, `Rekap_Usia_${kelas.nama}_${BULAN[bulan]}_${tahun}.xlsx`)
  }

  function cetakAbsenPDF() {
    const rows = rekapAbsen.map((r, i) => `<tr><td>${i+1}</td><td>${r.nama}</td><td>${r.nis}</td><td>${r.hadir}</td><td>${r.sakit}</td><td>${r.izin}</td><td>${r.alpha}</td><td>${r.total > 0 ? Math.round((r.hadir/r.total)*100) : 0}%</td></tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rekap Absensi</title><style>
      body{font-family:Arial;padding:30px 40px;color:#222}
      .kop{display:flex;align-items:center;gap:16px;border-bottom:3px solid #163a61;padding-bottom:14px;margin-bottom:20px}
      .kop img{width:60px;height:60px;object-fit:contain}
      .kop .nama{font-size:17px;font-weight:bold;color:#163a61}
      .kop .alamat{font-size:11px;color:#555}
      h1{text-align:center;font-size:15px;color:#163a61;margin-bottom:4px}
      .sub{text-align:center;font-size:12px;color:#666;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#163a61;color:white;padding:6px}
      td{padding:6px;border-bottom:1px solid #eee;text-align:center}
      td:nth-child(2){text-align:left}
      @media print{.no-print{display:none}}
    </style></head><body>
      <div class="no-print" style="text-align:center;margin-bottom:16px"><button onclick="window.print()" style="background:#163a61;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer">🖨️ Cetak PDF</button></div>
      <div class="kop"><img src="/logo-sdn.png"/><div><div class="nama">SDN PASIRKALIKI I</div><div class="alamat">Dusun Sempur Rt 11 Rw 03, Desa Pasirkaliki, Kec. Rawamerta, Kabupaten Karawang</div></div></div>
      <h1>Rekapitulasi Absensi Bulanan</h1>
      <p class="sub">${kelas.nama} · ${BULAN[bulan]} ${tahun}</p>
      <table><tr><th>No</th><th>Nama</th><th>NIS</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alpha</th><th>%</th></tr>${rows}</table>
    </body></html>`
    const win = window.open('', '_blank')
    win.document.write(html); win.document.close()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Memuat...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />
      <main className="pt-14 pb-8">
        <div className="bg-navy-800 px-4 pt-5 pb-8">
          <h2 className="text-white font-bold text-lg">Laporan Administrasi</h2>
          <p className="text-navy-300 text-xs">{kelas?.nama} · Absensi, usia, dan rekap bulanan</p>
        </div>

        <div className="bg-white border-b border-gray-100 flex">
          {[['absensi','Absensi Bulanan', Calendar],['usia','Rekap Usia', Users2]].map(([key,label,Icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors
                ${tab === key ? 'text-navy-700 border-navy-700' : 'text-gray-400 border-transparent'}`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </div>

        <div className="px-4 mt-4 mb-3 flex gap-2">
          <select className="input flex-1" value={bulan} onChange={e => setBulan(parseInt(e.target.value))}>
            {BULAN.map((b, i) => <option key={b} value={i}>{b}</option>)}
          </select>
          <select className="input w-28" value={tahun} onChange={e => setTahun(parseInt(e.target.value))}>
            {[tahun-1, tahun, tahun+1].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {loadingRekap ? (
          <div className="px-4 text-center py-8"><p className="text-gray-400 text-sm">Menghitung rekap...</p></div>
        ) : (
          <>
            {tab === 'absensi' && (
              <div className="px-4 space-y-3">
                <div className="flex gap-2">
                  <button onClick={exportAbsenExcel} className="btn-secondary flex-1 py-2.5 flex items-center justify-center gap-2 text-sm">
                    <FileSpreadsheet size={14} /> Excel
                  </button>
                  <button onClick={cetakAbsenPDF} className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm bg-purple-50 text-purple-700 font-semibold rounded-lg border border-purple-200">
                    <Printer size={14} /> Cetak PDF
                  </button>
                </div>
                {rekapAbsen.map((r, i) => (
                  <div key={i} className="card">
                    <p className="text-sm font-bold text-gray-800">{r.nama}</p>
                    <p className="text-xs text-gray-400 mb-2">NIS: {r.nis}</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-green-50 rounded-lg p-1.5 text-center"><p className="text-sm font-bold text-green-700">{r.hadir}</p><p className="text-xs text-green-600">Hadir</p></div>
                      <div className="bg-yellow-50 rounded-lg p-1.5 text-center"><p className="text-sm font-bold text-yellow-700">{r.sakit}</p><p className="text-xs text-yellow-600">Sakit</p></div>
                      <div className="bg-blue-50 rounded-lg p-1.5 text-center"><p className="text-sm font-bold text-blue-700">{r.izin}</p><p className="text-xs text-blue-600">Izin</p></div>
                      <div className="bg-red-50 rounded-lg p-1.5 text-center"><p className="text-sm font-bold text-red-700">{r.alpha}</p><p className="text-xs text-red-600">Alpha</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'usia' && (
              <div className="px-4 space-y-3">
                <button onClick={exportUsiaExcel} className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
                  <FileSpreadsheet size={14} /> Export Excel
                </button>
                {rekapUsia.map((r, i) => (
                  <div key={i} className="card flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{r.nama}</p>
                      <p className="text-xs text-gray-400">NIS: {r.nis}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-navy-700">{r.usia}</p>
                      <p className="text-xs text-gray-400">{r.kategori}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
