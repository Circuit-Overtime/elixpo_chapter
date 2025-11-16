from boson_multimodal.serve.serve_engine import HiggsAudioServeEngine, HiggsAudioResponse
from multiprocessing.managers import BaseManager
from multiprocessing import Queue
import whisper
import torch
from loguru import logger
import time, resource
import hashlib
import string
from config import TRANSCRIBE_MODEL_SIZE, MAX_CACHE_SIZE_MB, MAX_CACHE_FILES, MAX_CONCURRENT_OPERATIONS
import os
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import threading
from functools import wraps

BASE62 = string.digits + string.ascii_letters
MODEL_PATH = "bosonai/higgs-audio-v2-generation-3B-base"
AUDIO_TOKENIZER_PATH = "bosonai/higgs-audio-v2-tokenizer"
device = "cuda" if torch.cuda.is_available() else "cpu"
torch.cuda.set_per_process_memory_fraction(0.5, 0)


def base62_encode(num: int) -> str:
    if num == 0:
        return BASE62[0]
    digits = []
    base = len(BASE62)
    while num:
        num, rem = divmod(num, base)
        digits.append(BASE62[rem])
    return ''.join(reversed(digits))

def thread_safe_gpu_operation(func):
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        with self._gpu_lock:
            return func(self, *args, **kwargs)
    return wrapper

class ipcModules:
    logger.info("Loading IPC Device...")
    def __init__(self):
        self.model = whisper.load_model(TRANSCRIBE_MODEL_SIZE)
        self.serve_engine = HiggsAudioServeEngine(
            MODEL_PATH,
            AUDIO_TOKENIZER_PATH,
            device=device,
        )
        self.executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_OPERATIONS, thread_name_prefix="AudioOp")
        self._gpu_lock = threading.Lock()
        self._operation_semaphore = threading.Semaphore(MAX_CONCURRENT_OPERATIONS)

    def stop_cleanup(self):
        try:
            self.request_queue.put("STOP")
        except Exception as e:
            logger.error(f"Error stopping cache cleanup: {e}")
        self.executor.shutdown(wait=True, timeout=30)

    @staticmethod
    def cleanup_old_cache_files(): 
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            gen_audio_folder = os.path.join(script_dir, "..", "genAudio")
            
            if not os.path.exists(gen_audio_folder):
                return
            
            files_info = []
            total_size = 0
            
            for filename in os.listdir(gen_audio_folder):
                if filename.endswith('.wav'):
                    file_path = os.path.join(gen_audio_folder, filename)
                    try:
                        stat = os.stat(file_path)
                        files_info.append({
                            'path': file_path,
                            'filename': filename,
                            'atime': stat.st_atime, 
                            'size': stat.st_size
                        })
                        total_size += stat.st_size
                    except OSError as e:
                        logger.warning(f"Failed to stat cache file {filename}: {e}")
            
            files_info.sort(key=lambda x: x['atime'])
            
            total_size_mb = total_size / (1024 * 1024)
            cleaned_count = 0
            freed_mb = 0
            files_to_remove = []

            if total_size_mb > MAX_CACHE_SIZE_MB:
                target_size = MAX_CACHE_SIZE_MB * 0.8 * 1024 * 1024  
                current_size = total_size
                
                for file_info in files_info:
                    if current_size <= target_size:
                        break
                    files_to_remove.append(file_info)
                    current_size -= file_info['size']
            
           
            if len(files_info) > MAX_CACHE_FILES:
                excess_count = len(files_info) - int(MAX_CACHE_FILES * 0.8)  
                for i in range(excess_count):
                    if files_info[i] not in files_to_remove:
                        files_to_remove.append(files_info[i])
            
            
            for file_info in files_to_remove:
                try:
                    os.remove(file_info['path'])
                    cleaned_count += 1
                    freed_mb += file_info['size'] / (1024 * 1024)
                    logger.debug(f"Removed LRU cache file: {file_info['filename']}")
                except OSError as e:
                    logger.warning(f"Failed to remove cache file {file_info['filename']}: {e}")
            
            if cleaned_count > 0:
                logger.info(f"LRU cache cleanup: removed {cleaned_count} files, freed {freed_mb:.2f} MB")
            else:
                logger.debug(f"Cache within limits: {len(files_info)} files, {total_size_mb:.2f} MB")
                
        except Exception as e:
            logger.error(f"Error during LRU cache cleanup: {e}")

    @staticmethod
    def cacheName(query: str, length: int = 16) -> str:  
        query_bytes = query.encode('utf-8')
        digest = hashlib.sha256(query_bytes).digest()
        num = int.from_bytes(digest[:8], 'big')
        encoded = base62_encode(num)
        return encoded[:length]

    def _speechSynthesis_worker(self, chatTemplate: str):
        with self._operation_semaphore:
            thread_id = threading.current_thread().name
            logger.info(f"[{thread_id}] Starting generation...")
            start_time = time.time()
            
            try:
                with self._gpu_lock:
                    output: HiggsAudioResponse = self.serve_engine.generate(
                        chat_ml_sample=chatTemplate,
                        max_new_tokens=4096,
                        temperature=1.0,
                        top_p=0.95,
                        top_k=50,
                        stop_strings=["<|end_of_text|>", "<|eot_id|>"],
                    )
                    torch.cuda.empty_cache()
                    
            except RuntimeError as e:
                if "CUDA out of memory" in str(e):
                    logger.error(f"[{thread_id}] GPU OOM — request denied")
                    return None, None
                raise e

            elapsed_time = time.time() - start_time
            logger.info(f"[{thread_id}] Generation time: {elapsed_time:.2f} seconds")

            return output.audio, output.sampling_rate

    def speechSynthesis(self, chatTemplate: str):
        future = self.executor.submit(self._speechSynthesis_worker, chatTemplate)
        return future.result()  

    def speechSynthesis_async(self, chatTemplate: str):
        return self.executor.submit(self._speechSynthesis_worker, chatTemplate)

    def _transcribe_worker(self, audio_path: str, reqID):
        with self._operation_semaphore:
            thread_id = threading.current_thread().name
            logger.info(f"[{thread_id}] Starting transcription for request {reqID}")
            start_time = time.time()
            
            try:
                result = self.model.transcribe(audio_path)
                elapsed_time = time.time() - start_time
                logger.info(f"[{thread_id}] Transcription time: {elapsed_time:.2f} seconds")
                return result["text"]
            except Exception as e:
                logger.error(f"[{thread_id}] Transcription error: {e}")
                raise e

    def transcribe(self, audio_path: str, reqID) -> str:
        future = self.executor.submit(self._transcribe_worker, audio_path, reqID)
        return future.result()  

    def transcribe_async(self, audio_path: str, reqID):
        return self.executor.submit(self._transcribe_worker, audio_path, reqID)

    def get_active_operations_count(self):
        return MAX_CONCURRENT_OPERATIONS - self._operation_semaphore._value

class ModelManager(BaseManager): pass
if __name__ == "__main__":
    try:
        server = ipcModules()
        ModelManager.register("Service", callable=lambda: server)
        
        manager = ModelManager(address=("localhost", 6000), authkey=b"secret")
        print(f"[Producer] Server started at localhost:6000 with {MAX_CONCURRENT_OPERATIONS} concurrent operations")
        
        try:
            manager.get_server().serve_forever()
        except KeyboardInterrupt:
            logger.info("Shutting down server...")
        finally:
            server.stop_cleanup()
            
    except Exception as e:
        logger.error(f"Error in producer main: {e}")


