import { GoogleGenAI, Type } from "@google/genai";
import { Prospect, ATSAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface WebJob {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  jobType: string;
  sourceUrl: string;
}

export async function searchJobsOnWeb(query: string): Promise<WebJob[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find 5-7 real, recent job openings for "${query}" in the UAE (specifically Dubai, Sharjah, or Ajman). 
      Return the results as a JSON array of objects. 
      Each object must have: title, company, location (must be Dubai, Sharjah, or Ajman), salary (if available), description (brief summary), jobType (Full-time, Part-time, etc.), and sourceUrl (the link to the job post).`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              company: { type: Type.STRING },
              location: { type: Type.STRING },
              salary: { type: Type.STRING },
              description: { type: Type.STRING },
              jobType: { type: Type.STRING },
              sourceUrl: { type: Type.STRING },
            },
            required: ["title", "company", "location", "description", "jobType", "sourceUrl"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as WebJob[];
  } catch (error) {
    console.error("Error searching jobs on web:", error);
    return [];
  }
}

export async function generateJobApplicationEmail(
  jobTitle: string,
  company: string,
  jobDescription: string,
  userName: string,
  userSkills?: string[],
  userExperience?: string,
  cvUrl?: string
): Promise<{ subject: string; body: string }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a professional, ATS-friendly job application email.
      Job Title: ${jobTitle}
      Company: ${company}
      Job Description: ${jobDescription}
      Applicant Name: ${userName}
      Applicant Skills: ${userSkills?.join(", ") || "Not specified"}
      Applicant Experience: ${userExperience || "Not specified"}
      CV Link: ${cvUrl || "Not provided"}

      The email should be concise, professional, and highlight how the applicant's skills match the job. 
      Include a clear subject line. 
      If a CV link is provided, mention it as an attachment/link. 
      Return as JSON with "subject" and "body" fields.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
          },
          required: ["subject", "body"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating application email:", error);
    return {
      subject: `Application for ${jobTitle} - ${userName}`,
      body: `Dear Hiring Manager,\n\nI am writing to express my interest in the ${jobTitle} position at ${company}.\n\nBest regards,\n${userName}`,
    };
  }
}

export async function vibeProspecting(): Promise<Prospect[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find 20 real HR contacts or hiring managers who are actively hiring for Programming, Software Engineering, or Tech roles (Jobs or Internships) in the UAE (Dubai, Abu Dhabi, etc.). 
      I need a consolidated list of people with their:
      - Full Name
      - Company Name
      - Role (e.g., HR Manager, Talent Acquisition, Engineering Manager)
      - LinkedIn Profile URL
      - Email Address (if publicly available, otherwise provide a professional guess or company HR email)
      - Contact Number (if available)
      - What they are hiring for (e.g., Frontend Developer, Fullstack Intern, DevOps Engineer)
      
      Return the results as a JSON array of objects.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              company: { type: Type.STRING },
              role: { type: Type.STRING },
              linkedin: { type: Type.STRING },
              email: { type: Type.STRING },
              contactNumber: { type: Type.STRING },
              hiringFor: { type: Type.STRING },
            },
            required: ["name", "company", "role", "linkedin", "email", "hiringFor"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as Prospect[];
  } catch (error) {
    console.error("Error in vibe prospecting:", error);
    return [];
  }
}

export async function analyzeResumeATS(resumeText: string): Promise<ATSAnalysis> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following resume text for ATS (Applicant Tracking System) friendliness. 
      Resume Text:
      ${resumeText}

      Provide a detailed analysis including:
      1. An overall ATS score (0-100).
      2. Key strengths of the resume.
      3. Key weaknesses or missing elements.
      4. Specific suggestions for improvement, categorized by section (e.g., Contact Info, Experience, Skills, Formatting).
      5. A boolean indicating if it's generally ATS-friendly.

      Return the result as a JSON object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  section: { type: Type.STRING },
                  issue: { type: Type.STRING },
                  fix: { type: Type.STRING },
                },
                required: ["section", "issue", "fix"],
              },
            },
            isAtsFriendly: { type: Type.BOOLEAN },
          },
          required: ["score", "strengths", "weaknesses", "suggestions", "isAtsFriendly"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as ATSAnalysis;
  } catch (error) {
    console.error("Error analyzing resume ATS:", error);
    throw error;
  }
}

export async function generateATSResume(resumeText: string, suggestions: string[]): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rewrite the following resume to be highly ATS-friendly, incorporating the provided suggestions. 
      Original Resume:
      ${resumeText}

      Suggestions to incorporate:
      ${suggestions.join("\n")}

      Guidelines:
      - Use a clean, professional, and standard resume format.
      - Use standard section headings (e.g., Contact Information, Professional Summary, Experience, Education, Skills).
      - Use bullet points for experience and skills.
      - Ensure high keyword density related to the roles mentioned in the resume.
      - Avoid complex formatting, tables, or graphics.
      - Return ONLY the rewritten resume text.`,
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return text;
  } catch (error) {
    console.error("Error generating ATS resume:", error);
    throw error;
  }
}
