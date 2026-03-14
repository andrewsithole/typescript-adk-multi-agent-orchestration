import { ActivityEvent } from '../types';

export type Action =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'START_RUN' }
  | { type: 'STOP_RUN' }
  | { type: 'ADD_EVENT'; payload: ActivityEvent }
  | { type: 'SET_EVENTS'; payload: ActivityEvent[] }
  | { type: 'UPDATE_TWITTER'; payload: string }
  | { type: 'UPDATE_LINKEDIN'; payload: string }
  | { type: 'SET_SESSION_STATUS'; payload: boolean }
  | { type: 'TOGGLE_ACTIVITY'; payload?: boolean }
  | { type: 'RESET_SESSION' };
