export type Frame = {
  author?: string
  text?: string
  calls?: string[]
  responses?: string[]
  escalate?: boolean
  judge_output?: any
  twitter_output?: string
  linkedin_output?: string
  error?: string
  done?: boolean
}

export type EventKind = 'system' | 'agent' | 'tool_call' | 'tool_response' | 'escalate' | 'error' | 'judge'

export type ActivityEvent = {
  id: number
  kind: EventKind
  author?: string
  text: string
}
