import React, { useState, useEffect, useRef, useCallback } from "react";

// --- Constants ---
// Ensure this matches your actual server URL
const ENDPOINT_URL = "https://serwer2518023.home.pl/programowanie-gpt/cv-generator/endpoint.php";
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
  location: string;
  // linkedin removed
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

// --- Initial Data (Translated to Polish) ---
const INITIAL_DATA: CVData = {
  labels: {
    summary: "O mnie",
    experience: "Doświadczenie",
    education: "Edukacja",
    skills: "Umiejętności",
    languages: "Języki",
    interests: "Zainteresowania",
  },
  fullName: "Jan Kowalski",
  title: "Senior Frontend Developer",
  summary: [
    {
      id: "1",
      main: "Ekspert w ekosystemie JavaScript",
      text: "Posiadam bogate doświadczenie w budowaniu skalowalnych aplikacji SPA przy użyciu React, TypeScript i Next.js. Specjalizuję się w architekturze zapewniającej łatwe utrzymanie kodu i wysoką wydajność.",
    },
    {
      id: "2",
      main: "Nacisk na wydajność i dostępność",
      text: "Dedykowany optymalizacji wydajności stron (Core Web Vitals). Konsekwentnie stosuję wytyczne WCAG, aby zapewnić dostępność aplikacji dla wszystkich użytkowników.",
    },
    {
      id: "3",
      main: "Współpraca i mentoring",
      text: "Efektywnie pracuję w zespołach Agile, łącząc design UI/UX z implementacją techniczną. Aktywnie mentoruję młodszych programistów i dbam o jakość kodu.",
    },
  ],
  contact: {
    email: "jan.kowalski@example.com",
    phone: "+48 555 019 283",
    location: "Warszawa, Polska",
  },
  skills: [
    {
      category: "Technologie",
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
      category: "Kompetencje",
      items: [
        "Responsive Web Design",
        "Dostępność (WCAG)",
        "Optymalizacja wydajności",
        "Zarządzanie stanem",
        "REST & GraphQL APIs",
      ],
    },
  ],
  languages: [
    {
      language: "Polski",
      proficiency: "Ojczysty",
    },
    {
      language: "Angielski",
      proficiency: "C1 (Zaawansowany)",
    },
  ],
  interests: ["Open Source", "Trendy UI/UX", "Blogowanie technologiczne", "Turystyka górska"],
  experience: [
    {
      id: "1",
      role: "Senior Frontend Developer",
      company: "TechStream Solutions",
      duration: "2021 - Obecnie",
      description: [
        "Prowadzenie migracji monolitu frontendowego na mikro-frontendy (Next.js), poprawa czasu ładowania o 40%.",
        "Stworzenie wewnętrznej biblioteki komponentów UI w Storybook i TypeScript, standaryzacja designu w 3 produktach.",
        "Mentoring zespołu 4 junior developerów, code review i sesje dzielenia się wiedzą.",
      ],
    },
    {
      id: "2",
      role: "Frontend Developer",
      company: "Creative Web Agency",
      duration: "2018 - 2021",
      description: [
        "Współpraca z projektantami UI/UX przy wdrażaniu prototypów z Figmy (Pixel Perfect).",
        "Wdrożenie testów jednostkowych i integracyjnych (Jest), wzrost pokrycia kodu z 20% do 85%.",
        "Optymalizacja pobierania danych z API przy użyciu React Query.",
      ],
    },
  ],
  education: [
    {
      id: "1",
      degree: "Inżynier Informatyki",
      school: "Politechnika Warszawska",
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
    safeData.summary = [{ id: "1", main: "Podsumowanie", text: safeData.summary[0] }];
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
          <h3 className="font-bold text-lg mb-2">Błąd Renderowania</h3>
          <p className="text-sm mb-4">Struktura danych CV jest niekompletna lub nieprawidłowa.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition shadow-sm text-sm"
          >
            Spróbuj Ponownie
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

  // --- Modal & AI States ---
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Global loading state

  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldUpdate = (path: (string | number)[], newValue: string) => {
    const newData = setDeepValue(data, path, newValue);
    setData(newData);
    setJsonString(JSON.stringify(newData, null, 2));
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
        setError("Błędna składnia JSON (sprawdź nawiasy i cudzysłowy)");
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
    if (window.confirm("Zresetować wszystkie dane? Tej operacji nie można cofnąć.")) {
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

  // --- API Handler (Main Logic) ---
  const handleGenerateCV = async (prompt: string) => {
    // 1. Close Modal Immediately
    setIsPromptModalOpen(false);
    // 2. Show Global Loader
    setIsGenerating(true);

    try {
      const response = await fetch(ENDPOINT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });

      const result = await response.json();

      // --- LOGGING BACKEND RESPONSE ---
      console.log("Backend Response:", result);

      if (result.status === "success") {
        let cleanContent = result.answer;
        if (cleanContent) {
          cleanContent = cleanContent
            .replace(/^```json\s*/, "")
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");

          setJsonString(cleanContent); // Update data
        }
      } else {
        const errMsg = result.message || JSON.stringify(result.details) || "Nieznany błąd";
        alert(`Błąd generowania: ${errMsg}`);
      }
    } catch (error) {
      alert("Błąd sieci: Nie można połączyć się z serwerem.");
    } finally {
      // 3. Hide Global Loader
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-6 font-sans relative">
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
      {/* --- GLOBAL LOADING OVERLAY --- */}
      {isGenerating && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
          <h2 className="text-2xl font-bold">Generowanie CV...</h2>
          <p className="text-gray-300 mt-2">Proszę czekać, AI pisze Twoje CV.</p>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="text-center mb-8 no-print">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2">
          Każde CV powinno być dokładnie dopasowane do oferty pracy!
        </h1>
        <p className="text-lg text-gray-600 font-medium">
          Nasz generator stworzy dla Ciebie perfekcyjne CV w 20 sekund!
        </p>
      </div>

      <div className="main-layout max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* --- LEFT PANEL: CONTROLS --- */}
        <div className="no-print lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-3rem)] sticky top-6">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full border border-gray-200 overflow-y-auto">
            {/* --- BUTTON GROUP: Prompt & Download --- */}
            <div className="mb-6 space-y-2">
              <button
                onClick={() => setIsPromptModalOpen(true)}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span className="text-lg">✨</span> Wygeneruj swoje CV
              </button>

              <button
                onClick={handlePrint}
                disabled={!!error}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <DownloadIcon /> Pobierz PDF
              </button>
            </div>

            {/* --- MOVED: Image Upload (Now under buttons) --- */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Zdjęcie Profilowe</h2>
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
                    <p className="text-xs font-semibold text-gray-500">
                      {isDragging ? "Upuść tutaj" : "Przeciągnij lub Kliknij"}
                    </p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
              </div>
            </div>

            {/* Template Selector */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Szablon i Styl</h2>
                <button onClick={handleGlobalReset} className="text-[10px] text-red-500 hover:underline">
                  Resetuj Dane
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
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Marginesy Druku (px)</h2>
                <button
                  onClick={handleResetMargins}
                  className="text-[10px] text-blue-500 hover:underline"
                  title="Reset margins to default (50px / 0px)"
                >
                  Resetuj
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block">Góra (Top)</label>
                  <input
                    type="number"
                    value={marginTop}
                    onChange={(e) => setMarginTop(Number(e.target.value))}
                    className="w-full p-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block">Dół (Bottom)</label>
                  <input
                    type="number"
                    value={marginBottom}
                    onChange={(e) => setMarginBottom(Number(e.target.value))}
                    className="w-full p-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* JSON Editor */}
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Dane JSON (Zaawansowane)</h2>
            <textarea
              className={`flex-1 w-full p-4 font-mono text-[10px] leading-relaxed bg-[#f9fafb] border rounded-lg focus:outline-none focus:ring-2 resize-none mb-2 ${
                error ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
              }`}
              value={jsonString}
              onChange={(e) => setJsonString(e.target.value)}
              spellCheck={false}
            />
            {error && <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded mb-2">⚠️ {error}</div>}
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
        onGenerate={handleGenerateCV}
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
  onGenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
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

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem("prompt_jobDescription", jobDescription);
  }, [jobDescription]);

  useEffect(() => {
    localStorage.setItem("prompt_userInformation", userInformation);
  }, [userInformation]);

  if (!isOpen) return null;

  // 4. Construct the Prompt for Preview
  const finalPrompt = `

<opis-oferty-pracy>
${jobDescription}
</opis-oferty-pracy>
 
<informacje-o-mnie>  
${userInformation}
</informacje-o-mnie>

`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
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

        {/* Body - Vertical Layout for Inputs */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase">
              1. Opis Oferty Pracy (Wklej tutaj)
            </label>
            <textarea
              className="w-full h-32 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="Wklej treść ogłoszenia o pracę..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase">2. Twoje Dane / Stare CV</label>
            <textarea
              className="w-full h-32 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="Wklej tekst ze swojego starego CV lub JSON..."
              value={userInformation}
              onChange={(e) => setUserInformation(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
          >
            Anuluj
          </button>

          <button
            onClick={() => onGenerate(finalPrompt)}
            disabled={!jobDescription || !userInformation}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Wygeneruj swoje unikatowe CV!
          </button>
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
    experience: "Doświadczenie",
    education: "Edukacja",
    skills: "Umiejętności",
    languages: "Języki",
    interests: "Zainteresowania",
    summary: "O mnie",
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
            {/* LINKEDIN REMOVED */}
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
