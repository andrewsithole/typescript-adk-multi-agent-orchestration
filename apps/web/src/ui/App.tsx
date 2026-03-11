import React, { useCallback, useRef, useState, useEffect } from 'react'
import Markdown from 'react-markdown'

// ── Types ────────────────────────────────────────────────────────────────────

type Frame = {
  author?: string
  text?: string
  calls?: string[]
  responses?: string[]
  escalate?: boolean
  judge_output?: unknown
  error?: string
}

type EventKind = 'system' | 'agent' | 'tool_call' | 'tool_response' | 'escalate' | 'error' | 'judge'

type ActivityEvent = {
  id: number
  kind: EventKind
  author?: string
  text: string
}

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg:          '#09090b',
  surface:     '#18181b',
  surfaceAlt:  '#1f1f23',
  border:      '#27272a',
  borderFocus: '#7c3aed',
  accent:      '#8b5cf6',
  accentText:  '#c4b5fd',
  text:        '#fafafa',
  textSub:     '#a1a1aa',
  textMuted:   '#52525b',
  green:       '#4ade80',
  greenBg:     'rgba(74,222,128,0.08)',
  amber:       '#fbbf24',
  amberBg:     'rgba(251,191,36,0.08)',
  red:         '#f87171',
  redBg:       'rgba(248,113,113,0.08)',
  violet:      '#a78bfa',
  violetBg:    'rgba(167,139,250,0.08)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _eid = 0
function mkEvent(kind: EventKind, text: string, author?: string): ActivityEvent {
  return { id: _eid++, kind, author, text }
}

const AUTHOR_COLORS: Record<string, string> = {
  orchestrator:  C.accent,
  'course_creator': C.accent,
  researcher:    C.green,
  writer:        '#60a5fa',
  judge:         C.amber,
  system:        C.textMuted,
}

function authorColor(name?: string): string {
  if (!name) return C.textMuted
  const lower = name.toLowerCase()
  for (const [key, color] of Object.entries(AUTHOR_COLORS)) {
    if (lower.includes(key)) return color
  }
  return C.accentText
}

function authorLabel(name?: string): string {
  if (!name) return 'system'
  return name.replace(/_/g, ' ')
}

// ── Event row components ──────────────────────────────────────────────────────

function SystemRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', userSelect: 'none' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

function AgentRow({ author, text }: { author?: string; text: string }) {
  const color = authorColor(author)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {authorLabel(author)}
      </span>
      <p style={{
        margin: 0,
        fontSize: 14,
        lineHeight: 1.7,
        color: C.text,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {text}
      </p>
    </div>
  )
}

function ToolCallRow({ author, text }: { author?: string; text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      background: C.violetBg,
      border: `1px solid rgba(167,139,250,0.15)`,
      borderRadius: 6,
    }}>
      <span style={{ fontSize: 12, color: C.violet, opacity: 0.7 }}>↳</span>
      <span style={{ fontSize: 12, color: C.textSub, fontFamily: 'monospace' }}>calling</span>
      <span style={{ fontSize: 12, color: C.violet, fontFamily: 'monospace', fontWeight: 500 }}>{text}</span>
      {author && (
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.textMuted, fontFamily: 'monospace' }}>
          via {authorLabel(author)}
        </span>
      )}
    </div>
  )
}

function ToolResponseRow({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      background: C.greenBg,
      border: `1px solid rgba(74,222,128,0.12)`,
      borderRadius: 6,
    }}>
      <span style={{ fontSize: 12, color: C.green, opacity: 0.7 }}>←</span>
      <span style={{ fontSize: 12, color: C.textSub, fontFamily: 'monospace' }}>got</span>
      <span style={{ fontSize: 12, color: C.green, fontFamily: 'monospace', fontWeight: 500 }}>{text}</span>
    </div>
  )
}

function EscalateRow({ author }: { author?: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      background: C.amberBg,
      border: `1px solid rgba(251,191,36,0.15)`,
      borderRadius: 6,
    }}>
      <span style={{ fontSize: 12, color: C.amber }}>↑</span>
      <span style={{ fontSize: 12, color: C.amber }}>
        {author ? `${authorLabel(author)} escalating to parent` : 'escalating to parent agent'}
      </span>
    </div>
  )
}

