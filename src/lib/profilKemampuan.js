// Helper perhitungan & klasifikasi Profil Kemampuan Murid.
// Skor gabungan = rata-rata(nilai Sumatif) + rata-rata(pemahaman Formatif dikonversi skala 1-4 -> 0-100), masing-masing berbobot sama.
// Jika salah satu jenis data belum ada, klasifikasi dihitung dari data yang tersedia saja.

export const KLASIFIKASI = {
  MAHIR: { label: 'Mahir', warna: 'green', min: 80 },
  BERKEMBANG: { label: 'Berkembang', warna: 'blue', min: 60 },
  PENDAMPINGAN: { label: 'Perlu Pendampingan', warna: 'orange', min: 0 },
}

export function klasifikasiSkor(skor) {
  if (skor === null || skor === undefined) return null
  if (skor >= KLASIFIKASI.MAHIR.min) return KLASIFIKASI.MAHIR
  if (skor >= KLASIFIKASI.BERKEMBANG.min) return KLASIFIKASI.BERKEMBANG
  return KLASIFIKASI.PENDAMPINGAN
}

function rerata(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
}

// Ambil & hitung profil kemampuan satu murid, dikelompokkan per mata pelajaran.
export async function hitungProfilKemampuan(supabase, muridId) {
  const [{ data: sumatif }, { data: formatif }] = await Promise.all([
    supabase.from('penilaian_sumatif').select('mata_pelajaran, nilai').eq('murid_id', muridId),
    supabase.from('penilaian_formatif').select('mata_pelajaran, pemahaman').eq('murid_id', muridId),
  ])

  const mapelSet = new Set([
    ...(sumatif || []).map(s => s.mata_pelajaran),
    ...(formatif || []).map(f => f.mata_pelajaran),
  ])

  const hasil = []
  for (const mapel of mapelSet) {
    const nilaiSumatif = (sumatif || [])
      .filter(s => s.mata_pelajaran === mapel && s.nilai !== null && s.nilai !== undefined)
      .map(s => s.nilai)
    const nilaiFormatif = (formatif || [])
      .filter(f => f.mata_pelajaran === mapel && f.pemahaman !== null && f.pemahaman !== undefined)
      .map(f => f.pemahaman)

    const avgSumatif = rerata(nilaiSumatif) // skala 0-100
    const avgFormatifSkala4 = rerata(nilaiFormatif) // skala 1-4
    const avgFormatif100 = avgFormatifSkala4 !== null ? (avgFormatifSkala4 / 4) * 100 : null

    let skorGabungan = null
    if (avgSumatif !== null && avgFormatif100 !== null) {
      skorGabungan = (avgSumatif + avgFormatif100) / 2
    } else if (avgSumatif !== null) {
      skorGabungan = avgSumatif
    } else if (avgFormatif100 !== null) {
      skorGabungan = avgFormatif100
    }

    hasil.push({
      mapel,
      avgSumatif: avgSumatif !== null ? Math.round(avgSumatif) : null,
      avgFormatif: avgFormatif100 !== null ? Math.round(avgFormatif100) : null,
      jumlahDataSumatif: nilaiSumatif.length,
      jumlahDataFormatif: nilaiFormatif.length,
      skorGabungan: skorGabungan !== null ? Math.round(skorGabungan) : null,
      klasifikasi: klasifikasiSkor(skorGabungan),
    })
  }

  return hasil.sort((a, b) => a.mapel.localeCompare(b.mapel))
}

// Ringkasan satu kalimat untuk dipakai sebagai konteks tambahan saat generate RPP AI
// (rencana berikutnya: dukung pembelajaran berdiferensiasi).
export function ringkasanUntukAI(profilList, mapel) {
  const data = profilList.find(p => p.mapel === mapel)
  if (!data || !data.klasifikasi) return null
  return `Klasifikasi kemampuan murid pada mapel ${mapel}: ${data.klasifikasi.label} (skor gabungan ${data.skorGabungan}/100, berdasarkan ${data.jumlahDataSumatif} data sumatif dan ${data.jumlahDataFormatif} data formatif).`
}
