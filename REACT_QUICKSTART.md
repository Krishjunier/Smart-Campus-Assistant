# Smart Campus Assistant - React Quick Start Guide

## 🚀 Getting Started

### Prerequisites
```bash
# Ensure you have Node.js installed (v16 or higher)
node --version
npm --version
```

### Setup Instructions

```bash
# 1. Create React app with TypeScript
npx create-react-app smart-campus-frontend --template typescript
cd smart-campus-frontend

# 2. Install dependencies
npm install axios react-markdown react-syntax-highlighter
npm install @types/react-syntax-highlighter --save-dev
npm install react-dropzone react-toastify
npm install react-router-dom

# 3. Start development server
npm start
```

---

## 📁 Project Structure

```
smart-campus-frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── api/
│   │   └── smartCampusApi.ts         # API client
│   ├── components/
│   │   ├── FileUpload/
│   │   │   ├── FileUpload.tsx
│   │   │   └── FileUpload.css
│   │   ├── ChatInterface/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── ChatInterface.css
│   │   ├── SummaryGenerator/
│   │   │   ├── SummaryGenerator.tsx
│   │   │   └── SummaryGenerator.css
│   │   ├── QuizGenerator/
│   │   │   ├── QuizGenerator.tsx
│   │   │   └── QuizGenerator.css
│   │   ├── DocumentList/
│   │   │   ├── DocumentList.tsx
│   │   │   └── DocumentList.css
│   │   ├── StatusBar/
│   │   │   ├── StatusBar.tsx
│   │   │   └── StatusBar.css
│   │   └── Layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── Layout.css
│   ├── hooks/
│   │   └── useSmartCampus.ts         # Custom hook for API
│   ├── types/
│   │   └── api.types.ts              # TypeScript types
│   ├── utils/
│   │   └── formatters.ts             # Helper functions
│   ├── context/
│   │   └── AppContext.tsx            # Global state
│   ├── App.tsx
│   ├── App.css
│   └── index.tsx
├── package.json
└── tsconfig.json
```

---

## 🔧 Core Files Setup

### 1. TypeScript Types (`src/types/api.types.ts`)

```typescript
// src/types/api.types.ts

export interface UploadStatus {
  uploaded_documents: number;
  max_limit: number;
  remaining_slots: number;
  document_list: string[];
}

export interface StatusResponse {
  success: boolean;
  status: UploadStatus;
  total_chunks: number;
}

export interface UploadResult {
  status: 'success' | 'warning' | 'limit_reached' | 'error';
  message: string;
  uploaded: number;
  chunks_created?: number;
  current_count: number;
  remaining_slots: number;
  duplicate_files?: string[];
  invalid_files?: string[];
}

export interface UploadResponse {
  success: boolean;
  result: UploadResult;
}

export interface AskResponse {
  success: boolean;
  answer: string;
  sources: string[];
  type: 'rag' | 'wikipedia';
  related_topics?: string[];
}

export interface SummaryResponse {
  success: boolean;
  summary?: string;
  error?: string;
}

export interface QuizResponse {
  success: boolean;
  quiz?: string;
  error?: string;
}

export interface ConversationItem {
  question: string;
  answer: string;
  sources: string[];
  timestamp: number;
}

export interface HistoryResponse {
  success: boolean;
  history: ConversationItem[];
}

export interface ClearResponse {
  success: boolean;
  message: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
  responseType?: 'rag' | 'wikipedia';
}
```

---

### 2. API Client (`src/api/smartCampusApi.ts`)

