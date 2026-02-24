import React, { useCallback, useRef, useState, useEffect } from 'react'

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
  // @ts-ignore
  const [apiBase, setApiBase] = useState<string>((import.meta.env.VITE_API_BASE as string) || 'http://localhost:3000')
  const [userId, setUserId] = useState('user-1')
  const [sessionId, setSessionId] = useState('')
  const [query, setQuery] = useState('Create a course on the history of Coffee.')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [maxIterations, setMaxIterations] = useState(3)
  const [lines, setLines] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  
  const esRef = useRef<EventSource | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [lines, autoScroll])

  const createNewSession = useCallback(async () => {
    const newId = Math.random().toString(36).substring(7);
    try {
      const resp = await fetch(`${apiBase}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId: newId })
      });
      if (!resp.ok) throw new Error('Failed to create session');
      setSessionId(newId);
      setLines([`--- New Session Created: ${newId} ---`]);
    } catch (err) {
      alert((err as Error).message);
    }
  }, [apiBase, userId]);

  // Create initial session if none exists
  useEffect(() => {
    if (!sessionId) {
      createNewSession();
    }
  }, [sessionId, createNewSession]);

  const validate = () => {
    if (!apiBase.trim()) return 'API Base is required'
    if (!userId.trim() || userId.length > 128) return 'User ID must be 1-128 chars'
    if (!sessionId.trim()) return 'Session not initialized'
    if (!query.trim() || query.length > 2000) return 'Query must be 1-2000 chars'
    return null
  }

  const start = useCallback(() => {
    const error = validate()
    if (error) {
      alert(error)
      return
    }

    if (esRef.current) {
      esRef.current.close()
    }
    
    setIsLoading(true)
    const url = new URL('/api/run/stream', apiBase)
    url.searchParams.set('userId', userId)
    url.searchParams.set('sessionId', sessionId)
    url.searchParams.set('q', query)
    url.searchParams.set('model', model)
    url.searchParams.set('maxIterations', String(maxIterations))

    const es = new EventSource(url.toString())
    
    es.onopen = () => {
      setLines((prev) => [...prev.slice(-1000), `--- Connected to ${url.origin} ---`])
    }

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
        
        if (out.length) {
          setLines((prev) => [...prev.slice(-1000), ...out])
        }
      } catch (e) {
        console.error('SSE Parse Error', e)
      }
    }

    es.onerror = () => {
      es.close()
      setIsLoading(false)
      setLines((prev) => [...prev.slice(-1000), '--- Stream disconnected ---'])
    }
    
    esRef.current = es
  }, [apiBase, query, sessionId, userId, model, maxIterations])

  const stop = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setIsLoading(false)
    setLines((prev) => [...prev.slice(-1000), '--- Stream stopped by user ---'])
  }, [])

  const containerStyle: React.CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    color: '#333'
  }

  const controlGridStyle: React.CSSProperties = {
    display: 'grid',
    gap: '16px',
    background: '#f5f5f5',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd'
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '14px'
  }

  const logStyle: React.CSSProperties = {
    background: '#1e1e1e',
    color: '#d4d4d4',
    padding: '16px',
    borderRadius: '8px',
    height: '500px',
    overflowY: 'auto',
    fontSize: '13px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'Menlo, Monaco, "Courier New", monospace'
  }

  return (
    <div style={containerStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Agentic Course Creator</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: '#28a745', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={createNewSession}
          >
            + New Session
          </button>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {isLoading ? '● Streaming...' : '○ Ready'}
          </div>
        </div>
      </header>

      <section style={controlGridStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>API Base</span>
            <input style={inputStyle} value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>User ID</span>
            <input style={inputStyle} value={userId} onChange={(e) => setUserId(e.target.value)} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Model Selection</span>
            <select style={inputStyle} value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Max Iterations</span>
            <input style={inputStyle} type="number" value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))} />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Research Topic</span>
          <textarea 
            style={{ ...inputStyle, resize: 'vertical' }} 
            rows={3} 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="e.g. History of the internet..."
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              style={{ padding: '8px 20px', borderRadius: '4px', border: 'none', background: '#007bff', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={start}
              disabled={isLoading || !sessionId}
            >
              Run Pipeline
            </button>
            <button 
              style={{ padding: '8px 20px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
              onClick={stop}
              disabled={!isLoading}
            >
              Stop
            </button>
            <button 
              style={{ padding: '8px 20px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
              onClick={() => setLines([])}
            >
              Clear Logs
            </button>
          </div>
          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            Auto-scroll
          </label>
        </div>
      </section>

      <div style={logStyle}>
        {lines.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>Logs will appear here...</div>}
        {lines.join('')}
        <div ref={logEndRef} />
      </div>
    </div>
  )
}
