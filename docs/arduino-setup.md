
# Arduino Setup

## Hardware Requirements

- Arduino board (any model with serial communication)
- Sensors:
  - pH sensor
  - Temperature sensor
  - Water level sensor
  - TDS sensor

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

