
import logging
import os
from datetime import datetime

def setup_logger():
    """Set up and configure logging for the application"""
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)

    # Set up logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
    LOG_LEVELS = {
        'DEBUG': logging.DEBUG,
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL
    }

    log_level = LOG_LEVELS.get(LOG_LEVEL, logging.INFO)

    # Set up file handler with rotation
    log_file = f"logs/hydroponics_server_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

    # Set up console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        handlers=[file_handler, console_handler]
    )
    logger = logging.getLogger("hydroponics_server")
    logger.setLevel(log_level)

    logger.info(f"Logging initialized at level {LOG_LEVEL} to {log_file}")
    return logger, log_file, LOG_LEVEL
