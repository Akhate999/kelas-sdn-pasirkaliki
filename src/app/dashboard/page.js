'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { ClipboardList, Heart, BarChart2, Award, BookOpen, Users, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [kelas, setKelas]       = useState(null)
  const [stats, setStats]       = useState({ murid: 0, hadir: 0, absenHari: 0 })
  const [loading, setLoading]   = useState(true)
  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || prof.role === 'murid') { router.push('/'); return }
      setProfile(prof)

      const { data: kls } = await supabase
        .from('kelas').select('*').eq('wali_kelas_id', prof.id).single()
      setKelas(kls)

      if (kls) {
        const { count: jumlahMurid } = await supabase
          .from('murid').select('*', { count: 'exact', head: true }).eq('kelas_id', kls.id)

        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const { count: jumlahAbsen } = await supabase
          .from('absensi').select('*', { count: 'exact', head: true })
          .eq('kelas_id', kls.id).eq('tanggal', todayStr)

        const { count: tidakHadir } = await supabase
          .from('absensi').select('*', { count: 'exact', head: true })
          .eq('kelas_id', kls.id).eq('tanggal', todayStr)
          .neq('status', 'hadir')

        setStats({ murid: jumlahMurid || 0, hadir: jumlahAbsen || 0, tidakHadir: tidakHadir || 0 })
      }
      setLoading(false)
    }
    load()
  }, [router])

  const menus = [
    { href: '/absensi',  label: 'Absensi Harian',     icon: ClipboardList, color: 'bg-blue-50 text-blue-700',   desc: 'Catat kehadiran murid' },
    { href: '/karakter', label: 'Catatan Karakter',   icon: Heart,         color: 'bg-rose-50 text-rose-700',   desc: 'Disiplin & akhlak' },
    { href: '/formatif', label: 'Formatif',           icon: BarChart2,     color: 'bg-amber-50 text-amber-700', desc: 'Keaktifan & pemahaman' },
    { href: '/sumatif',  label: 'Sumatif',            icon: Award,         color: 'bg-green-50 text-green-700', desc: 'Nilai ulangan & ujian' },
    { href: '/modul',    label: 'Modul Ajar',         icon: BookOpen,      color: 'bg-purple-50 text-purple-700',desc: 'Buku & bahan ajar' },
    { href: '/murid',    label: 'Data Murid',         icon: Users,         color: 'bg-navy-50 text-navy-700',   desc: 'Kelola data murid' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-sm">Memuat dashboard...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar namaGuru={profile?.nama} namaKelas={kelas?.nama} />

      <main className="pt-14">
        {/* Hero banner */}
        <div className="bg-navy-800 text-white px-4 pt-6 pb-10">
          <p className="text-navy-300 text-xs mb-1">{today}</p>
          <h2 className="text-xl font-bold">Selamat Datang,</h2>
          <p className="text-navy-200 text-sm">{profile?.nama}</p>
          {kelas && (
            <div className="mt-3 bg-navy-700 rounded-xl px-4 py-3 inline-block">
              <p className="text-gold-400 text-xs font-semibold">Wali Kelas</p>
              <p className="text-white font-bold">{kelas.nama} · {kelas.tahun_ajaran}</p>
            </div>
          )}
        </div>

        {/* Stats card */}
        <div className="px-4 -mt-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
            <div className="p-3 text-center">
              <p className="text-2xl font-bold text-navy-700">{stats.murid}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Murid</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.hadir}</p>
              <p className="text-xs text-gray-500 mt-0.5">Absen Hari Ini</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{stats.tidakHadir || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Tidak Hadir</p>
            </div>
          </div>
        </div>

        {/* Menu grid */}
        <div className="px-4 mt-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-navy-600" />
            <h3 className="text-sm font-semibold text-navy-800">Menu Utama</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {menus.map(({ href, label, icon: Icon, color, desc }) => (
              <Link
                key={href}
                href={href}
                className="card hover:shadow-md transition-shadow active:scale-95 flex flex-col gap-2"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
