# Smart Campus Assistant - Visual Flow Diagram

## 🎨 User Interface Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Smart Campus Assistant 🎓                    [Settings] [@User] [Logout]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐  ┌────────────────────────────────────────────┐   │
│  │   SIDEBAR        │  │          MAIN CONTENT AREA                  │   │
│  │                  │  │                                              │   │
│  │  📤 Upload Files │  │  ┌──────────────────────────────────────┐  │   │
│  │  ┌────────────┐  │  │  │  Tab: 💬 Chat  📝 Summary  📋 Quiz   │  │   │
│  │  │ Drop files │  │  │  │       📚 History                     │  │   │
│  │  │    here    │  │  │  └──────────────────────────────────────┘  │   │
│  │  │     or     │  │  │                                              │   │
│  │  │   Browse   │  │  │  ┌────────────────────────────────────┐    │   │
│  │  └────────────┘  │  │  │                                      │    │   │
│  │                  │  │  │         CHAT INTERFACE               │    │   │
│  │  📊 Status       │  │  │                                      │    │   │
│  │  ━━━━━━━━━━━     │  │  │  🤖 AI: How can I help you study?  │    │   │
│  │  3/50 Documents  │  │  │                                      │    │   │
│  │  127 Chunks      │  │  │  👤 You: What is machine learning?  │    │   │
│  │                  │  │  │                                      │    │   │
│  │  📁 Uploaded     │  │  │  🤖 AI: Machine learning is...      │    │   │
│  │  • lecture1.pdf  │  │  │      📄 Sources: lecture1.pdf       │    │   │
│  │  • notes.docx    │  │  │                                      │    │   │
│  │  • slides.pptx   │  │  │  ┌────────────────────────────────┐ │    │   │
│  │                  │  │  │  │ Type your question here...     │ │    │   │
│  │  🗑️ Clear All    │  │  │  └────────────────────────────────┘ │    │   │
│  │                  │  │  │                            [Send 📤] │    │   │
│  └──────────────────┘  │  └────────────────────────────────────┘    │   │
│                        │                                              │   │
└────────────────────────┴──────────────────────────────────────────────┘
```

## 🔄 Complete Data Flow

### Flow 1: Initial Page Load

```
┌─────────────┐
│   Browser   │
│   Loads     │
│   React App │
└──────┬──────┘
       │
       │ useEffect (on mount)
       │
       ▼
┌─────────────────────┐
│  GET /api/status    │
│                     │
│  Response:          │
│  {                  │
│    uploaded_docs: 0 │
│    max_limit: 50    │
│    remaining: 50    │
│    doc_list: []     │
│  }                  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Update UI State:   │
│  - Show 0/50        │
│  - Empty doc list   │
│  - Enable upload    │
│  - Disable summary  │
│  - Disable quiz     │
└─────────────────────┘
```

### Flow 2: File Upload Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FILE UPLOAD FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘

1. User Action
   └─► Click "Upload" or Drag & Drop files

2. Frontend Validation
   ├─► Check file types (PDF, DOCX, PPTX, TXT, MD)
   ├─► Check file count (max 5 per upload)
   ├─► Check file size (warn if > 50MB)
   └─► Create preview list

3. Prepare FormData
   ├─► const formData = new FormData()
   ├─► files.forEach(file => formData.append('files', file))
   └─► Set loading state = true

4. API Call
   └─► POST /api/upload_files
       Content-Type: multipart/form-data
       Body: formData

5. Backend Processing
   ├─► Receive files
   ├─► Validate file types
   ├─► Check for duplicates
   │   └─► Compare with uploaded_documents[]
   ├─► Check upload limit (50 max)
   ├─► Save files to uploaded_docs/
   ├─► Process each file:
   │   ├─► Extract text (PDF: pdfplumber, DOCX: unstructured, etc.)
   │   ├─► Split into chunks (1500 chars, 200 overlap)
   │   ├─► Generate embeddings (HuggingFace, 384 dims)
   │   └─► Store in ChromaDB
   ├─► Update session_data.json
   └─► Update document_hashes.json

6. Response Handling
   ├─► Success (status: 'success')
   │   ├─► Update document count
   │   ├─► Show success message
   │   ├─► Refresh document list
   │   └─► Enable summary/quiz buttons
   │
   ├─► Warning (status: 'warning' - duplicates)
   │   ├─► Show duplicate file names
   │   ├─► Update count for new files only
   │   └─► Display warning toast
   │
   ├─► Limit Reached (status: 'limit_reached')
   │   ├─► Show limit message
   │   ├─► Suggest clear or remove
   │   └─► Disable upload button
   │
   └─► Error (status: 'error')
       ├─► Show error message
       └─► Keep previous state

7. UI Updates
   ├─► Set loading = false
   ├─► Update progress bar (X/50)
   ├─► Update document list
   ├─► Update chunk count
   └─► Enable relevant features
```

