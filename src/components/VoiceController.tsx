'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useWebSpeechTTS } from '@/hooks/useWebSpeechTTS';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface VoiceControllerProps {
  onVoiceCommand: (command: string) => void;
  agentResponse?: string;
  autoStart?: boolean;
  isProcessing?: boolean;
}

// Simple conversation states
type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking';

export const VoiceController: React.FC<VoiceControllerProps> = ({ 
  onVoiceCommand, 
  agentResponse, 
  autoStart = false,
  isProcessing = false 
}) => {
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [lastProcessedResponse, setLastProcessedResponse] = useState<string>('');
  
  // Refs to track state and prevent issues
  const conversationStateRef = useRef<ConversationState>('idle');
  const isProcessingResponseRef = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  // Initialize TTS hook
  const {
    speak,
    stop: stopSpeech,
    isSpeaking,
    isSupported: ttsSupported,
    error: ttsError
  } = useWebSpeechTTS({
    language: 'vietnamese',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    onStart: () => {
      console.log('🔊 TTS started - stopping STT to prevent feedback');
      setConversationState('speaking');
      // CRITICAL: Stop speech recognition when TTS starts to prevent audio feedback
      stopSTT();
    },
    onEnd: () => {
      console.log('🔊 TTS ended - starting to listen again');
      // When TTS ends, automatically start listening again
      if (conversationStateRef.current === 'speaking') {
        startListening();
      }
    },
    onError: (error) => {
      console.error('🚫 TTS error:', error);
      // CRITICAL: Ensure STT is stopped even on TTS error
      stopSTT();
      // If TTS fails, go back to listening after a brief delay
      setTimeout(() => {
        startListening();
      }, 500);
    }
  });

  // Initialize STT hook with 2-second silence timeout
  const {
    startListening: startSTT,
    stopListening: stopSTT,
    resetTranscript,
    isListening,
    transcript,
    isSupported: sttSupported,
    error: sttError
  } = useSpeechRecognition({
    language: 'vi-VN',
    silenceTimeout: 2000, // 2 seconds as requested
    onSilenceDetected: (finalTranscript) => {
      console.log('🔇 Silence detected, processing:', finalTranscript);
      handleSilenceDetected(finalTranscript);
    },
    onError: (error) => {
      console.error('🚫 STT error:', error);
      setConversationState('idle');
    }
  });

  // Handle silence detection - send to agent and stop listening
  const handleSilenceDetected = useCallback((finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      console.log('🚫 Empty transcript, continuing to listen');
      return;
    }

    // Only process if we're in listening state
    if (conversationStateRef.current !== 'listening') {
      console.log('🚫 Not in listening state, ignoring transcript');
      return;
    }

    console.log('📤 Sending to agent:', finalTranscript);
    setConversationState('processing');
    
    // Stop listening and send to agent
    stopSTT();
    onVoiceCommand(finalTranscript);
    
    // Clear transcript
    resetTranscript();
  }, [onVoiceCommand, stopSTT, resetTranscript]);

  // Start listening
  const startListening = useCallback(async () => {
    console.log('🎤 Starting to listen...');
    setConversationState('listening');
    resetTranscript();
    
    try {
      await startSTT();
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      setConversationState('idle');
    }
  }, [startSTT, resetTranscript]);

  // Stop the conversation
  const stopConversation = useCallback(() => {
    console.log('🛑 Stopping conversation...');
    setConversationState('idle');
    stopSTT();
    stopSpeech();
    resetTranscript();
    setLastProcessedResponse('');
  }, [stopSTT, stopSpeech, resetTranscript]);

  // Handle agent response - speak it out
  useEffect(() => {
    if (agentResponse && 
        agentResponse !== lastProcessedResponse && 
        conversationState === 'processing' &&
        !isProcessingResponseRef.current) {
      
      isProcessingResponseRef.current = true;
      console.log('📨 New agent response received, speaking:', agentResponse.substring(0, 50) + '...');
      
      setLastProcessedResponse(agentResponse);
      
      // CRITICAL: Ensure STT is fully stopped before starting TTS
      stopSTT();
      
      // Brief delay to ensure STT has fully stopped, then start TTS
      setTimeout(() => {
        speak(agentResponse);
      }, 100);
      
      // Reset flag after a short delay
      setTimeout(() => {
        isProcessingResponseRef.current = false;
      }, 500);
    }
  }, [agentResponse, lastProcessedResponse, conversationState, speak]);

  // Auto-start functionality
  useEffect(() => {
    if (autoStart && conversationState === 'idle' && sttSupported && ttsSupported) {
      console.log('🔄 Auto-starting conversation...');
      startListening();
    }
  }, [autoStart, conversationState, sttSupported, ttsSupported, startListening]);

  // Get status info for display
  const getStatusInfo = () => {
    switch (conversationState) {
      case 'listening':
        return {
          text: 'Đang nghe...',
          icon: Mic,
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
      case 'processing':
        return {
          text: 'Đang xử lý...',
          icon: MicOff,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100'
        };
      case 'speaking':
        return {
          text: 'Đang nói...',
          icon: Volume2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        };
      default:
        return {
          text: 'Nhấn để bắt đầu',
          icon: MicOff,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Check if system is supported
  const isSupported = sttSupported && ttsSupported;
  const hasError = sttError || ttsError;

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-lg">
      {/* Status Display */}
      <div className={`flex items-center space-x-3 px-4 py-2 rounded-full ${statusInfo.bgColor}`}>
        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
        <span className={`font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className="w-full max-w-md p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Bạn đang nói:</strong> {transcript}
          </p>
        </div>
      )}

      {/* Last Agent Response */}
      {lastProcessedResponse && (
        <div className="w-full max-w-md p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>AI đã nói:</strong> {lastProcessedResponse.substring(0, 100)}
            {lastProcessedResponse.length > 100 ? '...' : ''}
          </p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex space-x-4">
        {conversationState === 'idle' ? (
          <button
            onClick={startListening}
            disabled={!isSupported}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Mic className="w-5 h-5" />
            <span>Bắt đầu trò chuyện</span>
          </button>
        ) : (
          <button
            onClick={stopConversation}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <VolumeX className="w-5 h-5" />
            <span>Dừng trò chuyện</span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {hasError && (
        <div className="w-full max-w-md p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            <strong>Lỗi:</strong> {sttError || ttsError}
          </p>
        </div>
      )}

      {/* Support Check */}
      {!isSupported && (
        <div className="w-full max-w-md p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            <strong>Cảnh báo:</strong> Trình duyệt không hỗ trợ Web Speech API. 
            Vui lòng sử dụng Chrome, Edge, hoặc Safari.
          </p>
        </div>
      )}

      {/* Status Debug Info (for development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="w-full max-w-md p-2 bg-gray-100 rounded text-xs text-gray-600">
          <p>State: {conversationState}</p>
                     <p>STT: {isListening ? 'listening' : 'stopped'} | TTS: {isSpeaking() ? 'speaking' : 'stopped'}</p>
          <p>Support: STT={sttSupported ? '✓' : '✗'} | TTS={ttsSupported ? '✓' : '✗'}</p>
        </div>
      )}
    </div>
  );
};