'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { hitungProfilKemampuan } from '@/lib/profilKemampuan'
import { Loader } from 'lucide-react'

const WARNA_BADGE = {
  green: 'bg-green-50 text-green-700 border-green-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
}

// Props:
// - muridId (wajib): id murid yang dihitung profil kemampuannya
// - tampilanRingkas (opsional): true = hanya badge klasifikasi tanpa rincian angka
//   (cocok untuk dashboard murid), default false (untuk halaman guru)
export default function ProfilKemampuanMurid({ muridId, tampilanRingkas = false }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!muridId) return
    let cancelled = false
    setLoading(true)
    hitungProfilKemampuan(supabase, muridId).then(hasil => {
      if (cancelled) return
      setData(hasil)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [muridId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
        <Loader size={14} className="animate-spin" /> Menghitung profil kemampuan...
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <p className="text-xs text-gray-400 py-4">Belum ada data penilaian untuk menghitung profil kemampuan.</p>
  }

  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.mapel} className="card flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">{d.mapel}</p>
            {!tampilanRingkas && (
              <p className="text-xs text-gray-400 mt-0.5">
                Sumatif: {d.avgSumatif ?? '-'} ({d.jumlahDataSumatif} data) · Formatif: {d.avgFormatif ?? '-'} ({d.jumlahDataFormatif} data)
              </p>
            )}
          </div>
          {d.klasifikasi ? (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex-shrink-0 ${WARNA_BADGE[d.klasifikasi.warna]}`}>
              {d.klasifikasi.label}
            </span>
          ) : (
            <span className="text-xs text-gray-300 flex-shrink-0">Belum ada data</span>
          )}
        </div>
      ))}
    </div>
  )
}
