import './globals.css'

export const metadata = {
  title: 'Sistem Informasi Kelas — SDN Pasirkaliki 1',
  description: 'Aplikasi manajemen kelas SDN Pasirkaliki 1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
