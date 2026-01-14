import React, { useState, useEffect, useRef, useCallback } from "react";

// --- Constants ---
// Ensure this matches your actual server URL
const ENDPOINT_URL = "https://serwer2518023.home.pl/programowanie-gpt/endpoint.php";
const DEFAULT_MARGIN_TOP = 50;
const DEFAULT_MARGIN_BOTTOM = 0;

// --- Types ---
type CVStyle =
  | "marketing-1"
  | "marketing-2"
  | "logistics-1"
  | "logistics-2"
  | "engineering-1"
  | "engineering-2"
  | "ecommerce-1"
  | "ecommerce-2";

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

interface Language {
  language: string;
  proficiency: string;
}

interface CVLabels {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  languages: string;
  interests: string;
}

interface SummaryItem {
  id: string;
  main: string;
  text: string;
}

interface CVData {
  labels: CVLabels;
  fullName: string;
  title: string;
  summary: SummaryItem[];
  contact: ContactInfo;
  skills: SkillSet[];
  languages: Language[];
  interests: string[];
  experience: Experience[];
  education: Education[];
}

// --- Initial Data ---
const INITIAL_DATA: CVData = {
  labels: {
    summary: "About me",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    interests: "Interests",
  },
  fullName: "John Doe",
  title: "Senior Frontend Developer",
  summary: [
    {
      id: "1",
      main: "Expertise in Modern JavaScript Ecosystem",
      text: "I possess extensive experience in building scalable Single Page Applications (SPAs) using React, TypeScript, and Next.js. I specialize in architectural patterns that ensure code maintainability and high performance in complex web applications.",
    },
    {
      id: "2",
      main: "Focus on Performance and Accessibility",
      text: "Dedicated to optimizing web performance (Core Web Vitals) to increase user retention. I consistently apply WCAG guidelines to ensure applications are accessible to all users, leveraging semantic HTML and modern testing tools.",
    },
    {
      id: "3",
      main: "Collaborative Problem Solver",
      text: "I have a proven track record of working effectively within Agile teams, bridging the gap between UI/UX design and technical implementation. I actively mentor junior developers and conduct code reviews to maintain high quality standards.",
    },
  ],
  contact: {
    email: "alex.code@example.com",
    phone: "+1 555 019 2834",
    linkedin: "linkedin.com/in/alexcode-dev",
    location: "San Francisco, CA",
  },
  skills: [
    {
      category: "Technologies",
      items: [
        "React.js / Next.js",
        "TypeScript",
        "JavaScript (ES6+)",
        "Redux Toolkit / React Query",
        "Tailwind CSS / SCSS",
        "Jest / React Testing Library",
        "Git / CI/CD Actions",
      ],
    },
    {
      category: "Competencies",
      items: [
        "Responsive Web Design",
        "Web Accessibility (WCAG)",
        "Performance Optimization",
        "State Management",
        "REST & GraphQL APIs",
      ],
    },
  ],
  languages: [
    {
      language: "English",
      proficiency: "Native",
    },
    {
      language: "Spanish",
      proficiency: "B2 (Intermediate)",
    },
  ],
  interests: ["Open Source Contributing", "UI/UX Design Trends", "Tech Blogging", "Hiking"],
  experience: [
    {
      id: "1",
      role: "Senior Frontend Developer",
      company: "TechStream Solutions",
      duration: "2021 - Present",
      description: [
        "Led the migration of a legacy monolithic frontend to a micro-frontend architecture using Next.js, improving load times by 40%.",
        "Developed a shared internal UI component library using Storybook and TypeScript, standardizing design tokens across 3 different products.",
        "Mentored a team of 4 junior developers, conducting code reviews and organizing weekly knowledge-sharing sessions.",
      ],
    },
    {
      id: "2",
      role: "Frontend Developer",
      company: "Creative Web Agency",
      duration: "2018 - 2021",
      description: [
        "Collaborated with UI/UX designers to translate Figma prototypes into pixel-perfect, responsive web interfaces.",
        "Implemented rigorous unit and integration testing using Jest, increasing code coverage from 20% to 85%.",
        "Optimized API data fetching strategies using React Query to reduce server load and enhance user experience.",
      ],
    },
  ],
  education: [
    {
      id: "1",
      degree: "B.Sc. in Computer Science",
      school: "University of Technology",
      year: "2018",
    },
  ],
};

