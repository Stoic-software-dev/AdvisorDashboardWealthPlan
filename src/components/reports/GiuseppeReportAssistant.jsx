
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, User, Send, Sparkles, Loader2, Copy, Check, FileText, ArrowLeft } from "lucide-react";
import { InvokeLLM } from "@/api/integrations";
import ReactMarkdown from 'react-markdown';

export default function GiuseppeReportAssistant({ 
  isOpen, 
  onClose, 
  reportData, 
  clients, 
  goals, 
  portfolios, 
  calculators,
  appSettings, 
  advisorProfile, 
  onContentUpdate,
  onNotesUpdate 
}) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I'm Giuseppe, your AI report writing assistant. I can help you create professional content for each section of your financial report. What would you like me to help you with?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Define all possible section options
  const allSectionOptions = [
    { value: 'advisor_profile', label: 'Advisor Profile' },
    { value: 'executive_summary', label: 'Executive Summary' },
    { value: 'client_profile', label: 'Client Profile Analysis' },
    { value: 'financial_goals', label: 'Financial Goals Analysis' },
    { value: 'portfolios', label: 'Portfolio Analysis' },
    { value: 'calculators', label: 'Financial Projections Analysis' },
    { value: 'recommendations', label: 'Recommendations & Next Steps' }
  ];

  // Filter options based on reportData.sections
  const availableSectionOptions = allSectionOptions.filter(option => reportData.sections?.[option.value]);

  const [selectedSection, setSelectedSection] = useState(() => {
    // Default to 'executive_summary' if enabled and available, otherwise the first available section
    if (reportData.sections?.executive_summary && availableSectionOptions.some(opt => opt.value === 'executive_summary')) {
        return 'executive_summary';
    } else if (availableSectionOptions.length > 0) {
        return availableSectionOptions[0].value;
    }
    return ''; // Fallback if no sections are available
  });

  const [generatedContent, setGeneratedContent] = useState('');
  const [copiedStates, setCopiedStates] = useState({}); // FIX: Initialize with useState
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableView = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableView) {
        scrollableView.scrollTop = scrollableView.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const getReportContext = () => {
    // Handle both single and multiple client IDs
    const reportClientIds = reportData.client_ids || (reportData.client_id ? [reportData.client_id] : []);
    const reportClients = clients.filter(c => reportClientIds.includes(c.id));
    
    // Ensure selected_... are arrays before filtering
    const selectedGoals = goals.filter(g => (reportData.selected_goals || []).includes(g.id));
    const selectedPortfolios = portfolios.filter(p => (reportData.selected_portfolios || []).includes(p.id));
    const selectedCalculators = calculators.filter(c => (reportData.selected_calculators || []).includes(c.id));

    return {
      reportName: reportData.name,
      reportDescription: reportData.description, 
      clients: reportClients, // Pass the array of clients
      goals: selectedGoals,
      portfolios: selectedPortfolios,
      calculators: selectedCalculators,
      advisorProfile, 
      appSettings 
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { sender: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const context = getReportContext();
      
      const systemPrompt = `You are Giuseppe, an expert financial planning report writer. 
      
**CRITICAL CONTEXT: You are a Canadian financial advisor. All advice, terminology, and recommendations MUST be specific to the Canadian financial system. Use accounts like RRSP, TFSA, RESP, etc. NEVER recommend US accounts like 401(k) or IRA.**

REPORT CONTEXT:
- Report Name: ${context.reportName}
- Client: ${context.clients && context.clients.length > 0 ? context.clients.map(c => `${c.first_name} ${c.last_name}`).join(', ') : 'Not selected'}
- Selected Goals: ${context.goals.length} goals
- Selected Portfolios: ${context.portfolios.length} portfolios  
- Selected Calculators: ${context.calculators.length} calculators

FULL DATA CONTEXT:
${JSON.stringify(context, null, 2)}

Your role is to:
1. Create professional, clear, and actionable financial report content
2. Use the provided data to support your analysis and recommendations
3. Write in a professional but accessible tone suitable for client presentations
4. Provide specific, data-driven insights
5. Structure content with clear headings and bullet points when appropriate
6. IMPORTANT: For sub-headings like 'Key Findings' or 'Main Recommendations', format them as bold text on their own line, followed by a blank line, before the content begins. For example:
**Key Findings**

The client's main assets are...

Current section focus: ${selectedSection}

Please provide helpful, professional content based on the user's request and the available data.`;

      const response = await InvokeLLM({ 
        prompt: `${systemPrompt}\n\nUser Request: "${userMessage.text}"` 
      });

      const botMessage = { 
        sender: 'bot', 
        text: response || "I apologize, but I encountered an error generating content. Please try rephrasing your request." 
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Error invoking LLM:", error);
      const errorMessage = { 
        sender: 'bot', 
        text: "I'm sorry, I encountered an error while generating content. Please try again." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSection = async () => {
    setIsLoading(true);
    
    try {
      const context = getReportContext();
      
      let sectionPrompt = '';
      switch (selectedSection) {
        case 'advisor_profile':
          sectionPrompt = `Create professional content introducing the advisor. Include background, experience, and approach to financial planning. Make it client-focused and trustworthy.`;
          break;
        case 'executive_summary':
          sectionPrompt = `Create an executive summary that highlights the key findings, main recommendations, and next steps for this client's financial situation.`;
          break;
        case 'client_profile':
          sectionPrompt = `Create professional analysis of the client's financial profile, including their current situation, goals, and key considerations.`;
          break;
        case 'financial_goals':
          sectionPrompt = `Analyze the selected financial goals, provide insights on progress, timelines, and strategies to achieve them.`;
          break;
        case 'portfolios':
          sectionPrompt = `Analyze the selected investment portfolios, including performance, allocation, risk assessment, and recommendations.`;
          break;
        case 'calculators':
          sectionPrompt = `Summarize and analyze the financial projections and calculator results, explaining what they mean for the client's financial future.`;
          break;
        case 'recommendations':
          sectionPrompt = `Create specific, actionable recommendations based on the client's complete financial picture. Include priorities and next steps.`;
          break;
        default:
          sectionPrompt = `Create professional content for the ${selectedSection} section of this financial report.`;
      }

      const systemPrompt = `You are Giuseppe, an expert financial planning report writer. 

**CRITICAL CONTEXT: You are a Canadian financial advisor. All advice, terminology, and recommendations MUST be specific to the Canadian financial system. Use accounts like RRSP, TFSA, RESP, etc. NEVER recommend US accounts like 401(k) or IRA.**

REPORT CONTEXT:
${JSON.stringify(context, null, 2)}

Create professional report content for the ${selectedSection} section.
IMPORTANT FORMATTING RULES:
- Use markdown formatting with headers, bullet points, and emphasis where appropriate.
- For sub-headings inside a section (e.g., 'Key Findings', 'Main Recommendations'), format them as bold text on their own line, followed by a blank line. For example:
**Key Findings**

The client's main assets are...
- Base your analysis on the provided data and make it client-ready.`;

      const response = await InvokeLLM({ 
        prompt: `${systemPrompt}\n\n${sectionPrompt}` 
      });

      setGeneratedContent(response || "Unable to generate content at this time.");
      
      const botMessage = { 
        sender: 'bot', 
        text: `I've generated content for the **${availableSectionOptions.find(s => s.value === selectedSection)?.label}** section. You can review it below and copy it to your report if it looks good!` 
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Error generating section:", error);
      const errorMessage = { 
        sender: 'bot', 
        text: "I encountered an error generating the section content. Please try again." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyContent = (content, contentId = 'main') => {
    navigator.clipboard.writeText(content);
    setCopiedStates(prev => ({ ...prev, [contentId]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [contentId]: false }));
    }, 2000);
  };

  const handleSaveToReport = () => {
    if (generatedContent) {
      onContentUpdate(selectedSection, generatedContent);
      const botMessage = { 
        sender: 'bot', 
        text: `Great! I've saved the content to the ${availableSectionOptions.find(s => s.value === selectedSection)?.label} section of your report.` 
      };
      setMessages(prev => [...prev, botMessage]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <div className="px-6 pt-4">
            <Button variant="ghost" onClick={onClose} className="p-0 h-auto text-slate-600 hover:text-slate-900 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Report Builder
            </Button>
        </div>

        <DialogHeader className="p-6 pt-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-green-500" />
            Giuseppe - Report Writing Assistant
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 min-h-0">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col border-r">
            <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div key={index} className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                    {message.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className={`p-3 rounded-lg max-w-md ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                      <ReactMarkdown className="prose prose-sm max-w-none">{message.text}</ReactMarkdown>
                    </div>
                    {message.sender === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-slate-600" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="p-3 rounded-lg bg-slate-100 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                      <span className="text-sm text-slate-500">Giuseppe is writing...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-slate-50">
              <div className="relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                  placeholder="Ask Giuseppe to help with your report content..."
                  className="pr-10"
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Generation Panel */}
          <div className="w-96 flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-3">Section Generator</h3>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSectionOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleGenerateSection} 
                disabled={isLoading || !selectedSection}
                className="w-full mt-3"
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Generate Section
              </Button>
            </div>

            {generatedContent && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Generated Content</h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyContent(generatedContent)}
                      >
                        {copiedStates.main ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" onClick={handleSaveToReport}>
                        Save to Report
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-full">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{generatedContent}</ReactMarkdown>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
