import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Star, 
  TrendingUp, 
  Upload, 
  X, 
  File, 
  Sparkles, 
  Copy, 
  Check, 
  Download,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { analyzeResumeATS, generateATSResume } from '../services/geminiService';
import { ATSAnalysis } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { cn } from '../lib/utils';

// Set worker path from CDN for better compatibility in this environment
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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

const ATSChecker: React.FC = () => {
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState('');
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (file: File) => {
    setExtracting(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      setResumeText(fullText);
      setFileName(file.name);
    } catch (err) {
      console.error('Error extracting PDF text:', err);
      setError('Failed to extract text from PDF. Please try pasting the text manually.');
    } finally {
      setExtracting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      extractTextFromPDF(file);
    } else if (file) {
      setError('Please upload a PDF file.');
    }
  };

  const clearFile = () => {
    setFileName(null);
    setResumeText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeResumeATS(resumeText);
      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze resume. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOptimized = async () => {
    if (!resumeText || !analysis) return;
    setGenerating(true);
    setError(null);
    try {
      const suggestions = analysis.suggestions.map(s => `${s.section}: ${s.issue} - ${s.fix}`);
      const result = await generateATSResume(resumeText, suggestions);
      setGeneratedResume(result);
    } catch (err) {
      setError('Failed to generate optimized resume. Please try again.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedResume) return;
    navigator.clipboard.writeText(generatedResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadResume = () => {
    if (!generatedResume) return;
    
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const lines = doc.splitTextToSize(generatedResume, maxLineWidth);
    
    let cursorY = margin;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    lines.forEach((line: string) => {
      if (cursorY + 5 > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(line, margin, cursorY);
      cursorY += 5;
    });
    
    doc.save(`Optimized_Resume_${fileName?.replace('.pdf', '') || 'ATS'}.pdf`);
  };

  return (
    <div className="pb-24 px-6 pt-10">
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="w-12 h-12 glass flex items-center justify-center rounded-full text-gray-600 hover:scale-110 transition-transform shadow-sm border border-white/60">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">ATS Optimizer</h1>
            <p className="text-gray-500 font-black text-[10px] mt-1 tracking-widest uppercase opacity-60">Resume Optimization • AI Analysis</p>
          </div>
        </div>
        <div className="w-12 h-12 glass flex items-center justify-center rounded-2xl text-blue-600 shadow-xl border border-white/60">
          <TrendingUp className="w-6 h-6" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Input Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ios-card p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Resume Content</h2>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              className="py-2.5 px-5 text-[10px] font-black uppercase tracking-widest rounded-2xl"
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </Button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf"
              className="hidden"
            />
          </div>

          <AnimatePresence mode="wait">
            {fileName ? (
              <motion.div 
                key="file-badge"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mb-8 p-5 glass rounded-[28px] flex items-center justify-between border border-blue-500/20 shadow-lg shadow-blue-500/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-blue-600 shadow-inner">
                    <File className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800 truncate max-w-[200px] tracking-tight">{fileName}</p>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">PDF Extracted</p>
                  </div>
                </div>
                <button onClick={clearFile} className="w-10 h-10 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all">
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && file.type === 'application/pdf') extractTextFromPDF(file);
                }}
                className="mb-8 p-12 border-4 border-dashed border-gray-100 rounded-[40px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50/50 hover:border-blue-200 transition-all group"
              >
                <div className="w-20 h-20 rounded-[32px] glass mb-6 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl border border-white/60">
                  <Upload className="w-10 h-10 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
                <p className="font-black text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-gray-600">Drop PDF here or click to upload</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <textarea
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                if (fileName) setFileName(null);
              }}
              placeholder="Or paste your resume content here..."
              className="ios-input w-full h-80 p-8 resize-none text-lg font-medium leading-relaxed"
            />
            <AnimatePresence>
              {extracting && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 glass rounded-[40px] flex flex-col items-center justify-center z-20 backdrop-blur-xl"
                >
                  <RefreshCw className="w-12 h-12 animate-spin mb-6 text-blue-600" />
                  <p className="font-black text-[10px] uppercase tracking-widest text-blue-600">Extracting Text...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={loading || !resumeText.trim()}
            className="mt-10 w-full py-6 text-xs font-black uppercase tracking-widest rounded-[28px] shadow-2xl shadow-blue-500/30"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze Resume
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </motion.section>

        {/* Results Section */}
        <AnimatePresence>
          {analysis && (
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Score Card */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="ios-card p-10 bg-gradient-to-br from-blue-500/20 to-transparent relative overflow-hidden"
              >
                <div className="relative z-10">
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-6">ATS Compatibility Score</h3>
                  <div className="flex items-baseline gap-4">
                    <span className="text-6xl font-black text-[#1d1d1f] tracking-tighter">{analysis.score}</span>
                    <span className="text-xl font-black text-gray-300">/ 100</span>
                  </div>
                  <div className="mt-8 flex items-center gap-4">
                    {analysis.isAtsFriendly ? (
                      <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest border border-green-500/20 shadow-sm">
                        <CheckCircle className="w-4 h-4" />
                        ATS Friendly
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-orange-500/10 text-orange-600 px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest border border-orange-500/20 shadow-sm">
                        <AlertCircle className="w-4 h-4" />
                        Needs Improvement
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute -top-20 -right-20 opacity-5 text-blue-600">
                  <Star className="w-80 h-80 fill-current" />
                </div>
              </motion.div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="ios-card p-8">
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    Strengths
                  </h3>
                  <ul className="space-y-5">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-sm font-bold text-gray-700 flex gap-4 items-start">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0 shadow-lg shadow-green-500/40" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="ios-card p-8">
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    </div>
                    Weaknesses
                  </h3>
                  <ul className="space-y-5">
                    {analysis.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm font-bold text-gray-700 flex gap-4 items-start">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0 shadow-lg shadow-orange-500/40" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggestions */}
              <div className="ios-card overflow-hidden">
                <div className="p-8 border-b border-white/40 flex items-center justify-between">
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Actionable Suggestions</h3>
                  <Button
                    onClick={handleGenerateOptimized}
                    disabled={generating}
                    variant="secondary"
                    className="py-2.5 px-5 text-[10px] font-black uppercase tracking-widest rounded-2xl"
                  >
                    {generating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {generating ? 'Generating...' : 'Optimize Resume'}
                  </Button>
                </div>
                <div className="divide-y divide-white/40">
                  {analysis.suggestions.map((s, i) => (
                    <div key={i} className="p-8 hover:bg-white/30 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-black text-xl text-[#1d1d1f] tracking-tight">{s.section}</span>
                        <span className="font-black text-[9px] uppercase bg-red-500/10 text-red-600 px-3 py-1.5 rounded-xl border border-red-500/20">Issue Identified</span>
                      </div>
                      <p className="text-sm font-bold text-gray-600 mb-6 leading-relaxed">{s.issue}</p>
                      <div className="glass p-6 rounded-[28px] border-l-8 border-blue-500 shadow-inner">
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3">Recommended Fix</p>
                        <p className="text-sm font-bold text-gray-800 leading-relaxed">{s.fix}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Resume */}
              <AnimatePresence>
                {generatedResume && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="ios-card overflow-hidden shadow-2xl border-2 border-blue-500/20"
                  >
                    <div className="p-8 border-b border-white/40 flex items-center justify-between bg-white/40">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-black text-lg text-[#1d1d1f] tracking-tight">Optimized Version</h3>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">AI Enhanced</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={downloadResume}
                          variant="secondary"
                          className="py-2.5 px-5 text-[10px] font-black uppercase tracking-widest rounded-2xl"
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </Button>
                        <Button
                          onClick={copyToClipboard}
                          variant="secondary"
                          className="py-2.5 px-5 text-[10px] font-black uppercase tracking-widest rounded-2xl"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                    <div className="p-10 font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-[800px] overflow-y-auto bg-white/20 shadow-inner">
                      {generatedResume}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 glass border-2 border-red-500/30 text-red-600 rounded-[32px] flex items-center gap-4 shadow-xl"
          >
            <AlertCircle className="w-6 h-6" />
            <span className="font-black text-[10px] uppercase tracking-widest">{error}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ATSChecker;
