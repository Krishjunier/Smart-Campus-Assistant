import os
from pymongo import MongoClient
from pymongo.server_api import ServerApi, ServerApiVersion
from dotenv import load_dotenv

load_dotenv()

import certifi

# Use the URI provided in the prompt or from env
# Ideally from env, but I'll set a default if not present, or use the one from prompt as fallback
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://gk5139272_db_user:0OhJkotGM6B0sG9r@cluster0.yt7pddg.mongodb.net/?appName=Cluster0")

client = MongoClient(
    MONGO_URI, 
    server_api=ServerApi(ServerApiVersion.V1),
    connectTimeoutMS=30000,
    socketTimeoutMS=30000,
    retryWrites=True,
    retryReads=True,
    tlsCAFile=certifi.where()
)

try:
    # Send a ping to confirm a successful connection
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(f"MongoDB connection error: {e}")

db = client["smart_campus_db"]
users_collection = db["users"]
