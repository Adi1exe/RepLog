"""MongoDB client and collection dependencies."""

import os
from functools import lru_cache

import certifi
from pymongo import ASCENDING, DESCENDING, MongoClient


DEFAULT_MONGO_URI = "mongodb://localhost:27017"
DEFAULT_DATABASE_NAME = "replog"


@lru_cache
def get_client() -> MongoClient:
    uri = os.getenv("MONGO_URI", DEFAULT_MONGO_URI)
    if "mongodb.net" in uri or "srv" in uri:
        return MongoClient(uri, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
    return MongoClient(uri, serverSelectionTimeoutMS=5000)


def get_database():
    database_name = os.getenv("MONGO_DATABASE", DEFAULT_DATABASE_NAME)
    return get_client()[database_name]


def get_db():
    """FastAPI dependency that yields the configured Mongo database."""
    return get_database()


def configure_indexes() -> None:
    """Create indexes required for auth uniqueness and dashboard queries."""
    db = get_database()
    db.users.create_index([("email", ASCENDING)], unique=True)
    db.users.create_index([("username", ASCENDING)], unique=True)
    db.users.create_index([("provider", ASCENDING), ("provider_id", ASCENDING)])
    db.user_vitals.create_index([("user_id", ASCENDING)], unique=True)
    db.workout_sessions.create_index(
        [("user_id", ASCENDING), ("date", DESCENDING)]
    )
