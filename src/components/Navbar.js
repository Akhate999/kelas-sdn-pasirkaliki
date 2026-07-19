'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, ClipboardList, Heart, BarChart2,
  Award, BookOpen, Users, Menu, X, LogOut, ChevronRight, BookMarked, FileText, ClipboardCheck
} from 'lucide-react'

const menuItems = [
  { href: '/dashboard',  label: 'Dashboard',           icon: LayoutDashboard },
  { href: '/absensi',    label: 'Absensi Harian',      icon: ClipboardList },
  { href: '/karakter',   label: 'Catatan Karakter',    icon: Heart },
  { href: '/formatif',   label: 'Penilaian Formatif',  icon: BarChart2 },
  { href: '/sumatif',    label: 'Penilaian Sumatif',   icon: Award },
  { href: '/rpp',        label: 'RPP',                 icon: ClipboardCheck },
  { href: '/bab',        label: 'Bab & Laporan',       icon: BookMarked },
  { href: '/modul',      label: 'Modul Ajar',          icon: BookOpen },
  { href: '/murid',      label: 'Data Murid',          icon: Users },
  { href: '/laporan',    label: 'Laporan Administrasi', icon: FileText },
]

export default function Navbar({ namaGuru, namaKelas }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      <header className="bg-navy-800 text-white fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 shadow-md">
        <button onClick={() => setOpen(true)} className="mr-3 p-1.5 rounded-lg hover:bg-navy-700 transition-colors">
          <Menu size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-navy-300 leading-none">SDN Pasirkaliki I</p>
          <p className="text-sm font-semibold truncate leading-snug">{namaKelas || 'Sistem Informasi Kelas'}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-navy-300">Masuk sebagai</p>
          <p className="text-sm font-medium truncate max-w-[140px]">{namaGuru || '—'}</p>
        </div>
      </header>

      {open && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-full w-72 bg-navy-900 z-50 transform transition-transform duration-200 ease-in-out flex flex-col
        ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="bg-navy-800 px-4 py-4 flex items-center gap-3 border-b border-navy-700">
          <div className="w-12 h-12 relative flex-shrink-0">
            <Image src="/logo-sdn.png" alt="Logo SDN Pasirkaliki 1" width={48} height={48} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gold-400 text-xs font-semibold leading-none">Sistem Informasi Kelas</p>
            <p className="text-white font-bold text-sm leading-snug">SDN Pasirkaliki I</p>
            <p className="text-navy-400 text-xs leading-tight">Kec. Rawamerta, Karawang</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-navy-400 hover:text-white p-1 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-navy-700">
          <p className="text-navy-400 text-xs">Wali Kelas</p>
          <p className="text-white text-sm font-semibold">{namaGuru || '—'}</p>
          <p className="text-navy-300 text-xs">{namaKelas || '—'}</p>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {menuItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors
                  ${active ? 'bg-navy-700 text-white border-r-4 border-gold-400' : 'text-navy-300 hover:bg-navy-800 hover:text-white'}`}>
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="text-gold-400" />}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-navy-700 p-4">
          <button onClick={handleLogout} className="flex items-center gap-3 text-sm text-navy-400 hover:text-red-400 transition-colors w-full">
            <LogOut size={18} />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </aside>
    </>
  )
}
