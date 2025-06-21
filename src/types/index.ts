// Agent API Types
export interface Assistant {
  assistant_id: string;
  graph_id: string;
  config: {
    tags?: string[];
    recursion_limit?: number;
    configurable?: Record<string, any>;
  };
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
  version?: number;
  name?: string;
  description?: string;
}

export interface Thread {
  thread_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
  status: 'idle' | 'busy' | 'interrupted' | 'error';
  values?: Record<string, any>;
}

export interface Run {
  run_id: string;
  thread_id: string;
  assistant_id: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'error' | 'success' | 'timeout' | 'interrupted';
  metadata: Record<string, any>;
  kwargs: Record<string, any>;
  multitask_strategy: 'reject' | 'rollback' | 'interrupt' | 'enqueue';
}

export interface RunCreate {
  assistant_id: string;
  input?: any;
  command?: {
    update?: any;
    resume?: any;
    goto?: any;
  };
  metadata?: Record<string, any>;
  config?: {
    tags?: string[];
    recursion_limit?: number;
    configurable?: Record<string, any>;
  };
  stream_mode?: string[] | string;
  multitask_strategy?: 'reject' | 'rollback' | 'interrupt' | 'enqueue';
}

// Frontend specific types
export interface DocumentPage {
  id: string;
  title?: string;
  content: string;
  page_number: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  pages: DocumentPage[];
  current_page: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface VoiceCommand {
  type: 'create' | 'edit' | 'search' | 'delete' | 'read';
  content?: string;
  target?: string;
  parameters?: Record<string, any>;
}

export interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error?: string;
}

export interface AppState {
  documents: Document[];
  currentDocument?: Document;
  currentThread?: Thread;
  isLoading: boolean;
  speechRecognition: SpeechRecognitionState;
  agentResponse?: string;
} 