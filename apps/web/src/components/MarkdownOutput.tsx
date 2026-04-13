import React from 'react';
import Markdown from 'react-markdown';
import { C } from '../constants';

export function MarkdownOutput({ text }: { text: string }) {
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
  );
}
