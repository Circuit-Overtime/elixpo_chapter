import json
from utility import fetch_url_content_parallel, webSearch, preprocess_text
from multiprocessing.managers import BaseManager
import os 
import time
from typing import Optional
from responseGenerator import generate_intermediate_response
import asyncio



class modelManager(BaseManager): pass
modelManager.register("ipcService")
manager = modelManager(address=("localhost", 5010), authkey=b"ipcService")
manager.connect()
embedModelService = manager.ipcService()

async def subQueryPlan(block, reqID):
    result = ""
    start_time = time.time()
    query = block["q"]
    get_url = webSearch(query)
    information = fetch_url_content_parallel(query, get_url)
    response = embedModelService.extract_relevant(information, query)
    for i in response:
            sentences = []
            for piece in i:
                sentences.extend([s.strip() for s in piece.split('.') if s.strip()])
            result += '. '.join(sentences) + '. '

    end_time = time.time()
    struct = {
        "query": query,
        "urls": get_url,
        "information": result,
        "id": block["id"],
        "priority": block["priority"],
        "time_taken": f"{end_time - start_time:.2f}s",
        "reqID": reqID

    }
    response = await generate_intermediate_response(struct["urls"], struct["query"], struct["information"], struct["priority"])
    struct["information"] = response
    print(f"Subquery processed: {query}")
    print(f"Reranked Information: {json.dumps(struct, indent=2)}")  
        
            


if __name__ == "__main__":
    asyncio.run(subQueryPlan({"q": "capital of france", "id": "test123", "priority": "high"}, "test123"))