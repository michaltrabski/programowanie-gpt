import React, { useState, useEffect } from "react";

// --- Types ---
interface ContactInfo {
  email: string;
  phone: string;
  linkedin: string;
  location: string;
}

interface Experience {
  id: string;
  role: string;
  company: string;
  duration: string;
  description: string[];
}

interface Education {
  id: string;
  degree: string;
  school: string;
  year: string;
}

interface SkillSet {
  category: string;
  items: string[];
}

interface CVData {
  fullName: string;
  title: string;
  summary: string;
  contact: ContactInfo;
  skills: SkillSet[];
  experience: Experience[];
  education: Education[];
}

// --- Initial Data ---
const INITIAL_DATA: CVData = {
  fullName: "Alex J. Developer",
  title: "Senior Full Stack Engineer",
  summary:
    "Passionate software engineer with 6+ years of experience building scalable web applications. Expert in React, TypeScript, and Node.js ecosystems. Proven track record of leading teams and optimizing system performance.",
  contact: {
    email: "alex.dev@example.com",
    phone: "+1 (555) 123-4567",
    linkedin: "linkedin.com/in/alexjdev",
    location: "San Francisco, CA",
  },
  skills: [
    { category: "Frontend", items: ["React", "TypeScript", "Tailwind CSS", "Next.js"] },
    { category: "Backend", items: ["Node.js", "PostgreSQL", "GraphQL", "Docker"] },
    { category: "Tools", items: ["Git", "AWS", "Jira", "Figma"] },
  ],
  experience: [
    {
      id: "1",
      role: "Senior Frontend Developer",
      company: "TechFlow Solutions",
      duration: "2021 - Present",
      description: [
        "Architected a new dashboard reducing load times by 40%.",
        "Mentored 3 junior developers and established code review standards.",
        "Implemented unit testing coverage up to 85% using Jest and React Testing Library.",
      ],
    },
    {
      id: "2",
      role: "Software Engineer",
      company: "Creative Digital Agency",
      duration: "2018 - 2021",
      description: [
        "Developed responsive websites for high-profile clients.",
        "Collaborated with designers to implement pixel-perfect UIs.",
        "Integrated third-party APIs including Stripe and Google Maps.",
      ],
    },
  ],
  education: [
    {
      id: "1",
      degree: "B.S. Computer Science",
      school: "University of Technology",
      year: "2018",
    },
  ],
};