```typescript
// src/api/smartCampusApi.ts

import axios, { AxiosInstance } from 'axios';
import {
  StatusResponse,
  UploadResponse,
  AskResponse,
  SummaryResponse,
  QuizResponse,
  HistoryResponse,
  ClearResponse,
} from '../types/api.types';

const API_BASE_URL = 'http://localhost:5000';

class SmartCampusAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // 60 seconds for LLM responses
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Get upload status
  async getStatus(): Promise<StatusResponse> {
    const response = await this.client.get<StatusResponse>('/api/status');
    return response.data;
  }

  // Upload files
  async uploadFiles(files: File[]): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await this.client.post<UploadResponse>(
      '/api/upload_files',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  // Ask a question
  async askQuestion(question: string): Promise<AskResponse> {
    const response = await this.client.post<AskResponse>('/api/ask', {
      question,
    });
    return response.data;
  }

  // Generate summary
  async generateSummary(topic: string): Promise<SummaryResponse> {
    const response = await this.client.post<SummaryResponse>('/api/summarize', {
      topic,
    });
    return response.data;
  }

  // Generate quiz
  async generateQuiz(
    topic: string,
    num_questions: number = 5
  ): Promise<QuizResponse> {
    const response = await this.client.post<QuizResponse>('/api/quiz', {
      topic,
      num_questions,
    });
    return response.data;
  }

  // Get conversation history
  async getHistory(limit: number = 10): Promise<HistoryResponse> {
    const response = await this.client.get<HistoryResponse>(
      `/api/history?limit=${limit}`
    );
    return response.data;
  }

  // Clear all documents
  async clearDocuments(): Promise<ClearResponse> {
    const response = await this.client.post<ClearResponse>('/api/clear');
    return response.data;
  }
}

export default new SmartCampusAPI();
```

---

### 3. Custom Hook (`src/hooks/useSmartCampus.ts`)

```typescript
// src/hooks/useSmartCampus.ts

import { useState, useCallback } from 'react';
import api from '../api/smartCampusApi';
import {
  StatusResponse,
  UploadResponse,
  AskResponse,
  SummaryResponse,
  QuizResponse,
  HistoryResponse,
  ClearResponse,
} from '../types/api.types';

export const useSmartCampus = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatus = useCallback(async (): Promise<StatusResponse | null> => {
    try {
      setError(null);
      const data = await api.getStatus();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMsg);
      return null;
    }
  }, []);

  const uploadFiles = useCallback(async (files: File[]): Promise<UploadResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.uploadFiles(files);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const askQuestion = useCallback(async (question: string): Promise<AskResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.askQuestion(question);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Question failed';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSummary = useCallback(async (topic: string): Promise<SummaryResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.generateSummary(topic);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Summary generation failed';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateQuiz = useCallback(
    async (topic: string, numQuestions: number = 5): Promise<QuizResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const data = await api.generateQuiz(topic, numQuestions);
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Quiz generation failed';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getHistory = useCallback(async (limit: number = 10): Promise<HistoryResponse | null> => {
    try {
      setError(null);
      const data = await api.getHistory(limit);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(errorMsg);
      return null;
    }
  }, []);

  const clearDocuments = useCallback(async (): Promise<ClearResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.clearDocuments();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Clear failed';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getStatus,
    uploadFiles,
    askQuestion,
    generateSummary,
    generateQuiz,
    getHistory,
    clearDocuments,
  };
};
```

---

### 4. App Context (`src/context/AppContext.tsx`)

```typescript
// src/context/AppContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatMessage, UploadStatus } from '../types/api.types';
import { useSmartCampus } from '../hooks/useSmartCampus';

interface AppContextType {
  documentStatus: UploadStatus | null;
  chatMessages: ChatMessage[];
  currentSummary: string | null;
  currentQuiz: string | null;
  refreshStatus: () => Promise<void>;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  setSummary: (summary: string | null) => void;
  setQuiz: (quiz: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [documentStatus, setDocumentStatus] = useState<UploadStatus | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentSummary, setCurrentSummary] = useState<string | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<string | null>(null);
  
  const { getStatus } = useSmartCampus();

  const refreshStatus = async () => {
    const data = await getStatus();
    if (data) {
      setDocumentStatus(data.status);
    }
  };

  const addChatMessage = (message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  const setSummary = (summary: string | null) => {
    setCurrentSummary(summary);
  };

  const setQuiz = (quiz: string | null) => {
    setCurrentQuiz(quiz);
  };

  // Load initial status
  useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <AppContext.Provider
      value={{
        documentStatus,
        chatMessages,
        currentSummary,
        currentQuiz,
        refreshStatus,
        addChatMessage,
        clearChat,
        setSummary,
        setQuiz,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
```

---

### 5. Main App Component (`src/App.tsx`)

