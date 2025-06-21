import axios from 'axios';
import { Assistant, Thread, Run, RunCreate } from '@/types';

const API_BASE_URL = 'http://localhost:8123';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handling interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    throw error;
  }
);

export class AgentApiService {
  // Assistant methods
  static async getAssistants(): Promise<Assistant[]> {
    const response = await apiClient.post('/assistants/search', {
      limit: 100,
      offset: 0
    });
    return response.data;
  }

  static async getAssistant(assistantId: string): Promise<Assistant> {
    const response = await apiClient.get(`/assistants/${assistantId}`);
    return response.data;
  }

  static async createAssistant(data: {
    graph_id: string;
    name?: string;
    description?: string;
    config?: any;
    metadata?: any;
  }): Promise<Assistant> {
    const response = await apiClient.post('/assistants', data);
    return response.data;
  }

  // Thread methods
  static async createThread(metadata?: Record<string, any>): Promise<Thread> {
    const response = await apiClient.post('/threads', {
      metadata: metadata || {}
    });
    return response.data;
  }

  static async getThread(threadId: string): Promise<Thread> {
    const response = await apiClient.get(`/threads/${threadId}`);
    return response.data;
  }

  static async getThreads(): Promise<Thread[]> {
    const response = await apiClient.post('/threads/search', {
      limit: 100,
      offset: 0
    });
    return response.data;
  }

  static async deleteThread(threadId: string): Promise<void> {
    await apiClient.delete(`/threads/${threadId}`);
  }

  // Run methods - streaming
  static async createStreamingRun(
    threadId: string, 
    runData: RunCreate
  ): Promise<ReadableStream> {
    const response = await fetch(`${API_BASE_URL}/threads/${threadId}/runs/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(runData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.body!;
  }

  // Run methods - wait for completion
  static async createWaitRun(
    threadId: string, 
    runData: RunCreate
  ): Promise<any> {
    const response = await apiClient.post(`/threads/${threadId}/runs/wait`, runData);
    return response.data;
  }

  // Run methods - background
  static async createBackgroundRun(
    threadId: string, 
    runData: RunCreate
  ): Promise<Run> {
    const response = await apiClient.post(`/threads/${threadId}/runs`, runData);
    return response.data;
  }

  static async getRuns(threadId: string): Promise<Run[]> {
    const response = await apiClient.get(`/threads/${threadId}/runs`);
    return response.data;
  }

  static async getRun(threadId: string, runId: string): Promise<Run> {
    const response = await apiClient.get(`/threads/${threadId}/runs/${runId}`);
    return response.data;
  }

  static async cancelRun(threadId: string, runId: string): Promise<void> {
    await apiClient.post(`/threads/${threadId}/runs/${runId}/cancel`);
  }

  // Thread state methods
  static async getThreadState(threadId: string): Promise<any> {
    const response = await apiClient.get(`/threads/${threadId}/state`);
    return response.data;
  }

  static async updateThreadState(
    threadId: string, 
    values: any, 
    asNode?: string
  ): Promise<any> {
    const response = await apiClient.post(`/threads/${threadId}/state`, {
      values,
      as_node: asNode
    });
    return response.data;
  }

  // Utility method to process streaming response
  static async *processStreamingResponse(stream: ReadableStream): AsyncGenerator<any, void, unknown> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data;
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export default AgentApiService; 