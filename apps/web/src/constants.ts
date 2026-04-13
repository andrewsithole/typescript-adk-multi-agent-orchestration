export const C = {
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
  twitter:     '#1d9bf0',
  linkedin:    '#6366f1',
}

export const AUTHOR_COLORS: Record<string, string> = {
  orchestrator:  C.accent,
  'hype-squad':  C.accent,
  researcher:    C.green,
  thread_whiz:   C.twitter,
  the_professional: C.linkedin,
  judge:         C.amber,
  system:        C.textMuted,
}

export function authorColor(name?: string): string {
  if (!name) return C.textMuted
  const lower = name.toLowerCase()
  for (const [key, color] of Object.entries(AUTHOR_COLORS)) {
    if (lower.includes(key)) return color
  }
  return C.accentText
}

export function authorLabel(name?: string): string {
  if (!name) return 'system'
  // Remove :progress suffix and replace underscores
  return name.replace('_progress', '').replace(/_/g, ' ')
}

let _eid = 0
export function mkEvent(kind: any, text: string, author?: string) {
  return { id: _eid++, kind, author, text }
}
