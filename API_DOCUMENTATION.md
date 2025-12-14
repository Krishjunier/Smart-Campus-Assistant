# Smart Campus Assistant - React Frontend API Documentation

## System Overview

Smart Campus Assistant is an AI-powered RAG (Retrieval-Augmented Generation) system that helps students study by answering questions from uploaded course materials, generating summaries, and creating practice quizzes.

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend (Port 3000)                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Components:                                              │  │
│  │  - FileUpload        - ChatInterface                      │  │
│  │  - DocumentList      - SummaryGenerator                   │  │
│  │  - QuizGenerator     - ConversationHistory                │  │
│  │  - StatusBar         - SettingsPanel                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑ HTTP/REST API
┌─────────────────────────────────────────────────────────────────┐
│                   Flask Backend (Port 5000)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  API Endpoints:                                           │  │
│  │  /api/status, /api/upload_files, /api/ask                │  │
│  │  /api/summarize, /api/quiz, /api/history, /api/clear     │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SmartCampusAssistant (Business Logic)                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SmartCampusRAGSystem (AI/Vector Store)                  │  │
│  │  - HuggingFace Embeddings (all-MiniLM-L6-v2)             │  │
│  │  - ChromaDB Vector Store                                  │  │
│  │  - Groq LLM (llama-3.1-8b-instant)                        │  │
│  │  - Wikipedia Integration                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│              External Services                                   │
│  - Groq API (LLM)                                               │
│  - Wikipedia API (General Knowledge)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Journey                              │
└──────────────────────────────────────────────────────────────────┘

1. Initial Load
   │
   ├─► GET /api/status → Check if previous session exists
   │                     → Display document count (0/50)
   │
2. Upload Documents (Max 5 per upload, 50 total)
   │
   ├─► User clicks "Upload" button
   ├─► File picker opens (multi-select)
   ├─► User selects files (PDF, DOCX, PPTX, TXT, MD)
   ├─► Frontend validates file types & size
   ├─► POST /api/upload_files (multipart/form-data)
   │   │
   │   └─► Backend processes:
   │       ├─ Checks for duplicates
   │       ├─ Validates against 50 doc limit
   │       ├─ Extracts text (PDF, tables, slides)
   │       ├─ Creates embeddings (384 dims)
   │       ├─ Stores in ChromaDB
   │       └─ Saves session (session_data.json)
   │
3. Ask Questions
   │
   ├─► User types question in chat
   ├─► POST /api/ask
   │   │
   │   ├─► If NO documents uploaded:
   │   │   └─ Search Wikipedia → Return general answer
   │   │
   │   └─► If documents uploaded:
   │       ├─ Create question embedding
   │       ├─ Similarity search in ChromaDB (k=4)
   │       ├─ Retrieve relevant chunks
   │       ├─ Generate answer with Groq LLM
   │       ├─ Save to conversation history
   │       └─ Return answer + sources
   │
4. Generate Summary
   │
   ├─► User enters topic
   ├─► Frontend checks if docs uploaded (GET /api/status)
   ├─► POST /api/summarize
   │   │
   │   └─► Backend:
   │       ├─ Retrieves k=8 relevant chunks
   │       ├─ Combines content
   │       ├─ LLM generates structured summary
   │       └─ Returns formatted summary
   │
5. Generate Quiz
   │
   ├─► User enters topic + number of questions
   ├─► Frontend checks if docs uploaded
   ├─► POST /api/quiz
   │   │
   │   └─► Backend:
   │       ├─ Retrieves relevant content
   │       ├─ LLM generates multiple-choice questions
   │       ├─ Formats with answers & explanations
   │       └─ Returns quiz
   │
6. View History
   │
   ├─► GET /api/history?limit=10
   └─► Returns last 10 Q&A pairs with timestamps
   
7. Clear All
   │
   ├─► POST /api/clear
   └─► Clears vector DB + session data
