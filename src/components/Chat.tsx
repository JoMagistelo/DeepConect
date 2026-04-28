import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Send, Check, CheckCheck, ChevronLeft, Moon, Heart } from 'lucide-react';
import { Message, Match } from '../types';
import { cn } from '../lib/utils';

interface ChatProps {
  match: Match;
  onBack: () => void;
  uiStyle?: 'holographic' | 'blackout' | 'red';
}

export default function Chat({ match, onBack, uiStyle = 'holographic' }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRed = uiStyle === 'red';

  useEffect(() => {
    const q = query(
      collection(db, 'matches', match.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      
      snapshot.docs.forEach(async (d) => {
        const data = d.data();
        if (data.senderId !== auth.currentUser?.uid && !data.read) {
          await updateDoc(d.ref, { read: true });
        }
      });
    });

    return unsubscribe;
  }, [match.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !auth.currentUser) return;
    const content = input;
    setInput('');
    
    try {
      await addDoc(collection(db, 'matches', match.id, 'messages'), {
        content,
        senderId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        read: false
      });
  
      await updateDoc(doc(db, 'matches', match.id), {
        lastMessage: content,
        lastMessageAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `matches/${match.id}/messages`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
      <div className="noise-overlay opacity-[0.01]" />
      
      {/* Header */}
      <div className={cn(
        "p-6 border-b border-white/5 flex items-center justify-between z-20 shadow-2xl transition-colors duration-700",
        isRed ? "bg-red-950/60" : "bg-black/40"
      )}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="md:hidden p-2 text-white/40 hover:text-cyber-cyan transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="w-14 h-14 rounded-2xl border border-white/10 overflow-hidden shadow-[0_5px_20px_rgba(0,0,0,0.5)] p-0.5">
            <img src={match.otherUser?.photos[0]} className="w-full h-full object-cover rounded-[0.8rem]" />
          </div>
          <div>
            <h3 className="text-xl font-display text-white font-black tracking-tight italic uppercase">{match.otherUser?.displayName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
               <div className={cn(
                 "w-2 h-2 rounded-full animate-pulse shadow-lg",
                 isRed ? "bg-red-500 shadow-red-500/60" : "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"
               )} />
               <div className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-black italic">
                 {match.lastMessageAt ? `ACTIVO: ${new Date((match.lastMessageAt as any).toMillis?.() || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'SINC_ESTABLECIDA'}
               </div>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3 px-5 py-2 bg-white/5 border border-white/10 rounded-full">
           <Heart className={cn(
             "w-3.5 h-3.5 shadow-lg",
             isRed ? "text-red-500 shadow-red-500/60" : "text-cyber-pink shadow-[0_0_10px_rgba(255,0,255,0.4)]"
           )} />
           <span className="text-[8px] uppercase font-black tracking-[0.5em] text-white/40 italic">VÍNCULO_ESTABLE</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 z-10 scrollbar-hide">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === auth.currentUser?.uid;
          
          return (
            <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
              <div className={cn(
                "px-7 py-4 rounded-[1.8rem] text-sm leading-relaxed shadow-xl transition-all duration-300 relative group",
                isMe 
                  ? "bg-gradient-to-br from-cyber-cyan to-blue-500 text-black font-black italic rounded-tr-none shadow-[0_10px_30px_rgba(0,255,255,0.15)]" 
                  : "bg-white/[0.04] border border-white/5 text-white/80 rounded-tl-none font-medium"
              )}>
                {msg.content}
                <div className={cn(
                  "absolute -bottom-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",
                  isMe ? "right-0" : "left-0"
                )}>
                   <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic font-mono">
                      {msg.createdAt && new Date((msg.createdAt as any).toMillis?.() || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 px-1">
                {!isMe && <span className="text-[8px] font-black text-white/10 uppercase tracking-widest italic">{match.otherUser?.displayName}</span>}
                {isMe && (
                  msg.read ? <CheckCheck className="w-3.5 h-3.5 text-cyber-cyan" /> : <Check className="w-3.5 h-3.5 text-white/20" />
                )}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className={cn(
        "p-8 pb-10 z-20 border-t border-white/5 transition-colors duration-700",
        isRed ? "bg-red-950/60" : "bg-black/60"
      )}>
        <div className="max-w-4xl mx-auto flex items-center gap-5 bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-3 focus-within:border-cyber-cyan/30 transition-all shadow-2xl relative">
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="TRASMITIR SEÑAL..."
            className="flex-1 bg-transparent border-none outline-none text-sm px-8 py-4 placeholder:text-white/10 text-white font-black italic uppercase tracking-widest"
          />
          <button 
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-14 h-14 bg-cyber-pink text-white rounded-[1.2rem] hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,0,255,0.3)] disabled:opacity-5 disabled:grayscale flex items-center justify-center shrink-0"
          >
            <Send className="w-6 h-6 -rotate-12 translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
