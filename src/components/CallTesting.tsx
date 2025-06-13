import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Phone, X } from 'lucide-react';
import { Conversation } from '@11labs/client';
import { Loader } from './Loader';

interface CallTestingProps {
  agentId: string;
  dynamicVariables?: {[key: string]: string | number | boolean}; // Updated type and name
}

const CallTesting: React.FC<CallTestingProps> = ({ agentId, dynamicVariables = {} }) => {
  const [conversation, setConversation] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setHasPermission(false);
      return false;
    }
  };

  const toggleConversation = async () => {
    if (isConnected) {
      if (conversation) {
        await conversation.endSession();
        setConversation(null);
      }
    } else {
      setIsLoading(true);
      try {
        const permission = await requestMicrophonePermission();
        if (!permission) {
          alert('Microphone permission is required for the conversation.');
          setIsLoading(false);
          return;
        }

        console.log({dynamicVariables})

        const conv = await Conversation.startSession({
          agentId,
          dynamicVariables: Object.keys(dynamicVariables).length > 0 ? dynamicVariables : undefined,
          onConnect: () => {
            console.log('Connected');
            setIsConnected(true);
            setIsLoading(false);
          },
          onDisconnect: () => {
            console.log('Disconnected');
            setIsConnected(false);
            setIsSpeaking(false);
          },
          onError: (error) => {
            console.error('Conversation error:', error);
            setIsConnected(false);
            setIsLoading(false);
            alert(`Conversation error: ${error.message || 'Unknown error'}`);
          },
          onModeChange: (mode) => {
            console.log('Mode changed:', mode);
            setIsSpeaking(mode.mode === 'speaking');
          },
        });

        setConversation(conv);
      } catch (error) {
        console.error('Error starting conversation:', error);
        setIsLoading(false);
        alert(`Failed to start conversation: ${error.message || 'Please try again.'}`);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (conversation) {
        conversation.endSession();
      }
    };
  }, [conversation]);

  return (
    <div className="sticky top-8">
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-dark-100">
          <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white">Test Your Agent</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Click the microphone to start a conversation
          </p>
          {/* Debug info for dynamic variables */}
          {Object.keys(dynamicVariables).length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
              <strong>Dynamic Variables:</strong> {Object.keys(dynamicVariables).join(', ')}
            </div>
          )}
        </div>

        {hasPermission === false && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 py-4 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/20"
          >
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <MicOff className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Microphone Access Required</p>
                <p className="text-xs mt-0.5 text-red-500 dark:text-red-300">
                  Please allow microphone access to test the voice agent
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="p-6">
          <div className="flex flex-col items-center">
            {/* Status indicator */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <motion.div
                animate={{ opacity: [0.5, 1] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                  isLoading
                    ? 'bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-400'
                    : isConnected
                    ? isSpeaking
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-400'
                }`}
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-2 h-2 rounded-full mr-2 ${
                    isLoading
                      ? 'bg-gray-500 dark:bg-gray-400'
                      : isConnected
                      ? isSpeaking
                        ? 'bg-primary-500 dark:bg-primary-400'
                        : 'bg-red-500 dark:bg-red-400'
                      : 'bg-gray-500 dark:bg-gray-400'
                  }`}
                />
                {isLoading
                  ? 'Initializing...'
                  : isConnected
                  ? isSpeaking
                    ? 'Agent Speaking'
                    : 'Listening...'
                  : 'Ready'}
              </motion.div>
            </motion.div>

            {/* Main microphone button */}
            <motion.button
              onClick={toggleConversation}
              disabled={isLoading}
              className="relative outline-none group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Ripple effect */}
              <AnimatePresence>
                {isConnected && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="absolute inset-0"
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.2],
                        opacity: [0.3, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                      className={`absolute inset-0 rounded-full ${
                        isSpeaking 
                          ? 'bg-primary-500/20 dark:bg-primary-400/20' 
                          : 'bg-red-500/20 dark:bg-red-400/20'
                      }`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main button background */}
              <motion.div
                animate={{
                  scale: isSpeaking ? [1, 1.05, 1] : 1,
                }}
                transition={{
                  scale: {
                    duration: 1,
                    repeat: isSpeaking ? Infinity : 0,
                    ease: "easeInOut",
                  },
                }}
                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isLoading
                    ? 'bg-gray-100 dark:bg-dark-100'
                    : isConnected
                    ? isSpeaking
                      ? 'bg-primary shadow-lg shadow-primary/30 dark:shadow-primary/20'
                      : 'bg-red-500 shadow-lg shadow-red-500/30 dark:shadow-red-500/20'
                    : 'bg-gray-100 dark:bg-dark-100 shadow-lg hover:shadow-xl hover:bg-gray-200 dark:hover:bg-dark-50'
                }`}
              >
                {/* Icon container */}
                <motion.div
                  animate={{
                    scale: isConnected ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 1,
                    repeat: isConnected ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                  className={`transition-colors duration-300 ${
                    isLoading
                      ? 'text-gray-400 dark:text-gray-500'
                      : isConnected
                      ? 'text-white'
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                  }`}
                >
                  {isLoading ? (
                    <Loader />
                  ) : isSpeaking ? (
                    <Volume2 className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </motion.div>
              </motion.div>
            </motion.button>

            {/* End Call Button */}
            {isConnected && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={toggleConversation}
                className="mt-6 flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm font-medium">End Call</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallTesting;