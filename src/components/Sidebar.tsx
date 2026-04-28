import { useState } from 'react';
import { Match, User } from '../types';
import { MessageSquare, Settings, LayoutGrid, Star, Moon, LogOut, Heart, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { motion } from 'motion/react';

interface SidebarProps {
  user: User | null;
  matches: Match[];
  activeMatchId: string | null;
  onSelectMatch: (id: string) => void;
  onOpenDiscovery: () => void;
  currentTab: 'discovery' | 'chat' | 'profile';
  uiStyle?: 'holographic' | 'blackout' | 'red';
}

export default function Sidebar({ user, matches, activeMatchId, onSelectMatch, onOpenDiscovery, currentTab, uiStyle = 'holographic' }: SidebarProps) {
  const [search, setSearch] = useState('');
  const handleLogout = () => signOut(auth);
  
  const isRed = uiStyle === 'red';
  const isBlackout = uiStyle === 'blackout';

  const filteredMatches = matches.filter(m => 
    m.otherUser?.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const favoriteMatches = filteredMatches.filter(m => m.isSoulMatch);
  const otherMatches = filteredMatches.filter(m => !m.isSoulMatch);

  return (
    <div className={cn(
      "w-full md:w-80 h-full flex flex-col relative overflow-hidden shadow-2xl font-sans transition-colors duration-700",
      isRed ? "bg-red-950/60 border-r border-red-500/10" : "bg-black/60 border-r border-white/10"
    )}>
      <div className={cn(
        "absolute top-0 right-0 w-64 h-64 blur-[100px] pointer-events-none",
        isRed ? "bg-red-600/5" : "bg-cyber-pink/5"
      )} />
      <div className={cn(
        "absolute bottom-0 left-0 w-64 h-64 blur-[100px] pointer-events-none",
        isRed ? "bg-red-900/5" : "bg-cyber-cyan/5"
      )} />
      
      {/* Header */}
      <div className="p-8 pb-4 relative z-10">
        <div className="flex flex-col items-center mb-12">
           <motion.div
             animate={{ scale: [1, 1.1, 1] }}
             transition={{ duration: 4, repeat: Infinity }}
             className="mb-4"
           >
             <Heart className={cn(
               "w-12 h-12 drop-shadow-lg",
               isRed ? "text-red-500 shadow-red-500/60" : "text-cyber-pink drop-shadow-[0_0_15px_rgba(255,0,255,0.6)]"
             )} />
           </motion.div>
           <h1 className="text-3xl font-display font-black leading-none italic tracking-tighter text-white">
              DEEP<span className="text-holographic">CONECT</span>
           </h1>
           <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em] mt-2 italic">OS Ver: 2.1.0</p>
        </div>

        <nav className="mb-10">
          <ul className="grid grid-cols-3 gap-3">
            {[
              { id: 'discovery', icon: LayoutGrid, label: 'EXPLORA', action: onOpenDiscovery, color: 'cyber-cyan' },
              { id: 'chat', icon: MessageSquare, label: 'SEÑALES', action: () => onSelectMatch(''), color: 'cyber-pink' },
              { id: 'profile', icon: UserIcon, label: 'AJUSTES', action: () => onSelectMatch('profile-view'), color: 'white' }
            ].map(tab => (
              <li 
                key={tab.id}
                onClick={tab.action}
                className={cn(
                  "py-4 rounded-3xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 border group relative overflow-hidden",
                  currentTab === tab.id 
                    ? `bg-white/10 border-white/20 text-${tab.color} shadow-[0_10px_25px_rgba(0,0,0,0.4)]` 
                    : "bg-white/5 border-transparent text-white/20 hover:bg-white/10 hover:text-white/40"
                )}
              >
                {currentTab === tab.id && (
                  <motion.div 
                    layoutId="tab-highlight"
                    className={cn("absolute inset-x-0 bottom-0 h-1 bg-cyber-cyan shadow-[0_0_10px_rgba(0,255,255,0.8)]")}
                  />
                )}
                <tab.icon className={cn("w-5 h-5", currentTab === tab.id && "animate-pulse")} />
                <span className="text-[8px] uppercase tracking-[0.3em] font-black italic">{tab.label}</span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="relative">
            <input 
              type="text"
              placeholder="RASTREAR SEÑAL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input w-full py-4 text-[11px] placeholder:text-white/10 font-black italic border-white/5 bg-white/5"
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10 p-6 pt-2">
          <div className="space-y-8">
             {/* Soul Matches - Favorites */}
             {favoriteMatches.length > 0 && (
               <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-cyber-cyan font-black italic">CHATS FAVORITOS</p>
                    <Star className="w-3 h-3 text-cyber-cyan animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    {favoriteMatches.map(match => (
                      <MatchCard 
                        key={match.id} 
                        match={match} 
                        isActive={activeMatchId === match.id} 
                        onClick={() => onSelectMatch(match.id)} 
                        isFavorite
                      />
                    ))}
                  </div>
               </div>
             )}
             
             {/* All Matches */}
             <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-black italic">TRANSMISIONES ACTIVAS</p>
                   <MessageSquare className="w-3 h-3 text-white/10" />
                </div>
                <div className="space-y-3">
                  {otherMatches.map(match => (
                    <MatchCard 
                      key={match.id} 
                      match={match} 
                      isActive={activeMatchId === match.id} 
                      onClick={() => onSelectMatch(match.id)} 
                    />
                  ))}
                  
                  {filteredMatches.length === 0 && (
                    <div className="py-20 text-center space-y-4 opacity-30">
                       <Moon className="w-8 h-8 text-white/10 mx-auto" />
                       <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black italic">Frecuencia Silenciosa</p>
                    </div>
                  )}
                </div>
             </div>
          </div>
      </div>

      <div className="p-8 relative z-10 border-t border-white/10 bg-black/40">
         <div className="flex items-center gap-5">
            <div className="relative group cursor-pointer" onClick={() => onSelectMatch('profile-view')}>
               <div className={cn(
                 "w-12 h-12 rounded-[1.5rem] border-2 p-1 transition-all duration-500",
                 currentTab === 'profile' ? "border-cyber-cyan shadow-[0_0_15px_rgba(0,255,255,0.4)]" : "border-white/10 group-hover:border-white/30"
               )}>
                  <div className="w-full h-full rounded-[1rem] bg-white/5 flex items-center justify-center text-lg font-black text-white italic">
                     {user?.displayName?.substring(0, 1).toUpperCase()}
                  </div>
               </div>
               <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyber-pink shadow-[0_0_10px_rgba(255,0,255,0.5)] rounded-full flex items-center justify-center">
                  <Star className="w-2.5 h-2.5 text-white" />
               </div>
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-black text-white truncate italic uppercase tracking-tighter">{user?.displayName}</p>
               <button 
                 onClick={handleLogout}
                 className="text-[9px] text-white/20 hover:text-red-500 uppercase font-black tracking-[0.3em] italic transition-colors mt-1"
               >
                 Desconectar
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

function MatchCard({ 
  match, 
  isActive, 
  onClick, 
  isFavorite = false 
}: { 
  key?: string;
  match: Match;
  isActive: boolean;
  onClick: () => void;
  isFavorite?: boolean;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-[2.5rem] border flex items-center gap-4 transition-all relative overflow-hidden group",
        isActive 
          ? "bg-white/10 border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.5)]" 
          : "bg-white/[0.04] border-white/5 hover:border-white/10 hover:bg-white/5"
      )}
    >
      {isActive && (
        <motion.div 
          layoutId="sidebar-active"
          className={cn("absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyber-cyan shadow-[0_0_15px_rgba(0,255,255,0.8)] rounded-r-full")}
        />
      )}
      
      <div className="relative flex-shrink-0">
         <div className={cn(
           "w-12 h-12 rounded-[1.6rem] overflow-hidden border p-0.5 group-hover:rotate-6 transition-transform duration-500",
           isActive ? "border-cyber-cyan/50" : (isFavorite ? "border-cyber-cyan/30" : "border-white/10")
         )}>
            <img src={match.otherUser?.photos[0]} className="w-full h-full object-cover rounded-[1.2rem]" />
         </div>
         <div className={cn(
           "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-4 border-black",
           isFavorite ? "bg-cyber-cyan shadow-[0_0_10px_rgba(0,255,255,0.5)]" : "bg-green-500"
         )} />
      </div>

      <div className="flex-1 min-w-0 text-left">
         <div className="flex justify-between items-center gap-2 mb-0.5">
            <p className={cn(
              "text-sm font-black truncate tracking-tighter italic uppercase",
              isActive ? "text-white" : "text-white/80"
            )}>{match.otherUser?.displayName}</p>
            <span className="text-[8px] font-black text-white/20 italic">
               {match.lastMessageAt ? new Date((match.lastMessageAt as any).toMillis?.() || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </span>
         </div>
         <p className={cn(
           "text-[10px] truncate tracking-wide font-medium italic",
           isActive ? (isFavorite ? "text-cyber-cyan" : "text-cyber-pink") : "text-white/20"
         )}>{match.lastMessage || (isFavorite ? 'SINCRO_TOTAL' : 'ENLACE_ESTABLE')}</p>
      </div>
    </button>
  );
}