// --- Helper: Deep Object Update ---
const setDeepValue = (obj: any, path: (string | number)[], value: any): any => {
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
  let current = newObj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key]) current[key] = {};
    current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
    current = current[key];
  }
  current[path[path.length - 1]] = value;
  return newObj;
};

// --- Helper: Data Sanitizer ---
const sanitizeCVData = (parsed: any): CVData => {
  const safeData = { ...INITIAL_DATA, ...parsed };

  safeData.summary = Array.isArray(safeData.summary) ? safeData.summary : [];
  safeData.experience = Array.isArray(safeData.experience) ? safeData.experience : [];
  safeData.education = Array.isArray(safeData.education) ? safeData.education : [];
  safeData.skills = Array.isArray(safeData.skills) ? safeData.skills : [];
  safeData.languages = Array.isArray(safeData.languages) ? safeData.languages : [];
  safeData.interests = Array.isArray(safeData.interests) ? safeData.interests : [];

  safeData.experience = safeData.experience.map((exp: any) => ({
    ...exp,
    description: Array.isArray(exp.description) ? exp.description : [],
  }));

  safeData.skills = safeData.skills.map((skill: any) => ({
    ...skill,
    items: Array.isArray(skill.items) ? skill.items : [],
  }));

  if (safeData.summary.length > 0 && typeof safeData.summary[0] === "string") {
    safeData.summary = [{ id: "1", main: "Summary", text: safeData.summary[0] }];
  }

  return safeData;
};

