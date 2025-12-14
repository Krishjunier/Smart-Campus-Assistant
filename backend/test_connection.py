import os
import socket
import ssl
import sys
import certifi
from pymongo import MongoClient
from pymongo.server_api import ServerApi, ServerApiVersion
from dotenv import load_dotenv

# Load env
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://gk5139272_db_user:0OhJkotGM6B0sG9r@cluster0.yt7pddg.mongodb.net/?appName=Cluster0")

print(f"--- MongoDB Connection Diagnostic Tool ---")
print(f"Python Version: {sys.version}")
print(f"URI: {MONGO_URI.split('@')[1] if '@' in MONGO_URI else 'HIDDEN'}")

def check_dns(hostname):
    print(f"\n[1] Checking DNS resolution for {hostname}...")
    try:
        ip = socket.gethostbyname(hostname)
        print(f"    SUCCESS: Resolved to {ip}")
        return ip
    except Exception as e:
        print(f"    FAILED: {e}")
        return None

def check_tcp(hostname, port):
    print(f"\n[2] Checking TCP connection to {hostname}:{port}...")
    try:
        sock = socket.create_connection((hostname, port), timeout=10)
        print(f"    SUCCESS: Connected to {hostname}:{port}")
        sock.close()
        return True
    except Exception as e:
        print(f"    FAILED: {e}")
        return False

def check_mongo_driver():
    print(f"\n[3] Testing PyMongo Connection...")
    try:
        client = MongoClient(
            MONGO_URI,
            server_api=ServerApi(ServerApiVersion.V1),
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
            serverSelectionTimeoutMS=10000,
            tlsCAFile=certifi.where()
        )
        print("    Attempting ping...")
        client.admin.command('ping')
        print("    SUCCESS: MongoDB Ping Successful!")
    except Exception as e:
        print(f"    FAILED: {e}")

if __name__ == "__main__":
    # Extract hostname from URI
    # Redirect output to file
    with open("backend/connection_log.txt", "w") as log_file:
        sys.stdout = log_file
        try:
            # Direct check to the shard found in logs
            shard_host = "ac-lfxuyux-shard-00-00.yt7pddg.mongodb.net"
            print(f"Target Shard: {shard_host}")
            check_dns(shard_host)
            check_tcp(shard_host, 27017)
        except Exception as e:
            print(f"Error parsing URI: {e}")

        check_mongo_driver()
        sys.stdout = sys.__stdout__ # Reset stdout
