
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8081;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('healthy');
});

// Endpoint to get serial monitor logs
app.get('/logs', (req, res) => {
  try {
    const logPath = path.join('/app/logs', 'serial_monitor.log');
    
    if (!fs.existsSync(logPath)) {
      return res.status(404).send('Log file not found');
    }
    
    // Read the last 100 lines of the log file
    const maxLines = req.query.lines ? parseInt(req.query.lines) : 100;
    
    const logContent = fs.readFileSync(logPath, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim());
    
    // Get the most recent lines
    const recentLogs = logLines.slice(-maxLines).join('\n');
    
    // Set content type to plain text
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(recentLogs);
  } catch (error) {
    console.error('Error reading log file:', error);
    res.status(500).send('Error reading log file');
  }
});

// Raw endpoint that returns the entire log file
app.get('/logs/raw', (req, res) => {
  try {
    const logPath = path.join('/app/logs', 'serial_monitor.log');
    
    if (!fs.existsSync(logPath)) {
      return res.status(404).send('Log file not found');
    }
    
    // Set content type to plain text
    res.setHeader('Content-Type', 'text/plain');
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(logPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error streaming log file:', error);
    res.status(500).send('Error streaming log file');
  }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Serial logs server listening at http://0.0.0.0:${port}`);
});
