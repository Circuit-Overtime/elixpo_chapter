from flask import Flask, request, jsonify, Response, g
from flask_cors import CORS
from loguru import logger
from utility import save_temp_audio, cleanup_temp_file, validate_and_decode_base64_audio, encode_audio_base64
from requestID import reqID
from voiceMap import VOICE_BASE64_MAP
from server import run_audio_pipeline
import uuid
from cacheHash import cacheName
import multiprocessing as mp
import threading
import queue
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import io
import traceback
from wittyMessages import get_validation_error, get_witty_error
import time
import asyncio
import atexit
import os

request_queue = None
response_queue = None
worker_process = None
worker_thread = None
_worker_initialized = False

cache_cleanup_thread = None
cache_cleanup_stop_event = None

def cleanup_old_cache_files():
    """Clean up cache files older than 1 hour"""
    try:
        gen_audio_folder = os.path.join(os.path.dirname(__file__), "..", "genAudio")
        
        # Ensure the directory exists
        if not os.path.exists(gen_audio_folder):
            return
            
        current_time = time.time()
        one_hour_ago = current_time - 3600  # 3600 seconds = 1 hour
        
        cleaned_count = 0
        for filename in os.listdir(gen_audio_folder):
            if filename.endswith('.wav'):
                file_path = os.path.join(gen_audio_folder, filename)
                try:
                    # Get file modification time
                    file_mtime = os.path.getmtime(file_path)
                    
                    # If file is older than 1 hour, remove it
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

def cache_cleanup_worker():
    """Background worker that periodically cleans up old cache files"""
    global cache_cleanup_stop_event
    
    logger.info("Cache cleanup worker started")
    
    while not cache_cleanup_stop_event.is_set():
        try:
            cleanup_old_cache_files()
            
            # Wait for 10 minutes or until stop event is set
            if cache_cleanup_stop_event.wait(timeout=600):  # 600 seconds = 10 minutes
                break
                
        except Exception as e:
            logger.error(f"Error in cache cleanup worker: {e}")
            # Wait a bit before retrying on error
            if cache_cleanup_stop_event.wait(timeout=60):
                break
    
    logger.info("Cache cleanup worker stopped")

def start_cache_cleanup():
    """Start the cache cleanup background thread"""
    global cache_cleanup_thread, cache_cleanup_stop_event
    
    if cache_cleanup_thread and cache_cleanup_thread.is_alive():
        return
        
    cache_cleanup_stop_event = threading.Event()
    cache_cleanup_thread = threading.Thread(target=cache_cleanup_worker, daemon=True)
    cache_cleanup_thread.start()
    logger.info("Cache cleanup thread started")

def stop_cache_cleanup():
    """Stop the cache cleanup background thread"""
    global cache_cleanup_thread, cache_cleanup_stop_event
    
    if cache_cleanup_stop_event:
        cache_cleanup_stop_event.set()
        
    if cache_cleanup_thread and cache_cleanup_thread.is_alive():
        cache_cleanup_thread.join(timeout=5)
        logger.info("Cache cleanup thread stopped")

        
def is_daemon_process():
    try:
        import multiprocessing
        return multiprocessing.current_process().daemon
    except:
        return False

def init_worker():
    """Initialize the worker process or thread"""
    global request_queue, response_queue, worker_process, worker_thread, _worker_initialized
    
    if _worker_initialized:
        return
        
    try:
        from model_server import model_worker
        from model_service import init_model_service

        
        # Use threading if we're in a daemon process, otherwise use multiprocessing
        if is_daemon_process():
            logger.info("Running in daemon process, using threading for worker")
            request_queue = queue.Queue()
            response_queue = queue.Queue()
            
            # Wrap model_worker for threading
            def thread_worker():
                model_worker(request_queue, response_queue)
            
            worker_thread = threading.Thread(target=thread_worker, daemon=True)
            worker_thread.start()
        else:
            logger.info("Running in main process, using multiprocessing for worker")
            request_queue = mp.Queue()
            response_queue = mp.Queue()
            worker_process = mp.Process(target=model_worker, args=(request_queue, response_queue))
            worker_process.start()
        
        init_model_service(request_queue, response_queue)
        _worker_initialized = True
        
        # Register cleanup function
        atexit.register(cleanup_worker)
        
    except Exception as e:
        logger.error(f"Failed to initialize worker: {e}")
        raise

def cleanup_worker():
    global worker_process, worker_thread, request_queue
    
    # Stop cache cleanup first
    stop_cache_cleanup()
    
    try:
        if request_queue:
            request_queue.put("STOP")
        
        if worker_process and worker_process.is_alive():
            worker_process.join(timeout=5)
            if worker_process.is_alive():
                worker_process.terminate()
        
        if worker_thread and worker_thread.is_alive():
            worker_thread.join(timeout=5)
            
    except Exception as e:
        logger.error(f"Error cleaning up worker: {e}")

