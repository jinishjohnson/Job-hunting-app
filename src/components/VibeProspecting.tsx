import React, { useState, useEffect } from 'react';
import { ExternalLink, Mail, Zap, RefreshCw, ArrowLeft } from 'lucide-react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { vibeProspecting } from '../services/geminiService';
import { Prospect, UserProfile } from '../types';
import { cn } from '../lib/utils';

// Re-using the Button component logic from App.tsx for consistency
const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }) => {
  const variants = {
    primary: 'ios-button-primary',
    secondary: 'ios-button-secondary',
    outline: 'bg-transparent border border-white/40 text-gray-700 hover:bg-white/20',
    ghost: 'bg-transparent text-gray-600 hover:bg-white/40',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30'
  };

  return (
    <button 
      className={cn(
        'ios-button flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const VibeProspecting = ({ user, profile }: { user: User | null | undefined, profile: UserProfile | null }) => {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);

  const handleProspect = async () => {
    setLoading(true);
    try {
      const results = await vibeProspecting();
      setProspects(results);
    } catch (error) {
      console.error('Error fetching prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleProspect();
  }, []);

  return (
    <div className="pb-24 px-6 pt-10">
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="w-12 h-12 glass flex items-center justify-center rounded-full text-gray-600 hover:scale-110 transition-transform shadow-sm border border-white/60">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Vibe Prospecting</h1>
            <p className="text-gray-500 font-black text-[10px] mt-1 tracking-widest uppercase opacity-60">HR Contacts • Programming & Tech • UAE</p>
          </div>
        </div>
        <motion.button 
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.5 }}
          onClick={handleProspect} 
          disabled={loading}
          className="w-12 h-12 glass flex items-center justify-center rounded-2xl text-blue-600 shadow-xl border border-white/60 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-6 h-6", loading && "animate-spin")} />
        </motion.button>
      </header>

      <main>
        {loading ? (
          <div className="flex flex-col gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 glass rounded-[32px] animate-pulse border border-white/40" />
            ))}
          </div>
        ) : prospects.length > 0 ? (
          <div className="flex flex-col gap-6">
            {prospects.map((p, idx) => {
              const userName = profile?.name || user?.displayName || 'Applicant';
              const subject = encodeURIComponent(`Application for ${p.hiringFor} - ${userName}`);
              const body = encodeURIComponent(
                `Dear ${p.name},\n\nI am writing to express my interest in the ${p.hiringFor} position at ${p.company}. I have attached my resume for your review and would welcome the opportunity to discuss how my skills and experience align with your team's needs.\n\nThank you for your time and consideration.\n\nBest regards,\n${userName}`
              );
              const mailtoUrl = `mailto:${p.email}?subject=${subject}&body=${body}`;

              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="ios-card p-6 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-5">
                      <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-blue-600 font-black text-2xl border border-white/50 shadow-lg shadow-blue-500/5">
                        {p.company[0]}
                      </div>
                      <div>
                        <h3 className="font-black text-xl text-[#1d1d1f] tracking-tight">{p.name}</h3>
                        <p className="text-xs text-gray-500 font-black uppercase tracking-widest mt-0.5 opacity-60">{p.role}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg">{p.company}</span>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-current" /> {p.hiringFor}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a 
                        href={p.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 glass flex items-center justify-center rounded-xl text-blue-600 hover:scale-110 transition-transform border border-white/60 shadow-sm"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                      <a 
                        href={mailtoUrl}
                        className="w-10 h-10 glass flex items-center justify-center rounded-xl text-green-600 hover:scale-110 transition-transform border border-white/60 shadow-sm"
                      >
                        <Mail className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 glass rounded-[50px] border border-white/40 shadow-xl">
            <div className="w-24 h-24 glass rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner border border-white/40">
              <Zap className="w-12 h-12 text-gray-300" />
            </div>
            <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No prospects found. Try refreshing.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default VibeProspecting;
