import logging
from langchain_huggingface import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)


class EmbeddingManager:
    """Manage embedding model for document vectorization"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize embedding model
        
        Args:
            model_name: HuggingFace model name for embeddings
        """
        self.model_name = model_name
        self.embeddings = self._initialize_embeddings()
    
    def _initialize_embeddings(self):
        """Initialize HuggingFace embeddings"""
        try:
            embeddings = HuggingFaceEmbeddings(
                model_name=self.model_name,
                model_kwargs={'device': 'cpu'},
                encode_kwargs={'normalize_embeddings': True}  # Enable normalization for better performance
            )
            logger.info(f"Embeddings initialized with model: {self.model_name}")
            return embeddings
        except Exception as e:
            logger.error(f"Error initializing embeddings: {e}")
            raise
    
    def get_embeddings(self):
        """Get the embedding function"""
        return self.embeddings
    
    def embed_query(self, text: str):
        """Embed a single query text"""
        return self.embeddings.embed_query(text)
    
    def embed_documents(self, texts: list):
        """Embed multiple documents"""
        return self.embeddings.embed_documents(texts)
