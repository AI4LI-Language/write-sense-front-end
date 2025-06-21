'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { elevenLabsService, STTOptions, STTResult } from '@/services/elevenlabs';

export interface SpeechToTextState {
  isSupported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error?: string;
  confidence?: number;
  languageDetected?: string;
  timeStamps?: Array<{
    text: string;
    start: number;
    end: number;
    type: 'word' | 'spacing' | 'audio_event';
  }>;
}

interface UseElevenLabsSTTProps {
  onResult?: (transcript: string) => void;
  onFinalResult?: (result: STTResult) => void;
  onError?: (error: string) => void;
  onSilenceDetected?: (finalTranscript: string) => void;
  language?: string;
  continuous?: boolean;
  silenceTimeout?: number; // in milliseconds
  isBlocked?: boolean; // External control to block speech recognition
  sttOptions?: STTOptions;
}

export const useElevenLabsSTT = ({
  onResult,
  onFinalResult,
  onError,
  onSilenceDetected,
  language = 'vi',
  continuous = true,
  silenceTimeout = 5000,
  isBlocked = false,
  sttOptions = {},
}: UseElevenLabsSTTProps = {}) => {
  const [state, setState] = useState<SpeechToTextState>({
    isSupported: false,
    isListening: false,
    isProcessing: false,
    transcript: '',
  });

  const [isClient, setIsClient] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const lastTTSEndTimeRef = useRef<number>(0);

  // Set this from VoiceController when TTS ends
  const setLastTTSEndTime = useCallback((ttsContent?: string) => {
    lastTTSEndTimeRef.current = Date.now();
    console.log('📝 Updated last TTS end time for ElevenLabs STT feedback prevention');
  }, []);

  // Ensure client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize ElevenLabs service and check browser support
  useEffect(() => {
    if (!isClient) return;

    const initializeService = async () => {
      try {
        // Check if MediaRecorder is supported
        if (!navigator.mediaDevices || !window.MediaRecorder) {
          setState(prev => ({
            ...prev,
            isSupported: false,
            error: 'MediaRecorder not supported in this browser',
          }));
          onError?.('MediaRecorder not supported in this browser');
          return;
        }

        // Initialize ElevenLabs service
        const success = await elevenLabsService.initialize();
        
        setState(prev => ({
          ...prev,
          isSupported: success,
          error: success ? undefined : 'Failed to initialize ElevenLabs STT service',
        }));

        if (success) {
          isInitializedRef.current = true;
        } else {
          onError?.('Failed to initialize ElevenLabs STT service');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({
          ...prev,
          isSupported: false,
          error: errorMessage,
        }));
        onError?.(errorMessage);
      }
    };

    initializeService();
  }, [isClient]); // Remove onError dependency to prevent infinite loops

  // Force stop when blocked
  useEffect(() => {
    if (isBlocked && state.isListening) {
      console.log('🛑 Force stopping ElevenLabs STT due to blocking');
      // Use the media recorder directly to avoid dependency issues
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setState(prev => ({ ...prev, isListening: false }));
    }
  }, [isBlocked, state.isListening]);

  // Process recorded audio with ElevenLabs STT
  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (!elevenLabsService.initialized) {
      console.error('ElevenLabs service not initialized');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      console.log('🎤 Processing audio with ElevenLabs STT...');
      
      const result = await elevenLabsService.speechToText(audioBlob, {
        languageCode: language,
        ...sttOptions,
      });

      console.log('✅ ElevenLabs STT result:', result);

      // Check for echo/feedback prevention
      const timeSinceTTS = Date.now() - lastTTSEndTimeRef.current;
      const MIN_TIME_AFTER_TTS = 3000; // 3 seconds

      if (lastTTSEndTimeRef.current > 0 && timeSinceTTS < MIN_TIME_AFTER_TTS) {
        console.log(`⚠️ Ignoring STT result, too soon after TTS (${timeSinceTTS}ms < ${MIN_TIME_AFTER_TTS}ms)`);
        setState(prev => ({ ...prev, isProcessing: false }));
        return;
      }

      if (result.text && result.text.trim()) {
        setState(prev => ({
          ...prev,
          transcript: result.text,
          confidence: result.languageProbability,
          languageDetected: result.languageCode,
          timeStamps: result.words?.map(word => ({
            text: word.text,
            start: word.start,
            end: word.end,
            type: word.type,
          })),
          isProcessing: false,
        }));

        // Call callbacks
        onResult?.(result.text);
        onFinalResult?.(result);

        // If continuous mode and we got a result, handle silence detection
        if (continuous) {
          onSilenceDetected?.(result.text);
        }
      } else {
        setState(prev => ({ ...prev, isProcessing: false }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'STT processing failed';
      console.error('❌ ElevenLabs STT error:', error);
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      
      onError?.(errorMessage);
    }
  }, [language, sttOptions, continuous]); // Remove callback dependencies to prevent infinite loops

  // Start listening for speech
  const startListening = useCallback(async () => {
    if (!state.isSupported || !elevenLabsService.initialized) {
      const error = 'ElevenLabs STT service not available';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    if (isBlocked) {
      console.log('🚫 Cannot start ElevenLabs STT - blocked');
      return;
    }

    if (state.isListening) {
      console.log('Already listening');
      return;
    }

    try {
      console.log('🎤 Starting ElevenLabs STT...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;

      // Check if MediaRecorder supports audio/webm
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Only process if we have substantial audio (> 500ms)
          if (audioBlob.size > 1000) {
            processAudio(audioBlob);
          }
        }
        audioChunksRef.current = [];
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const errorMessage = 'Recording error occurred';
        setState(prev => ({ ...prev, error: errorMessage, isListening: false }));
        onError?.(errorMessage);
      };

      // Start recording
      mediaRecorder.start();
      
      setState(prev => ({
        ...prev,
        isListening: true,
        error: undefined,
        transcript: '',
      }));

      // Set up silence detection timer if not continuous
      if (!continuous && silenceTimeout > 0) {
        silenceTimerRef.current = setTimeout(() => {
          console.log('⏰ Silence timeout reached, stopping listening');
          stopListening();
        }, silenceTimeout);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      console.error('❌ Failed to start ElevenLabs STT:', error);
      
      setState(prev => ({
        ...prev,
        isListening: false,
        error: errorMessage,
      }));
      
      onError?.(errorMessage);
    }
  }, [state.isSupported, state.isListening, isBlocked, continuous, silenceTimeout, processAudio]); // Remove onError to prevent infinite loops

  // Stop listening
  const stopListening = useCallback(() => {
    if (!state.isListening) return;

    console.log('🛑 Stopping ElevenLabs STT...');

    // Clear silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState(prev => ({ ...prev, isListening: false }));
  }, [state.isListening]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      transcript: '', 
      confidence: undefined,
      languageDetected: undefined,
      timeStamps: undefined,
      error: undefined,
    }));
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    // State
    ...state,
    
    // Methods
    startListening,
    stopListening,
    resetTranscript,
    setLastTTSEndTime,
    
    // Utilities
    isReady: state.isSupported && elevenLabsService.initialized,
  };
}; 