import { User } from '../types';
import { motion } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { doc, updateDoc } from 'firebase/firestore';
import { X, User as UserIcon, LogOut, Save, ShieldCheck, Star, Heart, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

interface ProfileProps {
  user: User | null;
  onClose: () => void;
}

export default function Profile({ user, onClose }: ProfileProps) {
  const [editingUser, setEditingUser] = useState(user);
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        displayName: editingUser.displayName,
        bio: editingUser.bio,
        interestTags: editingUser.interestTags,
        uiStyle: editingUser.uiStyle || 'holographic'
      });
      alert("Señal de identidad actualizada.");
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`);
      alert("Error al sincronizar datos.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentStyle = user?.uiStyle || 'holographic';
  const isRed = currentStyle === 'red';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "w-[95vw] max-w-7xl h-[90vh] border rounded-[5rem] overflow-hidden flex flex-col md:flex-row shadow-[0_60px_150px_rgba(0,0,0,0.9)] relative font-sans transition-all duration-700",
        isRed 
          ? "bg-red-950/60 border-red-500/20" 
          : "bg-black/60 border-white/20"
      )}
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyber-pink/5 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyber-cyan/5 blur-[150px] pointer-events-none" />
      </div>

      <button 
        onClick={onClose}
        className="absolute top-10 right-10 p-4 rounded-3xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all z-50 border border-white/10"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Sidebar Info */}
      <div className="w-full md:w-[28rem] bg-white/[0.03] border-r border-white/10 p-16 flex flex-col items-center z-10">
        <div className="relative mb-10 group">
           <motion.div 
             animate={{ rotate: [0, 5, -5, 0] }}
             transition={{ duration: 10, repeat: Infinity }}
             className="w-56 h-56 rounded-[4rem] border-2 border-cyber-pink/30 p-2 overflow-hidden shadow-[0_0_60px_rgba(255,0,255,0.1)] bg-black/40 group-hover:border-cyber-pink transition-colors duration-700"
           >
              <div className="w-full h-full rounded-[3.5rem] bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center text-8xl font-display font-black italic text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                 {user.displayName?.substring(0, 1).toUpperCase()}
              </div>
           </motion.div>
           <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-[1.5rem] bg-cyber-pink shadow-[0_0_20px_rgba(255,0,255,0.6)] flex items-center justify-center border-4 border-black">
              <ShieldCheck className="w-7 h-7 text-white" />
           </div>
        </div>

        <h3 className="text-4xl font-display font-black text-white italic mb-2 uppercase tracking-tighter leading-none">{user.displayName}</h3>
        <p className="text-[11px] text-white/20 uppercase tracking-[0.6em] mb-12 font-black italic">VECTOR_ID: {user.id.substring(0, 12)}</p>

        <div className="w-full space-y-4 pt-10 border-t border-white/5">
           <div className="flex justify-between items-center px-6 py-5 bg-white/5 rounded-[2rem] border border-white/5">
              <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em] italic">Sector_A</span>
              <span className="text-[11px] text-cyber-cyan font-black uppercase tracking-widest italic">{user.zodiacSign}</span>
           </div>
           <div className="flex justify-between items-center px-6 py-5 bg-white/5 rounded-[2rem] border border-white/5">
              <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em] italic">Frecuencia_Ok</span>
              <span className="text-[11px] text-green-500 font-black uppercase tracking-widest italic animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.3)]">ACTIVA</span>
           </div>
        </div>

        <div className="mt-auto w-full pt-12">
          <button 
            onClick={() => auth.signOut()}
            className="w-full py-6 rounded-[2rem] bg-red-500/5 border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-[0.4em] hover:bg-red-500 hover:text-black transition-all flex items-center justify-center gap-4 italic"
          >
            <LogOut className="w-5 h-5 -rotate-90" />
            Terminal de Sesión
          </button>
        </div>
      </div>

      {/* Main Form */}
      <div className="flex-1 p-16 md:p-24 overflow-y-auto scrollbar-hide z-10 bg-black/20">
         <div className="max-w-3xl space-y-16">
            <div className="space-y-6">
               <div className="flex items-center gap-4 mb-4">
                  <UserIcon className="w-6 h-6 text-cyber-cyan" />
                  <h4 className="text-[12px] font-black text-cyber-cyan uppercase tracking-[0.7em] italic">Configuración de Origen</h4>
               </div>
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                       <label className="text-[11px] text-white/20 font-black uppercase tracking-[0.4em] italic ml-2">Identificador de Usuario</label>
                       <input 
                         type="text"
                         value={editingUser?.displayName}
                         onChange={e => setEditingUser(prev => prev ? {...prev, displayName: e.target.value} : null)}
                         className="glass-input text-2xl py-6 px-10 border-white/10"
                       />
                     </div>
                     <div className="space-y-3">
                       <label className="text-[11px] text-white/20 font-black uppercase tracking-[0.4em] italic ml-2">Estética Visual</label>
                       <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 h-[76px]">
                          <button 
                            type="button"
                            onClick={() => setEditingUser(prev => prev ? {...prev, uiStyle: 'holographic'} : null)}
                            className={cn(
                              "flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all",
                              (editingUser?.uiStyle === 'holographic' || !editingUser?.uiStyle) ? "bg-cyber-cyan text-black" : "text-white/30 hover:text-white"
                            )}
                          >
                            Holográfico
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingUser(prev => prev ? {...prev, uiStyle: 'blackout'} : null)}
                            className={cn(
                              "flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all",
                              editingUser?.uiStyle === 'blackout' ? "bg-white/20 text-white" : "text-white/30 hover:text-white"
                            )}
                          >
                            Deep Black
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingUser(prev => prev ? {...prev, uiStyle: 'red'} : null)}
                            className={cn(
                              "flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all",
                              editingUser?.uiStyle === 'red' ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "text-white/30 hover:text-white"
                            )}
                          >
                            Crimson Red
                          </button>
                       </div>
                     </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] text-white/20 font-black uppercase tracking-[0.4em] italic ml-2">Manifiesto Digital (Transmisión)</label>
                    <textarea 
                      rows={6}
                      value={editingUser?.bio}
                      onChange={e => setEditingUser(prev => prev ? {...prev, bio: e.target.value} : null)}
                      className="glass-input h-64 py-8 px-10 text-lg border-white/10 leading-relaxed font-medium italic"
                      placeholder="Transmite tu verdad al núcleo..."
                    />
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <div className="flex items-center gap-4 mb-4">
                  <Star className="w-6 h-6 text-cyber-pink" />
                  <h4 className="text-[12px] font-black text-cyber-pink uppercase tracking-[0.7em] italic">Mapeo de Intereses</h4>
               </div>
               <div className="flex flex-wrap gap-4">
                  {editingUser?.interestTags?.map(tag => (
                    <button 
                      key={tag}
                      className="px-8 py-4 bg-cyber-pink/5 border border-cyber-pink/20 rounded-2xl text-[10px] font-black text-cyber-pink uppercase tracking-[0.3em] hover:bg-cyber-pink/10 transition-all italic"
                    >
                      {tag}
                    </button>
                  ))}
                  <button className="px-8 py-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-[10px] font-black text-white/10 uppercase tracking-[0.3em] hover:border-white/30 hover:text-white/30 transition-all italic">
                    + ENLAZAR ATRIBUTO
                  </button>
               </div>
            </div>

            <div className="pt-12 flex flex-col sm:flex-row gap-6">
               <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "flex-[2] cyber-button py-8 text-lg font-black uppercase tracking-[0.4em] italic shadow-[0_20px_50px_rgba(0,0,255,0.2)]",
                    isSaving && "opacity-50 grayscale"
                  )}
               >
                  <span className="flex items-center justify-center gap-4">
                    {isSaving ? 'TRANSFIRIENDO...' : 'SINCRONIZAR ACTUALIZACIÓN'}
                    <Save className="w-6 h-6" />
                  </span>
               </button>
               <button 
                  onClick={onClose}
                  className="flex-1 px-12 py-8 border border-white/10 rounded-[2rem] text-[11px] font-black text-white/30 uppercase tracking-[0.4em] hover:bg-white/5 transition-all italic"
               >
                  Descartar
               </button>
            </div>
         </div>
      </div>
    </motion.div>
  );
}
