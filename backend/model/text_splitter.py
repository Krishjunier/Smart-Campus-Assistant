import re
from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


class SmartTextSplitter:
    """Intelligent text splitter that preserves educational content structure"""
    
    def __init__(self, chunk_size: int = 1200, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Educational content patterns
        self.structure_patterns = {
            'heading': r'^#{1,6}\s+.*$|^[A-Z][^.!?]*:$',
            'list': r'^\s*[\d\-\*\+•]\s+',
            'formula': r'\$.*?\$|\\[.*?\\]',
            'code': r'```.*?```',
            'table': r'\|.*\|.*\|',
            'definition': r'^[A-Z][a-zA-Z\s]+:\s+',
        }
        
    def split_documents(self, documents: List[Document]) -> List[Document]:
        """Split documents intelligently"""
        all_splits = []
        
        for doc in documents:
            splits = self._split_single_document(doc)
            all_splits.extend(splits)
        
        return all_splits
    
    def _split_single_document(self, document: Document) -> List[Document]:
        """Split a single document preserving structure"""
        text = document.page_content
        
        # Use recursive character splitter with educational separators
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=[
                "\n\n\n",  # Multiple newlines (major sections)
                "\n\n",    # Paragraphs
                "\n",      # Lines
                ". ",      # Sentences
                " ",       # Words
                ""
            ]
        )
        
        splits = splitter.split_text(text)
        documents = []
        
        for i, split in enumerate(splits):
            content_type = self._classify_content(split)
            
            doc = Document(
                page_content=split,
                metadata={
                    **document.metadata,
                    "chunk_index": i,
                    "content_type": content_type,
                    "word_count": len(split.split()),
                }
            )
            documents.append(doc)
        
        return documents
    
    def _classify_content(self, text: str) -> str:
        """Classify educational content type"""
        text_lower = text.lower()
        
        if re.search(self.structure_patterns['formula'], text):
            return "formula"
        elif re.search(self.structure_patterns['code'], text):
            return "code"
        elif re.search(self.structure_patterns['table'], text):
            return "table"
        elif re.search(self.structure_patterns['definition'], text):
            return "definition"
        elif re.search(self.structure_patterns['list'], text, re.MULTILINE):
            return "list"
        elif re.search(self.structure_patterns['heading'], text, re.MULTILINE):
            return "heading"
        else:
            return "paragraph"
