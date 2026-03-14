import { Action } from './actions';
import { ActivityEvent } from '../types';

export interface State {
  query: string;
  isLoading: boolean;
  events: ActivityEvent[];
  twitterOutput: string;
  linkedinOutput: string;
  hasSession: boolean;
  showActivity: boolean;
}

export const initialState: State = {
  query: '',
  isLoading: false,
  events: [],
  twitterOutput: '',
  linkedinOutput: '',
  hasSession: false,
  showActivity: false,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload };
    case 'START_RUN':
      return {
        ...state,
        isLoading: true,
        twitterOutput: '',
        linkedinOutput: '',
      };
    case 'STOP_RUN':
      return { ...state, isLoading: false };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events.slice(-500), action.payload] };
    case 'SET_EVENTS':
      return { ...state, events: action.payload };
    case 'UPDATE_TWITTER':
      return { ...state, twitterOutput: action.payload };
    case 'UPDATE_LINKEDIN':
      return { ...state, linkedinOutput: action.payload };
    case 'SET_SESSION_STATUS':
      return { ...state, hasSession: action.payload };
    case 'TOGGLE_ACTIVITY':
      return { ...state, showActivity: action.payload ?? !state.showActivity };
    case 'RESET_SESSION':
      return {
        ...initialState,
        hasSession: state.hasSession,
        query: state.query, // keep current query maybe? or clear it?
      };
    default:
      return state;
  }
}