```

---

## API Endpoints Reference

### Base URL
```
http://localhost:5000
```

---

## 1. GET /api/status

**Purpose:** Get current upload status and document information

**Request:**
```http
GET /api/status
```

**Response:**
```typescript
{
  success: boolean;
  status: {
    uploaded_documents: number;      // Current number of uploaded docs
    max_limit: number;                // Maximum allowed (50)
    remaining_slots: number;          // How many more can be uploaded
    document_list: string[];          // Array of filenames
  };
  total_chunks: number;               // Total embeddings in vector DB
}
```

**Example Response:**
```json
{
  "success": true,
  "status": {
    "uploaded_documents": 3,
    "max_limit": 50,
    "remaining_slots": 47,
    "document_list": ["lecture1.pdf", "notes.docx", "slides.pptx"]
  },
  "total_chunks": 127
}
```

**Usage in React:**
```typescript
// On component mount and after uploads
useEffect(() => {
  const fetchStatus = async () => {
    const response = await fetch('http://localhost:5000/api/status');
    const data = await response.json();
    if (data.success) {
      setDocumentCount(data.status.uploaded_documents);
      setDocumentList(data.status.document_list);
    }
  };
  fetchStatus();
}, []);
```

---

## 2. POST /api/upload_files

**Purpose:** Upload documents to the RAG system

**Request:**
```http
POST /api/upload_files
Content-Type: multipart/form-data
```

**Form Data:**
```typescript
{
  files: File[];  // Array of files (max 5 per request)
}
```

**Allowed File Types:**
- `.pdf` - PDF documents
- `.doc`, `.docx` - Word documents
- `.ppt`, `.pptx` - PowerPoint presentations
- `.txt` - Text files
- `.md` - Markdown files

**File Size Limit:** Recommended max 50MB per file

**Response:**
```typescript
{
  success: boolean;
  result: {
    status: 'success' | 'warning' | 'limit_reached' | 'error';
    message: string;
    uploaded: number;                    // Number of files successfully uploaded
    chunks_created: number;              // Number of text chunks created
    current_count: number;               // Total docs after upload
    remaining_slots: number;             // Remaining upload capacity
    duplicate_files?: string[];          // Files that were already uploaded
    invalid_files?: string[];            // Files that couldn't be processed
  };
}
```

**Example Success Response:**
```json
{
  "success": true,
  "result": {
    "status": "success",
    "message": "Successfully uploaded 3 document(s)",
    "uploaded": 3,
    "chunks_created": 84,
    "current_count": 3,
    "remaining_slots": 47
  }
}
```

**Example Duplicate Warning:**
```json
{
  "success": true,
  "result": {
    "status": "warning",
    "message": "All documents already uploaded!",
    "duplicate_files": ["lecture1.pdf", "notes.docx"],
    "uploaded": 0,
    "current_count": 3,
    "remaining_slots": 47
  }
}
```

**Example Limit Reached:**
```json
{
  "success": false,
  "result": {
    "status": "limit_reached",
    "message": "Document limit reached! You have 50/50 documents.",
    "current_count": 50,
    "attempted_upload": 2,
    "suggestion": "Remove old documents or clear collection to upload new ones",
    "uploaded": 0
  }
}
```

**Usage in React:**
```typescript
const handleFileUpload = async (files: FileList) => {
  const formData = new FormData();
  
  // Limit to 5 files per upload
  const filesToUpload = Array.from(files).slice(0, 5);
  filesToUpload.forEach(file => {
    formData.append('files', file);
  });

  try {
    const response = await fetch('http://localhost:5000/api/upload_files', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (data.success) {
      if (data.result.duplicate_files) {
        alert(`Duplicates skipped: ${data.result.duplicate_files.join(', ')}`);
      }
      // Update UI with new document count
      setDocumentCount(data.result.current_count);
    } else {
      alert(data.result.message);
    }
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

---

## 3. POST /api/ask

**Purpose:** Ask a question about uploaded materials or general knowledge

**Request:**
```http
POST /api/ask
Content-Type: application/json
```

**Request Body:**
```typescript
{
  question: string;  // User's question (required, non-empty)
}
```

**Response:**
```typescript
{
  success: boolean;
  answer: string;              // Generated answer
  sources: string[];           // Source documents or URLs
  type: 'rag' | 'wikipedia';  // Answer source type
  related_topics?: string[];   // Related topics (Wikipedia only)
}
```

**Example Request:**
```json
{
  "question": "What is machine learning?"
}
```

**Example Response (No docs - Wikipedia):**
```json
{
  "success": true,
  "answer": "Machine learning is a branch of artificial intelligence that enables computers to learn from data and improve their performance over time without being explicitly programmed. It involves algorithms that can identify patterns in data and make predictions or decisions based on those patterns.",
  "sources": ["https://en.wikipedia.org/wiki/Machine_learning"],
  "type": "wikipedia",
  "related_topics": ["Machine learning", "Deep learning", "Artificial intelligence"]
}
```

**Example Response (With docs - RAG):**
```json
{
  "success": true,
  "answer": "Based on your lecture notes, machine learning is defined as a subset of AI that focuses on algorithms that improve automatically through experience. The course covers three main types: supervised learning (labeled data), unsupervised learning (unlabeled data), and reinforcement learning (reward-based).",
  "sources": ["lecture1.pdf", "notes.docx"],
  "type": "rag"
}
```

**Usage in React:**
```typescript
const askQuestion = async (question: string) => {
  setLoading(true);
  
  try {
    const response = await fetch('http://localhost:5000/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Add to chat history
      setChatHistory(prev => [...prev, {
        question,
        answer: data.answer,
        sources: data.sources,
        type: data.type,
        timestamp: Date.now()
      }]);
    }
  } catch (error) {
    console.error('Question failed:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## 4. POST /api/summarize

**Purpose:** Generate a summary of uploaded materials on a specific topic

**Request:**
```http
POST /api/summarize
Content-Type: application/json
```

**Request Body:**
```typescript
{
  topic: string;  // Topic to summarize (required)
}
```

**Response:**
```typescript
{
  success: boolean;
  summary?: string;  // Generated summary
  error?: string;    // Error message if failed
}
```

**Example Request:**
```json
{
  "topic": "Neural Networks"
}
```

**Example Success Response:**
```json
{
  "success": true,
  "summary": "# Neural Networks Summary\n\n## Key Concepts\n\n**Definition:** Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) organized in layers.\n\n**Architecture:**\n- Input Layer: Receives raw data\n- Hidden Layers: Process and transform data\n- Output Layer: Produces final predictions\n\n**Key Components:**\n• Weights: Connection strengths between neurons\n• Biases: Threshold adjustments\n• Activation Functions: Introduce non-linearity (ReLU, Sigmoid, Tanh)\n\n**Training Process:**\n1. Forward propagation: Data flows through network\n2. Loss calculation: Measure prediction error\n3. Backpropagation: Update weights using gradient descent\n\n**Important Formulas:**\n- Output: y = f(Σ(wi × xi) + b)\n- Loss: L = (1/n)Σ(y_pred - y_true)²\n\n**Applications:** Image recognition, NLP, game playing, autonomous vehicles"
}
```

**Example No Documents Response:**
```json
{
  "success": false,
  "error": "📤 No documents uploaded yet. Please upload course materials first to generate summaries!"
}
```

**Usage in React:**
```typescript
const generateSummary = async (topic: string) => {
  // First check if documents are uploaded
  const statusResponse = await fetch('http://localhost:5000/api/status');
  const statusData = await statusResponse.json();
  
  if (statusData.status.uploaded_documents === 0) {
    alert('⚠️ Please upload documents first!');
    return;
  }
  
  setLoading(true);
  
  try {
    const response = await fetch('http://localhost:5000/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      setSummary(data.summary);
    } else {
      alert(data.error);
    }
  } catch (error) {
    console.error('Summarization failed:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## 5. POST /api/quiz

**Purpose:** Generate practice quiz questions on a topic

**Request:**
```http
POST /api/quiz
Content-Type: application/json
```

**Request Body:**
```typescript
{
  topic: string;         // Quiz topic (required)
  num_questions: number; // Number of questions (default: 5)
}
```

**Response:**
```typescript
{
  success: boolean;
  quiz?: string;   // Formatted quiz with questions
  error?: string;  // Error message if failed
}
```

**Example Request:**
```json
{
  "topic": "Python Functions",
  "num_questions": 3
}
```

**Example Success Response:**
```json
{
  "success": true,
  "quiz": "# Practice Quiz: Python Functions\n\n**Question 1:** What is the correct syntax to define a function in Python?\nA) function myFunc():\nB) def myFunc():\nC) create myFunc():\nD) func myFunc():\n\n**Correct Answer:** B\n**Explanation:** In Python, functions are defined using the 'def' keyword followed by the function name and parentheses.\n\n---\n\n**Question 2:** What does the 'return' statement do in a function?\nA) Exits the program\nB) Prints a value\nC) Sends a value back to the caller\nD) Deletes the function\n\n**Correct Answer:** C\n**Explanation:** The return statement exits the function and sends a value back to the code that called the function.\n\n---\n\n**Question 3:** Which of the following is a valid function call?\nA) calculate(5, 10)\nB) calculate[5, 10]\nC) calculate{5, 10}\nD) calculate<5, 10>\n\n**Correct Answer:** A\n**Explanation:** Functions are called using parentheses with arguments separated by commas."
}
```

**Example No Documents Response:**
```json
{
  "success": false,
  "error": "📤 No documents uploaded yet. Please upload course materials first to generate quizzes!"
}
```

**Usage in React:**
```typescript
const generateQuiz = async (topic: string, numQuestions: number = 5) => {
  // Check if documents are uploaded
  const statusResponse = await fetch('http://localhost:5000/api/status');
  const statusData = await statusResponse.json();
  
  if (statusData.status.uploaded_documents === 0) {
    alert('⚠️ Please upload documents first!');
    return;
  }
  
  setLoading(true);
  
  try {
    const response = await fetch('http://localhost:5000/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, num_questions: numQuestions }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      setQuiz(data.quiz);
    } else {
      alert(data.error);
    }
  } catch (error) {
    console.error('Quiz generation failed:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## 6. GET /api/history

**Purpose:** Retrieve conversation history

**Request:**
```http
GET /api/history?limit=10
```

**Query Parameters:**
```typescript
{
  limit?: number;  // Number of conversations to retrieve (default: 10)
}
```

**Response:**
```typescript
{
  success: boolean;
  history: Array<{
    question: string;
    answer: string;
    sources: string[];
    timestamp: number;  // Unix timestamp
  }>;
}
```

**Example Response:**
```json
{
  "success": true,
  "history": [
    {
      "question": "What is a neural network?",
      "answer": "A neural network is a computing system...",
      "sources": ["lecture5.pdf"],
      "timestamp": 1701619200
    },
    {
      "question": "Explain backpropagation",
      "answer": "Backpropagation is an algorithm...",
      "sources": ["notes.docx", "slides.pptx"],
      "timestamp": 1701619800
    }
  ]
}
```

**Usage in React:**
```typescript
const fetchHistory = async (limit: number = 10) => {
  try {
    const response = await fetch(`http://localhost:5000/api/history?limit=${limit}`);
    const data = await response.json();
    
    if (data.success) {
      setHistory(data.history.map(item => ({
        ...item,
        date: new Date(item.timestamp * 1000)
      })));
    }
  } catch (error) {
    console.error('Failed to fetch history:', error);
  }
};
```

---

## 7. POST /api/clear

**Purpose:** Clear all uploaded documents and conversation history

**Request:**
```http
POST /api/clear
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "All documents cleared successfully"
}
```

**Usage in React:**
```typescript
const clearAllDocuments = async () => {
  if (!confirm('Are you sure you want to clear all documents? This cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch('http://localhost:5000/api/clear', {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Reset UI state
      setDocumentCount(0);
      setDocumentList([]);
      setChatHistory([]);
      alert('All documents cleared!');
    }
  } catch (error) {
    console.error('Clear failed:', error);
  }
};
```

---

## React Component Structure

### Suggested Component Hierarchy

```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   └── StatusBar (shows upload count)
│   ├── Sidebar
│   │   ├── FileUpload
│   │   ├── DocumentList
│   │   └── ActionButtons (Clear, Settings)
│   └── MainContent
│       ├── TabNavigation
│       │   ├── ChatTab
│       │   ├── SummaryTab
│       │   ├── QuizTab
│       │   └── HistoryTab
│       └── TabContent
│           ├── ChatInterface
│           │   ├── MessageList
│           │   │   ├── UserMessage
│           │   │   └── AssistantMessage (with sources)
│           │   └── InputBox
│           ├── SummaryGenerator
│           │   ├── TopicInput
│           │   └── SummaryDisplay (Markdown)
│           ├── QuizGenerator
│           │   ├── TopicInput
│           │   ├── QuestionCountSelector
│           │   └── QuizDisplay
│           └── HistoryViewer
│               └── HistoryList
└── Footer
```

---

## TypeScript Types for React

```typescript
// API Response Types

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

// Component State Types

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
  responseType?: 'rag' | 'wikipedia';
}

export interface AppState {
  documentCount: number;
  documentList: string[];
  maxDocuments: number;
  isLoading: boolean;
  chatHistory: ChatMessage[];
  currentSummary: string | null;
  currentQuiz: string | null;
  conversationHistory: ConversationItem[];
}
```

---

## React Hooks Example

```typescript
// useSmartCampus.ts - Custom hook for API calls

import { useState, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:5000';

export const useSmartCampus = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatus = useCallback(async (): Promise<StatusResponse | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/status`);
      return await response.json();
    } catch (err) {
      setError('Failed to fetch status');
      return null;
    }
  }, []);

  const uploadFiles = useCallback(async (files: File[]): Promise<UploadResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch(`${API_BASE_URL}/api/upload_files`, {
        method: 'POST',
        body: formData,
      });
      
      return await response.json();
    } catch (err) {
      setError('Upload failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const askQuestion = useCallback(async (question: string): Promise<AskResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      
      return await response.json();
    } catch (err) {
      setError('Question failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSummary = useCallback(async (topic: string): Promise<SummaryResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      
      return await response.json();
    } catch (err) {
      setError('Summary generation failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateQuiz = useCallback(async (
    topic: string,
    num_questions: number = 5
  ): Promise<QuizResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, num_questions }),
      });
      
      return await response.json();
    } catch (err) {
      setError('Quiz generation failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getHistory = useCallback(async (limit: number = 10): Promise<HistoryResponse | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history?limit=${limit}`);
      return await response.json();
    } catch (err) {
      setError('Failed to fetch history');
      return null;
    }
  }, []);

  const clearDocuments = useCallback(async (): Promise<ClearResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/clear`, {
        method: 'POST',
      });
      
      return await response.json();
    } catch (err) {
      setError('Clear failed');
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

## Key Features to Implement

### 1. **File Upload Component**
- Drag & drop support
- Multi-file selection (max 5 per upload)
- File type validation (PDF, DOCX, PPTX, TXT, MD)
- Upload progress indicator
- File preview list
- Duplicate detection feedback

### 2. **Status Bar**
- Document count display (X/50)
- Visual progress bar
- Warning when approaching limit (40+)
- Total chunks indicator

### 3. **Chat Interface**
- Message history display
- User/Assistant message bubbles
- Source citations with clickable links
- Wikipedia badge for general knowledge answers
- Typing indicator during loading
- Auto-scroll to latest message

### 4. **Summary Generator**
- Topic input field
- Generate button with validation
- Markdown rendering for summary
- Copy to clipboard functionality
- Export as PDF option

### 5. **Quiz Generator**
- Topic input
- Question count selector (1-10)
- Generated quiz display with formatting
- Answer reveal on click
- Score tracking
- Retry functionality

### 6. **History Viewer**
- Searchable conversation list
- Date/time stamps
- Expandable Q&A cards
- Filter by date range
- Export history as JSON/CSV

### 7. **Document Manager**
- List of uploaded documents
- File size display
- Upload date
- Remove individual documents (future feature)
- Search/filter documents
- Clear all button with confirmation

---

## Error Handling

### Common Errors to Handle:

1. **No Documents Uploaded**
```typescript
if (response.error?.includes('No documents uploaded')) {
  // Show alert or redirect to upload page
  alert('⚠️ Please upload documents first!');
}
```

2. **Upload Limit Reached**
```typescript
if (result.status === 'limit_reached') {
  // Show modal with option to clear or manage documents
  showLimitReachedModal();
}
```

3. **Network Errors**
```typescript
try {
  // API call
} catch (error) {
  if (error instanceof TypeError) {
    alert('❌ Cannot connect to server. Is it running on port 5000?');
  }
}
```

4. **Duplicate Files**
```typescript
if (result.duplicate_files && result.duplicate_files.length > 0) {
  toast.warning(`Already uploaded: ${result.duplicate_files.join(', ')}`);
}
```

---

## Performance Considerations

1. **Debounce Search/Input**
   - Add 300ms debounce to search inputs
   - Prevents excessive API calls

2. **Lazy Loading**
   - Load history on demand
   - Paginate long conversation lists

3. **Optimistic UI Updates**
   - Show messages immediately
   - Update with actual response

4. **Caching**
   - Cache status response (refresh every 30s)
   - Store document list locally

5. **File Validation**
   - Validate on client before upload
   - Show file size warnings (50MB+)

---

## Styling Recommendations

### Color Scheme (from existing frontend):
```css
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --text-color: #2d3748;
  --light-bg: #f7fafc;
  --white: #ffffff;
  --success: #48bb78;
  --warning: #ed8936;
  --error: #f56565;
}
```

### Typography:
- Font Family: 'Segoe UI', 'Inter', 'Roboto', sans-serif
- Headings: 600-700 weight
- Body: 400 weight

---

## Testing Checklist

- [ ] Upload single file
- [ ] Upload multiple files (5)
- [ ] Upload duplicate file
- [ ] Reach upload limit (50 docs)
- [ ] Ask question without documents (Wikipedia)
- [ ] Ask question with documents (RAG)
- [ ] Generate summary without documents (error)
- [ ] Generate summary with documents
- [ ] Generate quiz (3, 5, 10 questions)
- [ ] View conversation history
- [ ] Clear all documents
- [ ] Handle network errors
- [ ] Mobile responsiveness
- [ ] File type validation
- [ ] Large file handling (50MB+)

---

## Future Enhancements

1. **Authentication**
   - User login/signup
   - Personal document spaces

2. **Document Management**
   - Remove individual documents
   - Rename documents
   - Document tags/categories

3. **Advanced Features**
   - Export chat as PDF
   - Save summaries to favorites
   - Share quizzes with others
   - Study schedule planner

4. **Analytics**
   - Study time tracking
   - Topic coverage analysis
   - Quiz performance metrics

---

## Getting Started with React

### 1. Create React App with TypeScript
```bash
npx create-react-app smart-campus-frontend --template typescript
cd smart-campus-frontend
```

### 2. Install Dependencies
```bash
npm install axios react-markdown react-syntax-highlighter
npm install @types/react-syntax-highlighter --save-dev
npm install react-dropzone  # For drag & drop
npm install react-toastify  # For notifications
```

### 3. Project Structure
```
src/
├── api/
│   └── smartCampusApi.ts
├── components/
│   ├── FileUpload/
│   ├── ChatInterface/
│   ├── SummaryGenerator/
│   ├── QuizGenerator/
│   ├── DocumentList/
│   └── StatusBar/
├── hooks/
│   └── useSmartCampus.ts
├── types/
│   └── api.types.ts
├── utils/
│   └── formatters.ts
├── App.tsx
└── index.tsx
```

---

## API Testing with cURL

```bash
# Get status
curl http://localhost:5000/api/status

# Upload file
curl -X POST http://localhost:5000/api/upload_files \
  -F "files=@./lecture1.pdf"

# Ask question
curl -X POST http://localhost:5000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is machine learning?"}'

# Generate summary
curl -X POST http://localhost:5000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"topic": "Neural Networks"}'

# Generate quiz
curl -X POST http://localhost:5000/api/quiz \
  -H "Content-Type: application/json" \
  -d '{"topic": "Python", "num_questions": 3}'

# Get history
curl http://localhost:5000/api/history?limit=5

# Clear documents
curl -X POST http://localhost:5000/api/clear
```

---

## Contact & Support

For questions or issues:
- Check conversation history for previous discussions
- Review session_data.json for persisted state
- Check backend logs for detailed error messages
- Ensure GROQ_API_KEY is set in .env file

---

**Last Updated:** December 3, 2025
**Version:** 2.0
**Backend Port:** 5000
**Recommended Frontend Port:** 3000
