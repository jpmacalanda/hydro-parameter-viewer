
# Arduino Setup

## Hardware Requirements

- Arduino board (any model with serial communication)
- Sensors:
  - pH sensor
  - Temperature sensor
  - Water level sensor
  - TDS sensor

## Wiring Diagram

```
                  ┌─────────────┐
                  │   Arduino   │
                  │             │
┌─────────┐       │         A0 ◄─── pH Sensor
│         │       │             │
│ pH      ├───────► GND         │
│ Sensor  │       │             │
│         ├───────► 5V          │
└─────────┘       │             │
                  │             │
┌─────────┐       │         A1 ◄─── Temperature Sensor
│         │       │             │
│ Temp    ├───────► GND         │
│ Sensor  │       │             │
│         ├───────► 5V          │
└─────────┘       │             │
                  │             │
┌─────────┐       │         A2 ◄─── TDS Sensor
│         │       │             │
│ TDS     ├───────► GND         │
│ Sensor  │       │             │
│         ├───────► 5V          │
└─────────┘       │             │
                  │             │
┌─────────┐       │         D2 ◄─── Water Level Sensor
│         │       │             │
│ Water   ├───────► GND         │
│ Level   │       │             │
│ Sensor  ├───────► 5V          │
└─────────┘       │             │
                  │             │
                  │         USB ◄─── To Raspberry Pi
                  │             │
                  └─────────────┘
```

## Software Setup

1. **Install Arduino IDE**
2. **Upload the following code**:

```cpp
// Hydroponics Monitoring System
// Make sure to connect your sensors correctly

void setup() {
  Serial.begin(9600);
  // Initialize your sensors here
}

void loop() {
  // Replace these with actual sensor readings
  float ph = 6.8;           // pH sensor reading
  float temp = 23.5;        // Temperature sensor reading
  String waterLevel = "medium";  // Water level sensor reading
  int tds = 650;            // TDS sensor reading
  
  // Send data in the format expected by the monitoring system
  Serial.print("pH:");
  Serial.print(ph);
  Serial.print(",temp:");
  Serial.print(temp);
  Serial.print(",water:");
  Serial.print(waterLevel);
  Serial.print(",tds:");
  Serial.print(tds);
  Serial.println();
  
  delay(5000); // Send data every 5 seconds
}
```

3. **Connect Arduino to Raspberry Pi** via USB

## Sensor Configuration

### pH Sensor
- Connect to analog pin A0
- Calibration: Use buffer solutions of pH 4.0 and 7.0
- Adjust the calibration factor in the code as needed

### Temperature Sensor
- Connect to analog pin A1
- Waterproof DS18B20 recommended for hydroponics
- Uses OneWire library for communication

### TDS Sensor
- Connect to analog pin A2
- Requires temperature compensation for accurate readings
- Calibrate with standard solution (e.g., 1000 ppm)

### Water Level Sensor
- Connect to digital pin D2
- Float switch or ultrasonic sensor can be used
- Configure threshold values based on your tank dimensions

