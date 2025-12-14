import time
import psutil


class ConversationManager:
    """Manage conversation history"""
    
    def __init__(self, max_history: int = 10):
        self.max_history = max_history
        self.history = []
    
    def add_exchange(self, question: str, answer: str):
        """Add Q&A to history"""
        self.history.append({
            'question': question,
            'answer': answer,
            'timestamp': time.time()
        })
        
        if len(self.history) > self.max_history:
            self.history.pop(0)
    
    def get_recent_context(self, n: int = 3) -> str:
        """Get recent conversation context"""
        recent = self.history[-n:]
        parts = []
        for ex in recent:
            parts.append(f"Q: {ex['question']}\nA: {ex['answer'][:100]}...")
        return "\n\n".join(parts)
    
    def clear(self):
        """Clear history"""
        self.history.clear()


class MemoryMonitor:
    """Monitor memory usage"""
    
    def __init__(self):
        self.process = psutil.Process()
    
    def check_memory(self) -> dict:
        """Check current memory"""
        memory_info = self.process.memory_info()
        memory_mb = memory_info.rss / 1024 / 1024
        
        return {
            'memory_mb': memory_mb,
            'memory_percent': memory_mb / 2048 * 100,
        }


class RateLimiter:
    """Rate limit API calls"""
    
    def __init__(self, delay: float = 1.0):
        self.delay = delay
        self.last_request = 0
    
    def wait_if_needed(self):
        """Wait if needed"""
        current = time.time()
        elapsed = current - self.last_request
        
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        
        self.last_request = time.time()