```typescript
// src/App.tsx

import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AppProvider } from './context/AppContext';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import ChatInterface from './components/ChatInterface/ChatInterface';
import SummaryGenerator from './components/SummaryGenerator/SummaryGenerator';
import QuizGenerator from './components/QuizGenerator/QuizGenerator';
import HistoryViewer from './components/HistoryViewer/HistoryViewer';
import './App.css';

type Tab = 'chat' | 'summary' | 'quiz' | 'history';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface />;
      case 'summary':
        return <SummaryGenerator />;
      case 'quiz':
        return <QuizGenerator />;
      case 'history':
        return <HistoryViewer />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <AppProvider>
      <div className="app">
        <Header />
        <div className="app-body">
          <Sidebar />
          <main className="main-content">
            <div className="tab-navigation">
              <button
                className={activeTab === 'chat' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('chat')}
              >
                💬 Chat
              </button>
              <button
                className={activeTab === 'summary' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('summary')}
              >
                📝 Summary
              </button>
              <button
                className={activeTab === 'quiz' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('quiz')}
              >
                📋 Quiz
              </button>
              <button
                className={activeTab === 'history' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('history')}
              >
                📚 History
              </button>
            </div>
            <div className="tab-content">{renderTabContent()}</div>
          </main>
        </div>
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    </AppProvider>
  );
};

export default App;
```

---

### 6. Basic Styles (`src/App.css`)

```css
/* src/App.css */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #667eea;
  --secondary: #764ba2;
  --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --text: #2d3748;
  --text-light: #718096;
  --bg: #f7fafc;
  --white: #ffffff;
  --border: #e2e8f0;
  --success: #48bb78;
  --warning: #ed8936;
  --error: #f56565;
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

body {
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text);
  background: var(--bg);
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-navigation {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--white);
  border-bottom: 1px solid var(--border);
}

.tab {
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--text-light);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.tab:hover {
  background: var(--bg);
  color: var(--primary);
}

.tab.active {
  background: var(--gradient);
  color: var(--white);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .app-body {
    flex-direction: column;
  }
  
  .tab-navigation {
    flex-wrap: wrap;
  }
  
  .tab {
    flex: 1;
    min-width: 120px;
  }
}
```

---

### 7. Example Component: ChatInterface (`src/components/ChatInterface/ChatInterface.tsx`)

```typescript
// src/components/ChatInterface/ChatInterface.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useSmartCampus } from '../../hooks/useSmartCampus';
import { useAppContext } from '../../context/AppContext';
import { ChatMessage } from '../../types/api.types';
import './ChatInterface.css';

const ChatInterface: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const { chatMessages, addChatMessage } = useAppContext();
  const { askQuestion, loading } = useSmartCampus();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const question = inputValue.trim();
    setInputValue('');

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date(),
    };
    addChatMessage(userMessage);

    // Get AI response
    const response = await askQuestion(question);
    if (response && response.success) {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date(),
        responseType: response.type,
      };
      addChatMessage(assistantMessage);
    }
  };

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {chatMessages.length === 0 && (
          <div className="empty-state">
            <h2>👋 Hello! How can I help you study today?</h2>
            <p>Ask me questions about your uploaded materials or general topics!</p>
          </div>
        )}
        {chatMessages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              <p>{message.content}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="sources">
                  <strong>Sources:</strong> {message.sources.join(', ')}
                </div>
              )}
              {message.responseType === 'wikipedia' && (
                <span className="badge">Wikipedia</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !inputValue.trim()}>
          {loading ? '...' : '📤'}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
```

---

## 🎨 Additional Component Examples

See the full documentation in:
- `API_DOCUMENTATION.md` - Complete API reference
- `VISUAL_FLOW_DIAGRAM.md` - Visual flow diagrams

---

## 🧪 Testing the Setup

1. **Start Flask Backend:**
```bash
cd "d:\Smart Campus Assistant\backend"
python app.py
```

2. **Start React Frontend:**
```bash
cd smart-campus-frontend
npm start
```

3. **Test Flow:**
   - Visit `http://localhost:3000`
   - Upload a document
   - Ask a question
   - Generate a summary
   - Create a quiz

---

## 📦 Next Steps

1. Implement remaining components:
   - `FileUpload` with drag & drop
   - `SummaryGenerator` with markdown rendering
   - `QuizGenerator` with interactive questions
   - `HistoryViewer` with search/filter
   - `StatusBar` with progress visualization

2. Add styling with CSS or UI library (Material-UI, Chakra UI)

3. Implement error boundaries and loading states

4. Add authentication (if needed)

5. Deploy to production

---

**You now have everything you need to build a complete React frontend for the Smart Campus Assistant!** 🚀
