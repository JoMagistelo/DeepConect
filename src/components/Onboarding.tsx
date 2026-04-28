import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronRight, ChevronLeft, Upload, Sparkles, Heart, Activity, Camera, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const onboardingSchema = z.object({
  displayName: z.string().min(2, 'El nombre de usuario debe tener al menos 2 caracteres'),
  birthdate: z.string(),
  gender: z.string(),
  zodiacSign: z.string(),
  relationshipGoal: z.string(),
  interestTags: z.array(z.string()).min(3, 'Selecciona al menos 3 sectores activos'),
  bio: z.string().min(10, 'El manifiesto es demasiado corto'),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const STEPS = [
  { id: 'intro', title: 'DeepConect OS', description: 'Inicializa tu núcleo digital para la era holográfica.' },
  { id: 'basics', title: 'Identidad Binaria', description: 'Configura tus parámetros de frecuencia primarios.' },
  { id: 'photos', title: 'Renderizado Visual', description: 'Captura 2 señales que reflejen tu presencia.' },
  { id: 'purpose', title: 'Protocolo Directo', description: '¿Cuál es tu objetivo en la red de alta vinculación?' },
  { id: 'interests', title: 'Sectores Activos', description: 'Mapea las frecuencias que impulsan tu glitch.' },
  { id: 'final', title: 'Ejecución', description: 'Completa la sincronización de tu yo digital.' },
];

const getZodiacSign = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Acuario ♒';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Piscis ♓';
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries ♈';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Tauro ♉';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Géminis ♊';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cáncer ♋';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo ♌';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo ♍';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra ♎';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Escorpio ♏';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagitario ♐';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricornio ♑';
  return '';
};

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      interestTags: [],
      zodiacSign: '',
      displayName: auth.currentUser?.displayName || '',
    }
  });

  const watchedBirthdate = form.watch('birthdate');
  useEffect(() => {
    if (watchedBirthdate) {
      const sign = getZodiacSign(watchedBirthdate);
      form.setValue('zodiacSign', sign);
    }
  }, [watchedBirthdate, form]);

  const next = async () => {
    let fieldsToValidate: (keyof OnboardingData)[] = [];
    if (currentStep === 1) fieldsToValidate = ['displayName', 'birthdate', 'gender'];
    if (currentStep === 3) fieldsToValidate = ['relationshipGoal'];
    if (currentStep === 4) fieldsToValidate = ['interestTags'];
    if (currentStep === 5) fieldsToValidate = ['bio'];

    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid || currentStep === 0 || currentStep === 2) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(curr => curr + 1);
      } else {
        const finalValid = await form.trigger();
        if (finalValid) {
          await form.handleSubmit(onSubmit)();
        }
      }
    }
  };

  const prev = () => setCurrentStep(curr => Math.max(0, curr - 1));

  const onSubmit = async (data: OnboardingData) => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        ...data,
        id: auth.currentUser.uid,
        photos: [
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=500',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=500'
        ],
        onboardingCompleted: true,
        uiStyle: 'holographic',
        createdAt: serverTimestamp(),
      });
      onComplete();
    } catch (err) {
      console.error("Sync failed", err);
      handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { formState: { errors } } = form;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        <img 
          src="/fondo config.png" 
          className="w-full h-full object-cover opacity-20"
          alt="Background"
        />
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <div className="noise-overlay opacity-5" />
      <div className="scanline opacity-10" />
      
      <div className="w-full max-w-2xl z-10 relative">
        <div className="bg-black/40 border border-white/20 p-10 md:p-16 rounded-[4rem] shadow-[0_45px_100px_rgba(0,0,0,0.7)]">
          
          {/* Progress Tracker */}
          <div className="flex gap-3 mb-12">
            {STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "h-1.5 flex-1 transition-all duration-700 rounded-full",
                  idx <= currentStep ? "bg-cyber-cyan shadow-[0_0_20px_rgba(0,255,255,0.3)]" : "bg-white/5"
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-12 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                  <Activity className="w-5 h-5 text-cyber-cyan" />
                  <span className="text-[11px] uppercase font-black tracking-[0.5em] text-cyber-cyan italic">PARÁMETRO: {currentStep + 1}/{STEPS.length}</span>
                </div>
                <h2 className="text-5xl md:text-6xl font-display font-black text-white tracking-tighter italic mb-6 leading-none">{STEPS[currentStep].title}</h2>
                <p className="text-white/60 font-medium leading-relaxed tracking-tight text-lg max-w-md mx-auto md:mx-0">{STEPS[currentStep].description}</p>
              </div>

              <div className="space-y-8">
                {currentStep === 0 && (
                  <div className="py-12 flex flex-col items-center text-center space-y-10">
                     <motion.div 
                       animate={{ 
                         boxShadow: ['0 0 30px rgba(0,255,255,0.1)', '0 0 80px rgba(0,255,255,0.3)', '0 0 30px rgba(0,255,255,0.1)']
                       }}
                       transition={{ duration: 4, repeat: Infinity }}
                       className="w-40 h-40 rounded-[3rem] border border-cyber-cyan/30 flex items-center justify-center bg-black/40"
                     >
                       <Zap className="w-16 h-16 text-cyber-cyan drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]" />
                     </motion.div>
                     <p className="text-2xl text-white font-black italic tracking-tight leading-tight max-w-sm">"Tu frecuencia define tu realidad digital. Inicializa con precisión."</p>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div className="space-y-3">
                       <label className="text-[11px] uppercase tracking-[0.2em] text-cyber-cyan font-black ml-2">Alias en la Red</label>
                       <input {...form.register('displayName')} className="glass-input text-xl py-6 px-8 bg-white/5 border-white/10" placeholder="NOMBRE_USR" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-3">
                          <label className="text-[11px] uppercase tracking-[0.2em] text-cyber-cyan font-black ml-2">Origen Temporal</label>
                          <input type="date" {...form.register('birthdate')} className="glass-input py-6 px-8 bg-white/5 border-white/10" />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[11px] uppercase tracking-[0.2em] text-cyber-cyan font-black ml-2">Signo Astral</label>
                          <div className="glass-input py-6 px-8 bg-white/10 border-white/20 flex items-center justify-between text-cyber-cyan font-black italic">
                             {form.watch('zodiacSign') || 'BUSCANDO...'}
                          </div>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[11px] uppercase tracking-[0.2em] text-cyber-cyan font-black ml-2">Tipo de Frecuencia</label>
                       <select {...form.register('gender')} className="glass-input py-6 px-8 bg-black/40 border-white/10 text-white/80 font-bold">
                          <option value="">Selecciona frecuencia...</option>
                          <option value="man">Masculina</option>
                          <option value="woman">Femenina</option>
                          <option value="nonbinary">Fluida / Glitch</option>
                       </select>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="grid grid-cols-1 gap-4">
                     {[
                        { label: 'SINCRONIZACIÓN ETERNA 🌌', value: 'long' },
                        { label: 'CONEXIÓN EFÍMERA 🕯️', value: 'short' },
                        { label: 'NETWORKING DE SECTOR 💎', value: 'friends' },
                        { label: 'GLITCH EXPLORATORIO 🌙', value: 'unknown' }
                     ].map(goal => (
                        <button
                          key={goal.value}
                          type="button"
                          onClick={() => form.setValue('relationshipGoal', goal.label)}
                          className={cn(
                            "w-full p-8 text-left rounded-3xl border transition-all flex justify-between items-center group",
                            form.watch('relationshipGoal') === goal.label 
                              ? "bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan shadow-[0_0_30px_rgba(0,255,255,0.15)]" 
                              : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/20"
                          )}
                        >
                          <span className="font-black uppercase tracking-[0.2em] text-xs italic">{goal.label}</span>
                          <Heart className={cn("w-6 h-6 transition-all", form.watch('relationshipGoal') === goal.label ? "scale-125 opacity-100 text-cyber-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" : "opacity-0 scale-50")} />
                        </button>
                     ))}
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="flex flex-wrap gap-4 justify-center">
                    {['RETRO-GAMING', 'CYBER-ART', 'VINILO', 'PROGRAMACIÓN', 'LUCES NEÓN', 'ANIME', 'FUTURISMO', 'TECHNO', 'SYNTHS', 'GLITCH-CORE', 'METAVERSO', 'HOLOGRAFÍA'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const current = form.getValues('interestTags');
                          const updated = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
                          form.setValue('interestTags', updated);
                        }}
                        className={cn(
                          "px-8 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                          form.watch('interestTags').includes(tag) 
                            ? "bg-cyber-pink/20 border-cyber-pink text-cyber-pink shadow-[0_0_25px_rgba(255,0,255,0.3)]" 
                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20 hover:text-white"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-8">
                    <div className="space-y-3">
                       <label className="text-[11px] uppercase tracking-[0.2em] text-cyber-pink font-black ml-2">Manifiesto Digital</label>
                       <textarea 
                          {...form.register('bio')}
                          className="glass-input h-56 resize-none text-lg leading-relaxed italic py-8 px-10 bg-white/5 border-white/10 font-medium"
                          placeholder="Escribe tu verdad digital aquí..."
                       />
                    </div>
                    <div className="p-8 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-[2.5rem] flex items-center gap-6">
                       <Activity className="w-8 h-8 text-cyber-cyan animate-pulse shrink-0" />
                       <p className="text-[11px] uppercase tracking-[0.4em] text-cyber-cyan font-black leading-snug italic">La sincronización persistirá tus datos en el núcleo central de DeepConect.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <footer className="mt-16 pt-10 border-t border-white/10 flex justify-between gap-6">
            <button 
              type="button"
              onClick={prev}
              className={cn(
                "px-8 py-6 border border-white/10 rounded-[2rem] text-white/40 hover:text-white hover:bg-white/5 transition-all uppercase text-[10px] font-black tracking-[0.4em] italic",
                currentStep === 0 && "opacity-0 pointer-events-none"
              )}
            >
              Volver
            </button>
            <button 
              type="button"
              onClick={next}
              disabled={isSubmitting}
              className="cyber-button flex-1 py-6 text-base shadow-[0_10px_30px_rgba(0,255,255,0.2)]"
            >
               <span className="flex items-center justify-center gap-4">
                  {currentStep === STEPS.length - 1 ? (isSubmitting ? 'SINCRO-ACTIVA...' : 'EJECUTAR ENLACE') : 'SIGUIENTE PROTOCOLO'}
                  <ChevronRight className="w-6 h-6" />
               </span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
