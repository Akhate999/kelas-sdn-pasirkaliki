'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Menu, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Download, ArrowLeft, BookOpen, Loader
} from 'lucide-react'

export default function BacaModulPage() {
  const router = useRouter()
  const params = useParams()
  const modulId = params.id

  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [modulAktif, setModulAktif] = useState(null)
  const [daftarModul, setDaftarModul] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageNum, setPageNum] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [loadingPdf, setLoadingPdf] = useState(true)
  const [loadingPage, setLoadingPage] = useState(false)
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)

  // Load user & daftar modul
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setRole(prof.role)

      const { data: modulData } = await supabase.from('modul_ajar').select('*').eq('id', modulId).single()
      if (!modulData) { router.push('/modul'); return }
      setModulAktif(modulData)

      const { data: siblings } = await supabase.from('modul_ajar')
        .select('*').eq('mata_pelajaran', modulData.mata_pelajaran)
        .order('urutan')
      setDaftarModul(siblings || [])
    }
    load()
  }, [modulId, router])

  // Load PDF document via pdfjs
  useEffect(() => {
    if (!modulAktif?.file_url) return
    let cancelled = false
    setLoadingPdf(true)
    setPageNum(1)

    async function loadPdf() {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      try {
        const loadingTask = pdfjsLib.getDocument(modulAktif.file_url)
        const doc = await loadingTask.promise
        if (cancelled) return
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
      } catch (err) {
        console.error('Gagal memuat PDF', err)
      }
      setLoadingPdf(false)
    }
    loadPdf()
    return () => { cancelled = true }
  }, [modulAktif])

  // Render halaman ke canvas
  const renderPage = useCallback(async (num) => {
    if (!pdfDoc || !canvasRef.current) return
    setLoadingPage(true)
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
    }
    const page = await pdfDoc.getPage(num)
    const viewport = page.getViewport({ scale })
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const renderTask = page.render({ canvasContext: context, viewport })
    renderTaskRef.current = renderTask
    try {
      await renderTask.promise
    } catch (e) {
      // dibatalkan, abaikan
    }
    setLoadingPage(false)
  }, [pdfDoc, scale])

  useEffect(() => {
    if (pdfDoc) renderPage(pageNum)
  }, [pdfDoc, pageNum, scale, renderPage])

  function gantiModul(m) {
    if (!m.file_url) return
    setModulAktif(m)
    setSidebarOpen(false)
  }

  function halamanSebelumnya() { if (pageNum > 1) setPageNum(p => p - 1) }
  function halamanBerikutnya() { if (pageNum < totalPages) setPageNum(p => p + 1) }
  function perbesar() { setScale(s => Math.min(s + 0.2, 3)) }
  function perkecil() { setScale(s => Math.max(s - 0.2, 0.6)) }

  const backHref = role === 'murid' ? '/murid/modul' : '/modul'

  return (
    <div className="h-screen flex flex-col bg-gray-800 overflow-hidden">
      {/* Top bar */}
      <header className="bg-navy-900 text-white flex items-center px-3 h-14 flex-shrink-0 z-30">
        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-navy-800 rounded-lg">
          <Menu size={20} />
        </button>
        <button onClick={() => router.push(backHref)} className="p-2 hover:bg-navy-800 rounded-lg ml-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0 px-2">
          <p className="text-xs text-navy-300 truncate">{modulAktif?.mata_pelajaran}</p>
          <p className="text-sm font-semibold truncate">{modulAktif?.judul}</p>
        </div>
        {modulAktif?.file_url && (
          <a href={modulAktif.file_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-navy-800 rounded-lg">
            <Download size={18} />
          </a>
        )}
      </header>

      {/* Overlay sidebar */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar daftar isi */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-200 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="bg-navy-800 text-white px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-gold-400 text-xs font-semibold uppercase tracking-wide">Daftar Isi</p>
            <p className="text-sm font-bold">{modulAktif?.mata_pelajaran}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-navy-300 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {daftarModul.map(m => (
            <button key={m.id} onClick={() => gantiModul(m)}
              disabled={!m.file_url}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-50 transition-colors
                ${modulAktif?.id === m.id ? 'bg-navy-50 border-l-4 border-l-navy-700' : 'hover:bg-gray-50'}
                ${!m.file_url ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <span className="w-7 h-7 rounded-lg bg-navy-100 text-navy-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {m.urutan || '-'}
              </span>
              <div className="min-w-0">
                <p className={`text-sm truncate ${modulAktif?.id === m.id ? 'font-bold text-navy-800' : 'text-gray-700'}`}>{m.judul}</p>
                {m.tingkat && <p className="text-xs text-gray-400">Kelas {m.tingkat}</p>}
              </div>
            </button>
          ))}
          {daftarModul.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8 px-4">Belum ada modul lain untuk mata pelajaran ini.</p>
          )}
        </nav>
      </aside>

      {/* Area baca PDF */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        {loadingPdf ? (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <Loader size={32} className="animate-spin mb-3" />
            <p className="text-sm text-gray-300">Memuat modul...</p>
          </div>
        ) : (
          <div className="relative">
            {loadingPage && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                <Loader size={24} className="animate-spin text-navy-700" />
              </div>
            )}
            <canvas ref={canvasRef} className="shadow-2xl bg-white" />
          </div>
        )}
      </div>

      {/* Kontrol bawah: navigasi & zoom */}
      <div className="bg-navy-900 text-white flex items-center justify-between px-3 py-2 flex-shrink-0 z-30">
        <div className="flex items-center gap-1">
          <button onClick={perkecil} className="p-2 hover:bg-navy-800 rounded-lg"><ZoomOut size={18} /></button>
          <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={perbesar} className="p-2 hover:bg-navy-800 rounded-lg"><ZoomIn size={18} /></button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={halamanSebelumnya} disabled={pageNum <= 1}
            className="p-2 hover:bg-navy-800 rounded-lg disabled:opacity-30">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium">{pageNum} / {totalPages}</span>
          <button onClick={halamanBerikutnya} disabled={pageNum >= totalPages}
            className="p-2 hover:bg-navy-800 rounded-lg disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="w-16" />
      </div>
    </div>
  )
}
