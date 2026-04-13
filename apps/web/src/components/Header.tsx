import React from 'react';
import { C } from '../constants';

interface HeaderProps {
  isLoading: boolean;
  hasSession: boolean;
  eventsCount: number;
  onCreateNewSession: () => void;
}

export function Header({ isLoading, hasSession, eventsCount, onCreateNewSession }: HeaderProps) {
  return (
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
          The Social Media Hype Squad
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted }}>
          Transform any topic into viral social content
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {eventsCount > 0 && (
          <button onClick={onCreateNewSession} style={{
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
  );
}
