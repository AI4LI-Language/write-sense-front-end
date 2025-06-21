'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error?: string;
}

interface UseSpeechRecognitionProps {
  onResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onSilenceDetected?: (finalTranscript: string) => void;
  language?: string;
  silenceTimeout?: number; // in milliseconds
}

interface SpeechRecognitionInterface {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognitionInterface, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognitionInterface;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognitionInterface;
    };
  }
}

export const useSpeechRecognition = ({
  onResult,
  onFinalResult,
  onError,
  onSilenceDetected,
  language = 'vi-VN',
  silenceTimeout = 2000, // 2 seconds as requested
}: UseSpeechRecognitionProps = {}) => {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    transcript: '',
    isSupported: false,
    error: undefined,
  });

  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const interimTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  // Check for browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setState(prev => ({ ...prev, isSupported: !!SpeechRecognition }));
    }
  }, []);

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Reset silence timer
  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    
    silenceTimerRef.current = setTimeout(() => {
      console.log('🔇 Silence detected after', silenceTimeout, 'ms');
      const finalText = finalTranscriptRef.current;
      
      if (finalText.trim()) {
        onSilenceDetected?.(finalText);
        onFinalResult?.(finalText);
      }
      
      // Reset transcripts
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      setState(prev => ({ ...prev, transcript: '' }));
    }, silenceTimeout);
  }, [silenceTimeout, onSilenceDetected, onFinalResult, clearSilenceTimer]);

  // Setup recognition instance
  const setupRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported' }));
      return null;
    }

    const recognition = new SpeechRecognition();
    
    // Configure recognition as per Web Speech API docs
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    // Handle start event
    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      isListeningRef.current = true;
      setState(prev => ({ 
        ...prev, 
        isListening: true, 
        error: undefined 
      }));
    };

    // Handle results as per Web Speech API documentation
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      // Process all results as shown in Web Speech API examples
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update refs and state
      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
        console.log('✅ Final transcript:', finalTranscript);
        onResult?.(finalTranscriptRef.current);
      }

      if (interimTranscript) {
        interimTranscriptRef.current = interimTranscript;
        console.log('⏳ Interim transcript:', interimTranscript);
      }

      // Update display transcript
      const displayTranscript = finalTranscriptRef.current + interimTranscriptRef.current;
      setState(prev => ({ ...prev, transcript: displayTranscript }));

      // Reset silence timer when we get any speech
      if (finalTranscript || interimTranscript) {
        resetSilenceTimer();
      }
    };

    // Handle errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('🚫 Speech recognition error:', event.error);
      setState(prev => ({ 
        ...prev, 
        error: event.error,
        isListening: false 
      }));
      isListeningRef.current = false;
      clearSilenceTimer();
      onError?.(event.error);
    };

    // Handle end event
    recognition.onend = () => {
      console.log('🛑 Speech recognition ended');
      isListeningRef.current = false;
      setState(prev => ({ ...prev, isListening: false }));
      clearSilenceTimer();
      
      // Clear recognition reference to prevent stale references
      if (recognitionRef.current === recognition) {
        // Don't set to null immediately as other code might still need it
        // Let garbage collection handle cleanup
      }
    };

    return recognition;
  }, [language, onResult, onError, resetSilenceTimer, clearSilenceTimer]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!state.isSupported) {
      const error = 'Speech recognition not supported';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    if (isListeningRef.current) {
      console.log('🔄 Already listening, stopping first...');
      stopListening();
      // Wait a bit for the previous session to clean up
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      // Create new recognition instance
      recognitionRef.current = setupRecognition();
      
      if (!recognitionRef.current) {
        throw new Error('Failed to create speech recognition instance');
      }

      // Reset state
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      setState(prev => ({ 
        ...prev, 
        transcript: '', 
        error: undefined 
      }));

      // Start recognition
      recognitionRef.current.start();
      console.log('🎤 Starting speech recognition...');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start speech recognition';
      console.error('❌ Error starting speech recognition:', error);
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isListening: false 
      }));
      onError?.(errorMessage);
    }
  }, [state.isSupported, setupRecognition, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('🛑 Stopping speech recognition...');
    
    clearSilenceTimer();
    
    if (recognitionRef.current) {
      try {
        // Use stop() method as per Web Speech API documentation
        // This allows the recognition to return results for audio already captured
        if (isListeningRef.current) {
          recognitionRef.current.stop();
        }
      } catch (error) {
        console.error('Error stopping recognition:', error);
        // If stop() fails, try abort() as fallback
        try {
          recognitionRef.current.abort();
        } catch (abortError) {
          console.error('Error aborting recognition:', abortError);
        }
      }
    }
    
    // Update state immediately for better UX
    isListeningRef.current = false;
    setState(prev => ({ ...prev, isListening: false }));
  }, [clearSilenceTimer]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setState(prev => ({ ...prev, transcript: '' }));
    clearSilenceTimer();
  }, [clearSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      clearSilenceTimer();
    };
  }, [stopListening, clearSilenceTimer]);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  };
}; 