import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { muridList, kelasNama } = await request.json()
    const hasil = []

    for (const murid of muridList) {
      // Buat email dari nama murid yang disederhanakan
      const namaSlug = murid.nama
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '')
      const kelasSlug = kelasNama
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
      const email = `${namaSlug}.${kelasSlug}@sdn1pasirkaliki.id`
      const password = `Sdn${murid.nis || murid.nisn || '12345'}!`

      // Cek apakah akun sudah ada
      if (murid.user_id) {
        hasil.push({ ...murid, email, password, status: 'sudah_ada' })
        continue
      }

      // Buat akun baru
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nama: murid.nama, role: 'murid' }
      })

      if (authError) {
        // Kalau email sudah dipakai, coba email alternatif dengan NIS
        const emailAlt = `nis.${murid.nis || murid.nisn}.${kelasSlug}@sdn1pasirkaliki.id`
        const { data: authData2, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
          email: emailAlt,
          password,
          email_confirm: true,
          user_metadata: { nama: murid.nama, role: 'murid' }
        })
        if (authError2) {
          hasil.push({ ...murid, email, password, status: 'error', pesan: authError2.message })
          continue
        }
        // Hubungkan ke tabel murid
        await supabaseAdmin.from('murid').update({ user_id: authData2.user.id }).eq('id', murid.id)
        hasil.push({ ...murid, email: emailAlt, password, status: 'berhasil' })
      } else {
        // Hubungkan ke tabel murid
        await supabaseAdmin.from('murid').update({ user_id: authData.user.id }).eq('id', murid.id)
        hasil.push({ ...murid, email, password, status: 'berhasil' })
      }
    }

    return NextResponse.json({ hasil })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