### Flow 3: Ask Question Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                     QUESTION ANSWERING FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

1. User Input
   └─► Types question in chat input
       Example: "What is gradient descent?"

2. Frontend Action
   ├─► Validate input (not empty)
   ├─► Add user message to chat UI
   ├─► Set loading indicator
   └─► POST /api/ask { question: "..." }

3. Backend Decision Tree
   │
   ├─► IF uploaded_documents.length === 0
   │   │
   │   └─► WIKIPEDIA MODE
   │       ├─► Search Wikipedia API
   │       ├─► Get top result summary
   │       ├─► Format with LLM
   │       └─► Return: { type: 'wikipedia', answer, sources: [url] }
   │
   └─► ELSE (documents uploaded)
       │
       └─► RAG MODE
           ├─► 1. Generate question embedding
           │   └─► HuggingFace all-MiniLM-L6-v2 (384 dims)
           │
           ├─► 2. Vector Search
           │   ├─► Query ChromaDB
           │   ├─► Similarity search (k=4)
           │   └─► Retrieve relevant chunks
           │
           ├─► 3. Context Preparation
           │   ├─► Format chunks with sources
           │   └─► [Source 1 - lecture1.pdf]: chunk text...
           │
           ├─► 4. LLM Generation
           │   ├─► Build prompt:
           │   │   Question: {question}
           │   │   Context: {retrieved_chunks}
           │   ├─► Call Groq API (llama-3.1-8b-instant)
           │   ├─► Temperature: 0.2
           │   └─► Streaming: true
           │
           ├─► 5. Save to History
           │   ├─► conversation_history.append(...)
           │   └─► session_data.json updated
           │
           └─► 6. Return Response
               └─► { type: 'rag', answer, sources: [files] }

4. Frontend Display
   ├─► Add assistant message to chat
   ├─► Display answer with formatting
   ├─► Show source badges/links
   ├─► Show type indicator (Wikipedia/RAG)
   ├─► Set loading = false
   └─► Auto-scroll to latest message
```

### Flow 4: Generate Summary Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SUMMARY GENERATION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

1. User Action
   └─► Navigate to Summary tab
       Enter topic: "Neural Networks"
       Click "Generate Summary"

2. Frontend Pre-Check
   ├─► GET /api/status
   └─► IF uploaded_documents === 0
       ├─► Show alert: "Upload documents first"
       └─► STOP

3. API Call
   └─► POST /api/summarize { topic: "Neural Networks" }

4. Backend Processing
   ├─► Check uploaded_documents
   │   └─► IF empty: return error
   │
   ├─► Vector Search
   │   ├─► Generate topic embedding
   │   ├─► Search ChromaDB (k=8 chunks)
   │   └─► Retrieve relevant content
   │
   ├─► Content Combination
   │   ├─► Combine retrieved chunks
   │   ├─► Add source metadata
   │   └─► Truncate if > 5000 chars
   │
   ├─► LLM Summarization
   │   ├─► Prompt: "Create structured summary..."
   │   ├─► Call Groq API
   │   └─► Generate formatted summary
   │
   └─► Return: { success: true, summary: "..." }

5. Frontend Display
   ├─► Parse Markdown formatting
   ├─► Display with syntax highlighting
   ├─► Add copy button
   ├─► Add export PDF option
   └─► Show generation time
```

### Flow 5: Generate Quiz Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                     QUIZ GENERATION FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

1. User Action
   └─► Navigate to Quiz tab
       Topic: "Python Functions"
       Questions: 5
       Click "Generate Quiz"

2. Frontend Pre-Check
   ├─► GET /api/status
   └─► IF uploaded_documents === 0
       ├─► Show alert
       └─► STOP

3. API Call
   └─► POST /api/quiz { 
       topic: "Python Functions",
       num_questions: 5 
     }

4. Backend Processing
   ├─► Vector Search
   │   ├─► Search for topic (k=3 chunks)
   │   └─► Get relevant content
   │
   ├─► LLM Quiz Generation
   │   ├─► Prompt with instructions:
   │   │   - Create N questions
   │   │   - Multiple choice (A, B, C, D)
   │   │   - Indicate correct answer
   │   │   - Add explanations
   │   │   - Mix difficulty levels
   │   ├─► Call Groq API
   │   └─► Generate formatted quiz
   │
   └─► Return: { success: true, quiz: "..." }

