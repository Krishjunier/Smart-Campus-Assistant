"""
Flask Backend for Smart Campus Assistant - Multi-User Supported
"""
from flask import Flask, request, jsonify, render_template, Response
from werkzeug.utils import secure_filename
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging
import secrets
import datetime
from functools import wraps

from model.assistant import SmartCampusAssistant
from database import users_collection
from auth import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "message": "Smart Campus Assistant API is running 🚀",
        "version": "1.0.0"
    })

# Initialize assistant
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found!")
    raise ValueError("GROQ_API_KEY environment variable not set!")

assistant = SmartCampusAssistant(GROQ_API_KEY)

# File upload configuration
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploaded_docs")
ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "ppt", "pptx", "txt", "md"}
os.makedirs(UPLOAD_DIR, exist_ok=True)

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- Auth Middleware ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'message': 'Missing Authorization Header'}), 401
        
        try:
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            if not payload or payload.get("type") != "access":
                return jsonify({'message': 'Invalid or Expired Token'}), 401
            
            request.user_id = payload.get("sub")
        except Exception:
            return jsonify({'message': 'Invalid Token'}), 401
            
        return f(*args, **kwargs)
    return decorated_function

# --- Auth Endpoints ---

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        if not data:
             return jsonify({"message": "Invalid JSON data"}), 400
             
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        
        if not email or not password:
             return jsonify({"message": "Email and password are required"}), 400
        
        if users_collection.find_one({"email": email}):
            return jsonify({"message": "Email already registered"}), 400
        
        hashed_password = get_password_hash(password)
        user_id = users_collection.insert_one({
            "email": email,
            "password": hashed_password,
            "name": name,
            "documents": [],
            "history": []
        }).inserted_id
        
        access_token = create_access_token(data={"sub": str(user_id)})
        refresh_token = create_refresh_token(data={"sub": str(user_id)})
        
        return jsonify({
            "user": {"id": str(user_id), "email": email, "name": name},
            "accessToken": access_token,
            "refreshToken": refresh_token
        })
    except Exception as e:
        logger.error(f"Signup error: {e}")
        return jsonify({"message": f"Internal Server Error: {str(e)}"}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        if not data:
            return jsonify({"message": "Invalid JSON data"}), 400
            
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"message": "Email and password are required"}), 400
        
        user = users_collection.find_one({"email": email})
        if not user or not verify_password(password, user["password"]):
            return jsonify({"message": "Invalid credentials"}), 401
        
        access_token = create_access_token(data={"sub": str(user["_id"])})
        refresh_token = create_refresh_token(data={"sub": str(user["_id"])})
        
        return jsonify({
            "user": {"id": str(user["_id"]), "email": email, "name": user.get("name")},
            "accessToken": access_token,
            "refreshToken": refresh_token
        })
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({"message": f"Internal Server Error: {str(e)}"}), 500

# --- Protected Endpoints ---

