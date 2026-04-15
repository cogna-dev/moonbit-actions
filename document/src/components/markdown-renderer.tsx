import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeRaw from 'rehype-raw'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

const components: Components = {
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        'mt-8 scroll-m-20 text-4xl font-bold tracking-tight border-b pb-4 mb-4',
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        'mt-10 scroll-m-20 text-2xl font-semibold tracking-tight border-b pb-2 mb-4',
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        'mt-8 scroll-m-20 text-xl font-semibold tracking-tight mb-3',
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn('mt-6 scroll-m-20 text-lg font-semibold tracking-tight mb-2', className)}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p className={cn('leading-7 [&:not(:first-child)]:mt-4', className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn('font-medium text-primary underline underline-offset-4 hover:opacity-80', className)}
      target={props.href?.startsWith('http') ? '_blank' : undefined}
      rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn('my-4 ml-6 list-disc [&>li]:mt-1', className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn('my-4 ml-6 list-decimal [&>li]:mt-1', className)} {...props} />
  ),
  li: ({ className, ...props }) => (
    <li className={cn('leading-7', className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn('mt-4 border-l-4 border-primary/40 pl-4 italic text-muted-foreground', className)}
      {...props}
    />
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className
    if (isInline) {
      return (
        <code
          className={cn(
            'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code className={cn('font-mono text-sm', className)} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        'my-4 overflow-x-auto rounded-lg border bg-muted p-4 text-sm',
        className,
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="my-4 w-full overflow-auto">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead className={cn('border-b', className)} {...props} />
  ),
  tr: ({ className, ...props }) => (
    <tr className={cn('border-b transition-colors hover:bg-muted/50', className)} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground', className)}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td className={cn('p-4 align-middle', className)} {...props} />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn('my-8 border-border', className)} {...props} />
  ),
  img: ({ className, alt, ...props }) => (
    <img
      className={cn('rounded-md max-w-full h-auto', className)}
      alt={alt}
      {...props}
    />
  ),
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('text-foreground', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
