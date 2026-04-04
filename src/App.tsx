import React, { useState, useEffect, useMemo } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useParams, 
  Navigate 
} from 'react-router-dom';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  deleteDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Bookmark, 
  User as UserIcon, 
  Plus, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronRight, 
  LogOut, 
  Mail,
  Filter,
  CheckCircle2,
  X,
  Menu,
  ArrowLeft,
  Bell,
  FileText,
  Upload,
  ExternalLink,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow, format } from 'date-fns';
import Fuse from 'fuse.js';
import { auth, db, storage } from './firebase';
import { cn } from './lib/utils';
import { Job, UserProfile, SavedJob, Report, Prospect } from './types';
import { searchJobsOnWeb, WebJob, generateJobApplicationEmail, vibeProspecting } from './services/geminiService';
import VibeProspecting from './components/VibeProspecting';
import ATSChecker from './components/ATSChecker';

// --- Components ---

const LiquidBackground = () => (
  <div className="liquid-bg">
    <div className="liquid-blob w-[600px] h-[600px] bg-blue-300/40 -top-40 -left-40 animate-[float-1_40s_infinite_ease-in-out]" />
    <div className="liquid-blob w-[500px] h-[500px] bg-indigo-300/30 top-1/4 -right-40 animate-[float-2_45s_infinite_ease-in-out]" />
    <div className="liquid-blob w-[700px] h-[700px] bg-sky-200/20 -bottom-60 left-1/3 animate-[float-3_50s_infinite_ease-in-out]" />
    <div className="liquid-blob w-[400px] h-[400px] bg-blue-400/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[float-1_35s_infinite_reverse_ease-in-out]" />
  </div>
);

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

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className={cn(
      'ios-input w-full',
      className
    )}
    {...props}
  />
);

const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'warning' | 'info' }) => {
  const variants = {
    default: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    success: 'bg-green-500/10 text-green-600 border-green-500/20',
    warning: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  };

  return (
    <span className={cn('px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm', variants[variant], className)}>
      {children}
    </span>
  );
};

// --- Layout ---

const Navbar = ({ user, profile }: { user: User | null | undefined, profile: UserProfile | null }) => {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-4 z-50 mx-4 glass rounded-[28px] px-6 py-4 flex items-center justify-between shadow-2xl shadow-black/5 border border-white/40">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/40 border-2 border-white/30">
          <Briefcase className="w-5 h-5 text-white" />
        </div>
        <span className="font-black text-xl tracking-tight text-[#1d1d1f]">UAEJobs</span>
      </Link>
      
      <div className="flex items-center gap-4">
        <Link to="/vibe-prospecting" className="p-2.5 glass rounded-2xl text-gray-500 hover:text-blue-600 transition-all hover:scale-110 active:scale-95 flex items-center gap-1.5 border border-white/60 shadow-sm">
          <Zap className="w-4 h-4 text-orange-500 fill-current" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Vibe</span>
        </Link>
        <Link to="/ats-checker" className="p-2.5 glass rounded-2xl text-gray-500 hover:text-blue-600 transition-all hover:scale-110 active:scale-95 flex items-center gap-1.5 border border-white/60 shadow-sm">
          <FileText className="w-4 h-4 text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">ATS Check</span>
        </Link>
        {user ? (
          <div className="flex items-center gap-3">
            <Link to="/saved" className="p-2.5 glass rounded-2xl text-gray-500 hover:text-blue-600 transition-all hover:scale-110 border border-white/60 shadow-sm">
              <Bookmark className="w-5 h-5" />
            </Link>
            {profile?.role === 'admin' && (
              <Link to="/admin" className="p-2.5 glass rounded-2xl text-gray-500 hover:text-blue-600 transition-all hover:scale-110 border border-white/60 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </Link>
            )}
            <Link to="/profile" className="w-11 h-11 rounded-2xl glass border-2 border-white/60 overflow-hidden flex items-center justify-center shadow-xl shadow-blue-500/5 hover:scale-110 transition-transform">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-6 h-6 text-blue-600" />
              )}
            </Link>
          </div>
        ) : (
          <Button onClick={() => navigate('/login')} className="px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest">Login</Button>
        )}
      </div>
    </nav>
  );
};