@app.route('/api/status', methods=['GET'])
@login_required
def get_status():
    try:
        status = assistant.get_upload_status(request.user_id)
        if "error" in status:
             return jsonify({'success': False, 'error': status["error"]}), 400
             
        return jsonify({
            'success': True,
            'status': status
        })
    except Exception as e:
        logger.error(f"Status error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard_stats():
    try:
        stats = assistant.get_dashboard_stats(request.user_id)
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/upload_files', methods=['POST'])
@login_required
def upload_files():
    try:
        logger.info(f"Upload request received. Files: {request.files}, Form: {request.form}")
        if 'files' not in request.files:
            logger.error(f"No 'files' key in request.files. Keys: {list(request.files.keys())}, Form Keys: {list(request.form.keys())}, Content-Type: {request.content_type}")
            return jsonify({'success': False, 'error': f'No files part in request. Content-Type: {request.content_type}'}), 400

        files = request.files.getlist('files')
        if not files:
            return jsonify({'success': False, 'error': 'No files provided'}), 400

        saved_paths = []
        
        # Create user specific upload dir to avoid collision? 
        # Or just use unique filenames. Let's append timestamp/uuid to filename or keep simple for now.
        # To keep simple and compatible with existing logic, we just save to UPLOAD_DIR.
        # But for multi-user, we should ideally separate. 
        # For now, we rely on the fact that we store the path in DB.
        
        for f in files:
            filename = secure_filename(f.filename)
            if not filename or not allowed_file(filename):
                continue
            
            # Make unique to avoid overwriting other users' files with same name
            unique_filename = f"{request.user_id}_{int(datetime.datetime.now().timestamp())}_{filename}"
            target_path = os.path.abspath(os.path.join(UPLOAD_DIR, unique_filename))
            f.save(target_path)
            saved_paths.append(target_path)

        if not saved_paths:
            return jsonify({'success': False, 'error': 'No valid files processed'}), 400

        result = assistant.upload_materials(request.user_id, saved_paths)

        return jsonify({'success': result['status'] in ['success', 'warning'], 'result': result})
    except Exception as e:
        logger.error(f"Upload files error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ask', methods=['POST'])
@login_required
def ask_question():
    try:
        data = request.json
        question = data.get('question', '').strip()
        
        if not question:
            return jsonify({'success': False, 'error': 'No question provided'}), 400
        
        # Check if user has documents
        status = assistant.get_upload_status(request.user_id)
        if status.get("uploaded_documents", 0) == 0:
             # Use Wikipedia directly if no documents
             result = assistant.rag_system.search_wikipedia(question)
             return jsonify({
                'success': True,
                'answer': result['answer'],
                'sources': result.get('sources', []),
                'type': 'wikipedia',
                'related_topics': result.get('related_topics', [])
            })

        # Try to get answer from documents first
        result = assistant.ask_question(request.user_id, question)
        answer = result.get('answer', '')
        
        # Check if the answer indicates "don't know" or "not found"
        dont_know_phrases = [
            "don't know",
            "do not know",
            "not mentioned",
            "does not mention",
            "not in the context",
            "not in the documents",
            "no information",
            "cannot find"
        ]
        
        answer_lower = answer.lower()
        is_unknown = any(phrase in answer_lower for phrase in dont_know_phrases)
        
        if is_unknown:
            # Fall back to Wikipedia
            logger.info(f"Answer not found in documents, falling back to Wikipedia for: {question}")
            wiki_result = assistant.rag_system.search_wikipedia(question)
            return jsonify({
                'success': True,
                'answer': wiki_result['answer'],
                'sources': wiki_result.get('sources', []),
                'type': 'wikipedia_fallback',
                'related_topics': wiki_result.get('related_topics', []),
                'fallback_reason': 'Answer not found in your documents'
            })
        
        # Return answer from documents
        return jsonify({
            'success': True,
            'answer': answer,
            'sources': result.get('sources', []),
            'type': 'documents'
        })
    except Exception as e:
        logger.error(f"Question error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/summarize', methods=['POST'])
@login_required
def summarize_topic():
    try:
        data = request.json
        topic = data.get('topic', '').strip()
        
        if not topic:
            return jsonify({'success': False, 'error': 'No topic provided'}), 400
        
        status = assistant.get_upload_status(request.user_id)
        if status.get("uploaded_documents", 0) == 0:
            return jsonify({
                'success': False, 
                'error': '📤 No documents uploaded yet. Please upload course materials first to generate summaries!'
            }), 200
        
        summary = assistant.summarize_notes(request.user_id, topic)
        
        return jsonify({
            'success': True,
            'summary': summary
        })
    except Exception as e:
        logger.error(f"Summarize error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quiz', methods=['POST'])
@login_required
def generate_quiz():
    try:
        data = request.json
        topic = data.get('topic', '').strip()
        num_questions = data.get('num_questions', 5)
        
        if not topic:
            return jsonify({'success': False, 'error': 'No topic provided'}), 400
        
        status = assistant.get_upload_status(request.user_id)
        if status.get("uploaded_documents", 0) == 0:
            return jsonify({
                'success': False,
                'error': '📤 No documents uploaded yet. Please upload course materials first to generate quizzes!'
            }), 200
        
        quiz = assistant.generate_practice_quiz(request.user_id, topic, num_questions)
        
        return jsonify({
            'success': True,
            'quiz': quiz
        })
    except Exception as e:
        logger.error(f"Quiz error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quiz/submit', methods=['POST'])
@login_required
def submit_quiz_result():
    try:
        data = request.json
        score = data.get('score')
        total = data.get('total')
        topic = data.get('topic')
        
        if score is None or total is None:
            return jsonify({'success': False, 'error': 'Score and total are required'}), 400
            
        result = assistant.submit_quiz_result(request.user_id, score, total, topic)
        
        return jsonify({
            'success': result,
            'message': 'Score saved' if result else 'Failed to save score'
        })
    except Exception as e:
        logger.error(f"Quiz submit error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
@login_required
def get_history():
    try:
        limit = request.args.get('limit', 10, type=int)
        history = assistant.get_conversation_history(request.user_id, limit)
        
        return jsonify({
            'success': True,
            'history': history
        })
    except Exception as e:
        logger.error(f"History error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/clear', methods=['POST'])
@login_required
def clear_documents():
    try:
        result = assistant.clear_all_documents(request.user_id)
        return jsonify({
            'success': result['status'] == 'success',
            'message': result['message']
        })
    except Exception as e:
        logger.error(f"Clear error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Smart Campus Assistant Server (Multi-User)...")
    from waitress import serve
    serve(app, host='0.0.0.0', port=5000)

