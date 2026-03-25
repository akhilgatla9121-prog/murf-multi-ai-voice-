import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  User, 
  Bot, 
  Headphones,
  MessageSquare,
  Settings,
  HelpCircle,
  AlertCircle,
  Heart,
  GraduationCap,
  Wrench,
  Gamepad2,
  ChevronRight,
  Sparkles,
  Clock,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
type AssistantType = 'healthcare' | 'edtech' | 'industry' | 'gaming';

interface AssistantConfig {
  id: AssistantType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  systemInstruction: string;
  defaultVoice: string;
  voices: { id: string; name: string }[];
  imageUrl: string;
  actionLabel: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  mood?: string;
}

const ASSISTANTS: AssistantConfig[] = [
  {
    id: 'healthcare',
    name: 'Recovery Coach',
    description: 'Empathetic post-op wellness partner',
    icon: <Heart size={20} />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    defaultVoice: 'en-US-natalie',
    voices: [
      { id: 'en-US-natalie', name: 'Natalie (Caring)' },
      { id: 'en-US-claire', name: 'Claire (Soft)' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80',
    actionLabel: 'Monitoring Recovery...',
    systemInstruction: "You are a caring, empathetic recovery coach for post-op patients. Use a soft, gentle, and encouraging tone. Focus on medication reminders, wellness check-ins, and providing human-like companionship. Avoid clinical or impersonal language."
  },
  {
    id: 'edtech',
    name: 'Multi-Dialect Tutor',
    description: 'STEM concepts in regional accents',
    icon: <GraduationCap size={20} />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    defaultVoice: 'en-IN-amit',
    voices: [
      { id: 'en-IN-amit', name: 'Amit (Indian)' },
      { id: 'en-UK-charles', name: 'Charles (British)' },
      { id: 'en-AU-jack', name: 'Jack (Australian)' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=1200&q=80',
    actionLabel: 'Explaining Concepts...',
    systemInstruction: "You are a multi-dialect STEM tutor. Your goal is to make complex concepts accessible to students in diverse regions. Adapt your explanations to be clear and use regional context where appropriate. You can switch between Indian, British, or Australian English styles."
  },
  {
    id: 'industry',
    name: 'Documentation Partner',
    description: 'Hands-free technical repair support',
    icon: <Wrench size={20} />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    defaultVoice: 'en-US-marcus',
    voices: [
      { id: 'en-US-marcus', name: 'Marcus (Professional)' },
      { id: 'en-US-clint', name: 'Clint (Authoritative)' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1200&q=80',
    actionLabel: 'Analyzing Manuals...',
    systemInstruction: "You are a technical documentation partner for field engineers. Use precise industry-specific jargon and acronyms. Provide clear, step-by-step hands-free instructions for high-risk technical repairs. Be direct and efficient."
  },
  {
    id: 'gaming',
    name: 'Dynamic Narrator',
    description: 'Immersive real-time game storytelling',
    icon: <Gamepad2 size={20} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    defaultVoice: 'en-US-claire',
    voices: [
      { id: 'en-US-claire', name: 'Claire (Expressive)' },
      { id: 'en-US-marcus', name: 'Marcus (Dramatic)' },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    actionLabel: 'Narrating Story...',
    systemInstruction: "You are a dynamic AI narrator for an open-world game. Generate real-time responses to player actions. Adjust your mood (excited, angry, whispering, mysterious) based on the context. Keep the player immersed in the story."
  }
];

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeAssistant, setActiveAssistant] = useState<AssistantConfig>(ASSISTANTS[0]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your ${ASSISTANTS[0].name}. ${ASSISTANTS[0].description}. How can I assist you?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState(ASSISTANTS[0].defaultVoice);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionImage, setShowActionImage] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const switchAssistant = (assistant: AssistantConfig) => {
    setActiveAssistant(assistant);
    setSelectedVoice(assistant.defaultVoice);
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `Hello! I'm your ${assistant.name}. ${assistant.description}. How can I assist you?`,
      timestamp: new Date(),
    }]);
    setError(null);
    setShowActionImage(true);
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          systemInstruction: activeAssistant.systemInstruction,
        }
      });
      
      const assistantText = response.text;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);

      if (isVoiceEnabled) {
        generateVoice(assistantText, assistantMessage.id);
      }
    } catch (error: any) {
      console.error("Error generating response:", error);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }]);
    }
  };

  const generateVoice = async (text: string, messageId: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: selectedVoice }),
      });

      const data = await response.json();
      
      if (data.audioUrl) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, audioUrl: data.audioUrl } : m
        ));
        playAudio(data.audioUrl);
      } else if (data.error) {
        setError("Murf AI API Key might be missing. Voice synthesis skipped.");
      }
    } catch (error) {
      console.error("Error generating voice:", error);
    }
  };

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
    }
    audioRef.current = new Audio(url);
    setIsPlaying(true);
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.play().catch(e => {
      console.error("Audio play failed:", e);
      setIsPlaying(false);
    });
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => setIsRecording(false), 3000);
    } else {
      setIsRecording(false);
    }
  };

  return (
    <div className="flex h-screen bg-mesh font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-80 glass border-r border-white/20 flex flex-col z-30 shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <motion.div 
                    animate={{ 
                      rotate: 360,
                      boxShadow: ["0 0 0px rgba(0,0,0,0)", "0 0 20px rgba(99,102,241,0.4)", "0 0 0px rgba(0,0,0,0)"]
                    }}
                    transition={{ 
                      rotate: { repeat: Infinity, duration: 10, ease: "linear" },
                      boxShadow: { repeat: Infinity, duration: 3, ease: "easeInOut" }
                    }}
                    className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center text-white"
                  >
                    <Sparkles size={22} />
                  </motion.div>
                  <h1 className="font-display font-black text-3xl tracking-tighter text-gradient">MURF.AI</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mb-8 px-2">Select Assistant</p>
              <nav className="space-y-4">
                {ASSISTANTS.map((assistant) => (
                  <motion.button 
                    key={assistant.id}
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => switchAssistant(assistant)}
                    className={cn(
                      "w-full flex items-center gap-5 p-5 rounded-3xl transition-all group text-left border",
                      activeAssistant.id === assistant.id 
                        ? cn("bg-white/10 shadow-2xl border-white/20", assistant.color) 
                        : "hover:bg-white/[0.03] border-transparent text-white/40"
                    )}
                  >
                    <motion.div 
                      animate={activeAssistant.id === assistant.id ? { 
                        scale: [1, 1.15, 1],
                        rotate: [0, 5, -5, 0]
                      } : {}}
                      transition={{ repeat: Infinity, duration: 3 }}
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                        activeAssistant.id === assistant.id ? assistant.bgColor : "bg-white/5 group-hover:bg-white/10"
                      )}
                    >
                      {assistant.icon}
                    </motion.div>
                    <div>
                      <h3 className="font-display font-extrabold text-base tracking-tight">{assistant.name}</h3>
                      <p className="text-[11px] opacity-60 font-medium line-clamp-1 mt-0.5">{assistant.description}</p>
                    </div>
                    {activeAssistant.id === assistant.id && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-current"
                      />
                    )}
                  </motion.button>
                ))}
              </nav>
            </div>

            <div className="mt-auto p-8">
              <div className="glass bg-white/[0.02] rounded-[2.5rem] p-7 border border-white/5">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-5">Voice Engine</p>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/60">Auto-Play Voice</span>
                    <button 
                      onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                      className={cn(
                        "w-12 h-7 rounded-full transition-all relative",
                        isVoiceEnabled ? "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]" : "bg-white/10"
                      )}
                    >
                      <motion.div 
                        animate={{ left: isVoiceEnabled ? 24 : 4 }}
                        className="absolute top-1.5 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Selected Voice</label>
                    <div className="relative">
                      <select 
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer backdrop-blur-3xl text-white/80"
                      >
                        {activeAssistant.voices.map(v => (
                          <option key={v.id} value={v.id} className="bg-[#0a0a1a] text-white">{v.name}</option>
                        ))}
                      </select>
                      <ChevronRight size={14} className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-white/30 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <motion.main 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 flex flex-col relative bg-transparent"
      >
        {/* Header */}
        <header className="h-24 border-b border-white/20 flex items-center justify-between px-10 sticky top-0 z-10 glass">
          <div className="flex items-center gap-5">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-3 hover:bg-white/50 rounded-2xl transition-all shadow-sm border border-white/40">
                <Menu size={22} />
              </button>
            )}
            <div className="relative">
              <motion.div 
                key={activeAssistant.id}
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                  y: [0, -4, 0]
                }}
                transition={{
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
                }}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl",
                  activeAssistant.id === 'healthcare' ? "bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-200" :
                  activeAssistant.id === 'edtech' ? "bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-indigo-200" :
                  activeAssistant.id === 'industry' ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-200" :
                  "bg-gradient-to-br from-purple-400 to-purple-600 shadow-purple-200"
                )}
              >
                {activeAssistant.icon}
              </motion.div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-[#02010a] rounded-full shadow-sm" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl tracking-tight text-white">{activeAssistant.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em]">System Active • Neural Engine</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowActionImage(!showActionImage)}
              className="hidden sm:flex items-center gap-3 glass px-6 py-3 rounded-full border border-white/10 hover:bg-white/5 transition-all group"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <Sparkles size={16} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              </motion.div>
              <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">
                {showActionImage ? "Hide Visuals" : "Show Visuals"}
              </span>
            </button>
            <button 
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={cn(
                "p-4 rounded-2xl transition-all shadow-2xl border border-white/10",
                isVoiceEnabled ? "bg-white text-black" : "glass text-white/40"
              )}
            >
              {isVoiceEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-10 space-y-10 scroll-smooth"
        >
          {/* Action Image Card */}
          <AnimatePresence>
            {showActionImage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: [0, -10, 0] 
                }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{
                  opacity: { duration: 0.5 },
                  scale: { duration: 0.5 },
                  y: { repeat: Infinity, duration: 6, ease: "easeInOut" }
                }}
                className="max-w-4xl mx-auto mb-12"
              >
                <div className={cn(
                  "relative group overflow-hidden rounded-[3rem] shadow-2xl transition-all duration-700 border border-gray-100 bg-white",
                  isTyping ? "shadow-indigo-200 scale-[1.02]" : "shadow-gray-200"
                )}>
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <motion.img 
                      key={activeAssistant.imageUrl}
                      initial={{ scale: 1.1, filter: 'blur(10px)' }}
                      animate={{ 
                        scale: isTyping ? [1, 1.05, 1] : 1,
                        filter: 'blur(0px)' 
                      }}
                      transition={{
                        scale: isTyping ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.5 }
                      }}
                      src={activeAssistant.imageUrl} 
                      alt={activeAssistant.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className={cn(
                      "absolute inset-0 transition-opacity duration-700",
                      isTyping ? "bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100" : "bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100"
                    )} />
                    
                    <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
                      <div className="text-white">
                        <motion.div 
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className="flex items-center gap-3 mb-2"
                        >
                          <div className={cn("p-2 rounded-xl bg-white/20 backdrop-blur-md", activeAssistant.color)}>
                            {activeAssistant.icon}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                              {isTyping ? "Processing Request..." : isPlaying ? "Speaking..." : activeAssistant.actionLabel}
                            </span>
                            {(isTyping || isPlaying) && (
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="h-0.5 bg-white/50 mt-1 rounded-full"
                              />
                            )}
                          </div>
                        </motion.div>
                        <h3 className="font-display text-3xl font-black tracking-tighter">{activeAssistant.name}</h3>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {isPlaying && (
                          <div className="flex items-end gap-1 h-8 mb-2">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <motion.div
                                key={i}
                                animate={{ height: [8, 24, 12, 32, 8][i % 5] }}
                                transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                className="w-1 bg-white/60 rounded-full"
                              />
                            ))}
                          </div>
                        )}
                        <motion.div 
                          animate={{ 
                            y: [0, -10, 0],
                            rotate: (isTyping || isPlaying) ? [0, 180, 360] : 0,
                            scale: (isTyping || isPlaying) ? [1, 1.2, 1] : 1
                          }}
                          transition={{ 
                            y: { repeat: Infinity, duration: 2 },
                            rotate: (isTyping || isPlaying) ? { repeat: Infinity, duration: 4, ease: "linear" } : { duration: 0.5 },
                            scale: (isTyping || isPlaying) ? { repeat: Infinity, duration: 2 } : { duration: 0.5 }
                          }}
                          className={cn(
                            "w-16 h-16 backdrop-blur-xl rounded-full border flex items-center justify-center text-white transition-colors duration-500",
                            (isTyping || isPlaying) ? "bg-white/30 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "bg-white/10 border-white/20"
                          )}
                        >
                          <Sparkles size={24} />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-100 p-5 rounded-3xl flex items-center gap-4 text-amber-800 text-xs font-medium">
              <AlertCircle size={20} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 30, scale: 0.9, rotate: msg.role === 'user' ? 2 : -2 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
                className={cn(
                  "flex gap-6 max-w-4xl",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: msg.role === 'user' ? 10 : -10 }}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg transition-all border border-white/40",
                    msg.role === 'user' 
                      ? "glass text-indigo-600" 
                      : cn(activeAssistant.bgColor, activeAssistant.color)
                  )}
                >
                  {msg.role === 'user' ? <User size={22} /> : activeAssistant.icon}
                </motion.div>
                
                <div className={cn(
                  "flex flex-col gap-4",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  <motion.div 
                    layout
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      "px-10 py-8 rounded-[3rem] text-[17px] leading-[1.8] shadow-2xl font-medium transition-all hover:shadow-indigo-500/10 border",
                      msg.role === 'user' 
                        ? "glass text-white/90 rounded-tr-none border-white/10" 
                        : cn(activeAssistant.bgColor, activeAssistant.color, "rounded-tl-none border-current/20")
                    )}
                  >
                    {msg.content}
                  </motion.div>
                  
                  <div className="flex items-center gap-5 px-4">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.audioUrl && (
                      <button 
                        onClick={() => playAudio(msg.audioUrl!)}
                        className={cn("transition-all hover:scale-125 hover:rotate-12 p-2 glass rounded-full border-white/10", activeAssistant.color)}
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-6 max-w-4xl"
            >
              <motion.div 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", activeAssistant.bgColor, activeAssistant.color)}
              >
                {activeAssistant.icon}
              </motion.div>
              <div className={cn("px-8 py-5 rounded-[2rem] rounded-tl-none flex items-center gap-2", activeAssistant.bgColor)}>
                {[0, 1, 2].map((i) => (
                  <motion.div 
                    key={i}
                    animate={{ 
                      y: [0, -8, 0],
                      scale: [1, 1.2, 1],
                      opacity: [0.4, 1, 0.4] 
                    }} 
                    transition={{ 
                      repeat: Infinity, 
                      duration: 0.8, 
                      delay: i * 0.15,
                      ease: "easeInOut"
                    }} 
                    className={cn("w-2 h-2 rounded-full", activeAssistant.color, "bg-current")} 
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-12 bg-transparent">
          <div className="max-w-5xl mx-auto relative">
            <div className="flex items-center gap-6 glass border-white/10 rounded-[3.5rem] p-4 pl-12 focus-within:ring-[12px] focus-within:ring-indigo-500/5 focus-within:bg-white/[0.05] focus-within:border-indigo-500/30 transition-all shadow-2xl">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                placeholder={`Ask your ${activeAssistant.name.split(' ')[0]}...`}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 py-6 font-medium text-xl tracking-tight"
              />
              
              <div className="flex items-center gap-5 pr-3">
                <button 
                  onClick={toggleRecording}
                  className={cn(
                    "p-6 rounded-[2.5rem] transition-all relative overflow-hidden shadow-xl border border-white/5",
                    isRecording 
                      ? "bg-rose-500 text-white shadow-rose-500/40" 
                      : "text-white/30 hover:bg-white/10 hover:text-white hover:shadow-lg"
                  )}
                >
                  {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
                  {isRecording && (
                    <motion.div 
                      layoutId="recording-glow"
                      className="absolute inset-0 bg-white/20 animate-pulse"
                    />
                  )}
                </button>
                
                <motion.button 
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95, rotate: -5 }}
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isTyping}
                  className={cn(
                    "p-6 rounded-[2.5rem] shadow-2xl transition-all disabled:bg-white/5 disabled:text-white/10 disabled:shadow-none border border-white/10",
                    activeAssistant.id === 'healthcare' ? "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-500/40" :
                    activeAssistant.id === 'edtech' ? "bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-indigo-500/40" :
                    activeAssistant.id === 'industry' ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/40" :
                    "bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-purple-500/40"
                  )}
                >
                  <Send size={28} />
                </motion.button>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-12 mt-10">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
                <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.4em]">Gemini 3.0 Ultra</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
                <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.4em]">Murf Neural Engine</span>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Overlay when recording */}
        <AnimatePresence>
          {isRecording && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden"
            >
              <motion.div 
                animate={{ 
                  background: [
                    "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.8) 100%)",
                    "radial-gradient(circle at 40% 60%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
                    "radial-gradient(circle at 60% 40%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.8) 100%)"
                  ]
                }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="absolute inset-0 backdrop-blur-xl"
              />
              
              <div className="relative z-10">
                <motion.div 
                  animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={cn("absolute inset-0 rounded-full", activeAssistant.bgColor)}
                />
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className={cn("relative w-48 h-48 rounded-full flex items-center justify-center text-white shadow-2xl", 
                    activeAssistant.id === 'healthcare' ? "bg-rose-500 shadow-rose-200" :
                    activeAssistant.id === 'edtech' ? "bg-indigo-500 shadow-indigo-200" :
                    activeAssistant.id === 'industry' ? "bg-amber-500 shadow-amber-200" :
                    "bg-purple-500 shadow-purple-200"
                  )}
                >
                  <Mic size={80} />
                </motion.div>
              </div>
              <motion.h3 
                animate={{ opacity: [1, 0.5, 1], scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="mt-16 text-4xl font-black tracking-tight text-gray-900 z-10"
              >
                Listening...
              </motion.h3>
              <p className="mt-4 text-gray-400 font-bold uppercase tracking-widest text-xs z-10">Speak your query clearly</p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsRecording(false)}
                className="mt-16 px-12 py-5 bg-black text-white rounded-full font-black text-sm tracking-widest uppercase hover:bg-gray-900 transition-all shadow-xl z-10"
              >
                End Session
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
