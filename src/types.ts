export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  skills?: string[];
  experience?: string;
  cvUrl?: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: 'Dubai' | 'Sharjah' | 'Ajman';
  salary?: string;
  description: string;
  requirements?: string;
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance';
  postedDate: any; // Firestore Timestamp
  isVerified?: boolean;
  authorUid: string;
  contactEmail?: string;
  isActivelyHiring?: boolean;
  scamReportCount?: number;
}

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  savedAt: any;
}

export interface Report {
  id: string;
  jobId: string;
  reporterId: string;
  reason: string;
  createdAt: any;
}

export interface Prospect {
  name: string;
  company: string;
  role: string;
  linkedin: string;
  email: string;
  contactNumber?: string;
  hiringFor: string;
}

export interface ATSAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: {
    section: string;
    issue: string;
    fix: string;
  }[];
  isAtsFriendly: boolean;
}