// --- COMPONENT: Error Boundary ---
class SafeErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("CV Rendering Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-red-50 border border-red-200 rounded-xl text-red-600">
          <h3 className="font-bold text-lg mb-2">Render Error</h3>
          <p className="text-sm mb-4">The CV data structure is incomplete or invalid.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition shadow-sm text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- COMPONENT: Editable Text ---
interface EditableProps {
  value: string;
  onUpdate: (newValue: string) => void;
  tag?: keyof JSX.IntrinsicElements;
  className?: string;
  placeholder?: string;
}

const Editable: React.FC<EditableProps> = ({
  value,
  onUpdate,
  tag: Tag = "span",
  className = "",
  placeholder = "...",
}) => {
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const text = e.currentTarget.textContent;
    if (text !== null && text !== value) {
      onUpdate(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (
      e.key === "Enter" &&
      Tag !== "p" &&
      Tag !== "div" &&
      Tag !== "h1" &&
      Tag !== "h2" &&
      Tag !== "h3" &&
      Tag !== "h4" &&
      Tag !== "li"
    ) {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`outline-none min-w-[20px] cursor-text transition-all border-b border-transparent hover:border-blue-300 hover:bg-blue-50/30 empty:before:content-[attr(placeholder)] empty:before:text-gray-300 ${className}`}
      placeholder={placeholder}
    >
      {value}
    </Tag>
  );
};

// --- Main Component ---
const CVGenerator: React.FC = () => {
  // --- Margin States (Persisted) ---
  const [marginTop, setMarginTop] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cv_marginTop");
      if (saved) return Number(saved);
    }
    return DEFAULT_MARGIN_TOP;
  });

  const [marginBottom, setMarginBottom] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cv_marginBottom");
      if (saved) return Number(saved);
    }
    return DEFAULT_MARGIN_BOTTOM;
  });

  const [jsonString, setJsonString] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cv_data");
      if (saved && saved !== "undefined" && saved !== "null") return saved;
    }
    return JSON.stringify(INITIAL_DATA, null, 2);
  });

  const [data, setData] = useState<CVData>(INITIAL_DATA);
  const [selectedStyle, setSelectedStyle] = useState<CVStyle>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("cv_style") as CVStyle) || "ecommerce-1";
    return "ecommerce-1";
  });

  const [profileImage, setProfileImage] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const savedImg = localStorage.getItem("cv_image");
      return savedImg && savedImg !== "undefined" && savedImg !== "null" ? savedImg : "/cv.png";
    }
    return "/cv.png";
  });

  // --- NEW: Modal State ---
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldUpdate = (path: (string | number)[], newValue: string) => {
    const newData = setDeepValue(data, path, newValue);
    setData(newData);
    setJsonString(JSON.stringify(newData, null, 2));
  };

  // --- New: Callback to handle data received from modal ---
  const handleApplyGeneratedData = (newDataString: string) => {
    setJsonString(newDataString);
    setIsPromptModalOpen(false); // Close modal on success
  };

  // --- Effects for Persistence ---
  useEffect(() => {
    localStorage.setItem("cv_marginTop", marginTop.toString());
  }, [marginTop]);

  useEffect(() => {
    localStorage.setItem("cv_marginBottom", marginBottom.toString());
  }, [marginBottom]);

  useEffect(() => {
    if (jsonString && jsonString !== "undefined") {
      localStorage.setItem("cv_data", jsonString);
      try {
        const parsed = JSON.parse(jsonString);
        const cleanData = sanitizeCVData(parsed);
        setData(cleanData);
        setError(null);
      } catch (e) {
        setError("Invalid JSON syntax (check brackets and quotes)");
      }
    }
  }, [jsonString]);

  useEffect(() => {
    localStorage.setItem("cv_style", selectedStyle);
  }, [selectedStyle]);

  useEffect(() => {
    if (profileImage) {
      try {
        localStorage.setItem("cv_image", profileImage);
      } catch (e) {
        console.error("Image too large");
      }
    } else {
      localStorage.removeItem("cv_image");
    }
  }, [profileImage]);

  const handlePrint = () => window.print();

  const handleResetMargins = () => {
    setMarginTop(DEFAULT_MARGIN_TOP);
    setMarginBottom(DEFAULT_MARGIN_BOTTOM);
    localStorage.removeItem("cv_marginTop");
    localStorage.removeItem("cv_marginBottom");
  };

  const handleGlobalReset = () => {
    if (window.confirm("Reset all data? This cannot be undone.")) {
      const defaultJson = JSON.stringify(INITIAL_DATA, null, 2);
      setJsonString(defaultJson);
      setData(INITIAL_DATA);
      setProfileImage("/cv.png");
      setMarginTop(DEFAULT_MARGIN_TOP);
      setMarginBottom(DEFAULT_MARGIN_BOTTOM);
      localStorage.removeItem("cv_data");
      localStorage.removeItem("cv_image");
      localStorage.removeItem("cv_marginTop");
      localStorage.removeItem("cv_marginBottom");
    }
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  }, []);
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-6 font-sans">
      <style>{`
        @media print {
          @page { margin: 0; margin-top: ${marginTop}px; margin-bottom: ${marginBottom}px; size: auto; }
          .no-print, .no-print * { display: none !important; }
          body, html, #root, .main-layout { width: 100%; height: auto; margin: 0; padding: 0; background-color: white !important; }
          .cv-preview-wrapper { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; border: none !important; box-shadow: none !important; z-index: 9999; }
          #printable-cv { width: 210mm !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; border: none !important; min-height: 100vh !important; background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          [contenteditable]:hover { background: transparent !important; outline: none !important; border: none !important; }
        }
      `}</style>

      <div className="main-layout max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* --- LEFT PANEL: CONTROLS --- */}
        <div className="no-print lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-3rem)] sticky top-6">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full border border-gray-200 overflow-y-auto">
            {/* --- NEW BUTTON: Create Prompt --- */}
            <div className="mb-6">
              <button
                onClick={() => setIsPromptModalOpen(true)}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span className="text-lg">✨</span> Create ChatGPT Prompt
              </button>
            </div>

            {/* Template Selector */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Template & Style</h2>
                <button onClick={handleGlobalReset} className="text-[10px] text-red-500 hover:underline">
                  Reset Data
                </button>
              </div>
              <div className="space-y-3">
                <StyleGroup
                  title="ECOMMERCE"
                  styles={["ecommerce-1", "ecommerce-2"]}
                  current={selectedStyle}
                  set={setSelectedStyle}
                  labels={["Growth & Scale", "Brand Modern"]}
                />
                <StyleGroup
                  title="MARKETING"
                  styles={["marketing-1", "marketing-2"]}
                  current={selectedStyle}
                  set={setSelectedStyle}
                  labels={["Modern Bold", "Creative"]}
                />
                <StyleGroup
                  title="LOGISTICS"
                  styles={["logistics-1", "logistics-2"]}
                  current={selectedStyle}
                  set={setSelectedStyle}
                  labels={["Corporate", "Dense Data"]}
                />
                <StyleGroup
                  title="ENGINEERING"
                  styles={["engineering-1", "engineering-2"]}
                  current={selectedStyle}
                  set={setSelectedStyle}
                  labels={["Terminal", "Tech Clean"]}
                />
              </div>
            </div>

            {/* Print Margins Settings */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Print Margins (px)</h2>
                <button
                  onClick={handleResetMargins}
                  className="text-[10px] text-blue-500 hover:underline"
                  title="Reset margins to default (50px / 0px)"
                >
                  Reset Margins
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block">Top</label>
                  <input
                    type="number"
                    value={marginTop}
                    onChange={(e) => setMarginTop(Number(e.target.value))}
                    className="w-full p-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block">Bottom</label>
                  <input
                    type="number"
                    value={marginBottom}
                    onChange={(e) => setMarginBottom(Number(e.target.value))}
                    className="w-full p-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Profile Photo</h2>
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all duration-200 ${
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                {profileImage ? (
                  <div className="relative">
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover shadow-sm border border-gray-200"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileImage(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-500">{isDragging ? "Drop Here" : "Drag or Click"}</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
              </div>
            </div>

            {/* JSON Editor */}
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">JSON Data (Advanced)</h2>
            <textarea
              className={`flex-1 w-full p-4 font-mono text-[10px] leading-relaxed bg-[#f9fafb] border rounded-lg focus:outline-none focus:ring-2 resize-none mb-2 ${
                error ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
              }`}
              value={jsonString}
              onChange={(e) => setJsonString(e.target.value)}
              spellCheck={false}
            />
            {error && <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded mb-2">⚠️ {error}</div>}

            <button
              onClick={handlePrint}
              disabled={!!error}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <DownloadIcon /> Download PDF
            </button>
          </div>
        </div>

        {/* --- RIGHT PANEL: PREVIEW --- */}
        <div className="cv-preview-wrapper lg:col-span-8 overflow-auto flex justify-center bg-[#e5e7eb] rounded-xl p-8 border border-gray-300 shadow-inner">
          <div className="scale-[0.85] lg:scale-100 origin-top">
            <SafeErrorBoundary>
              <TemplateRenderer style={selectedStyle} data={data} image={profileImage} onUpdate={handleFieldUpdate} />
            </SafeErrorBoundary>
          </div>
        </div>
      </div>

      {/* --- RENDER PROMPT MODAL --- */}
      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onApplyData={handleApplyGeneratedData}
      />
    </div>
  );
};

// --- HELPER COMPONENTS ---
const StyleGroup = ({ title, styles, current, set, labels }: any) => (
  <div>
    <div className="text-[10px] font-bold text-gray-500 mb-1">{title}</div>
    <div className="grid grid-cols-2 gap-2">
      {styles.map((s: CVStyle, i: number) => (
        <button
          key={s}
          onClick={() => set(s)}
          className={`p-2 text-xs font-medium rounded border transition-all ${
            current === s ? "bg-gray-800 text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  </div>
);

// --- NEW COMPONENT: Prompt Modal (Modified) ---
const PromptModal = ({
  isOpen,
  onClose,
  onApplyData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: string) => void;
}) => {
  // 1. State for Job Description
  const [jobDescription, setJobDescription] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prompt_jobDescription") || "";
    }
    return "";
  });

  // 2. State for User's CV Information
  const [userInformation, setUserInformation] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prompt_userInformation") || "";
    }
    return "";
  });

  // 3. State for API handling
  const [isLoading, setIsLoading] = useState(false);
  const [responseData, setResponseData] = useState<string | null>(null);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem("prompt_jobDescription", jobDescription);
  }, [jobDescription]);

  useEffect(() => {
    localStorage.setItem("prompt_userInformation", userInformation);
  }, [userInformation]);

  if (!isOpen) return null;

  // 4. Construct the Prompt for Preview
  const finalPrompt = `Chcę napisać moje CV.
Na podstawie opisu oferty pracy i informacji o mnie, napisz dla mnie cv:
CV napisz w tym samym języku co opis oferty pracy.

<opis-oferty-pracy>
${jobDescription}
</opis-oferty-pracy>
 
<informacje-o-mnie>  
${userInformation}
</informacje-o-mnie>

Moje nowe CV powinno być podane w formacie JSON.

{
  labels: {
    summary: "About me",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    interests: "Interests",
  },
  fullName: "",
  title: "",
  summary: [
    {
      id: "1",
      main: "wymaganie 1",
      text: "opisz jak dobrze spełniam wymaganie 1",
    },
    {
      id: "2",
      main: "wymaganie 2",
      text: "opisz jak dobrze spełniam wymaganie 2",
    },
    ... kontynuuj dla wszystkich wymagań podanych w ofercie pracy
  ],
  contact: {
    email: "",
    phone: "",
    linkedin: "",
    location: "",
  },
  skills: [
    {
      category: "",
      items: [
        "",
        "",
        ...
      ],
    },
    {
      category: "",
      items: [
        "",
        "",
        ...
      ],
    },
  ],
  languages: [
    {
      language: "",
      proficiency: "",
    },
    {
      language: "",
      proficiency: "",
    },
  ],
  interests: ["", "", ...],
  experience: [
    {
      id: "1",
      role: "",
      company: "",
      duration: "",
      description: [
        "",
            "",
            ...
        ],
    },
    {
      id: "2",
      role: "",
      company: "",
      duration: "",
      description: [
        "",
            "",
            ...
        ],
    },
    ...
  ],
  education: [
    {
      id: "1",
      degree: "",
      school: "",
      year: "",
    },
    ...
  ],
};
 
`;

  // --- API Handler ---
  const handleSendToChatGPT = async () => {
    if (!jobDescription || !userInformation) return;

    setIsLoading(true);
    setResponseData(null); // Clear previous data

    try {
      const response = await fetch(ENDPOINT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: Sending 'message' key to match PHP code
        body: JSON.stringify({ message: finalPrompt }),
      });

      const result = await response.json();

      if (result.status === "success") {
        // Success: Extract the AI answer
        let cleanContent = result.answer;
        // Clean markdown code blocks often returned by GPT (```json ... ```)
        if (cleanContent) {
          cleanContent = cleanContent
            .replace(/^```json\s*/, "")
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");
        }
        setResponseData(cleanContent);
      } else {
        // Handle API errors from PHP (e.g. rate limit, OpenAI error)
        const errMsg = result.message || JSON.stringify(result.details) || "Unknown error occurred";
        setResponseData(`Error: ${errMsg}`);
      }
    } catch (error) {
      setResponseData("Network error: Unable to reach the endpoint.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <span className="text-xl">✨</span> AI CV Generator
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full p-1 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - Grid Layout for Inputs */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Inputs */}
          <div className="space-y-6">
            <div className="flex flex-col h-[45%]">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. Job Description</label>
              <textarea
                className="flex-1 w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                placeholder="Paste the job requirements here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col h-[45%]">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. Your Current Info</label>
              <textarea
                className="flex-1 w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                placeholder="Paste your old CV text or JSON here..."
                value={userInformation}
                onChange={(e) => setUserInformation(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column: Result / Preview */}
          <div className="flex flex-col h-full">
            <label
              className={`block text-xs font-bold uppercase mb-2 ${responseData ? "text-green-600" : "text-gray-500"}`}
            >
              {responseData ? "3. Data Received from AI" : "Preview Request Payload"}
            </label>
            <div className="relative flex-1">
              <textarea
                readOnly
                className={`w-full h-full p-4 text-xs font-mono rounded-lg focus:outline-none resize-none border ${
                  responseData
                    ? "bg-green-50 border-green-200 text-green-900"
                    : "bg-gray-100 border-gray-200 text-gray-500"
                }`}
                value={isLoading ? "Generating response..." : responseData || finalPrompt}
              />

              {/* If we have valid response data, show Apply button inside the preview area (optional placement) */}
              {responseData && (
                <div className="absolute top-2 right-2">
                  <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded">
                    Ready to Apply
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
          >
            Close
          </button>

          {/* Send Button */}
          {!responseData && (
            <button
              onClick={handleSendToChatGPT}
              disabled={isLoading || !jobDescription || !userInformation}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>Send Request</>
              )}
            </button>
          )}

          {/* Apply Button (Only appears when data is received) */}
          {responseData && (
            <button
              onClick={() => onApplyData(responseData)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
            >
              Apply to CV
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- TEMPLATE RENDERER ---
const TemplateRenderer = ({
  style,
  data,
  image,
  onUpdate,
}: {
  style: CVStyle;
  data: CVData;
  image: string | null;
  onUpdate: (path: (string | number)[], val: string) => void;
}) => {
  const wrapperId = "printable-cv";
  const commonStyles = { width: "210mm", minHeight: "297mm", boxSizing: "border-box" as const };
  const baseClass =
    "bg-white text-[#1f2937] shadow-2xl mx-auto rounded-none lg:rounded-md transition-all duration-300 overflow-hidden";
  const labels = data.labels || {
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    interests: "Interests",
    summary: "Summary",
  };

  // --- ECOMMERCE 1: Growth & Scale (Clean, Metric Focused) ---
  if (style === "ecommerce-1") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "40px" }}>
        <header className="border-b-2 border-black pb-6 mb-8 flex justify-between items-center">
          <div className="flex-1">
            <Editable
              tag="h1"
              className="text-5xl font-black uppercase tracking-tight leading-none mb-2"
              value={data.fullName}
              onUpdate={(v) => onUpdate(["fullName"], v)}
            />
            <Editable
              tag="p"
              className="text-xl font-medium text-gray-600"
              value={data.title}
              onUpdate={(v) => onUpdate(["title"], v)}
            />
          </div>
          <div className="text-right text-sm font-medium text-gray-800 space-y-1">
            <Editable
              className="block"
              value={data.contact.email}
              onUpdate={(v) => onUpdate(["contact", "email"], v)}
            />
            <Editable
              className="block"
              value={data.contact.phone}
              onUpdate={(v) => onUpdate(["contact", "phone"], v)}
            />
            <Editable
              className="block"
              value={data.contact.location}
              onUpdate={(v) => onUpdate(["contact", "location"], v)}
            />
            <Editable
              className="block text-blue-600"
              value={data.contact.linkedin}
              onUpdate={(v) => onUpdate(["contact", "linkedin"], v)}
            />
          </div>
          {image && <img src={image} alt="Profile" className="w-24 h-24 object-cover border-2 border-black ml-6" />}
        </header>

        <section className="mb-8">
          <Editable
            tag="h3"
            className="text-sm font-bold bg-black text-white inline-block px-2 py-1 mb-3 uppercase"
            value={labels.summary}
            onUpdate={(v) => onUpdate(["labels", "summary"], v)}
          />
          {/* UPDATED: Summary List */}
          <ol className="list-decimal list-outside ml-5 text-gray-800 text-sm leading-relaxed font-light space-y-2">
            {data.summary.map((item, idx) => (
              <li key={item.id} className="pl-2">
                <span className="font-bold mr-1">
                  <Editable value={item.main} onUpdate={(v) => onUpdate(["summary", idx, "main"], v)} />
                </span>
                <span className="block md:inline">
                  <Editable value={item.text} onUpdate={(v) => onUpdate(["summary", idx, "text"], v)} />
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <section className="mb-8">
              <Editable
                tag="h3"
                className="text-sm font-bold bg-black text-white inline-block px-2 py-1 mb-4 uppercase"
                value={labels.experience}
                onUpdate={(v) => onUpdate(["labels", "experience"], v)}
              />
              <div className="space-y-8">
                {data.experience.map((exp, idx) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-baseline border-b border-gray-200 pb-1 mb-2">
                      <Editable
                        tag="h4"
                        className="text-xl font-bold"
                        value={exp.role}
                        onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                      />
                      <Editable
                        tag="span"
                        className="text-sm font-bold"
                        value={exp.duration}
                        onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                      />
                    </div>
                    <Editable
                      className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 block"
                      value={exp.company}
                      onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                    />
                    <ul className="list-disc list-outside ml-4 text-gray-700 space-y-1">
                      {exp.description.map((desc, i) => (
                        <li key={i}>
                          <Editable value={desc} onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="col-span-4 space-y-8">
            <section>
              <Editable
                tag="h3"
                className="text-sm font-bold bg-black text-white inline-block px-2 py-1 mb-4 uppercase"
                value={labels.skills}
                onUpdate={(v) => onUpdate(["labels", "skills"], v)}
              />
              <div className="space-y-4">
                {data.skills.map((skill, idx) => (
                  <div key={idx}>
                    <Editable
                      className="font-bold text-sm border-b border-gray-300 block mb-1"
                      value={skill.category}
                      onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                    />
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-gray-600">
                      {skill.items.map((item, i) => (
                        <span key={i} className="after:content-[','] last:after:content-['']">
                          <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <Editable
                tag="h3"
                className="text-sm font-bold bg-black text-white inline-block px-2 py-1 mb-4 uppercase"
                value={labels.education}
                onUpdate={(v) => onUpdate(["labels", "education"], v)}
              />
              {data.education.map((edu, idx) => (
                <div key={edu.id} className="mb-3">
                  <Editable
                    className="font-bold block"
                    value={edu.school}
                    onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                  />
                  <Editable
                    className="text-sm text-gray-600 block"
                    value={edu.degree}
                    onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                  />
                  <Editable
                    className="text-xs text-gray-400 block"
                    value={edu.year}
                    onUpdate={(v) => onUpdate(["education", idx, "year"], v)}
                  />
                </div>
              ))}
            </section>

            <section>
              <Editable
                tag="h3"
                className="text-sm font-bold bg-black text-white inline-block px-2 py-1 mb-4 uppercase"
                value={labels.interests}
                onUpdate={(v) => onUpdate(["labels", "interests"], v)}
              />
              <div className="text-sm text-gray-600 flex flex-wrap gap-2">
                {data.interests.map((int, i) => (
                  <span key={i} className="bg-gray-100 px-2 py-1 rounded">
                    <Editable value={int} onUpdate={(v) => onUpdate(["interests", i], v)} />
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- ECOMMERCE 2, MARKETING 1-2, LOGISTICS 1-2, ENGINEERING 1-2 Logic omitted for brevity as requested ---
  // The provided logic above covers the main ECOMMERCE-1 template.
  // If you switch templates in the UI, ensure the rest of the template logic (from your original file) is present here.

  return null;
};

// --- Icons ---
const MailIcon = () => (
  <svg
    width="12"
    height="12"
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
    width="12"
    height="12"
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
    width="12"
    height="12"
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
