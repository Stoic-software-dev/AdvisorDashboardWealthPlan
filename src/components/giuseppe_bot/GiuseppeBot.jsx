
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Loader2, Paperclip, Globe, File as FileIcon } from "lucide-react"; // Added icons
import { agentSDK } from "@/agents";
import { toast } from "sonner";
import { UploadFile } from "@/api/integrations"; // Added UploadFile integration
import { cn } from "@/lib/utils";

export default function GiuseppeBot({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Giuseppe, your AI financial planning assistant. I follow FP Canada Standards Council guidelines and can help you analyze client data, provide optimization suggestions, and answer questions about financial planning. What would you like to know?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for file input

  // New state for enhanced features
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation when component opens
  useEffect(() => {
    const initializeConversation = async () => {
      if (isOpen && !conversation) {
        try {
          const newConversation = await agentSDK.createConversation({
            agent_name: "financial_planning_advisor",
            metadata: {
              name: "Giuseppe Chat Session",
              description: "Financial planning assistance session"
            }
          });
          setConversation(newConversation);
        } catch (error) {
          console.error("Failed to initialize conversation:", error);
          toast.error("Failed to initialize chat. Please try again.");
        }
      }
    };

    initializeConversation();
  }, [isOpen, conversation]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversation?.id) return;

    const unsubscribe = agentSDK.subscribeToConversation(conversation.id, (data) => {
      if (data.messages) {
        // Convert agent messages to our format
        const formattedMessages = data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at || new Date().toISOString(),
          tool_calls: msg.tool_calls
        }));
        
        setMessages(formattedMessages);
        
        // If the last message is from assistant and not loading, stop loading
        const lastMessage = formattedMessages[formattedMessages.length - 1];
        if (lastMessage?.role === 'assistant' && isLoading) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversation?.id, isLoading]);

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && attachedFiles.length === 0) || isLoading || !conversation) return;

    setIsLoading(true);

    let file_urls = [];
    if (attachedFiles.length > 0) {
      setIsUploading(true);
      try {
        const uploadPromises = attachedFiles.map(file => UploadFile({ file }));
        const uploadedFiles = await Promise.all(uploadPromises);
        file_urls = uploadedFiles.map(res => res.file_url);
      } catch (error) {
        console.error('File upload failed:', error);
        toast.error('File upload failed. Please try again.');
        setIsLoading(false);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    
    let finalMessageContent = inputMessage.trim();
    if (enableWebSearch) {
      finalMessageContent = `Using a web search, please answer the following question: ${finalMessageContent}`;
    }

    const userMessage = {
      role: 'user',
      content: finalMessageContent,
      timestamp: new Date().toISOString(),
      files: attachedFiles.map(f => f.name) // Store names for display
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setAttachedFiles([]);

    try {
      // Send message to agent
      await agentSDK.addMessage(conversation, {
        role: 'user',
        content: userMessage.content,
        file_urls: file_urls,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      setIsLoading(false);
      
      // Remove the user message if sending failed
      setMessages(prev => prev.slice(0, -1));
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
    // Reset file input to allow re-selection of the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (fileToRemove) => {
    setAttachedFiles(prev => prev.filter(file => file !== fileToRemove));
  };


  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    // Reset conversation state when closing
    setConversation(null);
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm Giuseppe, your AI financial planning assistant. I follow FP Canada Standards Council guidelines and can help you analyze client data, provide optimization suggestions, and answer questions about financial planning. What would you like to know?",
        timestamp: new Date().toISOString()
      }
    ]);
    setAttachedFiles([]);
    setEnableWebSearch(false);
    onClose();
  };

  const formatMessageContent = (content) => {
    // Handle basic markdown formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  const FunctionDisplay = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const name = toolCall?.name || 'Function';
    const status = toolCall?.status || 'pending';
    
    const statusConfig = {
      pending: { icon: '⏳', color: 'text-slate-400', text: 'Analyzing...' },
      running: { icon: '⚡', color: 'text-blue-500', text: 'Accessing data...' },
      completed: { icon: '✅', color: 'text-green-600', text: 'Complete' },
      success: { icon: '✅', color: 'text-green-600', text: 'Complete' },
    }[status] || { icon: '🔄', color: 'text-slate-500', text: 'Processing...' };
    
    return (
      <div className="mt-2 text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
          <span>{statusConfig.icon}</span>
          <span className="text-slate-700">Analyzing client data</span>
          <span className={`text-slate-500 ${statusConfig.color}`}>
            • {statusConfig.text}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[700px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Giuseppe</h3>
                <p className="text-sm text-slate-500">FP Canada Standards-Compliant AI Assistant</p>
              </div>
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] ${message.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    message.role === 'user' 
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]' 
                      : 'bg-white border border-slate-200'
                  }`}>
                    <div 
                      className="text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: formatMessageContent(message.content) 
                      }}
                    />
                     {/* Display attached file names in user message */}
                     {message.role === 'user' && message.files && message.files.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          {message.files.map((fileName, fileIndex) => (
                            <div key={fileIndex} className="flex items-center gap-2 text-xs text-white/80">
                              <Paperclip className="w-3 h-3" />
                              <span>{fileName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                  
                  {message.tool_calls?.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {message.tool_calls.map((toolCall, idx) => (
                        <FunctionDisplay key={idx} toolCall={toolCall} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && !isUploading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Giuseppe is thinking...
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
           {/* Attached Files Preview */}
           {attachedFiles.length > 0 && (
            <div className="mb-2 space-y-2">
              {attachedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white border rounded-lg p-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileIcon className="w-4 h-4 text-slate-500" />
                    <span className="truncate max-w-xs">{file.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(file)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your clients, optimization strategies, or attach a document for analysis..."
              className="resize-none pr-28"
              rows={2}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-500 hover:text-slate-900"
                onClick={() => fileInputRef.current.click()}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className={cn("h-8 w-8 text-slate-500 hover:text-slate-900", enableWebSearch && "bg-blue-100 text-blue-600")}
                onClick={() => setEnableWebSearch(!enableWebSearch)}
              >
                <Globe className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500">
              Giuseppe follows FP Canada Standards Council guidelines.
            </p>
            <Button 
                onClick={handleSendMessage}
                disabled={(!inputMessage.trim() && attachedFiles.length === 0) || isLoading}
                size="sm"
                className="gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isUploading ? 'Uploading...' : 'Send'}
              </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
