import React, { useRef } from 'react';
import { C } from '../constants';

interface ComposerProps {
  query: string;
  setQuery: (q: string) => void;
  isLoading: boolean;
  hasSession: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function Composer({ query, setQuery, isLoading, hasSession, onStart, onStop }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isLoading && hasSession && query.trim()) {
      onStart();
    }
  };

  return (
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
        placeholder="Enter a topic or paste a URL to an article…"
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

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }} />

        {isLoading && (
          <button onClick={onStop} style={{
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

        {!isLoading && (
          <button
            onClick={onStart}
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
  );
}
