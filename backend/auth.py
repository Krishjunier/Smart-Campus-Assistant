import datetime
print("DEBUG: LOADING AUTH.PY WITH DIRECT BCRYPT FIX")
import jwt
import bcrypt  # Direct bcrypt usage
import os
from dotenv import load_dotenv
import hashlib

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey") # Should be in env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Removed passlib CryptContext

def get_password_hash(password: str) -> str:
    # Pre-hash with SHA256 (64 hex chars)
    password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    # Hash the SHA256 digest with bcrypt
    # bcrypt.hashpw requires bytes, so encode the hex string
    hashed = bcrypt.hashpw(password_hash.encode('utf-8'), bcrypt.gensalt())
    # Return as string for storage
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # 1. Try confirming with the new method (SHA256 pre-hash)
    try:
        password_hash_new = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
        if bcrypt.checkpw(password_hash_new.encode('utf-8'), hashed_password.encode('utf-8')):
            return True
    except ValueError:
        pass # Continue to try legacy method

    # 2. Fallback: Try confirming with the old method (Direct bcrypt)
    # This supports existing users
    try:
        # Standard bcrypt limit is 72 bytes. If password is longer, this might raise ValueError
        # or we can truncate it to match what passlib might have done (though passlib errored)
        # We'll just try verifying directly. if it errors, then it's not a match.
        if bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8')):
            return True
    except ValueError:
        # Password too long or invalid salt
        pass
    except Exception:
        pass

    return False

def create_access_token(data: dict, expires_delta: datetime.timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: datetime.timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
