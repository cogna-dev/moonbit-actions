import { useState, useEffect, useCallback } from 'react'
import { Moon, Sun, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { cn } from '@/lib/utils'

interface Heading {
  id: string
  text: string
  level: number
}

interface AppProps {
  readmeContent: string
  pageTitle: string
}

function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split('\n')
  const headings: Heading[] = []
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)/)
    if (match) {
      const level = match[1].length
      const text = match[2].replace(/[`*_[\]]/g, '').trim()
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
      headings.push({ id, text, level })
    }
  }
  return headings
}

export default function App({ readmeContent, pageTitle }: AppProps) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeId, setActiveId] = useState('')

  const headings = extractHeadings(readmeContent)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY + 100
    let current = ''
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el && el.offsetTop <= scrollY) {
        current = h.id
      }
    }
    setActiveId(current)
  }, [headings])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <span className="font-semibold text-sm truncate max-w-[200px] sm:max-w-none">
              {pageTitle}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 flex gap-8">
        {/* Sidebar */}
        {headings.length > 0 && (
          <>
            {/* Mobile overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            <aside
              className={cn(
                'fixed inset-y-0 left-0 z-50 w-64 bg-background border-r px-4 py-6 overflow-y-auto transition-transform duration-200',
                'md:sticky md:top-14 md:z-auto md:w-56 md:border-0 md:bg-transparent md:flex-shrink-0',
                'md:h-[calc(100vh-3.5rem)] md:translate-x-0',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
              )}
            >
              <nav className="space-y-1 pt-14 md:pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  On this page
                </p>
                {headings.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => scrollTo(h.id)}
                    className={cn(
                      'block w-full text-left py-1 text-sm transition-colors hover:text-foreground truncate',
                      h.level === 1 && 'font-medium',
                      h.level === 2 && 'pl-2',
                      h.level === 3 && 'pl-4 text-xs',
                      activeId === h.id
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground',
                    )}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 py-8">
          <MarkdownRenderer content={readmeContent} />
        </main>
      </div>
    </div>
  )
}