5. Frontend Display
   ├─► Parse quiz format
   ├─► Display questions with options
   ├─► Hide answers initially
   ├─► Add "Show Answer" button per question
   ├─► Track user selections
   ├─► Calculate score
   └─► Add "Retry" button
```

### Flow 6: View History Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HISTORY VIEWING FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

1. User Action
   └─► Click "History" tab

2. API Call
   └─► GET /api/history?limit=10

3. Backend Processing
   ├─► Load conversation_history from memory
   ├─► Get last N items
   └─► Return with timestamps

4. Frontend Display
   ├─► Sort by timestamp (newest first)
   ├─► Display as expandable cards:
   │   ┌─────────────────────────────┐
   │   │ Q: What is machine learning?│
   │   │ Dec 3, 2025 10:30 AM        │
   │   │ [Expand ▼]                  │
   │   └─────────────────────────────┘
   │
   │   When expanded:
   │   ┌─────────────────────────────┐
   │   │ Q: What is machine learning?│
   │   │ Dec 3, 2025 10:30 AM        │
   │   │                             │
   │   │ A: Machine learning is...   │
   │   │ Sources: lecture1.pdf       │
   │   │ [Collapse ▲]                │
   │   └─────────────────────────────┘
   │
   ├─► Add search/filter
   ├─► Add date range selector
   └─► Add export button
```

### Flow 7: Clear Documents Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CLEAR DOCUMENTS FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

1. User Action
   └─► Click "Clear All" button

2. Frontend Confirmation
   ├─► Show modal/dialog:
   │   "Are you sure? This will delete all uploaded
   │    documents and conversation history."
   │   [Cancel] [Yes, Clear All]
   │
   └─► IF confirmed, proceed

3. API Call
   └─► POST /api/clear

4. Backend Processing
   ├─► Clear ChromaDB collection
   ├─► Clear uploaded_documents[]
   ├─► Clear conversation_history[]
   ├─► Update session_data.json
   └─► Return: { success: true, message: "Cleared" }

5. Frontend Updates
   ├─► Reset all state:
   │   ├─► documentCount = 0
   │   ├─► documentList = []
   │   ├─► chatHistory = []
   │   ├─► conversationHistory = []
   │   └─► currentSummary = null
   │
   ├─► Update UI:
   │   ├─► Show 0/50 documents
   │   ├─► Empty chat
   │   ├─► Disable summary/quiz
   │   └─► Show success message
   │
   └─► Return to initial state
```

## 📊 State Management Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     REACT STATE MANAGEMENT                           │
└─────────────────────────────────────────────────────────────────────┘

App State (Global Context or Redux)
├─── documentState
│    ├─── count: number
│    ├─── list: string[]
│    ├─── maxLimit: number
│    ├─── remainingSlots: number
│    └─── totalChunks: number
│
├─── chatState
│    ├─── messages: ChatMessage[]
│    ├─── isLoading: boolean
│    ├─── currentQuestion: string
│    └─── error: string | null
│
├─── summaryState
│    ├─── currentSummary: string | null
│    ├─── isGenerating: boolean
│    ├─── topic: string
│    └─── error: string | null
│
├─── quizState
│    ├─── currentQuiz: string | null
│    ├─── isGenerating: boolean
│    ├─── topic: string
│    ├─── numQuestions: number
│    ├─── userAnswers: Record<number, string>
│    └─── score: number | null
│
└─── historyState
     ├─── conversations: ConversationItem[]
     ├─── isLoading: boolean
     ├─── filter: string
     └─── dateRange: [Date, Date] | null

Component State (Local)
├─── FileUpload
│    ├─── selectedFiles: File[]
│    ├─── isDragging: boolean
│    └─── uploadProgress: number
│
├─── ChatInterface
│    ├─── inputValue: string
│    └─── isTyping: boolean
│
└─── DocumentList
     ├─── expandedItems: Set<string>
     └─── searchQuery: string
```

## 🎯 Component Communication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COMPONENT COMMUNICATION                          │
└─────────────────────────────────────────────────────────────────────┘

