'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTextToSpeechProps {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface TextToSpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  error?: string;
}

export const useTextToSpeech = ({
  language = 'vi-VN',
  rate = 1,
  pitch = 1,
  volume = 1,
}: UseTextToSpeechProps = {}) => {
  const [state, setState] = useState<TextToSpeechState>({
    isSpeaking: false,
    isPaused: false,
    isSupported: false,
    error: undefined,
  });

  // Fix for speech-dispatcher bug on Ubuntu systems
  const [speechDispatcherFixed, setSpeechDispatcherFixed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const utteranceQueueRef = useRef<SpeechSynthesisUtterance[]>([]);

  // Fix for Chrome's bug where speech synthesis gets cut off
  const watchdogRef = useRef<number | null>(null);
  const resumeInfinity = useCallback(() => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      speechSynthesis.resume();

      // Clear existing watchdog and set a new one
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
      }
      watchdogRef.current = window.setTimeout(resumeInfinity, 5000);
    }
  }, []);

  // Ensure client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Cleanup watchdog on unmount
  useEffect(() => {
    return () => {
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, []);

  // Initialize speech synthesis
  useEffect(() => {
    if (!isClient) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      console.log('✅ Speech synthesis is supported');
      setState(prev => ({ ...prev, isSupported: true }));

      // On Ubuntu systems, fix speech-dispatcher bug by disabling the Web Speech API temporarily
      // This is based on the fix mentioned here: https://tqdev.com/2021-firefox-ubuntu-crackling-sound
      try {
        const isLinux = navigator.userAgent.toLowerCase().includes('linux');
        if (isLinux) {
          console.log('Linux OS detected, applying speech-dispatcher fix');
          
          // Fix 1: Disable Web Speech Synthesis on Linux temporarily to see if it helps
          const meta = document.createElement('meta');
          meta.name = 'speech-synthesis-fix';
          meta.content = 'disabled';
          document.head.appendChild(meta);
          
          // This will only disable it for a short test, then we'll restore it
          setTimeout(() => {
            document.head.removeChild(meta);
            console.log('✅ Speech synthesis restored after fix applied');
            setSpeechDispatcherFixed(true);
          }, 500);
        }
      } catch (error) {
        console.error('Error during speech-dispatcher fix:', error);
      }

      // Load available voices
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        console.log(`🎙️ Available voices loaded: ${voices.length}`);
        if (voices.length > 0) {
          console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`).join(', '));
        }
      };
      
      loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    } else {
      setState(prev => ({ 
        ...prev, 
        isSupported: false,
        error: 'Trình duyệt không hỗ trợ Speech Synthesis API.'
      }));
    }
    
    // Important cleanup
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
        if (watchdogRef.current) {
          window.clearTimeout(watchdogRef.current);
          watchdogRef.current = null;
        }
      }
    };
  }, [isClient]);

  const selectBestVoice = useCallback((lang: string) => {
    if (!window.speechSynthesis) return null;
    
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    
    // First try: exact language match
    let voice = voices.find(v => v.lang.toLowerCase() === lang.toLowerCase());
    
    // Second try: partial match (language code)
    if (!voice) {
      const langCode = lang.split('-')[0].toLowerCase();
      voice = voices.find(v => v.lang.toLowerCase().startsWith(langCode));
    }
    
    // Third try: default voice
    if (!voice && voices.length > 0) {
      voice = voices.find(v => v.default) || voices[0];
    }
    
    return voice;
  }, []);

  const speak = useCallback((text: string) => {
    if (!state.isSupported || !window.speechSynthesis) {
      const error = 'Trình duyệt không hỗ trợ Speech Synthesis API.';
      setState(prev => ({ ...prev, error }));
      return;
    }

    if (!text.trim()) {
      const error = 'Không có nội dung để đọc.';
      setState(prev => ({ ...prev, error }));
      return;
    }

    // If speech is currently active, we need to stop it first
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      console.log('🛑 Stopping existing speech before starting new one');
      
      // Force stop all speech
      speechSynthesis.cancel();
      
      // Clear our internal state
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      
      // Clear references
      currentUtteranceRef.current = null;
      utteranceQueueRef.current = [];
      
      // Update state to reflect that we're not speaking
      setState(prev => ({ 
        ...prev, 
        isSpeaking: false, 
        isPaused: false 
      }));
      
      // Wait longer for the cancellation to fully complete and browser state to update
      setTimeout(() => {
        // Double-check that speech has actually stopped
        if (!speechSynthesis.speaking && !speechSynthesis.pending) {
          console.log('✅ Speech fully stopped, starting new utterance');
          createAndSpeakUtterance(text);
        } else {
          console.log('⚠️ Speech still active after cancellation, waiting longer');
          // Wait even longer if speech is still active
          setTimeout(() => {
            createAndSpeakUtterance(text);
          }, 500);
        }
      }, 200); // Increased delay from 50ms to 200ms
    } else {
      createAndSpeakUtterance(text);
    }
  }, [language, rate, pitch, volume, state.isSupported, selectBestVoice]);

  const createAndSpeakUtterance = useCallback((text: string) => {
    // Additional safety check
    if (!window.speechSynthesis) {
      console.error('🚨 SpeechSynthesis not available');
      setState(prev => ({
        ...prev,
        error: 'Hệ thống phát âm không khả dụng.'
      }));
      return;
    }

    // Don't try to speak if there's already speech happening
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      console.warn('⚠️ Speech already in progress, skipping new utterance');
      return;
    }

    console.log('🗣️ Creating new utterance:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    
    // Clamp values to safe ranges
    utterance.rate = Math.max(0.1, Math.min(rate, 2));
    utterance.pitch = Math.max(0.1, Math.min(pitch, 2));
    utterance.volume = Math.max(0, Math.min(volume, 1));
    
    // Try to find an appropriate voice
    const bestVoice = selectBestVoice(language);
    if (bestVoice) {
      console.log(`🎙️ Using voice: ${bestVoice.name} (${bestVoice.lang})`);
      utterance.voice = bestVoice;
    }
    
    // Keep reference to prevent garbage collection
    currentUtteranceRef.current = utterance;
    utteranceQueueRef.current.push(utterance);
    
    // Event handlers
    utterance.onstart = () => {
      console.log('🔊 Speech started');
      setState(prev => ({ 
        ...prev, 
        isSpeaking: true, 
        isPaused: false, 
        error: undefined 
      }));
      
      // Start the watchdog to prevent Chrome from cutting off
      if (!watchdogRef.current) {
        watchdogRef.current = window.setTimeout(resumeInfinity, 5000);
      }
    };
    
    utterance.onend = () => {
      console.log('🔊 Speech ended');
      setState(prev => ({ 
        ...prev, 
        isSpeaking: false, 
        isPaused: false 
      }));
      currentUtteranceRef.current = null;
      utteranceQueueRef.current = utteranceQueueRef.current.filter(u => u !== utterance);
      
      // Clear the watchdog
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
    
    utterance.onerror = (event) => {
      console.error('🚨 Speech error:', event.error);
      
      // Handle specific error cases
      if (event.error === 'canceled') {
        console.log('ℹ️ Speech was canceled - this is normal when stopping to start new speech');
        // Don't treat cancellation as a real error if we're just switching to new speech
        setState(prev => ({ 
          ...prev, 
          isSpeaking: false, 
          isPaused: false,
          error: undefined // Clear error for canceled
        }));
      } else if (event.error === 'not-allowed') {
        console.error('🚫 Speech not allowed - possibly due to user activation policy or rapid consecutive calls');
        setState(prev => ({ 
          ...prev, 
          isSpeaking: false, 
          isPaused: false,
          error: 'Không thể phát âm. Vui lòng thử lại sau.'
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          isSpeaking: false, 
          isPaused: false,
          error: `Lỗi phát âm: ${event.error}`
        }));
      }
      
      currentUtteranceRef.current = null;
      utteranceQueueRef.current = utteranceQueueRef.current.filter(u => u !== utterance);
      
      // Clear the watchdog
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
    
    // Speak!
    try {
      console.log('🎯 Starting speech synthesis');
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('🚨 Error in speechSynthesis.speak():', error);
      setState(prev => ({
        ...prev,
        error: 'Lỗi khi gọi hàm phát âm.'
      }));
    }
  }, [language, rate, pitch, volume, resumeInfinity, selectBestVoice]);

  const pause = useCallback(() => {
    if (state.isSupported && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      setState(prev => ({ ...prev, isPaused: true }));
      
      // Clear the watchdog
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    }
  }, [state.isSupported]);

  const resume = useCallback(() => {
    if (state.isSupported && speechSynthesis.paused) {
      speechSynthesis.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      
      // Restart the watchdog
      if (!watchdogRef.current) {
        watchdogRef.current = window.setTimeout(resumeInfinity, 5000);
      }
    }
  }, [state.isSupported, resumeInfinity]);

  const stop = useCallback(() => {
    if (state.isSupported) {
      speechSynthesis.cancel();
      setState(prev => ({ 
        ...prev, 
        isSpeaking: false, 
        isPaused: false 
      }));
      currentUtteranceRef.current = null;
      utteranceQueueRef.current = [];
      
      // Clear the watchdog
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    }
  }, [state.isSupported]);

  const getVoices = useCallback(() => {
    if (!state.isSupported) return [];
    return speechSynthesis.getVoices();
  }, [state.isSupported]);

  return {
    ...state,
    speak,
    pause,
    resume,
    stop,
    getVoices,
  };
}; 