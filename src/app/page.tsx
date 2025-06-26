'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { VoiceController } from '@/components/VoiceController';
import { DocumentManager } from '@/components/DocumentManager';
import { DocumentEditor } from '@/components/DocumentEditor';
import { Document, Thread, Assistant } from '@/types';
import AgentApiService from '@/services/agentApi';

export default function HomePage() {
  // Application state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | undefined>();
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentThread, setCurrentThread] = useState<Thread | undefined>();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | undefined>();
  
  // ✅ ADDED: Conversation history management
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  
  // Voice interaction state
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isClient, setIsClient] = useState(false);
  const [isInteractionMode, setIsInteractionMode] = useState(true); // Always in interaction mode for accessibility

  // Ensure client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ✅ ADDED: Utility function to manage conversation history length
  const manageConversationHistory = useCallback((newHistory: Array<{role: string, content: string}>) => {
    const MAX_HISTORY_LENGTH = 20; // Keep last 20 messages (10 turns)
    if (newHistory.length > MAX_HISTORY_LENGTH) {
      return newHistory.slice(-MAX_HISTORY_LENGTH);
    }
    return newHistory;
  }, []);

  // Helper functions for page management
  const getCurrentPage = useCallback((document: Document) => {
    return document.pages.find(page => page.page_number === document.current_page);
  }, []);

  const updateDocument = useCallback((updatedDoc: Document) => {
    console.log('🔄 updateDocument - Setting current page to:', updatedDoc.current_page);
    
    setDocuments(prev => prev.map(doc => 
      doc.id === updatedDoc.id ? updatedDoc : doc
    ));
    setCurrentDocument(updatedDoc);
  }, []);

  // Initialize application only after client hydration
  useEffect(() => {
    if (isClient) {
      initializeApp();
    }
  }, [isClient]);

  const initializeApp = async () => {
    setIsLoading(true);
    try {
      // Load assistants
      console.log('🔄 Loading assistants...');
      const assistantList = await AgentApiService.getAssistants();
      console.log('✅ Assistants loaded:', assistantList);
      setAssistants(assistantList);
      
      // Use first assistant or create one
      if (assistantList.length > 0) {
        console.log('📋 Using existing assistant:', assistantList[0]);
        setCurrentAssistant(assistantList[0]);
      } else {
        // Create a default assistant if none exists
        try {
          console.log('🔧 Creating new assistant...');
          const newAssistant = await AgentApiService.createAssistant({
            graph_id: 'agent',
            name: 'WriteSense Assistant',
            description: 'AI assistant for document management'
          });
          console.log('✅ New assistant created:', newAssistant);
          setCurrentAssistant(newAssistant);
          setAssistants([newAssistant]);
        } catch (error) {
          console.warn('❌ Could not create assistant:', error);
        }
      }

      // Create a new thread for conversation
      console.log('🧵 Creating new thread...');
      const thread = await AgentApiService.createThread({
        purpose: 'document_management'
      });
      console.log('✅ Thread created:', thread);
      setCurrentThread(thread);

      // Create a new document for MVP interaction mode
      const newDoc: Document = {
        id: uuidv4(),
        title: 'Tài liệu mới',
        pages: [{
          id: uuidv4(),
          title: '', // Add title field
          content: '',
          page_number: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        current_page: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDocuments([newDoc]);
      setCurrentDocument(newDoc);
      // ✅ ADDED: Initialize conversation history
      setConversationHistory([]);
      console.log('Created new document for MVP interaction mode');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setAgentResponse('Có lỗi xảy ra khi khởi tạo ứng dụng. Vui lòng kiểm tra kết nối với agent.');
      
      // Still create a new document for interaction even if agent fails
      const newDoc: Document = {
        id: uuidv4(),
        title: 'Tài liệu mới',
        pages: [{
          id: uuidv4(),
          title: '', // Add title field
          content: '',
          page_number: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        current_page: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDocuments([newDoc]);
      setCurrentDocument(newDoc);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockDocuments = () => {
    const mockDocs: Document[] = [
      {
        id: uuidv4(),
        title: 'Tài liệu mẫu 1',
        pages: [{
          id: uuidv4(),
          title: 'Trang giới thiệu', // Add title field
          content: 'Đây là nội dung của tài liệu mẫu đầu tiên. Bạn có thể chỉnh sửa hoặc xóa nó.',
          page_number: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        current_page: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: 'Hướng dẫn sử dụng',
        pages: [{
          id: uuidv4(),
          title: 'Hướng dẫn cơ bản', // Add title field
          content: 'Sử dụng lệnh giọng nói để:\n- Tạo tài liệu mới\n- Tìm kiếm thông tin\n- Chỉnh sửa nội dung\n- Xóa tài liệu',
          page_number: 1,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
        }],
        current_page: 1,
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    setDocuments(mockDocs);
  };

  // Voice command processing
  const handleVoiceCommand = useCallback(async (command: string) => {
    console.log('🎤 Voice command received:', command);
    
    // Special accessibility commands for voice control
    const lowerCommand = command.toLowerCase().trim();
    if (lowerCommand.includes('bắt đầu nghe') || lowerCommand.includes('khởi động giọng nói') || lowerCommand.includes('start listening')) {
      console.log('🎤 Voice restart command detected');
      setAgentResponse('Đã khởi động lại chức năng nghe giọng nói.');
      return;
    }
    

    
    // Handle stop commands
    if (lowerCommand.includes('dừng trò chuyện') || lowerCommand.includes('tắt') || lowerCommand.includes('ngừng')) {
      console.log('🛑 Stop command detected');
      setAgentResponse('Đã dừng trò chuyện. Nói bất kỳ điều gì để bắt đầu lại.');
      return;
    }
    
    if (!currentThread || !currentAssistant) {
      console.log('❌ Missing thread or assistant:', { currentThread, currentAssistant });
      setAgentResponse('Chưa kết nối được với agent. Vui lòng thử lại.');
      return;
    }

    setIsProcessing(true);
    setAgentResponse('');

    try {
      // ✅ FIXED: Proper message format for LangGraph API with conversation history
      const currentPage = currentDocument ? getCurrentPage(currentDocument) : null;
      const currentDocumentContent = currentPage?.content || '';
      const pageTitle = currentPage?.title || '';
      const pageNumber = currentPage?.page_number || 1;
      const totalPages = currentDocument?.pages.length || 1;
      
      const userMessage = `${command}\n\nCurrent page: ${pageNumber}/${totalPages}${pageTitle ? ` - ${pageTitle}` : ''}\nCurrent page content: ${currentDocumentContent}`;
      
      // ✅ ADDED: Include conversation history for multi-turn context
      const messagesForAPI = [
        ...conversationHistory,  // Include previous conversation
        {
          role: "user",
          content: userMessage
        }
      ];
      
              const runData = {
          assistant_id: currentAssistant.assistant_id,
          input: {
            messages: messagesForAPI  // ✅ Include full conversation history
          },
          stream_mode: 'updates', // ✅ Use 'updates' for better streaming
          metadata: {
            current_document: currentDocument?.id,
            current_page: currentDocument?.current_page,
            total_pages: currentDocument?.pages.length,
            documents: documents.map(doc => ({ 
              id: doc.id, 
              title: doc.title, 
              total_pages: doc.pages.length,
              current_page: doc.current_page 
            })),
            action: 'voice_command'
          }
        };

      console.log('📤 Sending to agent:', runData);

      // Use streaming to get real-time response
      const stream = await AgentApiService.createStreamingRun(currentThread.thread_id, runData);
      console.log('🌊 Stream created, processing response...');
      
      let fullResponse = '';
      let hasReceivedContent = false;
      
      for await (const chunk of AgentApiService.processStreamingResponse(stream)) {
        console.log('📦 Received chunk:', chunk);
        
        // ✅ FIXED: The chunk IS the data (not chunk.data)
        const response = chunk; // The processStreamingResponse already yields the parsed data
        console.log('📋 Processing response data:', response);
        
        // Handle different response formats
        if (typeof response === 'string') {
          fullResponse += response;
          hasReceivedContent = true;
          console.log('📝 String response added, full response now:', fullResponse);
        } else if (response.agent && response.agent.messages && Array.isArray(response.agent.messages)) {
          // ✅ FIXED: Handle agent.messages format (LangGraph streaming format)
          console.log('🔍 Found agent.messages, processing:', response.agent.messages);
          for (const message of response.agent.messages) {
            if (message.content) {
              console.log('📝 Extracting content from message:', message.content);
              fullResponse += message.content;
              hasReceivedContent = true;
              console.log('🤖 Agent message content added, full response now:', fullResponse);
            }
          }
        } else if (response.messages && Array.isArray(response.messages)) {
          // Handle direct messages array format
          console.log('🔍 Found direct messages, processing:', response.messages);
          for (const message of response.messages) {
            if (message.content) {
              console.log('📝 Extracting content from direct message:', message.content);
              fullResponse += message.content;
              hasReceivedContent = true;
              console.log('📨 Message content added, full response now:', fullResponse);
            }
          }
        } else if (response.content) {
          // Handle direct content in response
          console.log('📝 Extracting direct content:', response.content);
          fullResponse += response.content;
          hasReceivedContent = true;
          console.log('📄 Direct content added, full response now:', fullResponse);
        } else {
          console.log('⚠️ Unhandled response format:', response);
        }
      }
      
      console.log('🏁 Streaming completed. Has content:', hasReceivedContent, 'Full response length:', fullResponse.length);

      // Process the complete response
      if (fullResponse) {
        console.log('✅ Agent processing completed, parsing response:', fullResponse);
        
        // ✅ ADDED: Update conversation history with length management
        setConversationHistory(prev => manageConversationHistory([
          ...prev,
          { role: "user", content: userMessage },
          { role: "assistant", content: fullResponse }
        ]));
        
        await parseAndProcessAgentResponse(fullResponse);
      } else {
        console.log('⚠️ No response from agent, falling back to local processing');
        const processedResponse = await processVoiceCommandLocally(command);
        console.log('🏠 Local processing result:', processedResponse);
        
        // ✅ ADDED: Update conversation history for local processing too
        setConversationHistory(prev => manageConversationHistory([
          ...prev,
          { role: "user", content: userMessage },
          { role: "assistant", content: processedResponse }
        ]));
        
        setAgentResponse(processedResponse);
      }

    } catch (error) {
      console.error('❌ Error processing voice command:', error);
      
      // Fallback to local processing
      console.log('🔄 Falling back to local processing due to error');
      const fallbackResponse = await processVoiceCommandLocally(command);
      console.log('🏠 Fallback processing result:', fallbackResponse);
      setAgentResponse(fallbackResponse);
    } finally {
      console.log('🏁 Voice command processing finished');
      setIsProcessing(false);
    }
  }, [currentThread, currentAssistant, currentDocument, documents, conversationHistory, manageConversationHistory]);

  // Parse and process the new agent response format: "Action: <action type>\nAction content: <action content>\nAnswer: <answer>"
  const parseAndProcessAgentResponse = async (response: string) => {
    console.log('🔍 Parsing agent response:', response);
    
    // Parse the response format: "Action: <action type>\nAction content: <action content>\nAnswer: <answer>"
    const lines = response.trim().split('\n');
    let actionType = '';
    let actionContent = '';
    let answer = '';
    
    // Extract action, action content, and answer
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Action:')) {
        actionType = line.substring(7).trim(); // Remove "Action: " prefix
      } else if (line.startsWith('Action content:')) {
        // Action content might span multiple lines, collect until we hit "Answer:"
        let contentLines = [];
        for (let j = i; j < lines.length; j++) {
          const currentLine = lines[j].trim();
          if (currentLine.startsWith('Answer:')) {
            // Found answer, extract it and break
            answer = lines.slice(j).join('\n').substring(7).trim(); // Remove "Answer: " prefix
            break;
          } else if (j === i) {
            // First line, remove "Action content: " prefix
            contentLines.push(currentLine.substring(15).trim());
          } else {
            // Additional lines for action content
            contentLines.push(currentLine);
          }
        }
        actionContent = contentLines.join('\n').trim();
        break;
      }
    }
    
    console.log('📋 Parsed action:', actionType, 'action content:', actionContent, 'answer:', answer);
    
    // Process the action
    if (actionType) {
      await processNewAgentAction(actionType, actionContent, answer);
    } else {
      console.log('⚠️ Could not parse action from response:', response);
      // Show the raw response if parsing fails
      setAgentResponse(response);
    }
  };

  // Process the new agent action types
  const processNewAgentAction = async (actionType: string, actionContent: string, answer: string) => {
    console.log('🎯 Processing new agent action:', actionType, 'with action content:', actionContent, 'and answer:', answer);
    
    switch (actionType.toLowerCase()) {
      case 'add_to_page':
        console.log('➕ Adding content to current page');
        if (currentDocument) {
          const currentPage = getCurrentPage(currentDocument);
          if (currentPage) {
            const updatedPages = currentDocument.pages.map(page => 
              page.id === currentPage.id 
                ? { ...page, content: page.content + (page.content ? '\n' : '') + actionContent, updated_at: new Date().toISOString() }
                : page
            );
            const updatedDoc: Document = {
              ...currentDocument,
              pages: updatedPages,
              updated_at: new Date().toISOString(),
            };
            updateDocument(updatedDoc);
            const response = answer || `Đã thêm nội dung vào trang ${currentPage.page_number}.`;
            setAgentResponse(response);
          }
        } else {
          const response = answer || 'Không có tài liệu nào được chọn để thêm nội dung.';
          setAgentResponse(response);
        }
        break;
        
      case 'rewrite_page':
        console.log('📝 Rewriting current page content');
        if (currentDocument) {
          const currentPage = getCurrentPage(currentDocument);
          if (currentPage) {
            const updatedPages = currentDocument.pages.map(page => 
              page.id === currentPage.id 
                ? { ...page, content: actionContent, updated_at: new Date().toISOString() }
                : page
            );
            const updatedDoc: Document = {
              ...currentDocument,
              pages: updatedPages,
              updated_at: new Date().toISOString(),
            };
            updateDocument(updatedDoc);
            const response = answer || `Đã viết lại nội dung trang ${currentPage.page_number}.`;
            setAgentResponse(response);
          }
        } else {
          const response = answer || 'Không có tài liệu nào được chọn để viết lại nội dung.';
          setAgentResponse(response);
        }
        break;
        
      case 'create_doc':
        console.log('📄 Creating new document');
        const newDoc: Document = {
          id: uuidv4(),
          title: extractTitleFromContent(actionContent) || 'Tài liệu mới',
                  pages: [{
          id: uuidv4(),
          title: '', // Add title field
          content: actionContent,
          page_number: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
          current_page: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setDocuments(prev => [newDoc, ...prev]);
        setCurrentDocument(newDoc);
        const createResponse = answer || `Đã tạo tài liệu mới: "${newDoc.title}"`;
        setAgentResponse(createResponse);
        break;

      case 'set_title_doc':
        console.log('📝 Setting document title');
        if (currentDocument) {
          const updatedDoc: Document = {
            ...currentDocument,
            title: actionContent,
            updated_at: new Date().toISOString(),
          };
          updateDocument(updatedDoc);
          const response = answer || `Đã đặt tiêu đề tài liệu: "${actionContent}"`;
          setAgentResponse(response);
        } else {
          const response = answer || 'Không có tài liệu nào được chọn để đặt tiêu đề.';
          setAgentResponse(response);
        }
        break;

      case 'read_title_doc':
        console.log('📖 Reading document title');
        if (currentDocument) {
          const response = answer || `Tiêu đề tài liệu là: "${currentDocument.title}"`;
          setAgentResponse(response);
        } else {
          const response = answer || 'Không có tài liệu nào được chọn để đọc tiêu đề.';
          setAgentResponse(response);
        }
        break;

      case 'set_title_page':
        console.log('📝 Setting page title');
        if (currentDocument) {
          const currentPage = getCurrentPage(currentDocument);
          if (currentPage) {
            const updatedPages = currentDocument.pages.map(page => 
              page.id === currentPage.id 
                ? { ...page, title: actionContent, updated_at: new Date().toISOString() }
                : page
            );
            const updatedDoc: Document = {
              ...currentDocument,
              pages: updatedPages,
              updated_at: new Date().toISOString(),
            };
            updateDocument(updatedDoc);
            const response = answer || `Đã đặt tiêu đề trang ${currentPage.page_number}: "${actionContent}"`;
            setAgentResponse(response);
          }
        } else {
          const response = answer || 'Không có tài liệu nào được chọn để đặt tiêu đề trang.';
          setAgentResponse(response);
        }
        break;

      case 'read_title_page':
        console.log('📖 Reading page title');
        if (currentDocument) {
          const currentPage = getCurrentPage(currentDocument);
          if (currentPage && currentPage.title) {
            const response = answer || `Tiêu đề trang ${currentPage.page_number} là: "${currentPage.title}"`;
            setAgentResponse(response);
          } else if (currentPage) {
            const response = answer || `Trang ${currentPage.page_number} chưa có tiêu đề.`;
            setAgentResponse(response);
          }
        } else {
          const response = answer || 'Không có tài liệu nào được chọn để đọc tiêu đề trang.';
          setAgentResponse(response);
        }
        break;

      case 'add_page':
        console.log('📄 Adding new page');
        if (currentDocument) {
          const newPageNumber = currentDocument.pages.length + 1;
          console.log('📄 Agent creating new page number:', newPageNumber);
          
          const newPage = {
            id: uuidv4(),
            title: '', // Add title field for new pages
            content: '',
            page_number: newPageNumber,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const updatedDoc = {
            ...currentDocument,
            pages: [...currentDocument.pages, newPage],
            current_page: newPageNumber, // Automatically switch to the new page
            updated_at: new Date().toISOString(),
          };
          
          console.log('📋 Agent updated document with new page:', updatedDoc);
          console.log('🎯 Agent setting current page to:', newPageNumber);
          
          updateDocument(updatedDoc);
          const response = answer || `Đã tạo trang mới số ${newPageNumber}. Bạn đang ở trang ${newPageNumber}.`;
          setAgentResponse(response);
        } else {
          const response = answer || 'Không có tài liệu nào được chọn để tạo trang mới.';
          setAgentResponse(response);
        }
        break;

      case 'next_page':
        console.log('➡️ Moving to next page');
        if (currentDocument) {
          if (currentDocument.current_page < currentDocument.pages.length) {
            const updatedDoc: Document = {
              ...currentDocument,
              current_page: currentDocument.current_page + 1,
            };
            updateDocument(updatedDoc);
            const response = answer || `Đã chuyển đến trang ${updatedDoc.current_page}.`;
            setAgentResponse(response);
          } else {
            const response = answer || 'Đây là trang cuối cùng.';
            setAgentResponse(response);
          }
        } else {
          const response = answer || 'Không có tài liệu nào được chọn.';
          setAgentResponse(response);
        }
        break;

      case 'prev_page':
        console.log('⬅️ Moving to previous page');
        if (currentDocument) {
          if (currentDocument.current_page > 1) {
            const updatedDoc: Document = {
              ...currentDocument,
              current_page: currentDocument.current_page - 1,
            };
            updateDocument(updatedDoc);
            const response = answer || `Đã chuyển về trang ${updatedDoc.current_page}.`;
            setAgentResponse(response);
          } else {
            const response = answer || 'Đây là trang đầu tiên.';
            setAgentResponse(response);
          }
        } else {
          const response = answer || 'Không có tài liệu nào được chọn.';
          setAgentResponse(response);
        }
        break;

      case 'read_page':
        console.log('📖 Reading current page');
        if (currentDocument) {
          const currentPage = getCurrentPage(currentDocument);
          if (currentPage && currentPage.content) {
            const pageTitle = currentPage.title ? ` "${currentPage.title}"` : '';
            const response = answer || `Đây là nội dung trang ${currentPage.page_number}${pageTitle}: ${currentPage.content}`;
            setAgentResponse(response);
          } else if (currentPage) {
            const response = answer || `Trang ${currentPage.page_number} hiện tại đang trống.`;
            setAgentResponse(response);
          }
        } else {
          const response = answer || 'Không có tài liệu nào được chọn để đọc.';
          setAgentResponse(response);
        }
        break;

      case 'delete_page':
        console.log('🗑️ Deleting current page');
        if (currentDocument && currentDocument.pages.length > 1) {
          const currentPageNum = currentDocument.current_page;
          const updatedPages = currentDocument.pages.filter(page => page.page_number !== currentPageNum);
          // Renumber pages
          const renumberedPages = updatedPages.map((page, index) => ({
            ...page,
            page_number: index + 1
          }));
          const newCurrentPage = Math.min(currentPageNum, renumberedPages.length);
          const updatedDoc: Document = {
            ...currentDocument,
            pages: renumberedPages,
            current_page: newCurrentPage,
            updated_at: new Date().toISOString(),
          };
          updateDocument(updatedDoc);
          const response = answer || `Đã xóa trang ${currentPageNum}.`;
          setAgentResponse(response);
        } else if (currentDocument) {
          const response = answer || 'Không thể xóa trang duy nhất trong tài liệu.';
          setAgentResponse(response);
        } else {
          const response = answer || 'Không có tài liệu nào được chọn để xóa trang.';
          setAgentResponse(response);
        }
        break;
        
      case 'remove_doc':
        console.log('🗑️ Removing current document');
        if (currentDocument) {
          const documentTitle = currentDocument.title;
          handleDocumentDelete(currentDocument.id);
          const response = answer || `Đã xóa tài liệu: "${documentTitle}"`;
          setAgentResponse(response);
        } else {
          const response = answer || 'Không có tài liệu nào được chọn để xóa.';
          setAgentResponse(response);
        }
        break;
        
      case 'save_doc':
        console.log('💾 Saving current document');
        if (currentDocument) {
          setIsEditing(false);
          const response = answer || `Đã lưu tài liệu: "${currentDocument.title}"`;
          setAgentResponse(response);
        } else {
          const response = answer || 'Không có tài liệu nào để lưu.';
          setAgentResponse(response);
        }
        break;
        
      case 'reply_user':
        console.log('💬 Replying to user');
        const response = answer || actionContent;
        setAgentResponse(response);
        break;
        
      default:
        console.log('❓ Unknown action type:', actionType);
        const unknownResponse = answer || `Không hiểu lệnh: ${actionType}.`;
        setAgentResponse(unknownResponse);
    }
  };

  // Extract title from content (first line or first few words)
  const extractTitleFromContent = (content: string): string => {
    if (!content) return '';
    
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length > 0 && firstLine.length <= 100) {
      return firstLine;
    }
    
    // If first line is too long, use first few words
    const words = firstLine.split(' ').slice(0, 8);
    return words.join(' ') + (words.length === 8 ? '...' : '');
  };

  // Local command processing (fallback)
  const processVoiceCommandLocally = async (command: string): Promise<string> => {
    const lowerCommand = command.toLowerCase();

    // Handle direct content writing
    if (currentDocument && !lowerCommand.includes('tạo') && !lowerCommand.includes('tìm') && 
        !lowerCommand.includes('chỉnh sửa') && !lowerCommand.includes('xóa') && !lowerCommand.includes('đọc')) {
      // This seems like content to add to the current page
      const currentPage = getCurrentPage(currentDocument);
      if (currentPage) {
        const updatedPages = currentDocument.pages.map(page => 
          page.id === currentPage.id 
            ? { ...page, content: page.content + (page.content ? '\n' : '') + command, updated_at: new Date().toISOString() }
            : page
        );
        const updatedDoc: Document = {
          ...currentDocument,
          pages: updatedPages,
          updated_at: new Date().toISOString(),
        };
        updateDocument(updatedDoc);
        return `Đã thêm nội dung vào trang ${currentPage.page_number}: "${command}"`;
      }
    }

    if (lowerCommand.includes('tạo') && (lowerCommand.includes('tài liệu') || lowerCommand.includes('mới'))) {
      handleDocumentCreate();
      return 'Đã tạo tài liệu mới. Hãy nói nội dung bạn muốn thêm.';
    }
    
    if (lowerCommand.includes('tìm') || lowerCommand.includes('tìm kiếm')) {
      const searchTerm = extractSearchTerm(command);
      if (searchTerm) {
        setSearchQuery(searchTerm);
        return `Đang tìm kiếm: "${searchTerm}"`;
      }
      return 'Vui lòng nói rõ từ khóa bạn muốn tìm kiếm.';
    }
    
    if (lowerCommand.includes('chỉnh sửa') || lowerCommand.includes('sửa')) {
      if (currentDocument) {
        setIsEditing(true);
        return `Đã chuyển sang chế độ chỉnh sửa tài liệu: ${currentDocument.title}`;
      }
      return 'Vui lòng chọn một tài liệu để chỉnh sửa.';
    }
    
    if (lowerCommand.includes('xóa')) {
      if (currentDocument) {
        return `Bạn có muốn xóa tài liệu "${currentDocument.title}" không? Hãy xác nhận bằng cách nhấn nút xóa.`;
      }
      return 'Vui lòng chọn một tài liệu để xóa.';
    }
    
    if (lowerCommand.includes('đọc') || lowerCommand.includes('xem')) {
      if (currentDocument) {
        const currentPage = getCurrentPage(currentDocument);
        if (currentPage && currentPage.content) {
          return `Đây là nội dung trang ${currentPage.page_number} của tài liệu "${currentDocument.title}": ${currentPage.content}`;
        } else if (currentPage) {
          return `Trang ${currentPage.page_number} của tài liệu "${currentDocument.title}" hiện tại đang trống.`;
        }
      }
      return 'Vui lòng chọn một tài liệu để đọc.';
    }

    // Default: add content to current page
    if (currentDocument) {
      const currentPage = getCurrentPage(currentDocument);
      if (currentPage) {
        const updatedPages = currentDocument.pages.map(page => 
          page.id === currentPage.id 
            ? { ...page, content: page.content + (page.content ? '\n' : '') + command, updated_at: new Date().toISOString() }
            : page
        );
        const updatedDoc: Document = {
          ...currentDocument,
          pages: updatedPages,
          updated_at: new Date().toISOString(),
        };
        updateDocument(updatedDoc);
        return `Đã thêm nội dung vào trang ${currentPage.page_number}: "${command}"`;
      }
    }

    return 'Tôi đã nhận được lệnh của bạn. Tuy nhiên, tôi chưa thể xử lý lệnh này. Vui lòng thử: "Tạo tài liệu mới", "Tìm kiếm...", "Chỉnh sửa", hoặc "Đọc tài liệu".';
  };

  // Extract search term from voice command
  const extractSearchTerm = (command: string): string => {
    const lowerCommand = command.toLowerCase();
    const patterns = [
      /tìm kiếm (.*)/,
      /tìm (.*)/,
      /tìm kiếm về (.*)/,
      /tìm về (.*)/,
    ];
    
    for (const pattern of patterns) {
      const match = lowerCommand.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  };

  // Legacy function - kept for fallback compatibility
  const processAgentAction = async (action: string, data: any) => {
    console.log('🎯 Processing legacy agent action:', action, 'with data:', data);
    // This function is kept for compatibility but new format should use parseAndProcessAgentResponse
  };

  // Document management functions
  const handleDocumentCreate = () => {
    setCurrentDocument(undefined);
    setIsEditing(true);
    // ✅ ADDED: Clear conversation history when creating new document
    setConversationHistory([]);
  };

  const handleDocumentSelect = (document: Document) => {
    setCurrentDocument(document);
    setIsEditing(false);
    // ✅ ADDED: Clear conversation history when switching documents
    setConversationHistory([]);
  };

  const handleDocumentEdit = (document: Document) => {
    setCurrentDocument(document);
    setIsEditing(true);
  };

  const handleDocumentDelete = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    if (currentDocument?.id === documentId) {
      setCurrentDocument(undefined);
      setIsEditing(false);
    }
  };

  const handleDocumentSave = (data: { title: string; content: string }) => {
    const now = new Date().toISOString();
    
    if (currentDocument) {
      // Update existing document - update current page content
      const currentPage = getCurrentPage(currentDocument);
      if (currentPage) {
        const updatedPages = currentDocument.pages.map(page => 
          page.id === currentPage.id 
            ? { ...page, content: data.content, updated_at: now }
            : page
        );
        const updatedDoc: Document = {
          ...currentDocument,
          title: data.title,
          pages: updatedPages,
          updated_at: now,
        };
        updateDocument(updatedDoc);
      }
    } else {
      // Create new document
      const newDoc: Document = {
        id: uuidv4(),
        title: data.title,
        pages: [{
          id: uuidv4(),
          title: '', // Add title field
          content: data.content,
          page_number: 1,
          created_at: now,
          updated_at: now,
        }],
        current_page: 1,
        created_at: now,
        updated_at: now,
      };
      setDocuments(prev => [newDoc, ...prev]);
      setCurrentDocument(newDoc);
    }
    
    setIsEditing(false);
    setAgentResponse(`Đã lưu tài liệu: ${data.title}`);
  };

  const handleDocumentCancel = () => {
    setIsEditing(false);
  };

  const handleDocumentEditMode = () => {
    setIsEditing(true);
  };

  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!isClient ? 'Đang tải ứng dụng...' : 'Đang khởi tạo ứng dụng...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Compact Header */}
      <header className="bg-black/20 backdrop-blur-2xl border-b border-white/10 shadow-2xl">
        <div className="mx-auto px-8 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Logo & Title */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3 shadow-2xl shadow-purple-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  WriteSense
                </h1>
                <p className="text-xs text-purple-300 -mt-0.5">AI Voice Document Creation</p>
              </div>
            </div>

            {/* Center: Document Info */}
            {currentDocument && (
              <div className="flex-1 max-w-lg mx-8 text-center">
                <div className="text-lg font-semibold text-white truncate">
                  {currentDocument.title}
                </div>
                <div className="text-sm text-purple-300 mt-0.5">
                  Page {currentDocument.current_page} of {currentDocument.pages.length} • {new Date(currentDocument.updated_at).toLocaleString('vi-VN', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            )}

            {/* Voice Status - Prominent */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-400/30 rounded-full px-4 py-2">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse shadow-lg shadow-green-400/50"></div>
                <span className="text-sm font-semibold text-green-300">VOICE ACTIVE</span>
              </div>
              {currentDocument && (
                <div className={`px-4 py-2 rounded-full text-sm font-medium border ${
                  isEditing 
                    ? 'bg-orange-500/20 text-orange-300 border-orange-400/30' 
                    : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                }`}>
                  {isEditing ? 'EDITING' : 'VIEWING'}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Compact Layout - Voice First */}
      <main className="flex h-[calc(100vh-80px)]">
        {/* HERO: Voice Control Center - Streamlined */}
        <div className="w-80 bg-gradient-to-b from-purple-900/50 to-slate-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col relative overflow-hidden">
          {/* Animated Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-pink-600/10"></div>
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/5 to-transparent"></div>
          
          {/* Voice Control Hero Section - Centered */}
          <div className="relative z-10 flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
              {/* Main Voice Indicator */}
              <div className="mb-6">
                <div className="w-28 h-28 mx-auto mb-4 relative">
                  {/* Pulsing Rings */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 animate-ping"></div>
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-500/40 to-pink-500/40 animate-pulse"></div>
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl shadow-purple-500/25 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">
                  Voice Control
                </h2>
                <p className="text-purple-300 text-sm">
                  Speak naturally to create and edit documents
                </p>
              </div>
              
              <VoiceController
                onVoiceCommand={handleVoiceCommand}
                agentResponse={agentResponse}
                isProcessing={isProcessing}
                autoStart={isInteractionMode}
              />
            </div>
          </div>
        </div>

        {/* Document Workspace - Optimized for viewport */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-5xl mx-auto h-full">
              {currentDocument ? (
                <div className="h-full flex flex-col">
                  {(() => {
                    const currentPage = getCurrentPage(currentDocument);
                    return currentPage ? (
                      <div className="h-full flex flex-col space-y-4">
                        {/* Compact Page Navigation */}
                        <div className="flex items-center justify-between bg-black/20 backdrop-blur-xl rounded-xl p-4 border border-white/10 flex-shrink-0">
                          <button
                            onClick={() => {
                              if (currentDocument.current_page > 1) {
                                const updatedDoc = { ...currentDocument, current_page: currentDocument.current_page - 1 };
                                updateDocument(updatedDoc);
                              }
                            }}
                            disabled={currentDocument.current_page <= 1}
                            className="group flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg hover:shadow-xl hover:scale-105 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                          >
                            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                          </button>
                          
                          <div className="text-center px-6">
                            <div className="text-lg font-bold text-white">
                              Page {currentDocument.current_page} / {currentDocument.pages.length}
                            </div>
                            {currentPage.title && (
                              <div className="text-purple-300 text-sm mt-1 max-w-xs truncate">
                                "{currentPage.title}"
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => {
                              if (currentDocument.current_page < currentDocument.pages.length) {
                                const updatedDoc = { ...currentDocument, current_page: currentDocument.current_page + 1 };
                                updateDocument(updatedDoc);
                              }
                            }}
                            disabled={currentDocument.current_page >= currentDocument.pages.length}
                            className="group flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg hover:shadow-xl hover:scale-105 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                          >
                            Next
                            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Document Display - Fit to remaining height */}
                        <div className="flex-1 min-h-0">
                          {currentPage.content ? (
                            <div className="h-full">
                              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden h-full flex flex-col">
                                {/* Document Header */}
                                {currentPage.title && (
                                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-4 border-b border-gray-100 flex-shrink-0">
                                    <h1 className="text-2xl font-bold text-gray-900">{currentPage.title}</h1>
                                  </div>
                                )}
                                
                                {/* Document Content */}
                                <div className="p-8 flex-1 overflow-auto">
                                  <div className="prose prose-lg max-w-none">
                                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-['Charter',_'Georgia',_serif] text-lg leading-7">
                                      {currentPage.content}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Document Footer */}
                                <div className="bg-gray-50 px-8 py-3 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
                                  <div className="text-sm text-gray-500">{currentPage.content.length} characters</div>
                                  <div className="text-sm text-gray-500">Last updated {new Date(currentPage.updated_at).toLocaleString('vi-VN')}</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-xl border-2 border-dashed border-purple-400/30 rounded-2xl p-16 text-center h-full flex items-center justify-center">
                              <div className="max-w-lg mx-auto">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/25">
                                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                  </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">
                                  Page {currentPage.page_number} is Empty
                                </h3>
                                {currentPage.title && (
                                  <div className="text-purple-300 text-lg mb-6">"{currentPage.title}"</div>
                                )}
                                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-400/30">
                                  <div className="flex items-center justify-center mb-2">
                                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse shadow-lg shadow-green-400/50"></div>
                                    <span className="text-lg font-bold text-green-300">LISTENING</span>
                                  </div>
                                  <p className="text-green-200">
                                    Start speaking to add content to this page
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-slate-800/50 to-purple-900/50 backdrop-blur-xl rounded-2xl p-16 text-center h-full flex items-center justify-center border border-white/10">
                        <div className="max-w-lg mx-auto">
                          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/25">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-4">
                            Document is Empty
                          </h3>
                          <p className="text-purple-300 mb-6">
                            Use voice commands to create content for this document
                          </p>
                          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-400/30">
                            <div className="flex items-center justify-center mb-2">
                              <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse shadow-lg shadow-green-400/50"></div>
                              <span className="text-lg font-bold text-green-300">READY TO LISTEN</span>
                            </div>
                            <p className="text-green-200">
                              Try: "Write about..." or "Create document about..."
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-slate-800/30 to-purple-900/30 backdrop-blur-2xl rounded-2xl p-20 text-center h-full flex items-center justify-center border border-white/10">
                  <div className="max-w-xl mx-auto">
                    <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/25 relative">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/30 to-pink-400/30 animate-ping"></div>
                      <svg className="w-16 h-16 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-4">
                      Welcome to WriteSense
                    </h2>
                    <p className="text-xl text-purple-300 mb-8">
                      The Future of Voice-Powered Document Creation
                    </p>
                    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-xl p-6 border border-blue-400/30">
                      <h3 className="text-lg font-bold text-blue-300 mb-4">🚀 Get Started Instantly</h3>
                      <div className="grid grid-cols-2 gap-3 text-left">
                        <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                          <div className="text-sm font-semibold text-white mb-1">🎤 "Create new document"</div>
                          <div className="text-purple-300 text-xs">Start fresh</div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                          <div className="text-sm font-semibold text-white mb-1">✍️ "Write about [topic]"</div>
                          <div className="text-purple-300 text-xs">Generate content</div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                          <div className="text-sm font-semibold text-white mb-1">📄 "Next page"</div>
                          <div className="text-purple-300 text-xs">Navigate</div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                          <div className="text-sm font-semibold text-white mb-1">🔊 "Read this page"</div>
                          <div className="text-purple-300 text-xs">Hear content</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
