import os
import logging
import redis
from rq import Worker, Queue
from pymongo import MongoClient
from sendEmailToLeaks import send_email
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("emailWorkerScript")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo = MongoClient(MONGO_URI)
db = mongo["polli-token"]           
leaks_col = db["leaks"]

# Redis connection
redis_conn = redis.Redis(host='localhost', port=6379, db=0)

def process_leak(leak_info):
    try:
        # Store leak in DB (idempotent insert)
        leaks_col.update_one(
            {"commit_hash": leak_info.get("commit_hash"),
             "file_path": leak_info.get("file_path"),
             "token": leak_info.get("token")},
            {"$setOnInsert": leak_info},
            upsert=True
        )
        # Send email notification
        receiver_email = leak_info["receiver_email"]
        result = send_email(
            receiver_email,
            leak_info["repo_url"],
            leak_info["file_path"],
            leak_info["line_number"],
            leak_info["token"],
            leak_info["commit_hash"],
            leak_info["diff_info"]
        )
        if result["status"] == "success":
            logger.info(f"Leak processed and email sent to {receiver_email}")
        else:
            logger.error(f"Leak processed but failed to send email to {receiver_email}: {result['message']}")
    except Exception as e:
        logger.exception(f"Error processing leak: {e}")

if __name__ == "__main__":
    q = Queue("leaks", connection=redis_conn)
    worker = Worker([q], connection=redis_conn)
    worker.work()
