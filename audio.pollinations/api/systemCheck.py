import os
import time
import shutil
import threading
import gc
import torch
import subprocess

HIGGS_DIR = "/tmp/higgs"
MAX_AGE_SECONDS = 300  # 5 minutes

def clean_higgs_dir():
    while True:
        now = time.time()
        if os.path.exists(HIGGS_DIR):
            for folder in os.listdir(HIGGS_DIR):
                folder_path = os.path.join(HIGGS_DIR, folder)
                try:
                    if os.path.isdir(folder_path):
                        mtime = os.path.getmtime(folder_path)
                        if now - mtime > MAX_AGE_SECONDS:
                            shutil.rmtree(folder_path)
                            print(f"[system_monitor] Removed old folder: {folder_path}")
                except Exception as e:
                    print(f"[system_monitor] Error cleaning {folder_path}: {e}")
        time.sleep(60)

def monitor_ram_gpu():
    while True:
        # RAM cleanup
        gc.collect()
        # GPU cleanup (if available)
        try:
            torch.cuda.empty_cache()
        except Exception:
            pass
        # Optional: print RAM/GPU usage
        try:
            ram = os.popen("free -h").read()
            print("[system_monitor] RAM usage:\n", ram)
        except Exception:
            pass
        try:
            gpu = subprocess.getoutput("nvidia-smi")
            print("[system_monitor] GPU usage:\n", gpu)
        except Exception:
            pass
        time.sleep(60)

def start_system_monitor():
    t1 = threading.Thread(target=clean_higgs_dir, daemon=True)
    t2 = threading.Thread(target=monitor_ram_gpu, daemon=True)
    t1.start()
    t2.start()
    print("[system_monitor] System monitor threads started.")
    t1.join()
    t2.join()

if __name__ == "__main__":
    start_system_monitor()