
import serial

try:
    ser = serial.Serial('/dev/ttyUSB0', 9600)  # Replace with your Arduino's serial port and baud rate
    while True:
        if ser.in_waiting > 0:
            line = ser.readline().decode('utf-8').rstrip()
            print(line)

except serial.SerialException as e:
    print(f"Error: Serial port issue - {e}")

except KeyboardInterrupt:
    print("Serial reading stopped.")

finally:
    if 'ser' in locals() and ser.is_open:
        ser.close()
