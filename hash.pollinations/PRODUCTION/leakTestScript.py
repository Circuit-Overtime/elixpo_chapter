import os
from rq import Queue
from redis import Redis

# Make sure this matches your worker import path
queue = Queue("leaks", connection=Redis())

dummy_leak = {
    "repo_url": "testuser/testrepo",
    "file_path": "src/secrets.py",
    "line_number": 42,
    "token": "dummy-token-123",
    "commit_hash": "abc123def456",
    "diff_info": "dummy diff info",
    "receiver_email": "ayushbhatt633@gmail.com",  # Use your email for testing
    "timestamp": 1234567890
}

queue.enqueue("emailWorkerScript.process_leak", dummy_leak)
print("Dummy leak enqueued!")