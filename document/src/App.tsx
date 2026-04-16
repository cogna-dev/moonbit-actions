import { useState, useEffect, useCallback, useMemo } from 'react'
import { Moon, Sun, FileText, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { cn } from '@/lib/utils'

interface Heading {
  id: string
  text: string
  level: number
}

interface AppProps {
  readmeMap: Record<string, string>
  pageTitle: string
  repoFullName: string
}

// ---------------------------------------------------------------------------
// Hash routing helpers.
// The SPA uses the URL hash to encode the current README path:
//   #/        → root README  (key "")
//   #/src     → src/README.md  (key "src")
//   #/a/b/c   → a/b/c/README.md  (key "a/b/c")
// ---------------------------------------------------------------------------
function hashToKey(hash: string): string {
  if (!hash || hash === '#' || hash === '#/') return ''
  return hash.replace(/^#\/?/, '').replace(/\/$/, '')
}

function keyToHash(key: string): string {
  return key ? `#/${key}` : '#/'
}

// ---------------------------------------------------------------------------
// Heading extraction: mirrors github-slugger duplicate-counting behaviour.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Directory tree helpers.
// ---------------------------------------------------------------------------

/** Label shown in the sidebar for a given README key. */
function keyLabel(key: string): string {
  if (!key) return 'README'
  const parts = key.split('/')
  return parts[parts.length - 1]
}

/** Depth of a key (0 = root). */
function keyDepth(key: string): number {
  return key ? key.split('/').length : 0
}

const ASCII_BANNER = `
  ███╗   ███╗ ██████╗  ██████╗ ███╗   ██╗██████╗ ██╗████████╗
  ████╗ ████║██╔═══██╗██╔═══██╗████╗  ██║██╔══██╗██║╚══██╔══╝
  ██╔████╔██║██║   ██║██║   ██║██╔██╗ ██║██████╔╝██║   ██║   
  ██║╚██╔╝██║██║   ██║██║   ██║██║╚██╗██║██╔══██╗██║   ██║   
  ██║ ╚═╝ ██║╚██████╔╝╚██████╔╝██║ ╚████║██████╔╝██║   ██║   
  ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚═╝   ╚═╝   
                                         — ACTIONS FOR MOONBIT 🌙`.trimStart()

export default function App({ readmeMap, pageTitle, repoFullName }: AppProps) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  // Hash-based routing: derive the current README key from window.location.hash.
  const [currentKey, setCurrentKey] = useState(() =>
    hashToKey(window.location.hash),
  )

  const [activeId, setActiveId] = useState('')

  // All sorted README keys (root first, then alphabetical).
  const sortedKeys = useMemo(() => {
    const keys = Object.keys(readmeMap)
    keys.sort((a, b) => {
      if (a === '') return -1
      if (b === '') return 1
      return a.localeCompare(b)
    })
    return keys
  }, [readmeMap])

  const hasMultipleReadmes = sortedKeys.length > 1

  // Resolve the content for the current route, falling back to root.
  const currentContent = readmeMap[currentKey] ?? readmeMap[''] ?? ''
  const headings = useMemo(() => extractHeadings(currentContent), [currentContent])

  // Sync the in-app key with hash changes (browser back/forward).
  useEffect(() => {
    const onHashChange = () => setCurrentKey(hashToKey(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // If the current key is not in the map, redirect to root.
  useEffect(() => {
    if (!(currentKey in readmeMap) && readmeMap[''] !== undefined) {
      navigate('')
    }
  }, [currentKey, readmeMap])

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

  // Reset scroll and active heading whenever the page changes.
  useEffect(() => {
    window.scrollTo({ top: 0 })
    setActiveId('')
  }, [currentKey])

  function navigate(key: string) {
    window.location.hash = keyToHash(key)
    setCurrentKey(key)
  }

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

  const readmeKeySet = useMemo(() => new Set(sortedKeys), [sortedKeys])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Org · repo breadcrumb — clicking root README resets navigation */}
          <button
            className="flex items-center gap-1 min-w-0 hover:opacity-80 transition-opacity"
            onClick={() => navigate('')}
          >
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
          </button>

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
        <div className="container mx-auto max-w-7xl px-4 py-8">
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

      {/* Three-column layout: left file tree | content | right TOC */}
      <div className="container mx-auto max-w-7xl px-4 flex gap-0">

        {/* Left sidebar: directory / file tree (only when > 1 README) */}
        {hasMultipleReadmes && (
          <aside className="hidden lg:block w-52 flex-shrink-0 border-r border-border/40">
            <nav
              aria-label="Documentation pages"
              className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 pr-4 space-y-0.5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 pl-2">
                Pages
              </p>
              {sortedKeys.map((key) => {
                const depth = keyDepth(key)
                const label = keyLabel(key)
                const isActive = key === currentKey
                return (
                  <button
                    key={key}
                    onClick={() => navigate(key)}
                    style={depth > 0 ? { paddingLeft: `${Math.min(depth * 3 + 2, 10) * 0.25}rem` } : undefined}
                    className={cn(
                      'flex items-center gap-1.5 w-full text-left py-1 px-2 rounded text-sm transition-colors hover:bg-accent hover:text-accent-foreground truncate',
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground',
                    )}
                  >
                    {depth > 0 && (
                      <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/50" />
                    )}
                    <FileText className="h-3 w-3 flex-shrink-0 opacity-60" />
                    <span className="truncate">{label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className={cn('flex-1 min-w-0 py-8', hasMultipleReadmes ? 'px-6 lg:px-8' : '')}>
          {/* Breadcrumb path for sub-README pages */}
          {currentKey && (
            <p className="text-xs text-muted-foreground font-mono mb-4">
              {currentKey}/README.md
            </p>
          )}
          <MarkdownRenderer
            content={currentContent}
            currentPath={currentKey}
            readmeKeys={readmeKeySet}
            onNavigate={navigate}
          />
        </main>

        {/* Right-side TOC — visible only on large screens */}
        {headings.length > 0 && (
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <nav
              aria-label="On this page"
              className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 pl-4 space-y-1"
            >
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
