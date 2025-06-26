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

  // Initialize TTS hook for purely voice-driven experience
  const {
    speak,
    stop: stopSpeech,
    isSpeaking,
    isSupported: ttsSupported,
    isActivated,
    notifyUserInteraction,
    manualActivateTTS, // ✅ NEW: Manual activation function
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
      
      // ✅ ACCESSIBILITY: For "not-allowed" errors, provide voice guidance
      if (error.includes('kích hoạt đọc')) {
        console.log('🎤 Providing voice activation guidance');
        // The error message already contains the voice command instruction
      }
      
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

  // ✅ PURELY VOICE-DRIVEN: Start listening and notify TTS of user interaction
  const startListening = useCallback(async () => {
    console.log('🎤 Starting to listen...');
    setConversationState('listening');
    resetTranscript();
    
    try {
      await startSTT();
      // ✅ ACCESSIBILITY: Notify TTS that user has interacted (for activation)
      notifyUserInteraction();
      console.log('✅ Speech recognition started, TTS interaction registered');
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      setConversationState('idle');
    }
  }, [startSTT, resetTranscript, notifyUserInteraction]);

  // ✅ MANUAL ACTIVATION: Using hook's manual activation function with STT coordination
  const handleManualActivation = useCallback(async () => {
    console.log('👆 Manual TTS activation via click');
    
    try {
      // CRITICAL: Stop STT before TTS activation to prevent feedback
      console.log('🛑 Stopping STT before TTS activation to prevent audio feedback');
      stopSTT();
      resetTranscript();
      setConversationState('processing');
      
      // Wait a moment for STT to fully stop
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use the hook's manual activation function
      const success = await manualActivateTTS();
      
      if (success) {
        console.log('✅ TTS activated successfully');
        // Notify user interaction
        notifyUserInteraction();
        
                 // Wait for TTS to complete before restarting STT
         console.log('⏳ Waiting for TTS activation speech to complete before restarting STT');
         setTimeout(() => {
           console.log('🎤 Restarting STT after TTS activation');
           startListening();
         }, 2000); // Shorter wait time for the shorter activation message
      } else {
        console.error('❌ TTS activation failed');
        // Restart STT even if activation failed
        setTimeout(() => {
          startListening();
        }, 500);
        alert('Không thể kích hoạt chức năng đọc. Vui lòng kiểm tra cài đặt trình duyệt.');
      }
    } catch (error) {
      console.error('❌ TTS activation error:', error);
      // Restart STT even if there was an error
      setTimeout(() => {
        startListening();
      }, 500);
      alert('Lỗi khi kích hoạt chức năng đọc');
    }
  }, [manualActivateTTS, notifyUserInteraction, startListening, stopSTT, resetTranscript]);

  // Stop the conversation
  const stopConversation = useCallback(() => {
    console.log('🛑 Stopping conversation...');
    setConversationState('idle');
    stopSTT();
    stopSpeech();
    resetTranscript();
    setLastProcessedResponse('');
  }, [stopSTT, stopSpeech, resetTranscript]);

  // ✅ KEYBOARD SHORTCUTS: Handle keyboard shortcuts for accessibility
  useEffect(() => {
    // Detect if user is on macOS
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Platform-specific modifier key (Cmd on Mac, Ctrl on others)
      const primaryModifier = isMac ? event.metaKey : event.ctrlKey;
      
      // Cmd/Ctrl + Shift + Space: Activate TTS (alternative to clicking button)
      if (primaryModifier && event.shiftKey && event.code === 'Space') {
        event.preventDefault();
        
        // Only trigger if TTS is not activated and supported
        if (!isActivated && ttsSupported) {
          const shortcutName = isMac ? 'Cmd+Shift+Space' : 'Ctrl+Shift+Space';
          console.log(`⌨️ TTS activation triggered by ${shortcutName}`);
          handleManualActivation();
        }
        return;
      }
      
      // Cmd/Ctrl + S: Stop conversation
      if (primaryModifier && event.code === 'KeyS') {
        event.preventDefault();
        const shortcutName = isMac ? 'Cmd+S' : 'Ctrl+S';
        console.log(`⌨️ Stop conversation triggered by ${shortcutName}`);
        stopConversation();
        return;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActivated, ttsSupported, handleManualActivation, stopConversation]);

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
  }, [agentResponse, lastProcessedResponse, conversationState, speak, stopSTT]);

  // ✅ AUTO-START: Completely hands-free initialization
  useEffect(() => {
    if (autoStart && conversationState === 'idle' && sttSupported && ttsSupported) {
      console.log('🔄 Auto-starting hands-free conversation...');
      startListening();
    }
  }, [autoStart, conversationState, sttSupported, ttsSupported, startListening]);

  // ✅ BROWSER COMPATIBILITY: Check Web Speech API support according to documentation
  const checkBrowserSupport = useCallback(() => {
    const isSupported = {
      speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      speechSynthesis: 'speechSynthesis' in window,
      isSecureContext: window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    };
    
    console.log('🔍 Browser support check:', isSupported);
    return isSupported;
  }, []);

  // ✅ PLATFORM DETECTION: Detect macOS for keyboard shortcuts
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const browserSupport = checkBrowserSupport();

  // Get status info for display
  const getStatusInfo = () => {
    switch (conversationState) {
      case 'listening':
        return {
          text: 'Đang nghe...',
          icon: Mic,
          color: 'text-green-300',
          bgColor: 'bg-green-500/20 border-green-400/30'
        };
      case 'processing':
        return {
          text: 'Đang xử lý...',
          icon: MicOff,
          color: 'text-purple-300',
          bgColor: 'bg-purple-500/20 border-purple-400/30'
        };
      case 'speaking':
        return {
          text: 'Đang nói...',
          icon: Volume2,
          color: 'text-blue-300',
          bgColor: 'bg-blue-500/20 border-blue-400/30'
        };
      default:
        return {
          text: 'Sẵn sàng nghe',
          icon: MicOff,
          color: 'text-gray-300',
          bgColor: 'bg-gray-500/20 border-gray-400/30'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Check if system is supported
  const isSupported = sttSupported && ttsSupported;
  const hasError = sttError || ttsError;

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Status Display - Dark Theme */}
      <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl backdrop-blur-sm border ${statusInfo.bgColor}`}>
        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
        <span className={`font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
        {/* TTS Status */}
        {ttsSupported && (
          <span className={`text-xs px-2 py-1 rounded-full ${isActivated ? 'bg-green-500/20 text-green-300 border border-green-400/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'}`}>
            TTS: {isActivated ? 'Đã kích hoạt' : 'Cần kích hoạt'}
          </span>
        )}
      </div>

      {/* Voice-only instructions - Dark Theme */}
      {conversationState === 'idle' && (
        <div className="w-full max-w-md p-4 bg-purple-900/30 backdrop-blur-sm border border-purple-400/30 rounded-xl">
          <div className="text-sm text-purple-200 text-center">
            <strong className="text-purple-100">🎤 Hệ thống sẵn sàng</strong><br/>
            Hãy bắt đầu nói để tương tác với ứng dụng.<br/>
            {isActivated ? (
              <span className="text-xs text-green-300">🔊 Chức năng đọc đã sẵn sàng</span>
            ) : (
              <span className="text-xs text-yellow-300">⚠️ Cần kích hoạt chức năng đọc để nghe phản hồi</span>
            )}
          </div>
          
          {/* Keyboard shortcuts info */}
          <div className="mt-3 pt-2 border-t border-purple-400/30">
            <div className="text-xs text-purple-300 text-center">
              <strong className="text-purple-200">⌨️ Phím tắt:</strong><br/>
              {!isActivated && <span>{isMac ? 'Cmd + Shift + Space' : 'Ctrl + Shift + Space'}: Kích hoạt đọc<br/></span>}
              {isMac ? 'Cmd + S' : 'Ctrl + S'}: Dừng trò chuyện
            </div>
          </div>
        </div>
      )}

      {/* TTS ACTIVATION - Dark Theme */}
      {!isActivated && ttsSupported && (
        <div className="w-full max-w-md p-4 bg-gradient-to-br from-orange-900/30 to-red-900/30 backdrop-blur-sm border border-orange-400/30 rounded-xl">
          <div className="text-sm text-orange-200 text-center">
            <strong className="text-orange-100">🔊 Kích hoạt chức năng đọc</strong><br/>
            Để nghe phản hồi từ AI, vui lòng sử dụng một trong các cách sau:<br/>
            <span className="text-xs text-orange-300">(Chỉ cần làm một lần)</span>
          </div>
          
          <div className="mt-2 text-xs text-orange-300 text-center">
            ⌨️ <strong className="text-orange-200">{isMac ? 'Cmd + Shift + Space' : 'Ctrl + Shift + Space'}</strong> hoặc nhấn nút bên dưới
          </div>
          
          <button
            onClick={handleManualActivation}
            className="mt-3 w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:scale-105"
            title={`Hoặc nhấn ${isMac ? 'Cmd + Shift + Space' : 'Ctrl + Shift + Space'}`}
          >
            🔊 Kích hoạt chức năng đọc
          </button>
        </div>
      )}

      {/* Error Display for TTS - Dark Theme */}
      {ttsError && (
        <div className="w-full max-w-md p-3 bg-red-900/30 backdrop-blur-sm border border-red-400/30 rounded-xl">
          <p className="text-sm text-red-200">
            <strong className="text-red-100">Lỗi TTS:</strong> {ttsError}
          </p>
          {!isActivated && (
            <button
              onClick={handleManualActivation}
              className="mt-2 w-full px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-500 hover:to-red-600 transition-all duration-200 text-sm shadow-lg"
            >
              🔄 Thử kích hoạt lại
            </button>
          )}
        </div>
      )}

      {/* Transcript Display - Dark Theme */}
      {transcript && (
        <div className="w-full max-w-md p-3 bg-gray-800/30 backdrop-blur-sm border border-gray-400/30 rounded-xl">
          <p className="text-sm text-gray-200">
            <strong className="text-gray-100">Bạn đang nói:</strong> <span className="text-purple-300">{transcript}</span>
          </p>
        </div>
      )}

      {/* Last Agent Response - Dark Theme */}
      {lastProcessedResponse && (
        <div className="w-full max-w-md p-3 bg-blue-900/30 backdrop-blur-sm border border-blue-400/30 rounded-xl">
          <p className="text-sm text-blue-200">
            <strong className="text-blue-100">AI đã nói:</strong> <span className="text-blue-300">{lastProcessedResponse.substring(0, 100)}
            {lastProcessedResponse.length > 100 ? '...' : ''}</span>
          </p>
        </div>
      )}

      {/* Emergency stop - Dark Theme */}
      {conversationState !== 'idle' && (
        <div className="text-center">
          <div className="text-xs text-purple-400 mb-2">
            Nói "dừng trò chuyện" để dừng hệ thống
          </div>
          <button
            onClick={stopConversation}
            className="sr-only focus:not-sr-only px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-500 hover:to-red-600 transition-all duration-200 text-xs shadow-lg"
            aria-label="Dừng trò chuyện - chỉ dùng khi cần thiết"
          >
            Dừng khẩn cấp
          </button>
        </div>
      )}

      {/* STT Error Display - Dark Theme */}
      {sttError && (
        <div className="w-full max-w-md p-3 bg-red-900/30 backdrop-blur-sm border border-red-400/30 rounded-xl">
          <p className="text-sm text-red-200">
            <strong className="text-red-100">Lỗi nhận diện giọng nói:</strong> {sttError}
          </p>
        </div>
      )}

      {/* Support Check - Dark Theme */}
      {!isSupported && (
        <div className="w-full max-w-md p-3 bg-yellow-900/30 backdrop-blur-sm border border-yellow-400/30 rounded-xl">
          <p className="text-sm text-yellow-200">
            <strong className="text-yellow-100">Cảnh báo:</strong> Trình duyệt không hỗ trợ Web Speech API. 
            Vui lòng sử dụng Chrome, Edge, hoặc Safari.
          </p>
        </div>
      )}

      {/* Security Context - Dark Theme */}
      {!browserSupport.isSecureContext && (
        <div className="w-full max-w-md p-3 bg-red-900/30 backdrop-blur-sm border border-red-400/30 rounded-xl">
          <p className="text-sm text-red-200">
            <strong className="text-red-100">Bảo mật:</strong> Web Speech API yêu cầu HTTPS hoặc localhost. 
            Hiện tại đang sử dụng HTTP không bảo mật.
          </p>
        </div>
      )}
    </div>
  );
};