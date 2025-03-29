
import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Terminal } from "lucide-react";
import serialService from '@/services/SerialService';

const SerialMonitor: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Register for raw serial messages
    serialService.onRawMessage((message) => {
      setMessages(prev => [...prev, `> ${message}`]);
    });
    
    return () => {
      // No need to clean up as the service handles this on disconnect
    };
  }, []);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);
  
  // Function to send a command (would require implementing in SerialService)
  const sendCommand = () => {
    if (!command.trim()) return;
    
    // Add the command to messages
    setMessages(prev => [...prev, `< ${command}`]);
    
    // Clear the command input
    setCommand('');
    
    // TODO: Implement sending commands to the serial port
    console.log('Command to send:', command);
  };
  
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Terminal className="mr-2" />
          Serial Monitor
        </h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setMessages([])}
        >
          Clear
        </Button>
      </div>
      
      <ScrollArea className="h-80 border rounded-md p-2 bg-black text-green-500 font-mono" ref={scrollAreaRef}>
        <div className="whitespace-pre-wrap">
          {messages.length === 0 ? (
            <div className="text-gray-500 italic p-2">No serial messages received yet...</div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="py-1">
                {msg}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="flex items-center space-x-2">
        <Textarea 
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter command to send..."
          className="font-mono"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendCommand();
            }
          }}
        />
        <Button onClick={sendCommand}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default SerialMonitor;
