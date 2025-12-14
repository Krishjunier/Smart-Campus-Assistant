"""
Script to clear all users from the database.
This is needed after changing the password hashing method.
Users will need to re-register with the new hashing method.
"""
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

print(f"Current users in database: {users.count_documents({})}")

# Ask for confirmation
confirm = input("Do you want to DELETE ALL USERS? This cannot be undone! (type 'YES' to confirm): ")

if confirm == "YES":
    result = users.delete_many({})
    print(f"✅ Deleted {result.deleted_count} users from the database.")
    print("Users will need to re-register with their accounts.")
else:
    print("❌ Operation cancelled. No users were deleted.")

client.close()
