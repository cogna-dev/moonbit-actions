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
  /**
   * Map of page key → processed markdown content.
   *  - Dev/SPA mode: contains ALL pages (hash routing lets the user navigate).
   *  - Production static mode: contains exactly ONE entry (this page only).
   */
  readmeMap: Record<string, string>
  /** Full sorted list of all page keys. Same in every production HTML file. */
  allPageKeys: string[]
  /**
   * The page key baked into this specific HTML file.
   *  - Dev mode: "" (root, overridden by hash routing).
   *  - Static mode: actual key, e.g. "setup" or "".
   */
  currentPageKey: string
  pageTitle: string
  repoFullName: string
}

// ---------------------------------------------------------------------------
// Build-mode detection.
// SPA mode  → readmeMap contains ALL pages (dev server, hash routing).
// Static mode → readmeMap contains exactly the current page (each prod HTML
//               file has its own copy with relative-path navigation).
// ---------------------------------------------------------------------------
function isSPAMode(readmeMap: Record<string, string>, allPageKeys: string[]): boolean {
  return Object.keys(readmeMap).length === allPageKeys.length
}

// ---------------------------------------------------------------------------
// Navigation href helpers.
// ---------------------------------------------------------------------------

/** Hash URL for SPA routing (#/ → root, #/setup → setup page). */
function spaHref(key: string): string {
  return key ? `#/${key}` : '#/'
}

/**
 * Relative HTML path from `fromKey`'s index.html to `toKey`'s index.html.
 * e.g. ("", "setup")      → "setup/"
 *      ("setup", "")      → "../"
 *      ("setup", "doc")   → "../doc/"
 *      ("a/b", "c/d")     → "../../c/d/"
 */
export function relHtmlPath(fromKey: string, toKey: string): string {
  const depth = fromKey ? fromKey.split('/').length : 0
  const up = depth > 0 ? '../'.repeat(depth) : './'
  if (!toKey) return up
  return up + toKey + '/'
}

// ---------------------------------------------------------------------------
// Hash routing helpers (SPA mode only).
// ---------------------------------------------------------------------------
function hashToKey(hash: string): string {
  if (!hash || hash === '#' || hash === '#/') return ''
  return hash.replace(/^#\/?/, '').replace(/\/$/, '')
}

// ---------------------------------------------------------------------------
// Heading extraction: mirrors github-slugger duplicate-counting behaviour.
// ---------------------------------------------------------------------------
function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split('\n')
  const headings: Heading[] = []
  const slugCounts: Record<string, number> = {}

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/)
    if (match) {
      const level = match[1].length
      const text = match[2]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[`*_[\]]/g, '')
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
// Sidebar label / depth helpers.
// ---------------------------------------------------------------------------
function keyLabel(key: string): string {
  if (!key) return 'README'
  const parts = key.split('/')
  return parts[parts.length - 1]
}

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

export default function App({
  readmeMap,
  allPageKeys,
  currentPageKey,
  pageTitle,
  repoFullName,
}: AppProps) {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  )

  const staticMode = !isSPAMode(readmeMap, allPageKeys)

  // In SPA mode, the visible key is driven by the URL hash (mutable).
  // In static mode, it's fixed to the baked-in currentPageKey.
  const [spaKey, setSpaKey] = useState(() =>
    staticMode ? currentPageKey : hashToKey(window.location.hash),
  )
  const activeKey = staticMode ? currentPageKey : spaKey

  const [activeHeadingId, setActiveHeadingId] = useState('')

  // Resolve displayed content.
  const currentContent = staticMode
    ? (readmeMap[currentPageKey] ?? Object.values(readmeMap)[0] ?? '')
    : (readmeMap[spaKey] ?? readmeMap[''] ?? '')

  const headings = useMemo(() => extractHeadings(currentContent), [currentContent])

  const hasMultiplePages = allPageKeys.length > 1

  // ---- SPA hash-change listener -----------------------------------------
  useEffect(() => {
    if (staticMode) return
    const onHashChange = () => setSpaKey(hashToKey(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [staticMode])

  // ---- Redirect unknown hash keys to root (SPA mode only) ---------------
  useEffect(() => {
    if (staticMode) return
    if (!(spaKey in readmeMap) && '' in readmeMap) {
      window.location.hash = spaHref('')
      setSpaKey('')
    }
  }, [spaKey, readmeMap, staticMode])

  // ---- Dark mode toggle --------------------------------------------------
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // ---- Scroll spy --------------------------------------------------------
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY + 100
    let current = ''
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el && el.offsetTop <= scrollY) current = h.id
    }
    setActiveHeadingId(current)
  }, [headings])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Reset scroll when the SPA page changes.
  useEffect(() => {
    if (!staticMode) {
      window.scrollTo({ top: 0 })
      setActiveHeadingId('')
    }
  }, [spaKey, staticMode])

  // ---- Navigation --------------------------------------------------------
  /**
   * Compute the href for a given target page key.
   * Static mode → relative HTML path (proper URL, SEO-friendly).
   * SPA mode    → hash URL (#/key).
   */
  function pageHref(targetKey: string): string {
    if (staticMode) return relHtmlPath(currentPageKey, targetKey)
    return spaHref(targetKey)
  }

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ---- Repo header -------------------------------------------------------
  const [owner, repo] = repoFullName.includes('/')
    ? repoFullName.split('/', 2)
    : ['', pageTitle]

  const readmeKeySet = useMemo(() => new Set(allPageKeys), [allPageKeys])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Org · repo breadcrumb — links to root page */}
          <a
            href={pageHref('')}
            className="flex items-center gap-1 min-w-0 hover:opacity-80 transition-opacity"
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
          </a>

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

        {/* Left sidebar: directory / file tree (only when > 1 page) */}
        {hasMultiplePages && (
          <aside className="hidden lg:block w-52 flex-shrink-0 border-r border-border/40">
            <nav
              aria-label="Documentation pages"
              className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 pr-4 space-y-0.5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 pl-2">
                Pages
              </p>
              {allPageKeys.map((key) => {
                const depth = keyDepth(key)
                const label = keyLabel(key)
                const isActive = key === activeKey
                return (
                  <a
                    key={key}
                    href={pageHref(key)}
                    style={depth > 0 ? { paddingLeft: `${Math.min(depth * 3 + 2, 10) * 0.25}rem` } : undefined}
                    className={cn(
                      'flex items-center gap-1.5 w-full py-1 px-2 rounded text-sm transition-colors hover:bg-accent hover:text-accent-foreground truncate no-underline',
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
                  </a>
                )
              })}
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className={cn('flex-1 min-w-0 py-8', hasMultiplePages ? 'px-6 lg:px-8' : '')}>
          {/* Sub-page breadcrumb */}
          {activeKey && (
            <p className="text-xs text-muted-foreground font-mono mb-4">
              {activeKey}/README.md
            </p>
          )}
          <MarkdownRenderer
            content={currentContent}
            currentPath={activeKey}
            readmeKeys={readmeKeySet}
            isStaticMode={staticMode}
          />
        </main>

        {/* Right-side TOC */}
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
                    activeHeadingId === h.id
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
