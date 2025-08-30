from loguru import logger
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)

# Optional: define a log format
formatter = logging.Formatter(
    '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)
console_handler.setFormatter(formatter)

# Add handler to logger
if not logger.handlers:  # avoid adding multiple handlers if reloaded
    logger.addHandler(console_handler)