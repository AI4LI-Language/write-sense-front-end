'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface TextToSpeechState {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  error?: string;
  currentText?: string;
}

interface UseWebSpeechTTSProps {
  language?: 'vietnamese' | 'english';
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onPause?: () => void;
  onResume?: () => void;
}

export const useWebSpeechTTS = ({
  language = 'vietnamese',
  rate = 1.0,
  pitch = 1.0,
  volume = 1.0,
  onStart,
  onEnd,
  onError,
  onPause,
  onResume,
}: UseWebSpeechTTSProps = {}) => {
  const [state, setState] = useState<TextToSpeechState>({
    isSupported: false,
    isSpeaking: false,
    isPaused: false,
  });

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Check for browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setState(prev => ({ ...prev, isSupported: true }));
      
      // Load voices
      const loadVoices = () => {
        voicesRef.current = synthRef.current?.getVoices() || [];
      };

      loadVoices();
      
      // Voices may load asynchronously
      if (synthRef.current) {
        synthRef.current.addEventListener('voiceschanged', loadVoices);
      }

      return () => {
        if (synthRef.current) {
          synthRef.current.removeEventListener('voiceschanged', loadVoices);
        }
      };
    } else {
      setState(prev => ({ ...prev, error: 'Speech synthesis not supported' }));
    }
  }, []);

  // Get the best voice for the selected language
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    if (!voices.length) return null;

    // Language codes for Vietnamese and English
    const langCodes = {
      vietnamese: ['vi-VN', 'vi'],
      english: ['en-US', 'en-GB', 'en']
    };

    const targetLangs = langCodes[language];
    
    // Try to find a voice that matches the target language
    for (const lang of targetLangs) {
      const voice = voices.find(v => v.lang.startsWith(lang));
      if (voice) {
        console.log(`🔊 Selected voice: ${voice.name} (${voice.lang})`);
        return voice;
      }
    }

    // Fallback to default voice
    console.log('🔊 Using default voice');
    return voices[0] || null;
  }, [language]);

  // Speak text using Web Speech API
  const speak = useCallback(async (text: string) => {
    if (!state.isSupported || !synthRef.current) {
      const error = 'Speech synthesis not available';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    if (!text.trim()) {
      console.warn('Empty text provided to speak function');
      return;
    }

    // Stop any current speech
    stopSpeech();

    try {
      console.log('🔊 Starting speech synthesis:', text.substring(0, 50) + '...');
      
      // Create utterance as per Web Speech API documentation
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      
      // Set voice
      const selectedVoice = getVoice();
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        // Set fallback language
        utterance.lang = language === 'vietnamese' ? 'vi-VN' : 'en-US';
      }

      // Set up event handlers as per Web Speech API examples
      utterance.onstart = () => {
        console.log('🔊 Speech synthesis started');
        setState(prev => ({
          ...prev,
          isSpeaking: true,
          isPaused: false,
          currentText: text,
          error: undefined,
        }));
        onStart?.();
      };

      utterance.onend = () => {
        console.log('🔊 Speech synthesis ended');
        setState(prev => ({
          ...prev,
          isSpeaking: false,
          isPaused: false,
          currentText: undefined,
        }));
        currentUtteranceRef.current = null;
        onEnd?.();
      };

      utterance.onerror = (event) => {
        console.error('🚫 Speech synthesis error:', event.error);
        const errorMessage = `Speech synthesis error: ${event.error}`;
        setState(prev => ({
          ...prev,
          isSpeaking: false,
          isPaused: false,
          error: errorMessage,
          currentText: undefined,
        }));
        currentUtteranceRef.current = null;
        onError?.(errorMessage);
      };

      utterance.onpause = () => {
        console.log('⏸️ Speech synthesis paused');
        setState(prev => ({ ...prev, isPaused: true }));
        onPause?.();
      };

      utterance.onresume = () => {
        console.log('▶️ Speech synthesis resumed');
        setState(prev => ({ ...prev, isPaused: false }));
        onResume?.();
      };

      // Store current utterance
      currentUtteranceRef.current = utterance;

      // Start speaking
      synthRef.current.speak(utterance);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'TTS generation failed';
      console.error('❌ Speech synthesis error:', error);
      
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        error: errorMessage,
        currentText: undefined,
      }));
      
      onError?.(errorMessage);
    }
  }, [state.isSupported, language, rate, pitch, volume, getVoice, onStart, onEnd, onError, onPause, onResume]);

  // Pause current speech
  const pause = useCallback(() => {
    if (synthRef.current && state.isSpeaking && !state.isPaused) {
      console.log('⏸️ Pausing speech synthesis');
      synthRef.current.pause();
    }
  }, [state.isSpeaking, state.isPaused]);

  // Resume paused speech
  const resume = useCallback(() => {
    if (synthRef.current && state.isSpeaking && state.isPaused) {
      console.log('▶️ Resuming speech synthesis');
      synthRef.current.resume();
    }
  }, [state.isSpeaking, state.isPaused]);

  // Stop current speech
  const stopSpeech = useCallback(() => {
    if (synthRef.current) {
      console.log('🛑 Stopping speech synthesis');
      synthRef.current.cancel();
      
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        currentText: undefined,
      }));
      
      currentUtteranceRef.current = null;
    }
  }, []);

  // Get available voices
  const getVoices = useCallback(() => {
    return voicesRef.current;
  }, []);

  // Check if speaking
  const isSpeaking = useCallback(() => {
    return synthRef.current?.speaking || false;
  }, []);

  // Check if paused
  const isPaused = useCallback(() => {
    return synthRef.current?.paused || false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  return {
    // State
    ...state,
    
    // Methods
    speak,
    pause,
    resume,
    stop: stopSpeech,
    getVoices,
    isSpeaking,
    isPaused,
    
    // Utilities
    cancel: stopSpeech, // Alias for compatibility
  };
}; 