import { useState, useEffect, useCallback } from 'react'
import { Moon, Sun } from 'lucide-react'
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
  repoFullName: string
}

// Extract headings from markdown, generating duplicate-aware IDs that match
// rehype-slug's behaviour (powered by github-slugger under the hood).
function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split('\n')
  const headings: Heading[] = []
  const slugCounts: Record<string, number> = {}

  for (const line of lines) {
    // Only ATX headings (# through ######) — setext and bold text are excluded.
    const match = line.match(/^(#{1,6})\s+(.+)/)
    if (match) {
      const level = match[1].length
      // Strip inline markdown syntax to get plain text for display and ID.
      const text = match[2]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
        .replace(/[`*_[\]]/g, '')                 // backticks, emphasis
        .trim()

      const baseId = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const count = slugCounts[baseId] ?? 0
      const id = count === 0 ? baseId : `${baseId}-${count}`
      slugCounts[baseId] = count + 1

      headings.push({ id, text, level })
    }
  }
  return headings
}

const ASCII_BANNER = `
  ███╗   ███╗ ██████╗  ██████╗ ███╗   ██╗██████╗ ██╗████████╗
  ████╗ ████║██╔═══██╗██╔═══██╗████╗  ██║██╔══██╗██║╚══██╔══╝
  ██╔████╔██║██║   ██║██║   ██║██╔██╗ ██║██████╔╝██║   ██║   
  ██║╚██╔╝██║██║   ██║██║   ██║██║╚██╗██║██╔══██╗██║   ██║   
  ██║ ╚═╝ ██║╚██████╔╝╚██████╔╝██║ ╚████║██████╔╝██║   ██║   
  ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚═╝   ╚═╝   
                                         — ACTIONS FOR MOONBIT 🌙`.trimStart()

export default function App({ readmeContent, pageTitle, repoFullName }: AppProps) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
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
  }

  // Split repoFullName into owner and repo for styled display.
  const [owner, repo] = repoFullName.includes('/')
    ? repoFullName.split('/', 2)
    : ['', pageTitle]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Org · repo breadcrumb */}
          <div className="flex items-center gap-1 min-w-0">
            {owner && (
              <>
                <span className="text-sm text-muted-foreground font-medium truncate">
                  {owner}
                </span>
                <span className="text-muted-foreground/50 mx-1 select-none font-light text-lg leading-none">
                  ·
                </span>
              </>
            )}
            <span className="font-semibold text-sm truncate">{repo}</span>
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

      {/* Hero banner */}
      <div className="border-b border-border/40 bg-muted/30">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <pre
            aria-hidden="true"
            className="overflow-x-auto text-[0.55rem] leading-tight font-mono text-primary/70 select-none"
          >
            {ASCII_BANNER}
          </pre>
          {repoFullName && (
            <p className="mt-3 text-xs text-muted-foreground font-mono">
              {repoFullName}
            </p>
          )}
        </div>
      </div>

      {/* Content + right-side TOC */}
      <div className="container mx-auto max-w-5xl px-4 flex gap-8">
        {/* Main content */}
        <main className="flex-1 min-w-0 py-8">
          <MarkdownRenderer content={readmeContent} />
        </main>

        {/* Right-side TOC — visible only on large screens */}
        {headings.length > 0 && (
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <nav className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-8 space-y-1">
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
                    h.level === 2 && 'font-medium',
                    h.level === 3 && 'pl-3',
                    h.level >= 4 && 'pl-5 text-xs',
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
        )}
      </div>
    </div>
  )
}
