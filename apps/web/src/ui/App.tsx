import React, { useCallback, useRef, useEffect } from 'react';
import { C, mkEvent } from '../constants';
import { Frame } from '../types';
import { useStore } from '../store/StoreContext';
import { Header } from '../components/Header';
import { Composer } from '../components/Composer';
import { EventRow } from '../components/ActivityLog';
import { OutputPanel } from '../components/OutputPanels';
import { StreamingIndicator } from '../components/Indicator';

export function AppContent() {
  const { state, dispatch } = useStore();
  const {
    query,
    isLoading,
    events,
    twitterOutput,
    linkedinOutput,
    hasSession,
    showActivity
  } = state;

  const uidRef = useRef<string>('');
  const sidRef = useRef<string>('');
  const esRef = useRef<EventSource | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = (k: string) => {
      try { return localStorage.getItem(k) || '' } catch { return '' }
    };
    const mkId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

    let uid = stored('uid');
    if (!uid) { uid = mkId('u'); try { localStorage.setItem('uid', uid) } catch {} }
    uidRef.current = uid;

    let sid = stored('sid');
    if (!sid) { sid = mkId('s'); try { localStorage.setItem('sid', sid) } catch {} }
    sidRef.current = sid;
  }, []);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const initSession = useCallback(async () => {
    try {
      const resp = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uidRef.current, sessionId: sidRef.current }),
      });
      if (!resp.ok) throw new Error('Failed to create session');
      dispatch({ type: 'SET_SESSION_STATUS', payload: true });
    } catch (err) {
      dispatch({ type: 'ADD_EVENT', payload: mkEvent('error', (err as Error).message) });
    }
  }, [dispatch]);

  useEffect(() => {
    if (!hasSession) initSession();
  }, [hasSession, initSession]);

  const createNewSession = useCallback(async () => {
    const sid = `s_${Math.random().toString(36).slice(2, 10)}`;
    sidRef.current = sid;
    try { localStorage.setItem('sid', sid) } catch {}
    try {
      const resp = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uidRef.current, sessionId: sidRef.current }),
      });
      if (!resp.ok) throw new Error('Failed to create session');
      dispatch({ type: 'RESET_SESSION' });
      dispatch({ type: 'SET_SESSION_STATUS', payload: true });
      dispatch({ type: 'SET_EVENTS', payload: [] });
    } catch (err) {
      dispatch({ type: 'ADD_EVENT', payload: mkEvent('error', (err as Error).message) });
    }
  }, [dispatch]);

  const start = useCallback(() => {
    if (!query.trim() || query.length > 2000) return;
    if (esRef.current) esRef.current.close();

    dispatch({ type: 'START_RUN' });
    const url = new URL('/api/run/stream', window.location.origin);
    url.searchParams.set('userId', uidRef.current);
    url.searchParams.set('sessionId', sidRef.current);
    url.searchParams.set('q', query);
    url.searchParams.set('model', 'gemini-2.5-flash');
    url.searchParams.set('maxIterations', '1');

    const es = new EventSource(url.toString());

    es.onopen = () => {
      dispatch({ type: 'ADD_EVENT', payload: mkEvent('system', 'Connected') });
    };

    es.onmessage = (ev) => {
      try {
        const data: Frame = JSON.parse(ev.data);
        if (data.error) {
          dispatch({ type: 'ADD_EVENT', payload: mkEvent('error', data.error) });
          // Stop run on error and close stream
          es.close();
          esRef.current = null;
          dispatch({ type: 'STOP_RUN' });
          return;
        }
        if (data.text) {
          const author = data.author?.toLowerCase() || '';
          const isTwitter = author.includes('thread_whiz') || author.includes('twitter');
          const isLinkedin = author.includes('the_professional') || author.includes('linkedin');
          
          // Only add to activity log if not a final formatter output
          if (!isTwitter && !isLinkedin) {
            dispatch({ type: 'ADD_EVENT', payload: mkEvent('agent', data.text, data.author) });
          }
          
          if (isTwitter && data.text.length > 50) dispatch({ type: 'UPDATE_TWITTER', payload: data.text });
          if (isLinkedin && data.text.length > 50) dispatch({ type: 'UPDATE_LINKEDIN', payload: data.text });
        }
        data.calls?.forEach(c => dispatch({ type: 'ADD_EVENT', payload: mkEvent('tool_call', c, data.author) }));
        data.responses?.forEach(r => dispatch({ type: 'ADD_EVENT', payload: mkEvent('tool_response', r) }));
        if (data.escalate) dispatch({ type: 'ADD_EVENT', payload: mkEvent('escalate', '', data.author) });
        
        // Update outputs if present in the frame
        if (data.twitter_output) dispatch({ type: 'UPDATE_TWITTER', payload: String(data.twitter_output) });
        if (data.linkedin_output) dispatch({ type: 'UPDATE_LINKEDIN', payload: String(data.linkedin_output) });
        
        if (data.judge_output) {
          dispatch({ type: 'ADD_EVENT', payload: mkEvent('judge', String(data.judge_output)) });
        }

        // If server signals completion, stop loading and close stream
        if (data.done) {
          es.close();
          esRef.current = null;
          dispatch({ type: 'STOP_RUN' });
          dispatch({ type: 'ADD_EVENT', payload: mkEvent('system', 'Completed') });
        }
      } catch (e) {
        console.error('SSE parse error', e);
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      dispatch({ type: 'STOP_RUN' });
      dispatch({ type: 'ADD_EVENT', payload: mkEvent('system', 'Disconnected') });
    };

    esRef.current = es;
  }, [query, dispatch]);

  const stop = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    dispatch({ type: 'STOP_RUN' });
    dispatch({ type: 'ADD_EVENT', payload: mkEvent('system', 'Stopped') });
  }, [dispatch]);

  const activityEvents = events.filter(e => e.kind !== 'system' || e.text !== 'Connected');
  const latestStatusText = events.filter(e => e.text).at(-1)?.text ?? 'Working…';
  const isEmpty = events.length === 0;

  return (
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
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        textarea:focus { outline: none; border-color: ${C.borderFocus} !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.textMuted}; }
      `}</style>

      <Header
        isLoading={isLoading}
        hasSession={hasSession}
        eventsCount={events.length}
        onCreateNewSession={createNewSession}
      />

      <main style={{ width: '100%', maxWidth: 720, flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 32, paddingBottom: 40, gap: 24 }}>
        <Composer
          query={query}
          setQuery={(q) => dispatch({ type: 'SET_QUERY', payload: q })}
          isLoading={isLoading}
          hasSession={hasSession}
          onStart={start}
          onStop={stop}
        />

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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {activityEvents.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_ACTIVITY' })}
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

            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
                <StreamingIndicator />
                <p style={{ margin: 0, fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
                  {latestStatusText}
                </p>
              </div>
            )}

        {(twitterOutput || linkedinOutput || isLoading || activityEvents.length > 0) && (
          <div style={{ display: 'flex', gap: 16, width: '100%', flexWrap: 'wrap' }}>
            <OutputPanel
              title="🐦 Thread-Whiz (Twitter Thread)"
              content={twitterOutput}
              color={C.twitter}
              isLoading={isLoading && !twitterOutput}
            />
            <OutputPanel
              title="💼 The Professional (LinkedIn Post)"
              content={linkedinOutput}
              color={C.linkedin}
              isLoading={isLoading && !linkedinOutput}
            />
          </div>
        )}

            <div ref={feedEndRef} />
          </div>
        )}
      </main>
    </div>
  );
}

import { StoreProvider } from '../store/StoreContext';
export function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
