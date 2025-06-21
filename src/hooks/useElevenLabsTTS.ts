'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { elevenLabsService, TTSOptions } from '@/services/elevenlabs';

export interface TextToSpeechState {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  error?: string;
  currentText?: string;
  progress?: number;
}

interface UseElevenLabsTTSProps {
  autoPlay?: boolean;
  language?: 'vietnamese' | 'english';
  voiceSettings?: Partial<TTSOptions>;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onPause?: () => void;
  onResume?: () => void;
}

export const useElevenLabsTTS = ({
  autoPlay = false,
  language = 'vietnamese',
  voiceSettings = {},
  onStart,
  onEnd,
  onError,
  onPause,
  onResume,
}: UseElevenLabsTTSProps = {}) => {
  const [state, setState] = useState<TextToSpeechState>({
    isSupported: false,
    isSpeaking: false,
    isPaused: false,
    isLoading: false,
  });

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioBufferRef = useRef<ArrayBuffer | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize ElevenLabs service
  useEffect(() => {
    const initializeService = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        const success = await elevenLabsService.initialize();
        
        setState(prev => ({
          ...prev,
          isSupported: success,
          isLoading: false,
          error: success ? undefined : 'Failed to initialize ElevenLabs service',
        }));

        if (success) {
          isInitializedRef.current = true;
        } else {
          onError?.('Failed to initialize ElevenLabs service');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          error: errorMessage,
        }));
        onError?.(errorMessage);
      }
    };

    initializeService();
  }, []); // Remove onError dependency to prevent infinite loops

  // Speak text using ElevenLabs
  const speak = useCallback(async (text: string) => {
    if (!state.isSupported || !elevenLabsService.initialized) {
      const error = 'ElevenLabs service not available';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    if (!text.trim()) {
      console.warn('Empty text provided to speak function');
      return;
    }

    try {
      // Stop any currently playing audio
      stopSpeech();
      
      setState(prev => ({
        ...prev,
        isLoading: true,
        currentText: text,
        error: undefined,
      }));

      console.log('🔊 Starting ElevenLabs TTS for:', text.substring(0, 50) + '...');
      
      // Generate audio using ElevenLabs
      const audioBuffer = await elevenLabsService.textToSpeech(text, {
        language,
        ...voiceSettings,
      });

      audioBufferRef.current = audioBuffer;

      // Create audio element for playback
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      // Set up event listeners
      audio.onloadstart = () => {
        setState(prev => ({
          ...prev,
          isLoading: true,
        }));
      };

      audio.oncanplay = () => {
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      };

      audio.onplay = () => {
        setState(prev => ({
          ...prev,
          isSpeaking: true,
          isPaused: false,
          isLoading: false,
        }));
        onStart?.();
      };

      audio.onpause = () => {
        setState(prev => ({
          ...prev,
          isPaused: true,
        }));
        onPause?.();
      };

      audio.onended = () => {
        setState(prev => ({
          ...prev,
          isSpeaking: false,
          isPaused: false,
          currentText: undefined,
          progress: undefined,
        }));
        
        // Clean up
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        audioBufferRef.current = null;
        
        onEnd?.();
      };

      audio.onerror = (error) => {
        const errorMessage = 'Audio playback error';
        setState(prev => ({
          ...prev,
          isSpeaking: false,
          isPaused: false,
          isLoading: false,
          error: errorMessage,
        }));
        
        // Clean up
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        audioBufferRef.current = null;
        
        onError?.(errorMessage);
      };

      // Track progress
      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          const progress = (audio.currentTime / audio.duration) * 100;
          setState(prev => ({ ...prev, progress }));
        }
      };

      // Play the audio
      await audio.play();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'TTS generation failed';
      console.error('❌ ElevenLabs TTS error:', error);
      
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        isLoading: false,
        error: errorMessage,
        currentText: undefined,
      }));
      
      onError?.(errorMessage);
    }
  }, [state.isSupported, language, voiceSettings]); // Remove callback dependencies to prevent infinite loops

  // Pause current speech
  const pause = useCallback(() => {
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      currentAudioRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, []);

  // Resume paused speech
  const resume = useCallback(() => {
    if (currentAudioRef.current && currentAudioRef.current.paused) {
      currentAudioRef.current.play();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, []);

  // Stop current speech
  const stopSpeech = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      
      // The onended event will clean up the state
      const endEvent = new Event('ended');
      currentAudioRef.current.dispatchEvent(endEvent);
    }
  }, []);

  // Get available voices
  const getVoices = useCallback(async () => {
    if (!elevenLabsService.initialized) {
      return [];
    }

    try {
      return await elevenLabsService.getVoices();
    } catch (error) {
      console.error('Error getting ElevenLabs voices:', error);
      return [];
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up directly without calling stopSpeech to avoid dependency loops
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }
      if (audioBufferRef.current) {
        audioBufferRef.current = null;
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Methods
    speak,
    pause,
    resume,
    stop: stopSpeech,
    getVoices,
    
    // Utilities
    cancel: stopSpeech, // Alias for compatibility
  };
}; 