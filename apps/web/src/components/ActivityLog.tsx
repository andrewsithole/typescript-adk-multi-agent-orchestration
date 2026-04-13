import React from 'react';
import { C, authorColor, authorLabel } from '../constants';
import { ActivityEvent } from '../types';
import { JudgeRow } from './JudgeRow';

function SystemRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', userSelect: 'none' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function AgentRow({ author, text }: { author?: string; text: string }) {
  const color = authorColor(author);
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
  );
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
  );
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
  );
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
  );
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
  );
}

export function EventRow({ event }: { event: ActivityEvent }) {
  switch (event.kind) {
    case 'system':        return <SystemRow text={event.text} />;
    case 'agent':         return <AgentRow author={event.author} text={event.text} />;
    case 'tool_call':     return <ToolCallRow author={event.author} text={event.text} />;
    case 'tool_response': return <ToolResponseRow text={event.text} />;
    case 'escalate':      return <EscalateRow author={event.author} />;
    case 'error':         return <ErrorRow text={event.text} />;
    case 'judge':         return <JudgeRow text={event.text} />;
    default:              return null;
  }
}
