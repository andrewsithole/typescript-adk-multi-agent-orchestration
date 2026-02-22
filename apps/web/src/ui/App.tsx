import React, { useCallback, useMemo, useRef, useState } from 'react'

type Frame = {
  author?: string
  text?: string
  calls?: string[]
  responses?: string[]
  escalate?: boolean
  judge_output?: unknown
  error?: string
}

export function App() {
  const [apiBase, setApiBase] = useState<string>(
    (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3000'
  )
  const [userId, setUserId] = useState('user-1')
  const [sessionId, setSessionId] = useState('session-1')
  const [query, setQuery] = useState('Create a course on the history of Coffee.')
  const [lines, setLines] = useState<string[]>([])
  const esRef = useRef<EventSource | null>(null)

  const start = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    const url = new URL('/api/run/stream', apiBase)
    url.searchParams.set('userId', userId)
    url.searchParams.set('sessionId', sessionId)
    url.searchParams.set('q', query)

    const es = new EventSource(url.toString())
    es.onmessage = (ev) => {
      try {
        const data: Frame = JSON.parse(ev.data)
        const out: string[] = []
        if (data.error) out.push(`- [error] ${data.error}`)
        if (data.text) out.push(`- [${data.author ?? 'system'}] ${data.text}`)
        if (!data.text && data.author && data.author !== 'user') out.push(`- [${data.author}] (no text)`)
        data.calls?.forEach((c) => out.push(`- [${data.author ?? 'system'}] -> tool call: ${c}`))
        data.responses?.forEach((r) => out.push(`- [${data.author ?? 'system'}] <- tool response: ${r}`))
        if (data.escalate) out.push(`- [${data.author ?? 'system'}] escalating to parent agent`)
        if (data.judge_output) out.push(`- [state] judge_output = ${JSON.stringify(data.judge_output)}`)
        if (out.length) setLines((prev) => [...prev, ...out])
      } catch (e) {
        // ignore
      }
    }
    es.onerror = () => {
      es.close()
    }
    esRef.current = es
    setLines((prev) => [...prev, `--- Streaming from ${url.toString()} ---`])
  }, [apiBase, query, sessionId, userId])

  const stop = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setLines((prev) => [...prev, '--- Stream closed ---'])
  }, [])

  const controls = useMemo(
    () => (
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr' }}>
        <label>
          API Base
          <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} style={{ width: '100%' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label>
            userId
            <input value={userId} onChange={(e) => setUserId(e.target.value)} />
          </label>
          <label>
            sessionId
            <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
          </label>
        </div>
        <label>
          Query
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={4} />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={start}>Run</button>
          <button onClick={stop}>Stop</button>
          <button onClick={() => setLines([])}>Clear</button>
        </div>
      </div>
    ),
    [apiBase, query, sessionId, start, stop, userId]
  )

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h2>ts-multi-agents</h2>
      {controls}
      <pre style={{ background: '#111', color: '#eee', padding: 12, minHeight: 240 }}>
        {lines.join('\n')}
      </pre>
    </div>
  )
}

