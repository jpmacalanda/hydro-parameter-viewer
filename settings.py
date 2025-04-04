
import os
import glob
import serial
import logging
import socket
import subprocess
import sys

logger = logging.getLogger("hydroponics_server")

# Configure these settings:
SERIAL_PORT = os.environ.get('SERIAL_PORT', "/dev/ttyUSB0")  # Can be overridden by environment variable
BAUD_RATE = int(os.environ.get('BAUD_RATE', "9600"))  # Can be overridden by environment variable
WS_PORT = int(os.environ.get('WS_PORT', "8081"))  # Can be overridden by environment variable
USE_SSL = os.environ.get('USE_SSL', 'false').lower() == 'true'
MOCK_DATA = os.environ.get('MOCK_DATA', 'false').lower() == 'true'

# SSL Certificate paths
SSL_CERT_PATH = "/etc/nginx/ssl/nginx.crt"
SSL_KEY_PATH = "/etc/nginx/ssl/nginx.key"

def log_settings():
    """Log all the current settings"""
    logger.info(f"Starting hydroponics server with configuration:")
    logger.info(f"- Serial port: {SERIAL_PORT}")
    logger.info(f"- Baud rate: {BAUD_RATE}")
    logger.info(f"- WebSocket port: {WS_PORT}")
    logger.info(f"- SSL enabled: {USE_SSL}")
    logger.info(f"- Mock data: {MOCK_DATA}")

def list_serial_ports():
    """Lists available serial ports on the system"""
    import sys
    
    if sys.platform.startswith('win'):
        ports = ['COM%s' % (i + 1) for i in range(256)]
    elif sys.platform.startswith('linux') or sys.platform.startswith('cygwin'):
        # This excludes the current terminal /dev/tty
        ports = glob.glob('/dev/tty[A-Za-z]*')
        # Add USB serial device patterns
        ports.extend(glob.glob('/dev/ttyUSB*'))
        ports.extend(glob.glob('/dev/ttyACM*'))
    elif sys.platform.startswith('darwin'):
        ports = glob.glob('/dev/tty.*')
    else:
        raise EnvironmentError('Unsupported platform')

    result = []
    for port in ports:
        try:
            s = serial.Serial(port)
            s.close()
            result.append(port)
        except (OSError, serial.SerialException):
            pass
    return result

def is_port_in_use(port):
    """Check if a port is already in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def check_port_availability():
    """Check if the configured port is already in use"""
    if is_port_in_use(WS_PORT):
        logger.error(f"Port {WS_PORT} is already in use! This might cause connection failures.")
        logger.error(f"To fix this, you may need to kill any other process using port {WS_PORT}:")
        logger.error(f"Run: sudo lsof -i :{WS_PORT}")
        logger.error(f"And then: sudo kill <PID>")

def check_serial_port_used_by_process():
    """Check if the serial port is currently being used by another process"""
    port_busy = False
    pids = []
    cmds = []
    
    try:
        if sys.platform.startswith('linux') or sys.platform.startswith('darwin'):
            # Use lsof on Linux/Mac to find processes using the port
            try:
                output = subprocess.check_output(['lsof', SERIAL_PORT], universal_newlines=True)
                lines = output.strip().split('\n')
                
                if len(lines) > 1:  # First line is header
                    port_busy = True
                    for line in lines[1:]:
                        parts = line.split()
                        if len(parts) > 1:
                            pids.append(parts[1])
                            cmds.append(parts[0])
            except subprocess.CalledProcessError:
                # lsof returns non-zero if no processes are using the file
                port_busy = False
                
        elif sys.platform.startswith('win'):
            # For Windows, check if we can open the port
            try:
                s = serial.Serial(SERIAL_PORT)
                s.close()
                port_busy = False
            except serial.SerialException:
                port_busy = True
                logger.warning(f"Serial port {SERIAL_PORT} appears to be in use by another process")
    except Exception as e:
        logger.error(f"Error checking if serial port is used by process: {e}")
    
    if port_busy:
        logger.warning(f"Serial port {SERIAL_PORT} is currently being used by other processes:")
        for i, (pid, cmd) in enumerate(zip(pids, cmds)):
            logger.warning(f"  Process {pid} ({cmd})")
        logger.warning(f"You may need to terminate these processes to use the port.")
        logger.warning(f"Try: sudo kill {' '.join(pids)}")
    
    return port_busy, pids, cmds

def check_serial_port():
    """Check if the configured serial port is available and accessible"""
    available_ports = list_serial_ports()
    logger.info(f"Available serial ports: {available_ports}")
    
    # Check if our configured serial port exists
    if SERIAL_PORT not in available_ports:
        logger.warning(f"Configured serial port {SERIAL_PORT} not found in available ports: {available_ports}")
        if available_ports:
            logger.info(f"Available ports: {available_ports}")
            logger.info(f"Will attempt to connect to {SERIAL_PORT} anyway in case it appears later")
        else:
            logger.warning("No serial ports found on the system")
    
    # Check if the serial port is being used by other processes
    port_busy, pids, cmds = check_serial_port_used_by_process()
    
    # Check if the user has permission to access the serial port
    if os.path.exists(SERIAL_PORT):
        try:
            stats = os.stat(SERIAL_PORT)
            logger.info(f"Serial port permissions: {oct(stats.st_mode)}")
            
            # Check if readable by the current user
            if not os.access(SERIAL_PORT, os.R_OK | os.W_OK):
                logger.warning(f"Current user does not have read/write permission to {SERIAL_PORT}")
                logger.warning(f"You may need to run: sudo chmod 666 {SERIAL_PORT}")
        except Exception as e:
            logger.error(f"Error checking serial port permissions: {e}")
