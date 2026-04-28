import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';
import { onAuthStateChanged, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs, limit, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User, Match } from './types';
import Onboarding from './components/Onboarding';
import Feed from './components/Feed';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import Profile from './components/Profile';
import { Sparkles, Moon, Star, LogIn, Heart, MessageSquare } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [view, setView] = useState<'discovery' | 'chat' | 'profile'>('discovery');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [showMatchModal, setShowMatchModal] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [feedProfiles, setFeedProfiles] = useState<User[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showGoogleAlert, setShowGoogleAlert] = useState(false);

  // Auth & User Listener
  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Setup real-time listener for user document
        userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data() as User;
            setCurrentUser({ id: user.uid, ...userData });
            setNeedsOnboarding(!userData.onboardingCompleted);
          } else {
            setCurrentUser({ id: user.uid, displayName: user.displayName || 'Frequency' } as User);
            setNeedsOnboarding(true);
          }
          setShowDashboard(true);
          setAuthLoading(false);
          setIsTransitioning(false);
        });
      } else {
        setCurrentUser(null);
        setShowDashboard(false);
        if (userUnsubscribe) userUnsubscribe();
        setAuthLoading(false);
        setIsTransitioning(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, []);

  const handleEmailAuth = async () => {
    const email = (document.getElementById('email-input') as HTMLInputElement)?.value;
    const pass = (document.getElementById('pass-input') as HTMLInputElement)?.value;
    
    if (!email || !pass) {
      alert("Introduce tus credenciales de acceso.");
      return;
    }

    try {
      setIsTransitioning(true);
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        await createUserWithEmailAndPassword(auth, email, pass);
      }
      setShowGoogleAlert(true);
    } catch (err: any) {
      setIsTransitioning(false);
      alert(err.message);
    }
  };

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setIsTransitioning(true);
      await signInWithPopup(auth, provider);
      setShowGoogleAlert(true);
    } catch (err: any) {
      setIsTransitioning(false);
      console.error(err);
    }
  };

  const handleLoginStatus = () => {
    setAuthMode('login');
    setShowAuth(true);
  };

  const handleSignupStatus = () => {
    setAuthMode('signup');
    setShowAuth(true);
  };

  // Fetch Matches
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'matches'),
      where('userIds', 'array-contains', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const matchDataPromises = snapshot.docs.map(async (d) => {
        const data = d.data() as Match;
        const otherUserId = data.userIds.find(id => id !== currentUser.id);
        if (!otherUserId) return null;

        const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
        if (!otherUserDoc.exists()) return null;

        return { 
          id: d.id, 
          ...data, 
          otherUser: { id: otherUserDoc.id, ...otherUserDoc.data() } as User 
        };
      });

      const resolvedMatches = (await Promise.all(matchDataPromises)).filter(m => m !== null) as Match[];
      
      setMatches(resolvedMatches.sort((a, b) => {
        const timeA = a.lastMessageAt ? (a.lastMessageAt as any).toMillis?.() || 0 : 0;
        const timeB = b.lastMessageAt ? (b.lastMessageAt as any).toMillis?.() || 0 : 0;
        return timeB - timeA;
      }));
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Feed
  useEffect(() => {
    if (!currentUser || view !== 'discovery') return;

    const fetchFeed = async () => {
      const q = query(
        collection(db, 'users'),
        where('onboardingCompleted', '==', true),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const profiles = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(p => p.id !== currentUser.id);
      
      setFeedProfiles(profiles);
    };

    fetchFeed();
  }, [currentUser, view]);

  // Swipe Logic
  const handleSwipe = async (targetUserId: string, direction: 'L' | 'R' | 'S') => {
    if (!currentUser) return;

    // Remove from feed locally immediately
    setFeedProfiles(prev => prev.filter(p => p.id !== targetUserId));

    if (direction === 'R' || direction === 'S') {
      try {
        // 1. Record the swipe (as per firestore.rules)
        const swipeId = `${currentUser.id}_${targetUserId}`;
        try {
          await setDoc(doc(db, 'swipes', swipeId), {
            swiperId: currentUser.id,
            swipedId: targetUserId,
            direction: direction,
            matchScore: 0.98, // Required by rules
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `swipes/${swipeId}`);
        }

        // 2. Check if it's a mutual match
        const reverseSwipeId = `${targetUserId}_${currentUser.id}`;
        const reverseSwipeDoc = await getDoc(doc(db, 'swipes', reverseSwipeId));

        if (reverseSwipeDoc.exists() && (reverseSwipeDoc.data().direction === 'R' || reverseSwipeDoc.data().direction === 'S')) {
          // It's a match!
          const matchId = [currentUser.id, targetUserId].sort().join('_');
          const isSoulMatch = direction === 'S' || reverseSwipeDoc.data().direction === 'S';
          
          await setDoc(doc(db, 'matches', matchId), {
            userIds: [currentUser.id, targetUserId],
            isSoulMatch: isSoulMatch,
            createdAt: serverTimestamp(),
            lastMessageAt: serverTimestamp()
          });
          
          // Trigger Match Modal
          const otherUserDoc = await getDoc(doc(db, 'users', targetUserId));
          if (otherUserDoc.exists()) {
             setShowMatchModal({
                id: matchId,
                userIds: [currentUser.id, targetUserId],
                createdAt: serverTimestamp(),
                lastMessageAt: serverTimestamp(),
                otherUser: { id: otherUserDoc.id, ...otherUserDoc.data() } as User
             });
          }
        }
      } catch (err) {
        console.error("Error persisting swipe:", err);
      }
    }
  };

  // Loading / Transition Screen
  if (authLoading || isTransitioning) {
    const currentStyle = currentUser?.uiStyle || 'holographic';
    return (
      <div className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-8 overflow-hidden font-sans transition-colors duration-1000",
        currentStyle === 'red' ? "bg-[#0a0000]" : "bg-black"
      )}>
        <div className="absolute inset-0 z-0">
          <img 
            src="/fondo config.png" 
            className={cn(
              "w-full h-full object-cover opacity-20 scale-105",
              currentStyle === 'red' && "sepia-[0.8] hue-rotate-[280deg]"
            )}
            alt="Loading Background"
          />
          <div className={cn(
            "absolute inset-0",
            currentStyle === 'red' ? "bg-red-950/40" : "bg-black/80"
          )} />
        </div>
        
        <div className="noise-overlay opacity-5" />
        <div className="scanline opacity-10" />

        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            <div className="w-40 h-40 relative flex items-center justify-center">
               <motion.div 
                 animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                 transition={{ rotate: { duration: 10, repeat: Infinity, ease: "linear" }, scale: { duration: 3, repeat: Infinity } }}
                 className="absolute inset-0 border border-white/5 rounded-[4rem]"
               />
               <motion.div 
                 animate={{ rotate: -360 }}
                 transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                 className={cn(
                   "absolute inset-6 border rounded-[3rem]",
                   currentStyle === 'red' 
                    ? "border-red-600/10 border-t-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.1)]" 
                    : "border-cyber-cyan/10 border-t-cyber-cyan/40 shadow-[0_0_30px_rgba(0,255,255,0.1)]"
                 )}
               />
               <div className="relative">
                  <Heart className={cn(
                    "w-12 h-12 animate-pulse",
                    currentStyle === 'red' ? "text-red-500/20" : "text-cyber-pink/20"
                  )} />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      "absolute inset-0 blur-xl rounded-full",
                      currentStyle === 'red' ? "bg-red-600" : "bg-cyber-pink"
                    )}
                  />
               </div>
            </div>
          </motion.div>
          
          <div className="mt-16 text-center space-y-4">
            <h1 className="text-4xl font-display font-black italic tracking-tighter text-white/90">
              {isTransitioning ? 'SINCRONIZANDO VÍNCULO' : 'DEEPCONECT OS'}
            </h1>
            <div className="flex flex-col items-center gap-2">
               <p className={cn(
                 "text-[11px] font-black uppercase tracking-[0.8em] opacity-40 italic",
                 currentStyle === 'red' ? "text-red-500" : "text-cyber-cyan"
               )}>
                  {isTransitioning ? 'Conectando nodos neuronales...' : 'Ajustando frecuencia astral...'}
               </p>
               <div className="w-48 h-[1px] bg-white/5 mt-6 relative overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                      "w-full h-full bg-gradient-to-r from-transparent via-transparent to-transparent shadow-[0_0_10px_rgba(255,255,255,0.5)]",
                      currentStyle === 'red' ? "via-red-500" : "via-cyber-cyan"
                    )}
                  />
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Consolidated Auth View (Landing + Login)
  if (!currentUser) {
    return (
      <div className="h-screen bg-black relative overflow-hidden flex flex-col font-sans">
        {/* Main Background Image - Only for Login */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/fondo config.png" 
            className="w-full h-full object-cover"
            alt="Login Background"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
        </div>

        <div className="noise-overlay opacity-5" />
        <div className="scanline opacity-10" />
        
        <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-around gap-12 p-8 lg:px-24 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 space-y-4 text-center lg:text-left max-w-lg z-20"
          >
            <div className="inline-block py-1.5 px-5 rounded-full bg-cyber-pink/20 border border-cyber-pink/30 text-cyber-pink text-[9px] font-black uppercase tracking-[0.4em] drop-shadow-lg mb-2">
               SISTEMA DE CONEXIÓN ACTIVO
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-black leading-[0.8] italic drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
               Deep<span className="text-holographic">Conect</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/90 font-bold leading-tight max-w-sm mx-auto lg:mx-0 drop-shadow-2xl">
               Conecta con personas <span className="text-cyber-cyan italic">profundamente</span>. Donde los <span className="text-cyber-pink">vínculos</span> digitales se transforman en realidad.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="w-full max-w-md bg-black/40 border border-white/20 p-8 lg:p-10 rounded-[3rem] shadow-[0_45px_100px_rgba(0,0,0,0.7)]"
          >
            <div className="space-y-6">
               <div className="space-y-1 text-center">
                 <h2 className="text-4xl font-display font-black text-white uppercase italic tracking-tighter drop-shadow-lg">{authMode === 'login' ? 'Entrar' : 'Unirse'}</h2>
                 <p className="text-[10px] text-white/50 uppercase tracking-[0.3em] font-black">Escanea tu Identidad Digital</p>
               </div>
               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-cyber-cyan font-black uppercase tracking-[0.2em] ml-2">Correo Electrónico</label>
                    <input id="email-input" type="email" placeholder="tu@ejemplo.com" className="glass-input text-base py-4 px-6 bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-cyber-cyan font-black uppercase tracking-[0.2em] ml-2">Contraseña</label>
                    <input id="pass-input" type="password" placeholder="********" className="glass-input text-base py-4 px-6 bg-white/5 border-white/10" />
                  </div>
               </div>
 
               <button 
                onClick={handleEmailAuth}
                className="w-full cyber-button bg-gradient-to-r from-cyber-cyan to-cyber-pink border-none text-black font-black uppercase text-sm tracking-[0.2em] py-5 shadow-[0_10px_30px_rgba(0,255,255,0.2)]"
               >
                  <span className="flex items-center justify-center gap-3">
                    {authMode === 'login' ? 'EJECUTAR ACCESO' : 'CREAR PERFIL'}
                    <LogIn className="w-5 h-5" />
                  </span>
               </button>
 
               <div className="relative py-2">
                 <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                 <span className="relative flex justify-center text-[9px] uppercase tracking-[0.4em] bg-black/60 px-4 text-white/40 font-black">O CONECTA CON</span>
               </div>
 
               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleGoogleAuth}
                    className="py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all group shadow-lg"
                  >
                    <div className="w-2 h-2 rounded-full bg-cyber-cyan group-hover:animate-ping" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-white">Google</span>
                  </button>
                  <button 
                    onClick={() => {
                      signInAnonymously(auth).catch(err => {
                        if (err.code === 'auth/admin-restricted-operation') {
                          alert("El inicio de sesión anónimo está desactivado.");
                        } else {
                          console.error(err);
                        }
                      });
                    }} 
                    className="py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-white/40 shadow-lg group"
                  >
                    <span className="text-[10px] uppercase tracking-widest font-black">Invitado</span>
                  </button>
               </div>

               <div className="text-center pt-1">
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="text-[9px] uppercase tracking-widest text-white/60 hover:text-cyber-cyan transition-colors font-bold"
                  >
                    {authMode === 'login' ? '¿Eres nuevo? Regístrate aquí →' : '¿Ya tienes cuenta? Entra aquí →'}
                  </button>
               </div>
            </div>
          </motion.div>
        </main>

        <footer className="p-8 text-center border-t border-white/5 relative z-10">
           <p className="text-[9px] text-white/20 uppercase tracking-[0.5em] italic font-bold">DeepConect Network © 2026</p>
        </footer>
      </div>
    );
  }

  if (needsOnboarding && showDashboard) {
    return <Onboarding onComplete={() => setNeedsOnboarding(false)} />;
  }

  const activeMatch = matches.find(m => m.id === activeMatchId);
  const currentStyle = currentUser?.uiStyle || 'holographic';

  return (
    <div className={cn(
      "min-h-screen h-screen text-white flex overflow-hidden font-sans relative transition-colors duration-1000",
      currentStyle === 'blackout' ? "bg-black" : 
      currentStyle === 'red' ? "bg-[#0a0000]" : "bg-[#050505]"
    )}>
      {/* Dynamic Background System */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: currentStyle === 'blackout' ? 0.2 : (currentStyle === 'red' ? 0.3 : 0.45), 
                scale: 1 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
            >
              <img 
                src={view === 'chat' ? '/fondo.png' : '/fondo config.png'} 
                className={cn(
                  "w-full h-full object-cover transition-all duration-1000",
                  currentStyle === 'blackout' ? "grayscale brightness-50" : 
                  currentStyle === 'red' ? "sepia-[0.8] hue-rotate-[280deg] brightness-[0.4] saturate-[1.5]" : 
                  "brightness-90 opacity-40"
                )}
                alt="View Background"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/fondo config.png';
                }}
              />
            </motion.div>
         </AnimatePresence>
         <div className={cn(
           "absolute inset-0 transition-opacity duration-1000",
           currentStyle === 'blackout' 
            ? "bg-gradient-to-b from-black/80 via-black/40 to-black/80" 
            : currentStyle === 'red'
            ? "bg-gradient-to-tr from-red-900/40 via-transparent to-red-950/50"
            : "bg-gradient-to-tr from-black/60 via-transparent to-black/80"
         )} />
         
         <div className="noise-overlay opacity-[0.02]" />
         <div className="scanline opacity-[0.03]" />
         
         {currentStyle === 'red' && (
           <>
             <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-600/10 to-transparent" />
             <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-red-600/10 to-transparent" />
           </>
         )}
      </div>

      <div className={cn(
        "h-full md:block z-10",
        activeMatchId ? "hidden" : "block w-full md:w-80"
      )}>
        <Sidebar 
          user={currentUser}
          matches={matches}
          activeMatchId={activeMatchId}
          onSelectMatch={(id) => {
            if (id === 'profile-view') {
              setView('profile');
              setActiveMatchId(null);
            } else if (id === '') {
              setView('chat');
              setActiveMatchId(null);
            } else {
              setActiveMatchId(id);
              setView('chat');
            }
          }}
          onOpenDiscovery={() => {
            setActiveMatchId(null);
            setView('discovery');
          }}
          currentTab={view}
          uiStyle={currentStyle}
        />
      </div>

      <AnimatePresence>
        {showMatchModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-[100] flex items-center justify-center p-6 transition-colors duration-700",
              currentStyle === 'red' ? "bg-red-950/60" : "bg-black/90"
            )}
          >
            <motion.div 
              initial={{ scale: 0.1, rotate: 180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 100 }}
              className={cn(
                "border p-16 text-center max-w-xl rounded-[4rem] relative overflow-hidden transition-all duration-700",
                currentStyle === 'red' 
                  ? "bg-red-950/40 border-red-500/30 shadow-[0_0_100px_rgba(239,68,68,0.4)]" 
                  : "bg-white/[0.03] border-white/20 shadow-[0_0_100px_rgba(255,0,255,0.2)]"
              )}
            >
              <div className={cn(
                "absolute inset-0 bg-gradient-to-tr",
                currentStyle === 'red' 
                  ? "from-red-600/20 via-transparent to-red-900/20" 
                  : "from-cyber-pink/10 via-transparent to-cyber-cyan/10"
              )} />
              <div className={cn(
                "absolute -top-24 -left-24 w-64 h-64 opacity-20 animate-pulse",
                currentStyle === 'red' ? "bg-red-600/30" : "bg-cyber-pink/20"
              )} />
              <div className={cn(
                "absolute -bottom-24 -right-24 w-64 h-64 opacity-20 animate-pulse",
                currentStyle === 'red' ? "bg-red-500/30" : "bg-cyber-cyan/20"
              )} />
              
              <div className="relative z-10">
                <motion.h2 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn(
                    "text-7xl lg:text-8xl font-display font-black italic mb-10 uppercase tracking-tighter",
                    currentStyle === 'red' ? "text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" : "text-holographic"
                  )}
                >
                  ¡CONECTADO!
                </motion.h2>
                
                <div className="flex items-center justify-center gap-10 mb-14 scale-125">
                   <div className={cn(
                     "w-24 h-24 rounded-full border-2 p-1.5 rotate-6 overflow-hidden shadow-lg bg-black",
                     currentStyle === 'red' ? "border-red-500 shadow-red-500/40" : "border-cyber-pink shadow-[0_0_30px_rgba(255,0,255,0.4)]"
                   )}>
                     <div className={cn(
                       "w-full h-full rounded-full bg-cyber-bg flex items-center justify-center text-5xl font-black italic",
                       currentStyle === 'red' ? "text-red-500" : "text-cyber-pink"
                     )}>
                       {currentUser.displayName?.substring(0, 1).toUpperCase()}
                     </div>
                   </div>
                   <motion.div
                     animate={{ y: [0, -10, 0], scale: [1, 1.2, 1] }}
                     transition={{ duration: 1, repeat: Infinity }}
                   >
                     <Heart className={cn(
                       "w-20 h-20 drop-shadow-[0_0_20px_rgba(255,0,255,0.6)]",
                       currentStyle === 'red' ? "text-red-600" : "text-cyber-pink"
                     )} />
                   </motion.div>
                   <div className={cn(
                     "w-24 h-24 rounded-full border-2 p-1.5 -rotate-6 overflow-hidden shadow-lg bg-black",
                     currentStyle === 'red' ? "border-red-400 shadow-red-400/40" : "border-cyber-cyan shadow-[0_0_30px_rgba(0,255,255,0.4)]"
                   )}>
                     <img src={showMatchModal.otherUser?.photos[0]} className="w-full h-full object-cover" />
                   </div>
                </div>
  
                <p className="text-white/90 mb-12 text-lg lg:text-xl tracking-tight font-medium italic max-w-sm mx-auto leading-relaxed">
                  "La sincronización es perfecta. Vuestras señales están alineadas en la misma frecuencia."
                </p>
                
                <button 
                  onClick={() => {
                    if (showMatchModal) {
                      setActiveMatchId(showMatchModal.id);
                      setView('chat');
                      setShowMatchModal(null);
                    }
                  }}
                  className={cn(
                    "cyber-button w-full py-6 text-base font-black uppercase tracking-[0.3em] transition-all",
                    currentStyle === 'red' 
                      ? "bg-red-600 text-white hover:bg-red-500" 
                      : "bg-white text-black hover:bg-cyber-cyan"
                  )}
                >
                  ABRIR CANAL SEGURO
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={cn(
        "flex-1 relative h-full z-10 flex",
        !activeMatchId && view === 'chat' ? "hidden md:flex" : "flex"
      )}>
        <div className="flex-1 flex flex-col h-full relative">
          {view === 'discovery' && (
            <div className="h-full w-full flex items-center justify-center p-6 overflow-hidden">
              <Feed 
                profiles={feedProfiles} 
                onSwipe={handleSwipe}
                likedProfiles={matches.map(m => m.otherUser?.id!)}
                uiStyle={currentStyle}
              />
            </div>
          )}

          {view === 'chat' && (
            <>
              {activeMatchId && activeMatch ? (
                <Chat 
                  match={activeMatch} 
                  onBack={() => {
                    setActiveMatchId(null);
                  }}
                  uiStyle={currentStyle}
                />
              ) : (
                <div className="h-full w-full flex flex-col p-12 overflow-y-auto scrollbar-hide">
                  <div className="max-w-6xl mx-auto w-full space-y-12">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <MessageSquare className={cn(
                          "w-10 h-10",
                          currentStyle === 'red' ? "text-red-500" : "text-cyber-pink"
                        )} />
                        <h2 className="text-4xl font-display font-black italic uppercase tracking-tighter text-white">Central de Señales</h2>
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-black italic">Sincronización de enlaces neuronales activa</p>
                    </div>

                    {matches.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matches.map(match => (
                          <motion.button
                            key={match.id}
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setActiveMatchId(match.id);
                              setView('chat');
                            }}
                            className={cn(
                              "relative group p-6 rounded-[3rem] border transition-all overflow-hidden text-left",
                              currentStyle === 'red' 
                                ? "bg-red-950/20 border-red-500/10 hover:border-red-500/40" 
                                : "bg-white/[0.03] border-white/10 hover:border-cyber-cyan/40"
                            )}
                          >
                            <div className={cn(
                              "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity",
                              currentStyle === 'red' ? "bg-red-500" : "bg-cyber-cyan"
                            )} />
                            
                            <div className="relative z-10 flex flex-col gap-6">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-16 h-16 rounded-[1.8rem] border-2 p-1",
                                  match.isSoulMatch ? "border-cyber-pink" : "border-white/10"
                                )}>
                                  <img src={match.otherUser?.photos[0]} className="w-full h-full object-cover rounded-[1.4rem]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-xl font-black italic uppercase tracking-tight text-white truncate">{match.otherUser?.displayName}</h3>
                                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest italic">{match.isSoulMatch ? 'Sincro Perfecta' : 'Enlace Estable'}</p>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <p className="text-xs text-white/60 line-clamp-2 italic font-medium">
                                  {match.lastMessage || "Esperando transmisión..."}
                                </p>
                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic">
                                    {match.lastMessageAt ? new Date((match.lastMessageAt as any).toMillis?.() || Date.now()).toLocaleDateString() : 'Pendiente'}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                      "w-1.5 h-1.5 rounded-full animate-pulse",
                                      currentStyle === 'red' ? "bg-red-500" : "bg-cyber-cyan"
                                    )} />
                                    <span className="text-[8px] font-black uppercase text-white/40 italic">Online</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-32 flex flex-col items-center justify-center text-center space-y-8">
                        <div className="w-24 h-24 rounded-[2rem] border-2 border-white/5 flex items-center justify-center opacity-10">
                          <MessageSquare className="w-12 h-12" />
                        </div>
                        <div className="space-y-4">
                          <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter">Sin señales activas</h3>
                          <p className="text-white/30 text-sm max-w-xs mx-auto italic font-medium leading-relaxed">
                            No se han detectado enlaces neuronales todavía. Regresa a exploración para buscar nuevas frecuencias.
                          </p>
                        </div>
                        <button 
                          onClick={() => setView('discovery')}
                          className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-white/60 hover:bg-white/10 hover:text-white transition-all shadow-xl"
                        >
                          Rastrear Frecuencias
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {view === 'profile' && (
            <div className="h-full flex items-center justify-center p-4">
              <Profile user={currentUser} onClose={() => setView('discovery')} />
            </div>
          )}
        </div>

        {/* Integrated Discovery Scroller on Chat View (Desktop) */}
        {view === 'chat' && activeMatchId && (
          <div className="hidden xl:flex w-[400px] border-l border-white/10 bg-black/20 h-full flex-col p-8 z-20">
             <div className="flex items-center justify-between mb-8 px-4">
               <h3 className="text-sm font-display font-black italic text-holographic uppercase tracking-[0.4em]">Próximas Señales</h3>
               <Star className="w-4 h-4 text-cyber-cyan animate-pulse" />
             </div>
             <div className="flex-1 overflow-hidden">
                <Feed 
                  profiles={feedProfiles} 
                  onSwipe={handleSwipe}
                  likedProfiles={matches.map(m => m.otherUser?.id!)}
                  variant="sidebar"
                  uiStyle={currentStyle}
                />
             </div>
          </div>
        )}
      </main>

      {/* Global Alerts */}
      <AnimatePresence>
        {showGoogleAlert && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-12 right-12 z-[100] max-w-sm bg-black/80 border border-cyber-cyan/30 p-6 rounded-3xl shadow-[0_0_40px_rgba(0,255,255,0.2)]"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-cyber-cyan/10 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-cyber-cyan" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black text-white uppercase tracking-widest">Protocolo de Confianza</p>
                <p className="text-[11px] leading-relaxed text-white/60 font-medium">Recomendamos confiar principalmente en usuarios con el distintivo de Google, ya que su identidad ha sido verificada externamente.</p>
                <div className="pt-2">
                  <button 
                    onClick={() => setShowGoogleAlert(false)}
                    className="text-[10px] font-black text-cyber-cyan uppercase hover:text-white transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
