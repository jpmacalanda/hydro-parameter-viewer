
import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal, Server, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import systemLogsService from '@/services/SystemLogsService';

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'websocket' | 'webapp'>('websocket');
  const [isPolling, setIsPolling] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Register for logs
    systemLogsService.onLogs((newLogs) => {
      setLogs(newLogs);
    });
    
    return () => {
      // Stop polling when unmounting
      systemLogsService.stopPolling();
    };
  }, []);
  
  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [logs]);
  
  const handleTabChange = (value: string) => {
    const containerType = value as 'websocket' | 'webapp';
    setActiveTab(containerType);
    
    if (isPolling) {
      systemLogsService.startPolling(containerType);
    }
  };
  
  const togglePolling = () => {
    if (isPolling) {
      systemLogsService.stopPolling();
      setIsPolling(false);
    } else {
      systemLogsService.startPolling(activeTab);
      setIsPolling(true);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Server className="mr-2" />
            System Logs
          </CardTitle>
          <Button 
            variant={isPolling ? "destructive" : "default"} 
            size="sm"
            onClick={togglePolling}
          >
            <Activity className="mr-2 h-4 w-4" />
            {isPolling ? "Stop Polling" : "Start Polling"}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="websocket" onValueChange={handleTabChange}>
          <TabsList className="mb-2">
            <TabsTrigger value="websocket">WebSocket Server</TabsTrigger>
            <TabsTrigger value="webapp">Web App Server</TabsTrigger>
          </TabsList>

          <TabsContent value="websocket" className="mt-0">
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Container: hydroponics-websocket
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLogs('')}
                >
                  Clear
                </Button>
              </div>
              
              <ScrollArea className="h-80 border rounded-md p-2 bg-black text-green-500 font-mono text-sm" ref={scrollAreaRef}>
                <div className="whitespace-pre-wrap">
                  {logs.length === 0 ? (
                    <div className="text-gray-500 italic p-2">
                      {isPolling ? "Waiting for logs..." : "Click 'Start Polling' to fetch logs"}
                    </div>
                  ) : (
                    logs.split('\n').map((line, i) => (
                      <div key={i} className="py-1">
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              <p className="text-xs text-muted-foreground">
                Note: In this demo, logs are simulated. In production, these would be fetched from the actual Docker containers.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="webapp" className="mt-0">
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Container: hydroponics-webapp
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLogs('')}
                >
                  Clear
                </Button>
              </div>
              
              <ScrollArea className="h-80 border rounded-md p-2 bg-black text-green-500 font-mono text-sm" ref={scrollAreaRef}>
                <div className="whitespace-pre-wrap">
                  {logs.length === 0 ? (
                    <div className="text-gray-500 italic p-2">
                      {isPolling ? "Waiting for logs..." : "Click 'Start Polling' to fetch logs"}
                    </div>
                  ) : (
                    logs.split('\n').map((line, i) => (
                      <div key={i} className="py-1">
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              <p className="text-xs text-muted-foreground">
                Note: In this demo, logs are simulated. In production, these would be fetched from the actual Docker containers.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SystemLogs;
