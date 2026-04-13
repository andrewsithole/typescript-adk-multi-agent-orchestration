import React from 'react';
import { C } from '../constants';
import { MarkdownOutput } from './MarkdownOutput';

export function OutputPanel({ title, content, color, isLoading }: { title: string; content: string; color: string; isLoading: boolean }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      minHeight: 400,
      minWidth: 300,
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(255,255,255,0.02)',
        fontSize: 13,
        fontWeight: 600,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {title}
        {isLoading && (
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
          }} />
        )}
      </div>
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {isLoading && !content ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ height: 16, width: '80%', background: C.border, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 16, width: '100%', background: C.border, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 16, width: '60%', background: C.border, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 16, width: '90%', background: C.border, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
          </div>
        ) : content ? (
          <MarkdownOutput text={content} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: 13 }}>
            Waiting for generation...
          </div>
        )}
      </div>
    </div>
  );
}
