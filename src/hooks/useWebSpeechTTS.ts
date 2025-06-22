'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface TextToSpeechState {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  error?: string;
  currentText?: string;
  isActivated?: boolean;
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
    isActivated: false, // ✅ Requires user gesture to unlock due to browser autoplay policy
  });

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const userInteractionDetectedRef = useRef(false);

  // Check for browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setState(prev => ({ 
        ...prev, 
        isSupported: true
        // ✅ isActivated stays false until user gesture unlocks audio
      }));
      
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

  // ✅ ACCESSIBILITY: Use speech recognition user interaction to unlock TTS
  const activateFromUserInteraction = useCallback(() => {
    if (!synthRef.current || userInteractionDetectedRef.current) {
      return;
    }

    console.log('🔓 Speech recognition detected - marking user interaction');
    userInteractionDetectedRef.current = true;
    
    // ✅ DON'T ATTEMPT TTS YET: Just mark that we have user interaction
    // The actual TTS will be unlocked when user says activation command or clicks button
    setState(prev => ({ ...prev, error: undefined }));
    
  }, []);

  // Get the best voice for the selected language
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    if (!voices.length) return null;

    const langCodes = {
      vietnamese: ['vi-VN', 'vi'],
      english: ['en-US', 'en-GB', 'en']
    };

    const targetLangs = langCodes[language];
    
    for (const lang of targetLangs) {
      const voice = voices.find(v => v.lang.startsWith(lang));
      if (voice) {
        console.log(`🔊 Selected voice: ${voice.name} (${voice.lang})`);
        return voice;
      }
    }

    console.log('🔊 Using default voice');
    return voices[0] || null;
  }, [language]);

  // ✅ MANUAL ACTIVATION: Required to unlock TTS due to browser autoplay policies
  const manualActivateTTS = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      console.log('🔓 Manual TTS activation via user gesture');
      
      if (!window.speechSynthesis) {
        console.error('❌ speechSynthesis not available');
        resolve(false);
        return;
      }

      // Following Web Speech API documentation exactly
      try {
        // Cancel any existing speech as per documentation
        window.speechSynthesis.cancel();
        
        // Create test utterance following documentation pattern - keep it short to minimize feedback risk
        const testUtterance = new SpeechSynthesisUtterance('Đã kích hoạt chức năng đọc.');
        testUtterance.lang = 'vi-VN';
        testUtterance.rate = 1.2; // Speak a bit faster to reduce duration
        testUtterance.pitch = 1.0;
        testUtterance.volume = 0.8; // Slightly quieter to reduce feedback risk
        
        // Set event handlers as shown in documentation
        testUtterance.onstart = function() {
          console.log('✅ TTS successfully unlocked by user gesture');
          setState(prev => ({ ...prev, isActivated: true, error: undefined }));
          resolve(true);
        };
        
        testUtterance.onend = function() {
          console.log('🔊 TTS activation completed - now ready for automatic responses');
        };
        
        testUtterance.onerror = function(event) {
          console.error('❌ TTS activation failed:', event.error);
          let errorMessage = 'Không thể kích hoạt chức năng đọc';
          if (event.error === 'not-allowed') {
            errorMessage = 'Trình duyệt chặn chức năng đọc. Vui lòng cho phép âm thanh trong cài đặt trình duyệt.';
          }
          setState(prev => ({ 
            ...prev, 
            isActivated: false, 
            error: errorMessage
          }));
          resolve(false);
        };
        
        // Speak using global API as per documentation
        window.speechSynthesis.speak(testUtterance);
        
      } catch (error) {
        console.error('❌ Manual activation failed:', error);
        setState(prev => ({ 
          ...prev, 
          isActivated: false, 
          error: 'Không thể kích hoạt chức năng đọc' 
        }));
        resolve(false);
      }
    });
  }, []);

  // ✅ VOICE ACTIVATION: Only works AFTER manual activation due to browser policies
  const handleVoiceActivation = useCallback((text: string) => {
    const lowerText = text.toLowerCase().trim();
    
    // Check for activation voice commands
    if (lowerText.includes('kích hoạt đọc') || 
        lowerText.includes('bật đọc') || 
        lowerText.includes('cho phép đọc') ||
        lowerText.includes('khởi động đọc')) {
      
      console.log('🎤 Voice activation command detected');
      
      // ✅ SECURITY REALITY: Voice commands can't reliably unlock TTS due to browser policies
      // Provide clear guidance to user
      setState(prev => ({ 
        ...prev, 
        isActivated: false, 
        error: 'Để kích hoạt chức năng đọc, vui lòng nhấn nút "Kích hoạt đọc" bên dưới' 
      }));
      
      onError?.('Để kích hoạt chức năng đọc, vui lòng nhấn nút "Kích hoạt đọc" bên dưới');
      
      return true; // Indicates this was an activation command
    }
    
    return false;
  }, [onError]);

  // ✅ MAIN SPEAK FUNCTION: Following Web Speech API documentation with proper security handling
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

    // ✅ BROWSER AUTOPLAY POLICY: Check if TTS is unlocked by user gesture
    if (!state.isActivated) {
      console.log('🔒 TTS blocked by browser autoplay policy - needs user gesture');
      const errorMessage = 'Chức năng đọc cần được kích hoạt bằng một cú nhấp hoặc chạm';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
      return;
    }

    try {
      // Stop any current speech first
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      console.log('🔊 Starting speech synthesis:', text.substring(0, 50) + '...');
      
      // ✅ FOLLOWING WEB SPEECH API DOCUMENTATION EXACTLY
      // Cancel any existing speech first as per documentation
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      
      const selectedVoice = getVoice();
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = language === 'vietnamese' ? 'vi-VN' : 'en-US';
      }

      // Set event handlers as shown in documentation
      utterance.onstart = function() {
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

      utterance.onend = function() {
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

      utterance.onerror = function(event) {
        console.error('🚫 Speech synthesis error:', event.error);
        
        if (event.error === 'not-allowed') {
          console.log('🎤 TTS blocked - user needs to reactivate');
          const guidanceMessage = 'Chức năng đọc bị chặn. Vui lòng nhấn nút "Kích hoạt đọc" để sử dụng lại';
          setState(prev => ({
            ...prev,
            isSpeaking: false,
            isPaused: false,
            error: guidanceMessage,
            currentText: undefined,
            isActivated: false, // Reset activation status
          }));
          onError?.(guidanceMessage);
          return;
        }
        
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

      utterance.onpause = function() {
        console.log('⏸️ Speech synthesis paused');
        setState(prev => ({ ...prev, isPaused: true }));
        onPause?.();
      };

      utterance.onresume = function() {
        console.log('▶️ Speech synthesis resumed');
        setState(prev => ({ ...prev, isPaused: false }));
        onResume?.();
      };

      currentUtteranceRef.current = utterance;
      
      // ✅ USE GLOBAL API AS PER DOCUMENTATION
      if (window.speechSynthesis) {
        window.speechSynthesis.speak(utterance);
      } else {
        synthRef.current.speak(utterance);
      }

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
  }, [state.isSupported, state.isActivated, language, rate, pitch, volume, getVoice, onStart, onEnd, onError, onPause, onResume]);

  // Mark that user interaction has been detected (call this when speech recognition starts)
  const notifyUserInteraction = useCallback(() => {
    console.log('🎤 User interaction detected via speech recognition');
    activateFromUserInteraction();
  }, [activateFromUserInteraction]);

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
    notifyUserInteraction, // ✅ New method to signal user interaction from speech recognition
    manualActivateTTS, // ✅ Manual activation function for browser security compliance
    
    // Utilities
    cancel: stopSpeech,
  };
}; 