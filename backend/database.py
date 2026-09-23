import os
import time
from typing import List, Dict, Any, Optional

try:
    import pymongo
    from pymongo import MongoClient
    PYMONGO_AVAILABLE = True
except ImportError:
    pymongo = None
    MongoClient = None
    PYMONGO_AVAILABLE = False

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "neurosaathi"

class Database:
    def __init__(self):
        self.client = None
        self.db = None
        self.connected = False
        self._in_memory_store: Dict[str, List[Dict[str, Any]]] = {
            "patients": [],
            "activities": [],
            "family_memories": [],
            "alerts": [],
        }
        if PYMONGO_AVAILABLE:
            self._init_connection()
        else:
            print("PyMongo not installed. Running in-memory database store.")

    def _init_connection(self):
        try:
            self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
            # Test connection
            self.client.admin.command('ping')
            self.db = self.client[DB_NAME]
            self.connected = True
            print("Connected to MongoDB successfully.")
            self._create_indexes()
        except Exception as e:
            self.connected = False
            print(f"MongoDB connection unavailable ({e}). Using in-memory dataset store.")

    def _create_indexes(self):
        if self.connected and self.db is not None:
            try:
                self.db.activities.create_index([("patient_id", pymongo.ASCENDING), ("timestamp", pymongo.DESCENDING)])
                self.db.activities.create_index([("patient_id", pymongo.ASCENDING), ("activity_type", pymongo.ASCENDING)])
                self.db.alerts.create_index([("patient_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
                self.db.family_memories.create_index([("patient_id", pymongo.ASCENDING)])
            except Exception as e:
                print(f"Index creation warning: {e}")

db_wrapper = Database()

def get_db():
    return db_wrapper