App (Root)
  │
  ├─► useSmartCampus() hook
  │   └─► Provides all API methods
  │
  ├─► AppContext.Provider
  │   └─► Shares global state
  │
  └─► Child Components
      │
      ├─► StatusBar
      │   ├─► Subscribes to: documentState
      │   └─► Displays: count, progress bar
      │
      ├─► FileUpload
      │   ├─► Uses: uploadFiles() from hook
      │   ├─► Updates: documentState
      │   └─► Emits: onUploadComplete event
      │
      ├─► ChatInterface
      │   ├─► Uses: askQuestion() from hook
      │   ├─► Updates: chatState
      │   ├─► Reads: documentState.count
      │   └─► Auto-switches to Wikipedia if count === 0
      │
      ├─► SummaryGenerator
      │   ├─► Uses: generateSummary() from hook
      │   ├─► Updates: summaryState
      │   └─► Validates: documentState.count > 0
      │
      ├─► QuizGenerator
      │   ├─► Uses: generateQuiz() from hook
      │   ├─► Updates: quizState
      │   └─► Validates: documentState.count > 0
      │
      └─► HistoryViewer
          ├─► Uses: getHistory() from hook
          └─► Updates: historyState
```

## 🔐 Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ERROR HANDLING STRATEGY                          │
└─────────────────────────────────────────────────────────────────────┘

API Call
  │
  ├─► try {
  │     const response = await fetch(...)
  │     const data = await response.json()
  │     
  │     ├─► IF !response.ok
  │     │   └─► throw new Error(data.error || 'Request failed')
  │     │
  │     ├─► IF !data.success
  │     │   ├─► Check error type:
  │     │   │   ├─► "No documents uploaded" → Show upload prompt
  │     │   │   ├─► "Limit reached" → Show clear/manage modal
  │     │   │   ├─► "Duplicate files" → Show warning toast
  │     │   │   └─► Other → Show error message
  │     │   └─► Return null or default value
  │     │
  │     └─► ELSE return data
  │   }
  │
  └─► catch (error) {
        ├─► IF TypeError (network error)
        │   └─► "Cannot connect to server. Is it running?"
        │
        ├─► IF AbortError (timeout)
        │   └─► "Request timed out. Try again."
        │
        └─► ELSE
            └─► "An error occurred: {error.message}"
      }
      finally {
        └─► setLoading(false)
      }
```

## ⚡ Performance Optimization Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PERFORMANCE OPTIMIZATIONS                        │
└─────────────────────────────────────────────────────────────────────┘

1. Debouncing
   └─► Search inputs debounced by 300ms
       ├─► Prevents excessive API calls
       └─► Improves user experience

2. Caching
   └─► Status response cached for 30 seconds
       ├─► Reduces server load
       └─► Faster UI updates

3. Lazy Loading
   └─► History loaded on demand
       ├─► Initial load: first 10 items
       └─► Scroll: load more (pagination)

4. Optimistic Updates
   └─► Show messages immediately
       ├─► Add to UI before API response
       └─► Update with actual response

5. Code Splitting
   └─► React.lazy() for routes
       ├─► Chat: lazy load on tab switch
       ├─► Summary: lazy load on tab switch
       └─► Quiz: lazy load on tab switch

6. Memoization
   └─► useMemo for expensive computations
       ├─► Document list filtering
       ├─► Chat message rendering
       └─► Quiz score calculation

7. Virtual Scrolling
   └─► For long lists (>100 items)
       ├─► History list
       └─► Document list
```

## 🎨 UI/UX Flow Patterns

```
┌─────────────────────────────────────────────────────────────────────┐
│                     UI/UX PATTERNS                                   │
└─────────────────────────────────────────────────────────────────────┘

Loading States
├─► Skeleton screens for initial load
├─► Spinner for API calls
├─► Progress bar for file uploads
└─► Typing indicator for chat

Empty States
├─► No documents: Show upload prompt with illustration
├─► No chat: Show example questions
├─► No history: "Start by asking a question"
└─► No quiz: "Generate your first quiz"

Success Feedback
├─► Toast notifications (3s duration)
├─► Success checkmarks
├─► Smooth animations
└─► Haptic feedback (mobile)

Error States
├─► Inline error messages (red)
├─► Error toasts (auto-dismiss)
├─► Retry buttons
└─► Help links

Progressive Disclosure
├─► Collapse long answers
├─► Expandable history items
├─► Show/hide quiz answers
└─► Advanced settings hidden by default

Responsive Design
├─► Desktop (>1024px): 3-column layout
├─► Tablet (768-1024px): 2-column layout
├─► Mobile (<768px): Single column, drawer sidebar
└─► Touch-friendly buttons (min 44px)
```

---

**This visual flow diagram provides a complete overview of how data flows through the Smart Campus Assistant system, from user interactions to API calls to UI updates. Use this as your blueprint for building the React frontend!**
