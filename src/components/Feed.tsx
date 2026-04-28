import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import { Heart, X, Sparkles, Star, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface FeedProps {
  profiles: User[];
  onSwipe: (userId: string, direction: 'L' | 'R' | 'S') => void;
  likedProfiles?: string[];
  variant?: 'discovery' | 'sidebar';
  uiStyle?: 'holographic' | 'blackout' | 'red';
}

export default function Feed({ profiles, onSwipe, variant = 'discovery', uiStyle = 'holographic' }: FeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'L' | 'R' | 'S' | null>(null);
  const [showDetail, setShowDetail] = useState<User | null>(null);
  
  const isSidebar = variant === 'sidebar';
  const isHolographic = uiStyle === 'holographic';
  const isRed = uiStyle === 'red';
  const isBlackout = uiStyle === 'blackout';

  if (profiles.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center text-center p-12 transition-all duration-700", isSidebar ? "h-full" : "h-full")}>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
          className={cn(
            "border rounded-[3rem] flex items-center justify-center mb-12 transition-all duration-700", 
            isRed ? "bg-red-900/10 border-red-500/20" : "bg-cyber-pink/5 border-cyber-pink/20",
            isSidebar ? "w-20 h-20" : "w-32 h-32"
          )}
        >
          <Heart className={cn(isRed ? "text-red-500/40" : "text-cyber-pink/40", isSidebar ? "w-8 h-8" : "w-12 h-12")} />
        </motion.div>
        <h2 className={cn("font-display text-white mb-6 italic tracking-tighter uppercase font-black", isSidebar ? "text-xl" : "text-4xl")}>SEÑAL_NULL</h2>
        {!isSidebar && <p className="text-white/30 max-w-sm text-xs tracking-[0.4em] leading-loose uppercase font-black italic">Buscando nuevas frecuencias en la red...</p>}
      </div>
    );
  }

  const handleSwipeAction = (dir: 'L' | 'R' | 'S', profileId: string) => {
    setSwipeDirection(dir);
    // Execute swipe logic
    onSwipe(profileId, dir);
    
    // Smoothly transition to next
    setTimeout(() => {
      setSwipeDirection(null);
      setActiveIndex(prev => (prev + 1) % profiles.length);
    }, 300);
  };

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 80;
    if (info.offset.x > threshold) {
      handleSwipeAction('R', profiles[activeIndex].id);
    } else if (info.offset.x < -threshold) {
      handleSwipeAction('L', profiles[activeIndex].id);
    }
  };

  return (
    <div className={cn(
      "relative w-full h-full flex flex-col items-center justify-center overflow-hidden",
      isSidebar ? "perspective-[1500px]" : "perspective-[2000px]"
    )}>
      
      <div className={cn(
        "relative w-full flex items-center justify-center",
        isSidebar ? "h-full max-w-sm" : "max-w-5xl h-[600px]"
      )}>
        <AnimatePresence mode="popLayout" initial={false}>
          {profiles.map((profile, index) => {
            const isVisible = Math.abs(index - activeIndex) <= 2;
            if (!isVisible) return null;

            const offset = index - activeIndex;
            const absOffset = Math.abs(offset);

            // Responsive values for Cover Flow
            const xPos = isSidebar ? 0 : offset * (absOffset === 0 ? 0 : offset > 0 ? 250 : -250);
            const yPos = isSidebar ? offset * (absOffset === 0 ? 0 : offset > 0 ? 120 : -120) : 0;
            const rotationY = isSidebar ? 0 : offset * -35;
            const rotationX = isSidebar ? offset * -20 : 0;
            const scaleValue = isSidebar ? 1 - absOffset * 0.15 : 1 - absOffset * 0.2;
            const zValue = isSidebar ? -100 * absOffset : absOffset === 0 ? 150 : -150 * absOffset;
            const blurValue = absOffset === 0 ? 0 : 8 * absOffset;

            return (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, scale: 0.8, x: offset * 300 }}
                animate={{ 
                  opacity: 1 - absOffset * 0.4, 
                  scale: scaleValue, 
                  x: xPos,
                  y: yPos,
                  rotateY: rotationY,
                  rotateX: rotationX,
                  z: zValue,
                  filter: `blur(${blurValue}px)`,
                  zIndex: 20 - absOffset
                }}
                exit={{ 
                  scale: 0.5,
                  opacity: 0,
                  y: swipeDirection ? (swipeDirection === 'S' ? -500 : 0) : 0,
                  x: swipeDirection ? (swipeDirection === 'R' ? 1000 : swipeDirection === 'L' ? -1000 : 0) : 0,
                  rotate: swipeDirection ? (swipeDirection === 'R' ? 30 : -30) : 0,
                  transition: { duration: 0.5, ease: "anticipate" }
                }}
                drag={absOffset === 0 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                transition={{ type: "spring", damping: 30, stiffness: 150, mass: 1 }}
                className={cn(
                  "absolute cursor-grab active:cursor-grabbing",
                  isSidebar ? "w-[260px] h-[320px]" : "w-[400px] h-[550px]",
                  absOffset === 0 ? "pointer-events-auto" : "pointer-events-none"
                )}
                onClick={() => offset !== 0 ? setActiveIndex(index) : setShowDetail(profile)}
              >
                <div className={cn(
                  "w-full h-full overflow-hidden border relative transition-all duration-500",
                  isSidebar ? "rounded-[3rem]" : "rounded-[4rem]",
                  isRed 
                    ? "bg-red-950/40 border-red-500/20 shadow-[0_30px_100px_rgba(239,68,68,0.2)]"
                    : (isHolographic 
                      ? "bg-[#111]/40 border-white/20 shadow-[0_30px_100px_rgba(0,0,0,0.5)]" 
                      : "bg-black/80 border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)]"),
                  absOffset === 0 
                    ? (isRed ? "border-red-500/40 bg-red-950/40" : (isHolographic ? "border-cyber-cyan/40 bg-white/10" : "border-cyber-cyan/30 bg-black/80")) 
                    : "border-transparent opacity-20"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 z-10" />
                  
                  <img 
                    src={profile.photos[0]} 
                    className={cn(
                      "w-full h-full object-cover transition-all duration-1000",
                      absOffset === 0 ? "grayscale-0 brightness-90" : "grayscale brightness-50"
                    )} 
                  />

                  <div className={cn("absolute inset-0 z-20 flex flex-col justify-end", isSidebar ? "p-6" : "p-10")}>
                    <div className={cn("space-y-4", absOffset === 0 && "translate-y-0", absOffset !== 0 && "translate-y-4")}>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-cyber-pink/20 border border-cyber-pink/30 rounded-full text-[8px] font-black uppercase tracking-[0.2em] text-cyber-pink">
                          {profile.zodiacSign || 'SECTOR_A'}
                        </div>
                      </div>

                      <div>
                        <h3 className={cn("font-display font-black text-white italic tracking-tighter leading-none mb-1 drop-shadow-2xl", isSidebar ? "text-2xl" : "text-4xl")}>
                          {profile.displayName}
                        </h3>
                        {absOffset === 0 && (
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse" />
                             <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.4em] italic">SYNC: {90 + Math.floor(Math.random() * 10)}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {absOffset === 0 && swipeDirection && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1.2 }}
                      className={cn(
                        "absolute inset-0 z-50 flex items-center justify-center bg-black/20",
                        swipeDirection === 'R' ? "text-cyber-pink" : swipeDirection === 'L' ? "text-red-500" : "text-cyber-cyan"
                      )}
                    >
                      {swipeDirection === 'R' && <Heart className={cn("fill-current animate-ping", isSidebar ? "w-16 h-16" : "w-32 h-32")} />}
                      {swipeDirection === 'L' && <X className={cn("animate-pulse", isSidebar ? "w-16 h-16" : "w-32 h-32")} />}
                      {swipeDirection === 'S' && <Sparkles className={cn("animate-pulse", isSidebar ? "w-16 h-16" : "w-32 h-32")} />}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!isSidebar && (
        <>
          <div className="mt-16 relative z-30 flex items-center gap-12 scale-110">
              <button 
                onClick={() => profiles[activeIndex] && handleSwipeAction('L', profiles[activeIndex].id)}
                className="w-16 h-16 rounded-[2rem] border border-white/10 bg-white/20 flex items-center justify-center text-white/40 hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all shadow-xl"
              >
                <X className="w-7 h-7" />
              </button>
              
              <div className="flex flex-col items-center gap-4">
                 <button 
                  onClick={() => profiles[activeIndex] && handleSwipeAction('S', profiles[activeIndex].id)}
                  className="w-24 h-24 rounded-[3.2rem] border-2 border-cyber-cyan bg-cyber-cyan/10 flex items-center justify-center text-cyber-cyan hover:bg-cyber-cyan hover:text-black transition-all shadow-[0_0_30px_rgba(0,255,255,0.2)] group"
                 >
                   <Star className="w-10 h-10 group-hover:rotate-90 transition-transform duration-500" />
                 </button>
              </div>

              <button 
                onClick={() => profiles[activeIndex] && handleSwipeAction('R', profiles[activeIndex].id)}
                className="w-16 h-16 rounded-[2rem] border border-cyber-pink bg-cyber-pink/20 flex items-center justify-center text-cyber-pink hover:bg-cyber-pink hover:text-white transition-all shadow-[0_0_30px_rgba(255,0,255,0.3)] shadow-xl"
              >
                <Heart className="w-7 h-7" />
              </button>
          </div>

          <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-40 hidden lg:flex">
             <button 
              onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
              className="p-8 text-white/10 hover:text-white/40 transition-colors pointer-events-auto"
             >
               <ChevronLeft className="w-16 h-16" />
             </button>
             <button 
              onClick={() => setActiveIndex(prev => Math.min(profiles.length - 1, prev + 1))}
              className="p-8 text-white/10 hover:text-white/40 transition-colors pointer-events-auto"
             >
               <ChevronRight className="w-16 h-16" />
             </button>
          </div>
        </>
      )}

      <DetailModal 
        showDetail={showDetail} 
        setShowDetail={setShowDetail} 
        handleSwipeAction={handleSwipeAction} 
        isRed={isRed}
      />
    </div>
  );
}

{/* Move Modal Outside Perspective Container */}
function DetailModal({ showDetail, setShowDetail, handleSwipeAction, isRed }: any) {
  if (!showDetail) return null;
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/60"
        onClick={() => setShowDetail(null)}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-4xl bg-black/80 border border-white/20 rounded-[4rem] overflow-hidden flex flex-col md:flex-row shadow-[0_50px_100px_rgba(0,0,0,1)]"
          onClick={e => e.stopPropagation()}
        >
           <div className="w-full md:w-[40%] relative min-h-[300px]">
              <img src={showDetail.photos[0]} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <button 
                onClick={() => setShowDetail(null)}
                className="absolute top-8 left-8 p-3 rounded-full bg-black/40 text-white/60 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
           </div>
           
           <div className="flex-1 p-12 md:p-16 flex flex-col">
              <div className="mb-10">
                 <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-5 h-5 text-cyber-cyan animate-pulse" />
                    <span className="text-[10px] font-black text-cyber-cyan uppercase tracking-[0.6em] italic">SEÑAL_ENCONTRADA</span>
                 </div>
                 <h2 className="text-6xl font-display font-black text-white italic tracking-tighter mb-2">{showDetail.displayName}</h2>
                 <div className="flex gap-4">
                    <span className="text-white/40 text-[11px] font-black uppercase tracking-widest italic">{showDetail.zodiacSign}</span>
                    <span className={cn(
                      "text-[11px] font-black uppercase tracking-widest italic border-l border-white/10 pl-4",
                      isRed ? "text-red-500" : "text-cyber-pink"
                    )}>{90 + Math.floor(Math.random() * 10)}% SYNC</span>
                 </div>
              </div>

              <div className="flex-1 space-y-8">
                 <div className="space-y-3">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] italic">Manifiesto Digital</p>
                    <p className="text-white/60 text-lg font-medium italic leading-relaxed">{showDetail.bio}</p>
                 </div>

                 <div className="space-y-3">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] italic">Canales Sincronizados</p>
                    <div className="flex flex-wrap gap-2">
                       {showDetail.interestTags?.map((tag: string) => (
                          <span key={tag} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white/40 uppercase tracking-widest italic">
                             {tag}
                          </span>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="pt-10 flex gap-4">
                 <button 
                   onClick={() => { handleSwipeAction('R', showDetail.id); setShowDetail(null); }}
                   className={cn(
                     "flex-1 py-6 text-white rounded-3xl font-black uppercase tracking-[0.3em] italic hover:scale-[1.02] transition-all",
                     isRed ? "bg-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.3)] shadow-red-900" : "bg-cyber-pink shadow-[0_10px_30px_rgba(255,0,255,0.2)]"
                   )}
                 >
                    ENLAZAR
                 </button>
                 <button 
                   onClick={() => { handleSwipeAction('L', showDetail.id); setShowDetail(null); }}
                   className="p-6 border border-white/10 rounded-3xl text-white/20 hover:text-red-500 hover:border-red-500/30 transition-all"
                 >
                    <X className="w-6 h-6" />
                 </button>
              </div>
           </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
