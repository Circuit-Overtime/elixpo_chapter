import hashlib
import string
import time
import os
from loguru import logger

BASE62 = string.digits + string.ascii_letters
_cache_service = None


def base62_encode(num: int) -> str:
    if num == 0:
        return BASE62[0]
    digits = []
    base = len(BASE62)
    while num:
        num, rem = divmod(num, base)
        digits.append(BASE62[rem])
    return ''.join(reversed(digits))

def cacheName(query: str, length: int = 16) -> str:
    digest = hashlib.sha256(query.encode()).digest()
    num = int.from_bytes(digest[:8], 'big')
    encoded = base62_encode(num)
    return encoded[:length]

def cache_cleanup_worker(request_queue, response_queue):
    logger.info("Cache cleanup worker process started")
    
    while True:
        try:
            try:
                message = request_queue.get(timeout=600)  # 10 minutes timeout
                if message == "STOP":
                    logger.info("Cache cleanup worker received stop signal")
                    break
            except:
                pass
            cleanup_old_cache_files()
            
        except Exception as e:
            logger.error(f"Error in cache cleanup worker: {e}")
            time.sleep(60)  
    
    logger.info("Cache cleanup worker process stopped")

def cleanup_old_cache_files():
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        gen_audio_folder = os.path.join(script_dir, "..", "genAudio")
        
        if not os.path.exists(gen_audio_folder):
            return
            
        current_time = time.time()
        one_hour_ago = current_time - 3600  # 3600 seconds = 1 hour
        
        cleaned_count = 0
        for filename in os.listdir(gen_audio_folder):
            if filename.endswith('.wav'):
                file_path = os.path.join(gen_audio_folder, filename)
                try:
                    file_mtime = os.path.getmtime(file_path)
                    
                    if file_mtime < one_hour_ago:
                        os.remove(file_path)
                        cleaned_count += 1
                        logger.debug(f"Removed old cache file: {filename}")
                        
                except OSError as e:
                    logger.warning(f"Failed to remove cache file {filename}: {e}")
                    
        if cleaned_count > 0:
            logger.info(f"Cache cleanup: removed {cleaned_count} old audio files")
            
    except Exception as e:
        logger.error(f"Error during cache cleanup: {e}")

class CacheService:
    def __init__(self, request_queue, response_queue):
        self.request_queue = request_queue
        self.response_queue = response_queue
    
    def stop_cleanup(self):
        try:
            self.request_queue.put("STOP")
        except Exception as e:
            logger.error(f"Error stopping cache cleanup: {e}")




def get_cache_service():
    global _cache_service
    return _cache_service

def init_cache_service(request_queue, response_queue):
    global _cache_service
    _cache_service = CacheService(request_queue, response_queue)

if __name__ == "__main__":
    print(cacheName("a beautiful flower 42"))
    print(cacheName("SELECT * FROM users WHERE id=43"))
    print(cacheName("a beautiful flower"))  