def ensure_worker_initialized():
    """Ensure worker is initialized before processing requests"""
    if not _worker_initialized:
        init_worker()

app = Flask(__name__)
CORS(app)

@app.before_request
def before_request():
    g.request_id = reqID()
    g.start_time = time.time()
    # Initialize worker on first request
    ensure_worker_initialized()

@app.after_request
def after_request(response):
    process_time = time.time() - g.get('start_time', time.time())
    response.headers["X-Process-Time"] = str(process_time)
    return response

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "endpoints": {
            "GET": "/audio?text=your_text_here&system=optional_system_prompt&voice=optional_voice",
            "POST": "/audio"
        },
        "message": "All systems operational! 🚀"
    })

@app.route("/audio", methods=["GET", "POST"])
def audio_endpoint():
    if request.method == "GET":
        try:
            text = request.args.get("text")
            system = request.args.get("system")
            voice = request.args.get("voice")
            seed = request.args.get("seed")
            voice_path = None
            request_id = None

            generateHashValue = cacheName(f"{text}{system if system else ''}{voice if voice else ''}{str(seed) if seed else 42}")
            request_id = generateHashValue
            gen_audio_folder = os.path.join(os.path.dirname(__file__), "..", "genAudio")
            cached_audio_path = os.path.join(gen_audio_folder, f"{generateHashValue}.wav")
            if os.path.isfile(cached_audio_path):
                with open(cached_audio_path, "rb") as f:
                    audio_data = f.read()
                return Response(
                    audio_data,
                    mimetype="audio/wav",
                    headers={
                        "Content-Disposition": f"inline; filename={request_id}.wav",
                        "Content-Length": str(len(audio_data))
                    }
                )

            # if audio is not in cache
            if VOICE_BASE64_MAP.get(voice):
                named_voice_path = VOICE_BASE64_MAP.get(voice)
                coded = encode_audio_base64(named_voice_path)
                voice_path = save_temp_audio(coded, request_id, "clone")
            else:
                named_voice_path = VOICE_BASE64_MAP.get("alloy")
                coded = encode_audio_base64(named_voice_path)
                voice_path = save_temp_audio(coded, request_id, "clone")
                

            if not text or not isinstance(text, str) or not text.strip():
                return jsonify({"error": {"message": "Missing required 'text' parameter.", "code": 400}}), 400

            result = asyncio.run(run_audio_pipeline(
                reqID=request_id,
                text=text,
                system_instruction=system,
                voice=voice_path
            ))

            if result["type"] == "audio":
                return Response(
                    result["data"],
                    mimetype="audio/wav",
                    headers={
                        "Content-Disposition": f"inline; filename={request_id}.wav",
                        "Content-Length": str(len(result["data"]))
                    }
                )
            elif result["type"] == "text":
                return jsonify({"text": result["data"], "request_id": request_id})
            else:
                return jsonify({"error": {"message": result.get("message", "Unknown error"), "code": 500}}), 500

        except Exception as e:
            logger.error(f"GET error: {traceback.format_exc()}")
            return jsonify({"error": {"message": str(e), "code": 500}}), 500

    elif request.method == "POST":
        try:
            body = request.get_json(force=True)
            messages = body.get("messages", [])
            seed = body.get("seed", 42)
            if not messages or not isinstance(messages, list):
                return jsonify({"error": {"message": "Missing or invalid 'messages' in payload.", "code": 400}}), 400
            request_id = None
            system_instruction = None
            user_content = None
            for msg in messages:
                if msg.get("role") == "system":
                    for item in msg.get("content", []):
                        if item.get("type") == "text":
                            system_instruction = item.get("text")
                elif msg.get("role") == "user":
                    user_content = msg.get("content", [])

            if not user_content or not isinstance(user_content, list):
                return jsonify({"error": {"message": "Missing or invalid 'content' in user message.", "code": 400}}), 400

            text = None
            voice_name = "alloy"
            voice_b64 = None
            clone_audio_transcript = None
            speech_audio_b64 = None

            for item in user_content:
                if isinstance(item, dict):
                    if item.get("type") == "text":
                        text = item.get("text")
                    elif item.get("type") == "voice":
                        v = item.get("voice", {})
                        if isinstance(v, dict):
                            voice_name = v.get("name", "alloy")
                            if v.get("data"):
                                voice_b64 = v.get("data")
                    elif item.get("type") == "clone_audio_transcript":
                        clone_audio_transcript = item.get("audio_text")
                    elif item.get("type") == "speech_audio":
                        speech_audio_b64 = item.get("audio", {}).get("data")

            if not text or not isinstance(text, str) or not text.strip():
                return jsonify({"error": {"message": "Missing required 'text' in content.", "code": 400}}), 400

            # If both voice_b64 and a non-default voice_name are provided, error
            if voice_b64 and voice_name and voice_name != "alloy":
                return jsonify({"error": {"message": "Provide either 'voice.data' (base64) or 'voice.name', not both.", "code": 400}}), 400

            # Validate and save base64 audio if present
            voice_path = None
            speech_audio_path = None
            generateHashValue = cacheName(f"{text}{system_instruction if system_instruction else ''}{voice_name if voice_name else ''}{str(seed) if seed else 42}")
            request_id = generateHashValue
            gen_audio_folder = os.path.join(os.path.dirname(__file__), "..", "genAudio")
            cached_audio_path = os.path.join(gen_audio_folder, f"{generateHashValue}.wav")
            if os.path.isfile(cached_audio_path):
                with open(cached_audio_path, "rb") as f:
                    audio_data = f.read()
                return Response(
                    audio_data,
                    mimetype="audio/wav",
                    headers={
                        "Content-Disposition": f"inline; filename={request_id}.wav",
                        "Content-Length": str(len(audio_data))
                    }
                )
            if voice_b64:
                try:
                    decoded = validate_and_decode_base64_audio(voice_b64, max_duration_sec=5)
                    voice_path = save_temp_audio(decoded, request_id, "clone")
                except Exception as e:
                    return jsonify({"error": {"message": f"Invalid voice audio: {e}", "code": 400}}), 400
            elif voice_name and not voice_b64:
                try:
                    if VOICE_BASE64_MAP.get(voice_name):
                        named_voice_path = VOICE_BASE64_MAP.get(voice_name)
                        coded = encode_audio_base64(named_voice_path)
                        voice_path = save_temp_audio(coded, request_id, "clone")
                    else:
                        named_voice_path = VOICE_BASE64_MAP.get("alloy")
                        coded = encode_audio_base64(named_voice_path)
                        voice_path = save_temp_audio(coded, request_id, "clone")
                except Exception as e:
                    return jsonify({"error": {"message": f"Invalid voice name: {e}", "code": 400}}), 400
            else:
                named_voice_path = VOICE_BASE64_MAP.get("alloy")
                coded = encode_audio_base64(named_voice_path)
                voice_path = save_temp_audio(coded, request_id, "clone")

            if speech_audio_b64:
                try:
                    decoded = validate_and_decode_base64_audio(speech_audio_b64, max_duration_sec=60)
                    speech_audio_path = save_temp_audio(decoded, request_id, "speech")
                except Exception as e:
                    return jsonify({"error": {"message": f"Invalid speech_audio: {e}", "code": 400}}), 400

            # If voice_path is present, ignore voice_name param

            result = asyncio.run(run_audio_pipeline(
                reqID=request_id,
                text=text,
                voice=voice_path,
                synthesis_audio_path=speech_audio_path,
                clone_audio_transcript=clone_audio_transcript,
                system_instruction=system_instruction,
            ))

            if result["type"] == "audio":
                return Response(
                    result["data"],
                    mimetype="audio/wav",
                    headers={
                        "Content-Disposition": f"inline; filename={request_id}.wav",
                        "Content-Length": str(len(result["data"]))
                    }
                )
            elif result["type"] == "text":
                return jsonify({"text": result["data"], "request_id": request_id})
            else:
                return jsonify({"error": {"message": result.get("message", "Unknown error"), "code": 500}}), 500

        except Exception as e:
            logger.error(f"POST error: {traceback.format_exc()}")
            return jsonify({"error": {"message": str(e), "code": 500}}), 500
        finally:
            cleanup_temp_file(request_id)
            
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "alive", "message": "Still breathing! 💨"}), 200

@app.errorhandler(400)
def bad_request(e):
    logger.warning(f"400 error: {str(e)}")
    return jsonify({"error": {"message": get_validation_error(), "code": 400}}), 400

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Unhandled 500 exception: {traceback.format_exc()}")
    return jsonify({"error": {"message": get_witty_error(), "code": 500}}), 500

@app.errorhandler(404)
def not_found(e):
    logger.info(f"404 error: {request.url}")
    return jsonify({"error": {"message": "This endpoint went on vacation and forgot to leave a forwarding address! 🏖️", "code": 404}}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    logger.info(f"405 error: {request.method} on {request.url}")
    return jsonify({"error": {"message": "That HTTP method is not invited to this party! Try a different one! 🎉", "code": 405}}), 405


if __name__ == "__main__":
    mp.set_start_method('spawn', force=True)
    host = "0.0.0.0"
    port = 8000
    logger.info(f"Starting Elixpo Audio API Server at {host}:{port}")

    init_worker()
    start_cache_cleanup()

    try:
        app.run(host=host, port=port, debug=False, threaded=True)
    finally:
        cleanup_worker()