function ErrorRow({ text }: { text: string }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: C.redBg,
      border: `1px solid rgba(248,113,113,0.2)`,
      borderRadius: 6,
    }}>
      <span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>Error · </span>
      <span style={{ fontSize: 13, color: C.red }}>{text}</span>
    </div>
  )
}

function JudgeRow({ text }: { text: string }) {
  return (
    <div style={{
      padding: '12px',
      background: C.amberBg,
      border: `1px solid rgba(251,191,36,0.2)`,
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        Judge Output
      </div>
      <pre style={{ margin: 0, fontSize: 12, color: C.amber, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {text}
      </pre>
    </div>
  )
}

function EventRow({ event }: { event: ActivityEvent }) {
  switch (event.kind) {
    case 'system':        return <SystemRow text={event.text} />
    case 'agent':         return <AgentRow author={event.author} text={event.text} />
    case 'tool_call':     return <ToolCallRow author={event.author} text={event.text} />
    case 'tool_response': return <ToolResponseRow text={event.text} />
    case 'escalate':      return <EscalateRow author={event.author} />
    case 'error':         return <ErrorRow text={event.text} />
    case 'judge':         return <JudgeRow text={event.text} />
  }
}

function MarkdownOutput({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 15, lineHeight: 1.8, color: C.text, wordBreak: 'break-word' }}>
      <style>{`
        .md h1 { font-size: 22px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em; color: ${C.text}; }
        .md h2 { font-size: 18px; font-weight: 600; margin: 28px 0 10px; color: ${C.text}; }
        .md h3 { font-size: 15px; font-weight: 600; margin: 20px 0 8px; color: ${C.text}; }
        .md p  { margin: 0 0 12px; color: ${C.textSub}; }
        .md ul, .md ol { margin: 0 0 12px; padding-left: 20px; color: ${C.textSub}; }
        .md li { margin-bottom: 4px; }
        .md strong { color: ${C.text}; font-weight: 600; }
        .md code { font-family: monospace; font-size: 13px; background: ${C.surfaceAlt}; border: 1px solid ${C.border}; border-radius: 4px; padding: 1px 5px; color: ${C.accentText}; }
        .md pre  { background: ${C.surfaceAlt}; border: 1px solid ${C.border}; border-radius: 8px; padding: 14px 16px; overflow-x: auto; margin: 0 0 16px; }
        .md pre code { background: none; border: none; padding: 0; color: ${C.text}; font-size: 13px; }
        .md blockquote { border-left: 3px solid ${C.border}; margin: 0 0 12px; padding-left: 14px; color: ${C.textMuted}; font-style: italic; }
        .md hr { border: none; border-top: 1px solid ${C.border}; margin: 20px 0; }
        .md a { color: ${C.accent}; text-decoration: none; }
        .md a:hover { text-decoration: underline; }
      `}</style>
      <div className="md">
        <Markdown>{text}</Markdown>
      </div>
    </div>
  )
}

function StreamingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: C.accent,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color: C.textMuted }}>Generating…</span>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export function App() {
  const uidRef = useRef<string>('')
  const sidRef = useRef<string>('')
  const [hasSession, setHasSession] = useState(false)
  const [query, setQuery] = useState('')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [maxIterations, setMaxIterations] = useState(1)
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showActivity, setShowActivity] = useState(false)

  const esRef = useRef<EventSource | null>(null)
  const feedEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const stored = (k: string, prefix: string) => {
      try { return localStorage.getItem(k) || '' } catch { return '' }
    }
    const mkId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`

    let uid = stored('uid', 'u')
    if (!uid) { uid = mkId('u'); try { localStorage.setItem('uid', uid) } catch {} }
    uidRef.current = uid

    let sid = stored('sid', 's')
    if (!sid) { sid = mkId('s'); try { localStorage.setItem('sid', sid) } catch {} }
    sidRef.current = sid
  }, [])

  useEffect(() => {
    if (autoScroll) feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, autoScroll])

  const pushEvent = useCallback((e: ActivityEvent) => {
    setEvents(prev => [...prev.slice(-500), e])
  }, [])

  const createNewSession = useCallback(async () => {
    const sid = `s_${Math.random().toString(36).slice(2, 10)}`
    sidRef.current = sid
    try { localStorage.setItem('sid', sid) } catch {}
    try {
      const resp = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uidRef.current, sessionId: sidRef.current }),
      })
      if (!resp.ok) throw new Error('Failed to create session')
      setHasSession(true)
      setEvents([])
    } catch (err) {
      pushEvent(mkEvent('error', (err as Error).message))
    }
  }, [pushEvent])

  const initSession = useCallback(async () => {
    try {
      const resp = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uidRef.current, sessionId: sidRef.current }),
      })
      if (!resp.ok) throw new Error('Failed to create session')
      setHasSession(true)
    } catch (err) {
      pushEvent(mkEvent('error', (err as Error).message))
    }
  }, [pushEvent])

  useEffect(() => {
    if (!hasSession) initSession()
  }, [hasSession, initSession])

  const start = useCallback(() => {
    if (!query.trim() || query.length > 2000) return
    if (esRef.current) esRef.current.close()

    setIsLoading(true)
    const url = new URL('/api/run/stream', window.location.origin)
    url.searchParams.set('userId', uidRef.current)
    url.searchParams.set('sessionId', sidRef.current)
    url.searchParams.set('q', query)
    url.searchParams.set('model', model)
    url.searchParams.set('maxIterations', String(maxIterations))

    const es = new EventSource(url.toString())

    es.onopen = () => {
      pushEvent(mkEvent('system', 'Connected'))
    }

    es.onmessage = (ev) => {
      try {
        const data: Frame = JSON.parse(ev.data)
        if (data.error) {
          pushEvent(mkEvent('error', data.error))
          return
        }
        if (data.text) pushEvent(mkEvent('agent', data.text, data.author))
        else if (data.author && data.author !== 'user') {
          // no-text agent event — skip, tool calls below are more informative
        }
        data.calls?.forEach(c => pushEvent(mkEvent('tool_call', c, data.author)))
        data.responses?.forEach(r => pushEvent(mkEvent('tool_response', r)))
        if (data.escalate) pushEvent(mkEvent('escalate', '', data.author))
        if (data.judge_output) {
          pushEvent(mkEvent('judge', typeof data.judge_output === 'string'
            ? data.judge_output
            : JSON.stringify(data.judge_output, null, 2)))
        }
      } catch (e) {
        console.error('SSE parse error', e)
      }
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      setIsLoading(false)
      pushEvent(mkEvent('system', 'Disconnected'))
    }

    esRef.current = es
  }, [query, model, maxIterations, pushEvent])

  const stop = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    setIsLoading(false)
    pushEvent(mkEvent('system', 'Stopped'))
  }, [pushEvent])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isLoading && hasSession && query.trim()) {
      start()
    }
  }

  const isEmpty = events.length === 0

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1); }
        }
        textarea:focus { outline: none; border-color: ${C.borderFocus} !important; }
        select:focus   { outline: none; border-color: ${C.borderFocus} !important; }
        input:focus    { outline: none; border-color: ${C.borderFocus} !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.textMuted}; }
      `}</style>

      <div style={{
        minHeight: '100dvh',
        background: C.bg,
        color: C.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 16px',
      }}>
        {/* Header */}
        <header style={{
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 0 0',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: C.text }}>
              Course Creator
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted }}>
              AI-powered course generation
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {events.length > 0 && (
              <button onClick={createNewSession} style={{
                background: 'none',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 12,
                color: C.textSub,
                cursor: 'pointer',
              }}>
                New conversation
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isLoading ? C.accent : (hasSession ? C.green : C.textMuted),
                boxShadow: isLoading ? `0 0 8px ${C.accent}` : 'none',
                transition: 'all 0.3s',
              }} />
              <span style={{ fontSize: 12, color: C.textMuted }}>
                {isLoading ? 'Generating' : hasSession ? 'Ready' : 'Connecting'}
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main style={{ width: '100%', maxWidth: 720, flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 32, paddingBottom: 40, gap: 24 }}>

          {/* Composer */}
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What would you like to learn about?"
              rows={3}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 15,
                lineHeight: 1.6,
                resize: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
            />

            {/* Controls row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              flexWrap: 'wrap',
            }}>
              {/* Model selector */}
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                style={{
                  background: C.surfaceAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: '5px 8px',
                  fontSize: 12,
                  color: C.textSub,
                  cursor: 'pointer',
                }}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>

              {/* Iterations */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>Depth</span>
                <input
                  type="number"
                  value={maxIterations}
                  min={1}
                  max={10}
                  onChange={e => setMaxIterations(Number(e.target.value))}
                  style={{
                    width: 48,
                    background: C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    padding: '5px 8px',
                    fontSize: 12,
                    color: C.textSub,
                    textAlign: 'center',
                  }}
                />
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Stop button */}
              {isLoading && (
                <button onClick={stop} style={{
                  background: 'none',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  color: C.textSub,
                  cursor: 'pointer',
                }}>
                  Stop
                </button>
              )}

              {/* Generate button */}
              {!isLoading && (
                <button
                  onClick={start}
                  disabled={!hasSession || !query.trim()}
                  style={{
                    background: hasSession && query.trim() ? C.accent : C.border,
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: hasSession && query.trim() ? '#fff' : C.textMuted,
                    cursor: hasSession && query.trim() ? 'pointer' : 'default',
                    transition: 'background 0.2s',
                  }}
                >
                  Generate ⌘↵
                </button>
              )}
            </div>
          </div>

          {/* Feed */}
          {isEmpty && !isLoading ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '60px 0',
              color: C.textMuted,
            }}>
              <div style={{ fontSize: 32, opacity: 0.3 }}>✦</div>
              <p style={{ margin: 0, fontSize: 14 }}>Enter a topic above to get started</p>
            </div>
          ) : (() => {
            // The final output is the last agent text event (will be the formatter's output once built).
            // Everything else is intermediate activity.
            const agentTextEvents = events.filter(e => e.kind === 'agent')
            const finalOutput = !isLoading && agentTextEvents.length > 0 ? agentTextEvents.at(-1)! : null
            const activityEvents = finalOutput ? events.filter(e => e.id !== finalOutput.id) : events
            const latestStatusText = events.filter(e => e.text).at(-1)?.text ?? 'Working…'

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* While streaming: single animated status line */}
                {isLoading && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    padding: '20px 0',
                  }}>
                    <StreamingIndicator />
                    <p style={{
                      margin: 0,
                      fontSize: 14,
                      color: C.textSub,
                      lineHeight: 1.6,
                      transition: 'opacity 0.3s',
                    }}>
                      {latestStatusText}
                    </p>
                  </div>
                )}

                {/* Final output — prominent once streaming ends */}
                {finalOutput && (
                  <div style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: '24px 28px',
                  }}>
                    <MarkdownOutput text={finalOutput.text} />
                  </div>
                )}

                {/* Activity log toggle */}
                {activityEvents.length > 0 && !isLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      onClick={() => setShowActivity(v => !v)}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: 12,
                        color: C.textMuted,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 10, transition: 'transform 0.2s', display: 'inline-block', transform: showActivity ? 'rotate(90deg)' : 'none' }}>▶</span>
                      {showActivity ? 'Hide' : 'View'} activity · {activityEvents.length} step{activityEvents.length !== 1 ? 's' : ''}
                    </button>

                    {showActivity && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        paddingLeft: 12,
                        borderLeft: `2px solid ${C.border}`,
                      }}>
                        {activityEvents.map(event => (
                          <EventRow key={event.id} event={event} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div ref={feedEndRef} />
              </div>
            )
          })()}
        </main>
      </div>
    </>
  )
}
