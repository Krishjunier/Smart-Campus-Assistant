import os
import datetime
import json
from typing import List, Dict, Any
from bson.objectid import ObjectId

from langchain_groq import ChatGroq
from langchain_chroma import Chroma

from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper

from model.document_loader import EnhancedDocumentLoader
from model.text_splitter import SmartTextSplitter
from model.embeddings import EmbeddingManager
from database import users_collection

class SmartCampusAssistant:
    def __init__(self, api_key: str):
        self.api_key = api_key
        # Initialize Groq LLM
        self.llm = ChatGroq(
            temperature=0.3, 
            groq_api_key=api_key, 
            model_name="llama-3.3-70b-versatile"
        )
        
        self.embedding_manager = EmbeddingManager()
        self.text_splitter = SmartTextSplitter()
        
        # Vector Store Path
        self.persist_directory = os.path.join(os.path.dirname(os.path.dirname(__file__)), "campus_rag_db")
        os.makedirs(self.persist_directory, exist_ok=True)
        
        # Initialize Chroma
        self.vector_store = Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embedding_manager.get_embeddings()
        )
        
        # Initialize Wikipedia tool
        self.wiki_tool = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())

    def upload_materials(self, user_id: str, file_paths: List[str]) -> Dict[str, Any]:
        try:
            documents = []
            for path in file_paths:
                loader = EnhancedDocumentLoader(path)
                docs = loader.load()
                # Add metadata
                for doc in docs:
                    doc.metadata["user_id"] = user_id
                    doc.metadata["uploaded_at"] = datetime.datetime.now().isoformat()
                    doc.metadata["source_file"] = os.path.basename(path)
                documents.extend(docs)
            
            if not documents:
                return {"status": "error", "message": "No content found in files"}

            splits = self.text_splitter.split_documents(documents)
            
            # Add to vector store in batches to avoid exceeding max batch size
            BATCH_SIZE = 100  # ChromaDB default max is 166, use 100 to be safe
            for i in range(0, len(splits), BATCH_SIZE):
                batch = splits[i:i + BATCH_SIZE]
                self.vector_store.add_documents(batch)
            
            # Update user record in MongoDB
            file_metadata = [{
                "filename": os.path.basename(p), 
                "uploaded_at": datetime.datetime.now()
            } for p in file_paths]
            
            users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$push": {"documents": {"$each": file_metadata}}}
            )
            
            return {"status": "success", "message": f"Processed {len(file_paths)} files ({len(splits)} chunks)"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def ask_question(self, user_id: str, question: str) -> Dict[str, Any]:
        try:
            # Create retriever with user filter
            retriever = self.vector_store.as_retriever(
                search_kwargs={"filter": {"user_id": user_id}, "k": 4}
            )
            
            template = """You are a helpful Smart Campus Assistant. Use the following context to answer the student's question.
            Format your answer with clear bullet points and structured sections where applicable.
            If the answer is not in the context, say you don't know based on the documents.
            
            Context: {context}
            
            Question: {input}
            
            Answer:"""
            
            prompt = PromptTemplate(template=template, input_variables=["context", "input"])
            
            # Create modern retrieval chain
            from langchain.chains import create_retrieval_chain
            from langchain.chains.combine_documents import create_stuff_documents_chain
            
            combine_docs_chain = create_stuff_documents_chain(self.llm, prompt)
            chain = create_retrieval_chain(retriever, combine_docs_chain)
            
            response = chain.invoke({"input": question})
            answer = response["answer"]
            source_docs = response["context"]
            
            sources = list(set([doc.metadata.get("source_file", "Unknown") for doc in source_docs]))
            
            # Save history
            users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$push": {"history": {
                    "question": question,
                    "answer": answer,
                    "sources": sources,
                    "timestamp": datetime.datetime.now()
                }}}
            )
            
            return {"answer": answer, "sources": sources}
        except Exception as e:
            return {"answer": f"Error: {str(e)}", "sources": []}


    def summarize_notes(self, user_id: str, topic: str) -> str:
        try:
            retriever = self.vector_store.as_retriever(
                search_kwargs={"filter": {"user_id": user_id}, "k": 5}
            )
            docs = retriever.invoke(topic)
            context = "\n\n".join([doc.page_content for doc in docs])
            
            if not context:
                return "No relevant documents found for this topic."
                
            prompt = f"""Summarize the following content regarding '{topic}'. 
            Make it comprehensive and well-structured.
            
            Formatting Rules:
            - Use '### ' (Markdown H3) for all subheadings.
            - Use bullet points ('- ') for all list items.
            - Ensure there is a blank line between sections.
            
            Example Format:
            ### Key Concepts
            - Concept A: Description...
            - Concept B: Description...
            
            ### Historical Context
            - Event 1 happened in...
            
            Content:
            {context}
            """
            
            response = self.llm.invoke(prompt)
            return response.content
        except Exception as e:
            return f"Error generating summary: {str(e)}"

    def generate_practice_quiz(self, user_id: str, topic: str, num_questions: int) -> List[Dict]:
        try:
            retriever = self.vector_store.as_retriever(
                search_kwargs={"filter": {"user_id": user_id}, "k": 5}
            )
            docs = retriever.invoke(topic)
            context = "\n\n".join([doc.page_content for doc in docs])
            
            prompt = f"""Generate a multiple choice quiz with {num_questions} questions based on the following content about '{topic}'.
            Return the result as a JSON array of objects, where each object has:
            - question: str
            - options: List[str] (4 options)
            - correct_answer: str (the correct option text)
            - explanation: str
            
            Do not include any markdown formatting like ```json. Just the raw JSON string.
            
            Content:
            {context}
            """
            
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            
            if content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
                
            return json.loads(content)
        except Exception as e:
            return []

    def get_upload_status(self, user_id: str) -> Dict[str, Any]:
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                return {"uploaded_documents": 0, "documents": []}
            
            docs = user.get("documents", [])
            return {
                "uploaded_documents": len(docs),
                "documents": docs
            }
        except Exception:
            return {"uploaded_documents": 0, "documents": []}

    def get_conversation_history(self, user_id: str, limit: int = 10) -> List[Dict]:
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                return []
            
            history = user.get("history", [])
            return sorted(history, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]
        except Exception:
            return []

    def clear_all_documents(self, user_id: str) -> Dict[str, str]:
        # Ideally we delete from Chroma too, but for now just clear DB ref
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"documents": [], "history": [], "quiz_scores": []}}
        )
        return {"status": "success", "message": "Cleared all documents and history"}

    def submit_quiz_result(self, user_id: str, score: int, total: int, topic: str) -> bool:
        try:
            users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$push": {"quiz_scores": {
                    "score": score,
                    "total": total,
                    "topic": topic,
                    "timestamp": datetime.datetime.now()
                }}}
            )
            return True
        except Exception:
            return False

    def get_dashboard_stats(self, user_id: str) -> Dict[str, Any]:
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                return {"documents": 0, "questions": 0, "study_hours": 0, "quiz_score": 0}
            
            # Documents
            docs_count = len(user.get("documents", []))
            
            # Questions
            history = user.get("history", [])
            questions_count = len(history)
            
            # Study Hours Calculation
            # Algorithm: Group interactions into sessions. If gap > 30 mins, new session.
            # Default session duration for single event = 5 mins.
            study_minutes = 0
            if history:
                # Ensure sorted by timestamp
                sorted_history = sorted(
                    [h for h in history if h.get("timestamp")], 
                    key=lambda x: x["timestamp"]
                )
                
                if sorted_history:
                    current_session_start = sorted_history[0]["timestamp"]
                    last_time = current_session_start
                    
                    for i in range(1, len(sorted_history)):
                        curr_time = sorted_history[i]["timestamp"]
                        time_diff = (curr_time - last_time).total_seconds() / 60
                        
                        if time_diff > 30: # 30 min gap starts new session
                            # End previous session
                            session_duration = (last_time - current_session_start).total_seconds() / 60
                            study_minutes += max(5, session_duration) # Minimum 5 mins per session
                            
                            # Start new session
                            current_session_start = curr_time
                        
                        last_time = curr_time
                    
                    # Add last session
                    session_duration = (last_time - current_session_start).total_seconds() / 60
                    study_minutes += max(5, session_duration)
            
            # Quiz Score
            quiz_scores = user.get("quiz_scores", [])
            avg_score = 0
            if quiz_scores:
                total_percentage = sum([(s["score"] / s["total"]) * 100 for s in quiz_scores if s["total"] > 0])
                avg_score = int(total_percentage / len(quiz_scores))
                
            return {
                "documents": docs_count,
                "questions": questions_count,
                "study_hours": round(study_minutes / 60, 1),
                "quiz_score": avg_score
            }
        except Exception as e:
            return {"documents": 0, "questions": 0, "study_hours": 0, "quiz_score": 0}

    @property
    def rag_system(self):
        return self

    def search_wikipedia(self, query: str) -> Dict[str, Any]:
        try:
            raw_content = self.wiki_tool.run(query)
            
            prompt = f"""Format the following Wikipedia content into a clear, structured answer with bullet points.
            Focus on the most important facts relevant to: '{query}'.
            
            Content:
            {raw_content}
            """
            
            response = self.llm.invoke(prompt)
            formatted_answer = response.content
            
            return {
                "answer": formatted_answer, 
                "sources": ["Wikipedia"], 
                "related_topics": []
            }
        except Exception as e:
            return {
                "answer": f"Could not fetch from Wikipedia. Error: {str(e)}", 
                "sources": [], 
                "related_topics": []
            }
