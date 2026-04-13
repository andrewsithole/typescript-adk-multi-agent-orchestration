import React from 'react';
import { C } from '../constants';

export function JudgeRow({ text }: { text: string }) {
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch (e) {}

  if (!data || typeof data !== 'object' || !data.scores) {
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
    );
  }

  const { status, scores, feedback } = data;
  const isPass = status === 'pass';

  return (
    <div style={{
      padding: '16px',
      background: C.amberBg,
      border: `1px solid ${isPass ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Judge Feedback
        </div>
        <div style={{
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          background: isPass ? C.green : C.amber,
          color: C.bg,
        }}>
          {status}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px 24px' }}>
        {Object.entries(scores).map(([key, val]: [string, any]) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textSub }}>
              <span style={{ textTransform: 'capitalize' }}>{key}</span>
              <span>{val}/10</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(val / 10) * 100}%`,
                background: val >= 7 ? C.green : val >= 4 ? C.amber : C.red,
                borderRadius: 2,
              }} />
            </div>
          </div>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
        {feedback}
      </p>
    </div>
  );
}