const CVGenerator: React.FC = () => {
  const [jsonString, setJsonString] = useState<string>(JSON.stringify(INITIAL_DATA, null, 2));
  const [data, setData] = useState<CVData>(INITIAL_DATA);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonString);
      setData(parsed);
      setError(null);
    } catch (e) {
      setError("Invalid JSON format");
    }
  }, [jsonString]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-6 font-sans">
      {/* --- CSS FOR PRINTING --- */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }

          /* Hide sidebar and non-essential elements */
          .no-print, .no-print * {
            display: none !important;
          }

          /* Reset root containers */
          body, html, #root, .main-layout {
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            overflow: visible !important;
            background-color: white !important;
          }

          /* Reset the CV wrapper */
          .cv-preview-wrapper {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 9999;
          }
          
          /* CRITICAL FIXES FOR THE CV ITSELF */
          #printable-cv {
            width: 210mm !important;
            padding: 20mm !important; /* Internal padding acting as page margin */
            margin: 0 !important;
            
            /* Remove the "Preview" styles */
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            
            min-height: 100vh !important;
            background-color: white !important;
            color: black !important; /* Ensure text is pitch black for crispness */
          }
        }
      `}</style>

      {/* Main Layout Grid */}
      <div className="main-layout max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* --- LEFT PANEL: EDITOR --- */}
        <div className="no-print lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-3rem)] sticky top-6">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span>📝</span> JSON Editor
            </h2>
            <textarea
              className={`flex-1 w-full p-4 font-mono text-xs bg-[#f9fafb] border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                error ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
              }`}
              value={jsonString}
              onChange={(e) => setJsonString(e.target.value)}
              spellCheck={false}
            />
            {error && <div className="mt-2 text-red-500 text-xs font-bold bg-red-50 p-2 rounded">⚠️ {error}</div>}
            <button
              onClick={handlePrint}
              disabled={!!error}
              className="mt-4 w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <DownloadIcon /> Download PDF / Print
            </button>
          </div>
        </div>

        {/* --- RIGHT PANEL: PREVIEW --- */}
        <div className="cv-preview-wrapper lg:col-span-8 overflow-auto flex justify-center bg-[#e5e7eb] rounded-xl p-8 border border-gray-300 shadow-inner">
          <div className="scale-[0.85] lg:scale-100 origin-top">
            {/* --- CV CONTENT --- */}
            <div
              id="printable-cv"
              // On Screen: Has shadow, rounded corners, etc.
              // On Print: CSS override above removes these.
              className="bg-white text-[#1f2937] shadow-2xl mx-auto rounded-none lg:rounded-md"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "40px",
                boxSizing: "border-box",
              }}
            >
              {/* Header */}
              <header className="border-b-2 border-[#1f2937] pb-6 mb-6">
                <h1 className="text-4xl font-bold uppercase tracking-tight text-[#111827] mb-2">{data.fullName}</h1>
                <p className="text-xl text-[#4b5563] font-medium mb-4">{data.title}</p>
                <div className="flex flex-wrap gap-4 text-sm text-[#4b5563] mt-3">
                  {data.contact.email && (
                    <div className="flex items-center gap-1">
                      <MailIcon /> {data.contact.email}
                    </div>
                  )}
                  {data.contact.phone && (
                    <div className="flex items-center gap-1">
                      <PhoneIcon /> {data.contact.phone}
                    </div>
                  )}
                  {data.contact.location && (
                    <div className="flex items-center gap-1">
                      <MapPinIcon /> {data.contact.location}
                    </div>
                  )}
                  {data.contact.linkedin && (
                    <div className="flex items-center gap-1">
                      <LinkIcon /> {data.contact.linkedin}
                    </div>
                  )}
                </div>
              </header>

              {/* Summary */}
              <section className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#6b7280] border-b border-[#e5e7eb] mb-3 pb-1">
                  Professional Summary
                </h3>
                <p className="text-[#374151] leading-relaxed text-justify">{data.summary}</p>
              </section>

              {/* Skills */}
              <section className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#6b7280] border-b border-[#e5e7eb] mb-3 pb-1">
                  Technical Skills
                </h3>
                <div className="grid grid-cols-2 gap-y-2">
                  {data.skills.map((skill, idx) => (
                    <div key={idx} className="flex gap-2 text-sm">
                      <span className="font-bold text-[#374151] w-24 flex-shrink-0">{skill.category}:</span>
                      <span className="text-[#4b5563]">{skill.items.join(", ")}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Experience */}
              <section className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#6b7280] border-b border-[#e5e7eb] mb-4 pb-1">
                  Work Experience
                </h3>
                <div className="flex flex-col gap-6">
                  {data.experience.map((exp) => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-lg font-bold text-[#1f2937]">{exp.role}</h4>
                        <span className="text-sm font-medium text-[#6b7280] bg-[#f3f4f6] px-2 py-0.5 rounded">
                          {exp.duration}
                        </span>
                      </div>
                      <div className="text-md text-[#2563eb] font-semibold mb-2">{exp.company}</div>
                      <ul className="list-disc list-outside ml-4 text-[#374151] text-sm space-y-1">
                        {exp.description.map((desc, i) => (
                          <li key={i}>{desc}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* Education */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#6b7280] border-b border-[#e5e7eb] mb-4 pb-1">
                  Education
                </h3>
                <div className="space-y-4">
                  {data.education.map((edu) => (
                    <div key={edu.id} className="flex justify-between items-start">
                      <div>
                        <h4 className="text-md font-bold text-[#1f2937]">{edu.school}</h4>
                        <p className="text-sm text-[#4b5563]">{edu.degree}</p>
                      </div>
                      <span className="text-sm text-[#6b7280]">{edu.year}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Icons ---
const MailIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const PhoneIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const MapPinIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const LinkIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const DownloadIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

export default CVGenerator;