const BottomNav = () => {
  const navigate = useNavigate();
  return (
    <div className="md:hidden fixed bottom-6 left-6 right-6 glass rounded-full px-6 py-3 flex justify-between items-center z-50 shadow-2xl shadow-black/10">
      <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-all">
        <Search className="w-6 h-6" />
        <span className="text-[10px] font-medium">Explore</span>
      </button>
      <button onClick={() => navigate('/saved')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-all">
        <Bookmark className="w-6 h-6" />
        <span className="text-[10px] font-medium">Saved</span>
      </button>
      <button onClick={() => navigate('/post-job')} className="flex flex-col items-center gap-1 -mt-10">
        <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/40 border-4 border-white/50">
          <Plus className="w-7 h-7 text-white" />
        </div>
      </button>
      <button onClick={() => navigate('/vibe-prospecting')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-all">
        <Zap className="w-6 h-6" />
        <span className="text-[10px] font-medium">Vibe</span>
      </button>
      <button onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-all">
        <UserIcon className="w-6 h-6" />
        <span className="text-[10px] font-medium">Profile</span>
      </button>
    </div>
  );
};

// --- Pages ---

const Home = ({ jobs, loading }: { jobs: Job[], loading: boolean }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [salaryDisclosedOnly, setSalaryDisclosedOnly] = useState(false);
  const [activelyHiringOnly, setActivelyHiringOnly] = useState(false);
  const [webJobs, setWebJobs] = useState<WebJob[]>([]);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [user] = useAuthState(auth);

  const filteredJobs = useMemo(() => {
    let results = jobs;

    // Apply location filter
    if (selectedLocation !== 'All') {
      results = results.filter(job => job.location === selectedLocation);
    }

    // Apply salary filter
    if (salaryDisclosedOnly) {
      results = results.filter(job => job.salary && job.salary.trim() !== '');
    }

    // Apply actively hiring filter
    if (activelyHiringOnly) {
      results = results.filter(job => job.isActivelyHiring);
    }

    // Apply fuzzy search if searchTerm exists
    if (searchTerm.trim()) {
      const fuse = new Fuse(results, {
        keys: [
          { name: 'title', weight: 1 },
          { name: 'company', weight: 0.7 },
          { name: 'description', weight: 0.5 },
          { name: 'requirements', weight: 0.5 }
        ],
        threshold: 0.3,
        ignoreLocation: true,
      });
      return fuse.search(searchTerm).map(result => result.item);
    }

    return results;
  }, [jobs, searchTerm, selectedLocation, salaryDisclosedOnly, activelyHiringOnly]);

  const handleWebSearch = async () => {
    if (!searchTerm) return;
    setIsSearchingWeb(true);
    try {
      const results = await searchJobsOnWeb(searchTerm);
      setWebJobs(results);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearchingWeb(false);
    }
  };

  return (
    <div className="pb-24 min-h-screen">
      <header className="pt-12 pb-8 px-6 rounded-b-[48px] relative overflow-hidden bg-white/30 backdrop-blur-3xl border-b border-white/40 shadow-2xl shadow-blue-500/5">
        <LiquidBackground />
        
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-black text-[#1d1d1f] tracking-tight"
            >
              Find your <span className="text-blue-600">dream</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-500 font-black text-[9px] mt-1 tracking-widest uppercase opacity-60"
            >
              Jobs in UAE • {format(new Date(), 'EEEE, MMM d')}
            </motion.p>
          </div>
          <Link to="/profile">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-14 h-14 rounded-[24px] glass border-2 border-white/60 overflow-hidden shadow-2xl shadow-blue-500/10"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <UserIcon className="w-7 h-7" />
                </div>
              )}
            </motion.div>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative mb-8 z-10"
        >
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            placeholder="Search roles, companies, or skills..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-32 py-4 glass rounded-[24px] border-2 border-white/60 focus:border-blue-500/40 focus:ring-0 transition-all text-sm font-bold placeholder:text-gray-400 shadow-inner"
          />
          {searchTerm && (
            <button 
              onClick={handleWebSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-600 bg-blue-500/10 px-4 py-2 rounded-xl hover:bg-blue-500/20 transition-all border border-blue-500/20 uppercase tracking-widest shadow-sm"
            >
              Search Web
            </button>
          )}
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar relative z-10">
          {['All', 'Dubai', 'Sharjah', 'Ajman'].map((loc, i) => (
            <motion.button
              key={loc}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (i * 0.05) }}
              onClick={() => setSelectedLocation(loc)}
              className={cn(
                "px-6 py-3 rounded-[20px] text-[9px] font-black whitespace-nowrap transition-all duration-500 border uppercase tracking-widest shadow-sm",
                selectedLocation === loc 
                  ? "bg-blue-600 text-white shadow-2xl shadow-blue-500/40 scale-105 border-blue-400" 
                  : "glass text-gray-500 border-white/60 hover:bg-white/50"
              )}
            >
              {loc}
            </motion.button>
          ))}
        </div>
      </header>

      <main className="px-6 mt-8">
        {isSearchingWeb && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 p-10 glass rounded-[40px] text-center border border-white/40 shadow-xl"
          >
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-lg shadow-blue-500/20" />
            <p className="text-lg font-black text-[#1d1d1f] tracking-tight">Searching all UAE job boards...</p>
            <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-widest opacity-60">Fetching real-time listings from Dubizzle, GulfTalent, and more.</p>
          </motion.div>
        )}

        {webJobs.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="font-black text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                </div>
                Web Discoveries
              </h2>
              <button 
                onClick={() => setWebJobs([])} 
                className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-gray-600 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-6">
              {webJobs.map((job, idx) => (
                <WebJobCard key={idx} job={job} />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8 px-2">
          <h2 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Recent Local Jobs</h2>
          <div className="flex gap-3">
            <button 
              onClick={() => setActivelyHiringOnly(!activelyHiringOnly)}
              className={cn(
                "text-[10px] font-black px-5 py-2.5 rounded-2xl border transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm",
                activelyHiringOnly ? "bg-orange-500/20 border-orange-500/30 text-orange-600" : "glass border-white/40 text-gray-400"
              )}
            >
              <Zap className={cn("w-4 h-4", activelyHiringOnly ? "fill-current" : "")} />
              Active
            </button>
            <button 
              onClick={() => setSalaryDisclosedOnly(!salaryDisclosedOnly)}
              className={cn(
                "text-[10px] font-black px-5 py-2.5 rounded-2xl border transition-all uppercase tracking-widest shadow-sm",
                salaryDisclosedOnly ? "bg-green-500/20 border-green-500/30 text-green-600" : "glass border-white/40 text-gray-400"
              )}
            >
              Salary
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 glass rounded-[40px] animate-pulse border border-white/40" />
            ))}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="flex flex-col gap-6">
            {filteredJobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 glass rounded-[50px] border border-white/40 shadow-xl">
            <div className="w-24 h-24 glass rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner border border-white/40">
              <Search className="w-12 h-12 text-gray-300" />
            </div>
            <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No local jobs found.</p>
            {searchTerm && (
              <Button onClick={handleWebSearch} variant="secondary" className="mt-8 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                Search the Web for "{searchTerm}"
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const WebJobCard = ({ job }: { job: WebJob }) => {
  return (
    <motion.a 
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      href={job.sourceUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block ios-card p-6 hover:bg-white/50 transition-all relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-green-500/10 transition-colors" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex gap-4">
          <div className="w-16 h-16 glass rounded-[24px] flex items-center justify-center text-green-600 font-black text-2xl border border-white/50 shadow-xl shadow-green-500/5">
            {job.company[0]}
          </div>
          <div className="pt-1">
            <h3 className="font-black text-[#1d1d1f] leading-tight text-lg tracking-tight">{job.title}</h3>
            <p className="text-xs text-gray-500 font-black uppercase tracking-widest mt-1 opacity-60">{job.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-green-600 bg-green-500/10 px-3 py-1.5 rounded-full text-[9px] font-black border border-green-500/20 uppercase tracking-widest shadow-sm">
          <ExternalLink className="w-3.5 h-3.5" /> Web
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 relative z-10">
        <Badge variant="info" className="flex items-center gap-2 px-3 py-2 rounded-xl border-white/20 shadow-sm text-[10px]">
          <MapPin className="w-3.5 h-3.5" />
          {job.location}
        </Badge>
        <Badge className="flex items-center gap-2 px-3 py-2 rounded-xl glass border-white/50 text-gray-600 font-black uppercase tracking-widest text-[8px] shadow-sm">
          <Briefcase className="w-3.5 h-3.5" />
          {job.jobType}
        </Badge>
        {job.salary && (
          <Badge variant="success" className="font-black px-3 py-2 rounded-xl border-white/20 shadow-sm text-[10px]">
            {job.salary}
          </Badge>
        )}
      </div>

      <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed font-medium relative z-10">{job.description}</p>

      <div className="flex justify-between items-center text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] relative z-10">
        <span className="opacity-40">External Board</span>
        <div className="flex items-center gap-2 text-green-600 group-hover:translate-x-1 transition-transform">
          Apply Now <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.a>
  );
};

const JobCard = ({ job }: { job: Job }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link to={`/job/${job.id}`} className="block ios-card p-6 hover:bg-white/50 transition-all relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
        
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="flex gap-4">
            <div className="w-16 h-16 glass rounded-[24px] flex items-center justify-center text-blue-600 font-black text-2xl border border-white/50 shadow-xl shadow-blue-500/5">
              {job.company[0]}
            </div>
            <div className="pt-1">
              <h3 className="font-black text-[#1d1d1f] leading-tight text-lg tracking-tight">{job.title}</h3>
              <p className="text-xs text-gray-500 font-black uppercase tracking-widest mt-1 opacity-60">{job.company}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {job.isVerified && (
              <div className="w-9 h-9 rounded-xl glass flex items-center justify-center text-green-500 shadow-xl border border-white/50">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            {job.isActivelyHiring && (
              <div className="flex items-center gap-2 text-orange-500 bg-orange-500/10 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-500/20 shadow-sm">
                <Zap className="w-2.5 h-2.5 fill-current" /> Active
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 relative z-10">
          <Badge variant="info" className="flex items-center gap-2 px-3 py-2 rounded-xl border-white/20 shadow-sm text-[10px]">
            <MapPin className="w-3.5 h-3.5" />
            {job.location}
          </Badge>
          <Badge className="flex items-center gap-2 px-3 py-2 rounded-xl glass border-white/50 text-gray-600 font-black uppercase tracking-widest text-[8px] shadow-sm">
            <Briefcase className="w-3.5 h-3.5" />
            {job.jobType}
          </Badge>
          {job.salary && (
            <Badge variant="success" className="font-black px-3 py-2 rounded-xl border-white/20 shadow-sm text-[10px]">
              {job.salary}
            </Badge>
          )}
        </div>

        <div className="flex justify-between items-center text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] relative z-10">
          <span className="opacity-40">{job.postedDate ? formatDistanceToNow(job.postedDate.toDate()) + ' ago' : 'Just now'}</span>
          <div className="flex items-center gap-2 text-blue-600 group-hover:translate-x-1 transition-transform">
            Details <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const JobDetails = ({ user, profile }: { user: User | null | undefined, profile: UserProfile | null }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'jobs', id), (doc) => {
      if (doc.exists()) {
        setJob({ id: doc.id, ...doc.data() } as Job);
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const q = query(collection(db, `users/${user.uid}/saved_jobs`), where('jobId', '==', id));
    const unsub = onSnapshot(q, (snap) => {
      setIsSaved(!snap.empty);
    });
    return unsub;
  }, [user, id]);

  const handleSave = async () => {
    if (!user) return navigate('/login');
    if (isSaved) {
      const q = query(collection(db, `users/${user.uid}/saved_jobs`), where('jobId', '==', id));
      const snap = await getDocs(q);
      snap.forEach(async (d) => await deleteDoc(d.ref));
    } else {
      await addDoc(collection(db, `users/${user.uid}/saved_jobs`), {
        jobId: id,
        userId: user.uid,
        savedAt: serverTimestamp()
      });
    }
  };

  const handleReport = async () => {
    if (!user) return navigate('/login');
    if (!reportReason) return;
    await addDoc(collection(db, 'reports'), {
      jobId: id,
      reporterId: user.uid,
      reason: reportReason,
      createdAt: serverTimestamp()
    });
    // Increment scam count on job
    if (job) {
      await updateDoc(doc(db, 'jobs', id!), {
        scamReportCount: (job.scamReportCount || 0) + 1
      });
    }
    setShowReportModal(false);
    alert('Thank you for reporting. Our team will investigate.');
  };

  const handleDirectApply = async () => {
    if (!user) return navigate('/login');
    if (!job) return;

    setIsGeneratingEmail(true);
    try {
      // Save application to Firestore
      await addDoc(collection(db, `users/${user.uid}/applications`), {
        jobId: id,
        userId: user.uid,
        appliedAt: serverTimestamp()
      });

      const { subject, body } = await generateJobApplicationEmail(
        job.title,
        job.company,
        job.description,
        profile?.name || user.displayName || 'Applicant',
        profile?.skills,
        profile?.experience,
        profile?.cvUrl
      );

      const email = job.contactEmail || `hr@${job.company.toLowerCase().replace(/\s/g, '')}.com`;
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl);
    } catch (error) {
      console.error(error);
      alert('Failed to generate professional email. Opening default mail client instead.');
      window.open(`mailto:hr@${job.company.toLowerCase().replace(/\s/g, '')}.com?subject=Application for ${job.title}`);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading job details...</div>;
  if (!job) return <div className="p-8 text-center text-gray-500">Job not found.</div>;

  return (
    <div className="pb-24">
      <div className="relative h-72 bg-blue-600 flex items-center justify-center overflow-hidden rounded-b-[64px] shadow-2xl">
        <LiquidBackground />
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-12 left-8 w-14 h-14 glass flex items-center justify-center rounded-full text-white z-30 hover:scale-110 transition-transform shadow-xl border border-white/40"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 bg-white rounded-[48px] shadow-2xl flex items-center justify-center text-blue-600 font-black text-5xl border-8 border-white/30 z-10"
        >
          {job.company[0]}
        </motion.div>
      </div>

      <div className="px-6 -mt-14 relative z-20">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="ios-card p-10 shadow-2xl"
        >
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight mb-2">{job.title}</h1>
              <p className="text-blue-600 font-black text-lg tracking-tight">{job.company}</p>
            </div>
            {job.isVerified && (
              <div className="flex items-center gap-2 text-green-600 bg-green-500/10 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20 shadow-sm">
                <ShieldCheck className="w-4 h-4" /> Verified
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="glass-dark p-6 rounded-[32px] border border-white/10 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-3">Location</p>
              <div className="flex items-center gap-3 text-[#1d1d1f] font-black">
                <div className="w-10 h-10 rounded-2xl glass flex items-center justify-center text-blue-600 shadow-sm border border-white/40">
                  <MapPin className="w-5 h-5" />
                </div>
                {job.location}
              </div>
            </div>
            <div className="glass-dark p-6 rounded-[32px] border border-white/10 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-3">Job Type</p>
              <div className="flex items-center gap-3 text-[#1d1d1f] font-black">
                <div className="w-10 h-10 rounded-2xl glass flex items-center justify-center text-blue-600 shadow-sm border border-white/40">
                  <Briefcase className="w-5 h-5" />
                </div>
                {job.jobType}
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <section>
              <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Description
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-medium text-base">{job.description}</p>
            </section>

            {job.requirements && (
              <section>
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Requirements
                </h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-medium text-base">{job.requirements}</p>
              </section>
            )}
          </div>

          <div className="mt-12 pt-10 border-t border-white/10 flex gap-6">
            <Button 
              onClick={handleDirectApply} 
              className="flex-1 py-6 flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest rounded-[28px] shadow-xl"
              disabled={isGeneratingEmail}
            >
              {isGeneratingEmail ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mail className="w-6 h-6" />
                  Apply via Mail
                </>
              )}
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleSave} 
              className={cn("w-24 h-24 rounded-[32px] flex items-center justify-center border-white/60 shadow-xl", isSaved && "bg-blue-500/20 text-blue-600 border-blue-500/30")}
            >
              <Bookmark className={cn("w-8 h-8", isSaved && "fill-current")} />
            </Button>
          </div>

          <button 
            onClick={() => setShowReportModal(true)} 
            className="w-full mt-10 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:text-red-500 transition-colors py-4 glass rounded-2xl border border-white/20"
          >
            <AlertTriangle className="w-4 h-4" /> Report suspicious listing
          </button>
        </motion.div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg glass rounded-t-[60px] p-12 shadow-2xl border-t border-white/40"
            >
              <div className="w-20 h-2 bg-white/30 rounded-full mx-auto mb-10" />
              <h2 className="text-3xl font-black text-[#1d1d1f] mb-3 tracking-tight">Report Job</h2>
              <p className="text-gray-500 text-sm mb-10 font-bold">Help us keep UAE Job Finder safe. Why are you reporting this?</p>
              
              <div className="space-y-4 mb-12">
                {['Asks for payment/money', 'Fake/Duplicate listing', 'Misleading information', 'Offensive content'].map(reason => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={cn(
                      "w-full text-left px-8 py-6 rounded-[32px] border transition-all duration-500 font-black text-sm uppercase tracking-tight",
                      reportReason === reason 
                        ? "border-blue-500 bg-blue-500/10 text-blue-600 scale-[1.02] shadow-lg shadow-blue-500/10" 
                        : "border-white/20 glass-dark text-gray-600 hover:bg-white/20"
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div className="flex gap-6">
                <Button variant="secondary" className="flex-1 py-5 rounded-[28px] font-black uppercase tracking-widest text-[10px]" onClick={() => setShowReportModal(false)}>Cancel</Button>
                <Button className="flex-1 py-5 rounded-[28px] font-black uppercase tracking-widest text-[10px]" onClick={handleReport} disabled={!reportReason}>Submit Report</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (user) navigate('/');
  }, [user]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if profile exists
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      if (!profileDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: user.displayName || 'User',
          email: user.email || '',
          role: 'user',
          createdAt: serverTimestamp()
        });
      }
      navigate('/');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <LiquidBackground />
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-28 h-28 bg-blue-600 rounded-[44px] flex items-center justify-center mb-10 shadow-2xl shadow-blue-500/40 border-8 border-white/30 relative z-10"
      >
        <Briefcase className="w-12 h-12 text-white" />
      </motion.div>
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-5xl font-black text-[#1d1d1f] mb-4 text-center tracking-tight relative z-10"
      >
        UAE Job Finder
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-500 text-center mb-14 max-w-xs font-bold relative z-10 leading-relaxed"
      >
        The most fluid way to find your next career move in the Emirates.
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm space-y-6 relative z-10"
      >
        <Button onClick={handleGoogleLogin} variant="secondary" className="w-full py-6 flex items-center justify-center gap-4 bg-white/60 rounded-[28px] border-white/60 shadow-xl">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <span className="font-black text-[#1d1d1f] tracking-tight">Continue with Google</span>
        </Button>
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/20"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="glass px-4 py-1 rounded-full text-gray-400 font-black">Or</span></div>
        </div>
        <div className="space-y-4">
          <Input placeholder="Email Address" type="email" className="py-5 rounded-[24px]" />
          <Input placeholder="Password" type="password" className="py-5 rounded-[24px]" />
          <Button className="w-full py-6 text-sm font-black uppercase tracking-widest rounded-[28px]">Sign In</Button>
        </div>
        
        <p className="text-center text-sm text-gray-500 pt-6 font-medium">
          Don't have an account? <Link to="/register" className="text-blue-600 font-black hover:underline">Sign Up</Link>
        </p>
      </motion.div>
    </div>
  );
};

const Profile = ({ user, profile }: { user: User | null | undefined, profile: UserProfile | null }) => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);

  if (!user) return <Navigate to="/login" />;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF or DOCX file.');
      return;
    }

    // Validate file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `cvs/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', user.uid), {
        cvUrl: downloadUrl
      });
      alert('CV uploaded successfully!');
    } catch (error) {
      console.error('Error uploading CV:', error);
      alert('Failed to upload CV. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="relative h-80 bg-blue-600 flex items-center justify-center overflow-hidden rounded-b-[64px] shadow-2xl">
        <LiquidBackground />
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-12 left-8 w-14 h-14 glass flex items-center justify-center rounded-full text-white z-30 hover:scale-110 transition-transform shadow-xl border border-white/40"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
        
        <div className="flex flex-col items-center gap-6 relative z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 rounded-[48px] bg-white border-8 border-white/30 overflow-hidden shadow-2xl"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-50">
                <UserIcon className="w-16 h-16 text-blue-200" />
              </div>
            )}
          </motion.div>
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-black text-white tracking-tight"
            >
              {profile?.name || user.displayName}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-blue-100 font-bold opacity-80 text-base"
            >
              {user.email}
            </motion.p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-14 relative z-20 space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="ios-card p-10 shadow-2xl"
        >
          <h2 className="font-black text-[#1d1d1f] mb-8 uppercase tracking-widest text-[10px] opacity-40">My Dashboard</h2>
          <div className="grid grid-cols-2 gap-6">
            <Link to="/saved" className="bg-blue-500/5 p-8 rounded-[40px] flex flex-col items-center gap-4 border border-blue-500/10 hover:bg-blue-500/10 transition-all group shadow-sm">
              <div className="w-16 h-16 glass rounded-3xl flex items-center justify-center text-blue-600 shadow-xl group-hover:scale-110 transition-transform border border-white/40">
                <Bookmark className="w-8 h-8" />
              </div>
              <span className="text-base font-black text-gray-700 tracking-tight">Saved Jobs</span>
            </Link>
            <Link to="/applications" className="bg-green-500/5 p-8 rounded-[40px] flex flex-col items-center gap-4 border border-green-500/10 hover:bg-green-500/10 transition-all group shadow-sm">
              <div className="w-16 h-16 glass rounded-3xl flex items-center justify-center text-green-500 shadow-xl group-hover:scale-110 transition-transform border border-white/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-base font-black text-gray-700 tracking-tight">Applied</span>
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="ios-card p-10 shadow-2xl"
        >
          <h2 className="font-black text-[#1d1d1f] mb-8 uppercase tracking-widest text-[10px] opacity-40">My CV / Resume</h2>
          {profile?.cvUrl ? (
            <div className="flex items-center justify-between p-8 glass rounded-[40px] border border-white/60 shadow-xl">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 glass rounded-[32px] flex items-center justify-center text-blue-600 shadow-xl border border-white/40">
                  <FileText className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-xl font-black text-gray-800 tracking-tight">Current CV</p>
                  <a 
                    href={profile.cvUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 font-black flex items-center gap-1 hover:underline mt-1"
                  >
                    View Document <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} disabled={uploading} />
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-16 h-16 glass rounded-3xl flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors border border-white/60 shadow-xl"
                >
                  <Upload className="w-8 h-8" />
                </motion.div>
              </label>
            </div>
          ) : (
            <div className="p-16 border-4 border-dashed border-gray-100 rounded-[64px] flex flex-col items-center text-center bg-gray-50/50">
              <div className="w-24 h-24 glass rounded-[40px] flex items-center justify-center mb-8 text-gray-300 shadow-xl border border-white/40">
                <Upload className="w-12 h-12" />
              </div>
              <p className="text-lg text-gray-500 font-bold mb-10 max-w-[250px]">Upload your CV to apply for jobs faster.</p>
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} disabled={uploading} />
                <Button className="px-12 py-6 rounded-[28px] font-black uppercase tracking-widest text-sm shadow-xl">Upload CV</Button>
              </label>
            </div>
          )}
        </motion.div>

        <div className="glass rounded-[48px] p-4 shadow-2xl border border-white/40 overflow-hidden space-y-2">
          <button className="w-full flex items-center justify-between p-6 hover:bg-white/40 rounded-[32px] transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors shadow-sm border border-white/40">
                <UserIcon className="w-6 h-6" />
              </div>
              <span className="font-black text-lg text-gray-700 tracking-tight">Edit Profile</span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-300 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="w-full flex items-center justify-between p-6 hover:bg-white/40 rounded-[32px] transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors shadow-sm border border-white/40">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="font-black text-lg text-gray-700 tracking-tight">Security</span>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-300 group-hover:translate-x-1 transition-transform" />
          </button>
          {profile?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="w-full flex items-center justify-between p-6 hover:bg-white/40 rounded-[32px] transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-white/40">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="font-black text-lg text-gray-700 tracking-tight">Admin Panel</span>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-300 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          <button onClick={() => signOut(auth)} className="w-full flex items-center justify-between p-6 hover:bg-red-500/10 rounded-[32px] transition-all group text-red-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-white/40">
                <LogOut className="w-6 h-6" />
              </div>
              <span className="font-black text-lg tracking-tight">Sign Out</span>
            </div>
            <ChevronRight className="w-6 h-6 text-red-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

const PostJob = ({ user, profile }: { user: User | null | undefined, profile: UserProfile | null }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: 'Dubai',
    salary: '',
    description: '',
    requirements: '',
    jobType: 'Full-time',
    contactEmail: '',
    isActivelyHiring: false
  });

  if (!user) return <Navigate to="/login" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'jobs'), {
        ...formData,
        postedDate: serverTimestamp(),
        authorUid: user.uid,
        isVerified: profile?.role === 'admin',
        scamReportCount: 0
      });
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="relative h-64 bg-blue-600 flex items-center justify-center overflow-hidden rounded-b-[64px] shadow-2xl mb-10">
        <LiquidBackground />
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-12 left-8 w-14 h-14 glass flex items-center justify-center rounded-full text-white z-30 hover:scale-110 transition-transform shadow-xl border border-white/40"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
        <div className="text-center relative z-10">
          <h1 className="text-2xl font-black text-white tracking-tight">Post a Job</h1>
          <p className="text-blue-100 font-bold opacity-80 mt-2 uppercase tracking-widest text-[9px]">Reach the best talent in UAE</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 space-y-8">
        <div className="ios-card p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Job Title</label>
            <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Senior Frontend Developer" className="py-4 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company Name</label>
            <Input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="e.g. Tech Dubai LLC" className="py-4 rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location</label>
              <select 
                className="w-full px-4 py-4 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-gray-700"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value as any})}
              >
                <option>Dubai</option>
                <option>Sharjah</option>
                <option>Ajman</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Job Type</label>
              <select 
                className="w-full px-4 py-4 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-gray-700"
                value={formData.jobType}
                onChange={e => setFormData({...formData, jobType: e.target.value as any})}
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Freelance</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Salary (Optional)</label>
            <Input value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} placeholder="e.g. AED 15,000 - 20,000" className="py-4 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Email (HR)</label>
            <Input required type="email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} placeholder="e.g. hr@company.com" className="py-4 rounded-2xl" />
          </div>
        </div>

        <div className="ios-card p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Job Description</label>
            <textarea 
              required
              rows={6}
              className="w-full px-6 py-4 bg-white/50 backdrop-blur-md border border-white/40 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium text-gray-700 leading-relaxed"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the role, responsibilities, etc."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Requirements</label>
            <textarea 
              rows={4}
              className="w-full px-6 py-4 bg-white/50 backdrop-blur-md border border-white/40 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium text-gray-700 leading-relaxed"
              value={formData.requirements}
              onChange={e => setFormData({...formData, requirements: e.target.value})}
              placeholder="Skills, education, experience needed..."
            />
          </div>
        </div>

        <div className="flex items-center gap-4 p-6 glass rounded-[32px] border border-white/60 shadow-sm">
          <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-orange-500/20">
            <Zap className="w-7 h-7 fill-current" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-[#1d1d1f] uppercase tracking-tight">Actively Hiring</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Show a badge to attract more candidates</p>
          </div>
          <input 
            type="checkbox" 
            className="w-8 h-8 rounded-xl border-white/60 text-blue-600 focus:ring-blue-500/30 bg-white/50 backdrop-blur-md"
            checked={formData.isActivelyHiring}
            onChange={e => setFormData({...formData, isActivelyHiring: e.target.checked})}
          />
        </div>

        <Button type="submit" className="w-full py-6 mt-4 text-sm font-black uppercase tracking-widest rounded-[28px] shadow-xl" disabled={loading}>
          {loading ? 'Posting...' : 'Post Job Listing'}
        </Button>
      </form>
    </div>
  );
};

const SavedJobs = ({ user }: { user: User | null | undefined }) => {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/saved_jobs`), orderBy('savedAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const jobIds = snap.docs.map(d => d.data().jobId);
      if (jobIds.length === 0) {
        setSavedJobs([]);
        setLoading(false);
        return;
      }
      
      const jobsData: Job[] = [];
      for (const id of jobIds) {
        const jobDoc = await getDoc(doc(db, 'jobs', id));
        if (jobDoc.exists()) {
          jobsData.push({ id: jobDoc.id, ...jobDoc.data() } as Job);
        }
      }
      setSavedJobs(jobsData);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="pb-24">
      <div className="relative h-64 bg-blue-600 flex items-center justify-center overflow-hidden rounded-b-[64px] shadow-2xl mb-10">
        <LiquidBackground />
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-12 left-8 w-14 h-14 glass flex items-center justify-center rounded-full text-white z-30 hover:scale-110 transition-transform shadow-xl border border-white/40"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
        <div className="text-center relative z-10">
          <h1 className="text-2xl font-black text-white tracking-tight">Saved Jobs</h1>
          <p className="text-blue-100 font-bold opacity-80 mt-2 uppercase tracking-widest text-[9px]">Your personal shortlist</p>
        </div>
      </div>

      <div className="px-6">
        {loading ? (
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 glass rounded-[40px] animate-pulse border border-white/40" />
          ))}
        </div>
      ) : savedJobs.length > 0 ? (
        <div className="flex flex-col gap-6">
          {savedJobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <JobCard job={job} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 glass rounded-[50px] border border-white/40 shadow-xl">
          <div className="w-24 h-24 glass rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner border border-white/40">
            <Bookmark className="w-12 h-12 text-gray-300" />
          </div>
          <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No saved jobs yet.</p>
          <Button onClick={() => navigate('/')} variant="secondary" className="mt-8 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">
            Explore Jobs
          </Button>
        </div>
      )}
      </div>
    </div>
  );
};

const AdminPanel = ({ profile }: { profile: UserProfile | null }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'reports'>('pending');

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    
    const unsubJobs = onSnapshot(query(collection(db, 'jobs'), orderBy('postedDate', 'desc')), (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
    });

    const unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
    });

    setLoading(false);
    return () => {
      unsubJobs();
      unsubReports();
    };
  }, [profile]);

  if (profile?.role !== 'admin') return <Navigate to="/" />;

  const handleVerify = async (jobId: string, status: boolean) => {
    await updateDoc(doc(db, 'jobs', jobId), { isVerified: status });
  };

  const handleDelete = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      await deleteDoc(doc(db, 'jobs', jobId));
    }
  };

  const pendingJobs = jobs.filter(j => !j.isVerified);

  return (
    <div className="pb-24">
      <div className="relative h-64 bg-blue-600 flex items-center justify-center overflow-hidden rounded-b-[64px] shadow-2xl mb-10">
        <LiquidBackground />
        <div className="text-center relative z-10">
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Panel</h1>
          <p className="text-blue-100 font-bold opacity-80 mt-2 uppercase tracking-widest text-[9px]">Manage the ecosystem</p>
        </div>
      </div>

      <div className="px-6">
        <div className="flex gap-3 mb-10 overflow-x-auto no-scrollbar pb-2">
          <button 
            onClick={() => setActiveTab('pending')}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm", 
              activeTab === 'pending' 
                ? "bg-orange-500/10 text-orange-600 border-orange-500/30 scale-105" 
                : "glass border-white/60 text-gray-400"
            )}
          >
            Pending ({pendingJobs.length})
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm", 
              activeTab === 'reports' 
                ? "bg-red-500/10 text-red-600 border-red-500/30 scale-105" 
                : "glass border-white/60 text-gray-400"
            )}
          >
            Reports ({reports.length})
          </button>
          <button 
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm", 
              activeTab === 'all' 
                ? "bg-blue-500/10 text-blue-600 border-blue-500/30 scale-105" 
                : "glass border-white/60 text-gray-400"
            )}
          >
            All Listings ({jobs.length})
          </button>
        </div>

      <div className="space-y-10">
        {activeTab === 'reports' && (
          <section>
            <h2 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Recent Reports
            </h2>
            <div className="space-y-4">
              {reports.map(report => (
                <div key={report.id} className="ios-card p-6 border-red-500/20 bg-red-500/5">
                  <p className="text-sm font-black text-red-600 mb-2 uppercase tracking-tight">Reason: {report.reason}</p>
                  <p className="text-[10px] font-mono text-red-400 mb-4 uppercase tracking-widest">Job ID: {report.jobId}</p>
                  <div className="flex gap-4">
                    <Link to={`/job/${report.jobId}`} className="ios-button-secondary py-2 px-4 text-[10px] flex items-center gap-2">
                      <ExternalLink className="w-3 h-3" /> View Job
                    </Link>
                    <button onClick={() => deleteDoc(doc(db, 'reports', report.id))} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Dismiss</button>
                  </div>
                </div>
              ))}
              {reports.length === 0 && <p className="text-gray-400 text-sm italic font-medium text-center py-10 glass rounded-3xl border border-white/40">No active reports.</p>}
            </div>
          </section>
        )}

        {activeTab === 'pending' && (
          <section>
            <h2 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
              Pending Verification
            </h2>
            <div className="space-y-6">
              {pendingJobs.map(job => (
                <div key={job.id} className="ios-card p-6 border-orange-500/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-xl text-[#1d1d1f] tracking-tight">{job.title}</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">{job.company} • {job.location}</p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-6 font-medium leading-relaxed">{job.description}</p>
                  <div className="flex gap-4">
                    <Button onClick={() => handleVerify(job.id, true)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-green-500 hover:bg-green-600 rounded-2xl">Approve</Button>
                    <Button variant="danger" onClick={() => handleDelete(job.id)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl">Reject</Button>
                    <Link to={`/job/${job.id}`} className="ios-button-secondary px-4 py-3 text-[10px] flex items-center justify-center">Details</Link>
                  </div>
                </div>
              ))}
              {pendingJobs.length === 0 && (
                <div className="text-center py-20 glass rounded-[40px] border border-dashed border-white/40">
                  <CheckCircle2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No jobs pending verification.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'all' && (
          <section>
            <h2 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-500" />
              All Listings
            </h2>
            <div className="space-y-6">
              {jobs.map(job => (
                <div key={job.id} className="ios-card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-xl text-[#1d1d1f] tracking-tight">{job.title}</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">{job.company} • {job.location}</p>
                    </div>
                    <Badge variant={job.isVerified ? 'success' : 'warning'}>
                      {job.isVerified ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex gap-3 mt-6">
                    {!job.isVerified && (
                      <Button onClick={() => handleVerify(job.id, true)} className="py-2 px-4 text-[10px] font-black uppercase tracking-widest bg-green-500 hover:bg-green-600 rounded-xl">Approve</Button>
                    )}
                    {job.isVerified && (
                      <Button variant="outline" onClick={() => handleVerify(job.id, false)} className="py-2 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl border-blue-500/30 text-blue-600">Unverify</Button>
                    )}
                    <Button variant="danger" onClick={() => handleDelete(job.id)} className="py-2 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl">Delete</Button>
                    <Link to={`/job/${job.id}`} className="ios-button-secondary px-4 py-2 text-[10px] flex items-center justify-center">View</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  </div>
  );
};

const Applications = ({ user }: { user: User | null | undefined }) => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/applications`), orderBy('appliedAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const appsData = [];
      for (const d of snap.docs) {
        const data = d.data();
        const jobDoc = await getDoc(doc(db, 'jobs', data.jobId));
        if (jobDoc.exists()) {
          appsData.push({ 
            id: d.id, 
            ...data, 
            job: { id: jobDoc.id, ...jobDoc.data() } 
          });
        }
      }
      setApplications(appsData);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="pb-24">
      <div className="relative h-64 bg-blue-600 flex items-center justify-center overflow-hidden rounded-b-[64px] shadow-2xl mb-10">
        <LiquidBackground />
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-12 left-8 w-14 h-14 glass flex items-center justify-center rounded-full text-white z-30 hover:scale-110 transition-transform shadow-xl border border-white/40"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
        <div className="text-center relative z-10">
          <h1 className="text-2xl font-black text-white tracking-tight">Applications</h1>
          <p className="text-blue-100 font-bold opacity-80 mt-2 uppercase tracking-widest text-[9px]">Track your career progress</p>
        </div>
      </div>

      <div className="px-6">
        {loading ? (
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 glass rounded-[32px] animate-pulse border border-white/40" />
          ))}
        </div>
      ) : applications.length > 0 ? (
        <div className="flex flex-col gap-6">
          {applications.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="ios-card p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-white/40">
                  <Briefcase className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#1d1d1f] tracking-tight">{app.job.title}</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{app.job.company}</p>
                  <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest mt-1">Applied {formatDistanceToNow(app.appliedAt?.toDate() || new Date())} ago</p>
                </div>
              </div>
              <Link to={`/job/${app.jobId}`} className="w-10 h-10 glass rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors border border-white/60">
                <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 glass rounded-[50px] border border-white/40 shadow-xl">
          <div className="w-24 h-24 glass rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner border border-white/40">
            <CheckCircle2 className="w-12 h-12 text-gray-300" />
          </div>
          <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No applications yet.</p>
          <Button onClick={() => navigate('/')} variant="secondary" className="mt-8 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">
            Find Jobs
          </Button>
        </div>
      )}
      </div>
    </div>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (user) navigate('/');
  }, [user]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <LiquidBackground />
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-28 h-28 bg-blue-600 rounded-[44px] flex items-center justify-center mb-10 shadow-2xl shadow-blue-500/40 border-8 border-white/30 relative z-10"
      >
        <Briefcase className="w-12 h-12 text-white" />
      </motion.div>
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-black text-[#1d1d1f] mb-4 text-center tracking-tight relative z-10"
      >
        Join UAEJobs
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-500 text-center mb-14 max-w-xs font-bold relative z-10 leading-relaxed"
      >
        Create an account to start your career journey in the Emirates.
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm space-y-6 relative z-10"
      >
        <Button 
          onClick={handleGoogleLogin} 
          className="w-full py-6 text-sm font-black uppercase tracking-widest rounded-[28px] bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 shadow-xl"
        >
          <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" referrerPolicy="no-referrer" />
          Continue with Google
        </Button>
        
        <p className="text-center text-sm text-gray-500 pt-6 font-medium">
          Already have an account? <Link to="/login" className="text-blue-600 font-black hover:underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, loadingAuth] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'jobs'), orderBy('postedDate', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
      setLoadingJobs(false);
    });
    return unsub;
  }, []);

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <LiquidBackground />
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-500/20" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen relative overflow-x-hidden">
        <LiquidBackground />
        <Navbar user={user} profile={profile} />
        
        <main className="max-w-2xl mx-auto pt-8 pb-32 px-4">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home jobs={jobs} loading={loadingJobs} />} />
              <Route path="/vibe-prospecting" element={<VibeProspecting user={user} profile={profile} />} />
              <Route path="/ats-checker" element={<ATSChecker />} />
              <Route path="/job/:id" element={<JobDetails user={user} profile={profile} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile user={user} profile={profile} />} />
              <Route path="/saved" element={<SavedJobs user={user} />} />
              <Route path="/applications" element={<Applications user={user} />} />
              <Route path="/post-job" element={<PostJob user={user} profile={profile} />} />
              <Route path="/admin" element={<AdminPanel profile={profile} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
        </main>

        <BottomNav />
      </div>
    </Router>
  );
}
