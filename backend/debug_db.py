import os
import certifi
from pymongo import MongoClient
from pymongo.server_api import ServerApi, ServerApiVersion
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://gk5139272_db_user:0OhJkotGM6B0sG9r@cluster0.yt7pddg.mongodb.net/?appName=Cluster0")

client = MongoClient(
    MONGO_URI, 
    server_api=ServerApi(ServerApiVersion.V1),
    tlsCAFile=certifi.where()
)

db = client["smart_campus_db"]
users = db["users"]

print(f"Total Users: {users.count_documents({})}")
for user in users.find({}, {"email": 1, "name": 1, "_id": 0}):
    print(f"User: {user}")
