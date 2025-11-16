from boson_multimodal.serve.serve_engine import HiggsAudioServeEngine, HiggsAudioResponse
from multiprocessing.managers import BaseManager
from multiprocessing import Queue
import whisper
import torch
from loguru import logger
import time, resource
import hashlib
import string
import os

BASE62 = string.digits + string.ascii_letters
_cache_service = None
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

class ipcModules:
    logger.info("Loading IPC Device...")
    def __init__(self, request_queue, response_queue):
        self.model = whisper.load_model("base")
        self.serve_engine = HiggsAudioServeEngine(
            MODEL_PATH,
            AUDIO_TOKENIZER_PATH,
            device=device,
        )
        self.request_queue = request_queue
        self.response_queue = response_queue

    def stop_cleanup(self):
        try:
            self.request_queue.put("STOP")
        except Exception as e:
            logger.error(f"Error stopping cache cleanup: {e}")


        


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
                    message = request_queue.get(timeout=600)  
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

    

    def speechSynthesis(self, chatTemplate: str):
        logger.info("Starting generation...")
        start_time = time.time()
        try:
            output: HiggsAudioResponse = self.serve_engine.generate(
                chat_ml_sample=chatTemplate,
                max_new_tokens=1024,
                temperature=1.0,
                top_p=0.95,
                top_k=50,
                stop_strings=["<|end_of_text|>", "<|eot_id|>"],
            )
        except RuntimeError as e:
            if "CUDA out of memory" in str(e):
                logger.error("GPU OOM — request denied")
                return None, None
            raise e

        elapsed_time = time.time() - start_time
        logger.info(f"Generation time: {elapsed_time:.2f} seconds")

        torch.cuda.empty_cache()

        return output.audio, output.sampling_rate

    def transcribe(self, audio_path: str) -> str:
        result = self.model.transcribe(audio_path)
        return result["text"]
    



class ModelManager(BaseManager): pass

if __name__ == "__main__":
    try:
        server = ipcModules()
        ModelManager.register("Service", callable=lambda: server)
        
        manager = ModelManager(address=("localhost", 6000), authkey=b"secret")
        print("[Producer] Server started at localhost:6000")
        manager.get_server().serve_forever()
    except Exception as e:
        logger.error(f"Error in producer main: {e}")

    
