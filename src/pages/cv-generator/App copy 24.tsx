import React, { useState, useEffect, useRef, useCallback } from "react";

// --- Constants ---
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
  aboutMe: string;
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
  aboutMe: SummaryItem[];
  contact: ContactInfo;
  skills: SkillSet[];
  languages: Language[];
  interests: string[];
  experience: Experience[];
  education: Education[];
}

// --- Interface for History ---
interface HistoryItem {
  id: string;
  name: string;
  timestamp: number;
  data: CVData;
  style: CVStyle;
  image: string | null;
}

// --- Initial Data ---
const INITIAL_DATA: CVData = {
  labels: {
    aboutMe: "O mnie",
    experience: "Doświadczenie",
    education: "Edukacja",
    skills: "Umiejętności",
    languages: "Języki",
    interests: "Zainteresowania",
  },
  fullName: "Jan Kowalski",
  title: "Senior Frontend Developer",
  aboutMe: [
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
      items: ["Responsive Web Design", "Dostępność (WCAG)", "Optymalizacja wydajności", "REST & GraphQL APIs"],
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
  interests: ["Podróże"],
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

// --- Helper: Remove Item from Array ---
const removeDeepItem = (obj: any, path: (string | number)[], indexToRemove: number): any => {
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
  let current = newObj;

  // Navigate to the array container
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
    current = current[key];
  }

  // Current is now the array
  if (Array.isArray(current)) {
    current.splice(indexToRemove, 1);
  }

  return newObj;
};

// --- Helper: Data Sanitizer ---
const sanitizeCVData = (parsed: any): CVData => {
  const safeData = { ...INITIAL_DATA, ...parsed };

  // --- COMPATIBILITY FIX: Handle if backend returns 'summary' instead of 'aboutMe' ---
  if (parsed.summary && !parsed.aboutMe) {
    safeData.aboutMe = parsed.summary;
  }

  safeData.aboutMe = Array.isArray(safeData.aboutMe) ? safeData.aboutMe : [];
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

  if (safeData.aboutMe.length > 0 && typeof safeData.aboutMe[0] === "string") {
    safeData.aboutMe = [{ id: "1", main: "O mnie", text: safeData.aboutMe[0] }];
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

// --- COMPONENT: Removable Wrapper ---
interface RemovableProps {
  children: React.ReactNode;
  onRemove: () => void;
  className?: string;
}

const Removable: React.FC<RemovableProps> = ({ children, onRemove, className = "" }) => {
  return (
    <div className={`relative group transition-all ${className}`}>
      {children}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm("Czy na pewno usunąć ten element?")) {
            onRemove();
          }
        }}
        contentEditable={false}
        className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-600 transition-opacity p-1 no-print z-50 cursor-pointer flex items-center justify-center bg-white/80 rounded-full shadow-sm hover:shadow-md h-5 w-5"
        title="Usuń element"
      >
        <span className="text-xs font-bold leading-none">✕</span>
      </button>
    </div>
  );
};

// --- Main Component ---
const CVGenerator: React.FC = () => {
  // State Initialization
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

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cv_history_list");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldUpdate = (path: (string | number)[], newValue: string) => {
    const newData = setDeepValue(data, path, newValue);
    setData(newData);
    setJsonString(JSON.stringify(newData, null, 2));
  };

  const handleRemoveItem = (path: (string | number)[], index: number) => {
    const newData = removeDeepItem(data, path, index);
    setData(newData);
    setJsonString(JSON.stringify(newData, null, 2));
  };

  // --- Effects ---
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

  // Persist History
  useEffect(() => {
    try {
      localStorage.setItem("cv_history_list", JSON.stringify(history));
    } catch (e) {
      alert("Błąd zapisu historii: Pamięć przeglądarki jest pełna (prawdopodobnie przez zdjęcia).");
    }
  }, [history]);

  // --- History Handlers ---
  const handleSaveToHistory = () => {
    const name = prompt("Podaj nazwę dla tej wersji CV:", `Wersja ${new Date().toLocaleTimeString()}`);
    if (!name) return;

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data)), // Deep copy
      style: selectedStyle,
      image: profileImage,
    };

    setHistory((prev) => [newItem, ...prev]);
  };

  const handleLoadHistory = (item: HistoryItem) => {
    if (window.confirm(`Czy na pewno wczytać wersję "${item.name}"? Obecne zmiany zostaną nadpisane.`)) {
      setData(item.data);
      setJsonString(JSON.stringify(item.data, null, 2));
      setSelectedStyle(item.style);
      setProfileImage(item.image);
    }
  };

  const handleDeleteHistory = (id: string) => {
    if (window.confirm("Usunąć tę wersję z historii?")) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
    }
  };

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

  const handleGenerateCV = async (prompt: string) => {
    setIsPromptModalOpen(false);
    setIsGenerating(true);

    try {
      const response = await fetch(ENDPOINT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });

      const result = await response.json();

      if (result.status === "success") {
        let cleanContent = result.answer;
        if (cleanContent) {
          cleanContent = cleanContent
            .replace(/^```json\s*/, "")
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");

          // Parse new data first
          const parsedData = JSON.parse(cleanContent);
          const sanitizedData = sanitizeCVData(parsedData);

          // Update Editor Data
          setJsonString(cleanContent);
          // Note: setData is handled by the useEffect on jsonString, but for history we need immediate access

          // AUTOMATIC HISTORY SAVE
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            name: `AI Generacja ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            timestamp: Date.now(),
            data: sanitizedData, // Use the new data
            style: selectedStyle,
            image: profileImage,
          };
          setHistory((prev) => [newItem, ...prev]);
        }
      } else {
        const errMsg = result.message || JSON.stringify(result.details) || "Nieznany błąd";
        alert(`Błąd generowania: ${errMsg}`);
      }
    } catch (error) {
      alert("Błąd sieci: Nie można połączyć się z serwerem.");
    } finally {
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
      {isGenerating && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
          <h2 className="text-2xl font-bold">Generowanie CV...</h2>
          <p className="text-gray-300 mt-2">Proszę czekać, AI pisze Twoje CV.</p>
        </div>
      )}

      <div className="text-center mb-8 no-print">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2">
          Każde CV powinno być dokładnie dopasowane do oferty pracy!
        </h1>
        <p className="text-lg text-gray-600 font-medium">
          Nasz generator stworzy dla Ciebie perfekcyjne CV w 20 sekund!
        </p>
      </div>

      <div className="main-layout max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="no-print lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-3rem)] sticky top-6">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full border border-gray-200 overflow-y-auto">
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

            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Dane JSON (Zaawansowane)</h2>
            <textarea
              className={`flex-1 w-full p-4 font-mono text-[10px] leading-relaxed bg-[#f9fafb] border rounded-lg focus:outline-none focus:ring-2 resize-none mb-2 min-h-[100px] ${
                error ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
              }`}
              value={jsonString}
              onChange={(e) => setJsonString(e.target.value)}
              spellCheck={false}
            />
            {error && <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded mb-2">⚠️ {error}</div>}

            {/* --- History Section Moved to Bottom --- */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Historia Wersji</h2>
                <button onClick={handleSaveToHistory} className="text-xs text-blue-600 hover:underline font-bold">
                  + Zapisz Obecny
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Brak zapisanych wersji.</p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 group"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="text-xs font-bold text-gray-700 truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(item.timestamp).toLocaleDateString()}{" "}
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleLoadHistory(item)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Wczytaj"
                        >
                          📂
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(item.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Usuń"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* --- History Section End --- */}
          </div>
        </div>

        <div className="cv-preview-wrapper lg:col-span-8 overflow-auto flex justify-center bg-[#e5e7eb] rounded-xl p-8 border border-gray-300 shadow-inner">
          <div className="scale-[0.85] lg:scale-100 origin-top">
            <SafeErrorBoundary>
              <TemplateRenderer
                style={selectedStyle}
                data={data}
                image={profileImage}
                onUpdate={handleFieldUpdate}
                onRemove={handleRemoveItem}
              />
            </SafeErrorBoundary>
          </div>
        </div>
      </div>
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

const PromptModal = ({
  isOpen,
  onClose,
  onGenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}) => {
  const [jobDescription, setJobDescription] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prompt_jobDescription") || "";
    }
    return "";
  });

  const [userInformation, setUserInformation] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prompt_userInformation") || "";
    }
    return "";
  });

  useEffect(() => {
    localStorage.setItem("prompt_jobDescription", jobDescription);
  }, [jobDescription]);

  useEffect(() => {
    localStorage.setItem("prompt_userInformation", userInformation);
  }, [userInformation]);

  if (!isOpen) return null;

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
  onRemove,
}: {
  style: CVStyle;
  data: CVData;
  image: string | null;
  onUpdate: (path: (string | number)[], val: string) => void;
  onRemove: (path: (string | number)[], index: number) => void;
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
    aboutMe: "O mnie",
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
          </div>
          {image && <img src={image} alt="Profile" className="w-24 h-24 object-cover border-2 border-black ml-6" />}
        </header>
        <section className="mb-8">
          <Editable
            tag="h3"
            className="text-sm font-bold bg-black text-white inline-block px-2 py-1 mb-3 uppercase"
            value={labels.aboutMe}
            onUpdate={(v) => onUpdate(["labels", "aboutMe"], v)}
          />
          <ol className="list-decimal list-outside ml-5 text-gray-800 text-sm leading-relaxed font-light space-y-2">
            {data.aboutMe.map((item, idx) => (
              <Removable key={item.id} onRemove={() => onRemove(["aboutMe"], idx)} className="pl-2">
                <li className="pl-1">
                  <span className="font-bold mr-1">
                    <Editable value={item.main} onUpdate={(v) => onUpdate(["aboutMe", idx, "main"], v)} />
                  </span>
                  <span className="block md:inline">
                    <Editable value={item.text} onUpdate={(v) => onUpdate(["aboutMe", idx, "text"], v)} />
                  </span>
                </li>
              </Removable>
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
                  <Removable key={exp.id} onRemove={() => onRemove(["experience"], idx)}>
                    <div>
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
                          <Removable key={i} onRemove={() => onRemove(["experience", idx, "description"], i)}>
                            <li>
                              <Editable
                                value={desc}
                                onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)}
                              />
                            </li>
                          </Removable>
                        ))}
                      </ul>
                    </div>
                  </Removable>
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
                  <Removable key={idx} onRemove={() => onRemove(["skills"], idx)}>
                    <div>
                      <Editable
                        className="font-bold text-sm border-b border-gray-300 block mb-1"
                        value={skill.category}
                        onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                      />
                      <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-gray-600">
                        {skill.items.map((item, i) => (
                          <Removable
                            key={i}
                            onRemove={() => onRemove(["skills", idx, "items"], i)}
                            className="inline-block"
                          >
                            <span className="after:content-[','] last:after:content-['']">
                              <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                            </span>
                          </Removable>
                        ))}
                      </div>
                    </div>
                  </Removable>
                ))}
              </div>
            </section>

            {/* Languages Added */}
            <section>
              <Editable
                tag="h3"
                className="text-sm font-bold bg-black text-white inline-block px-2 py-1 mb-4 uppercase"
                value={labels.languages}
                onUpdate={(v) => onUpdate(["labels", "languages"], v)}
              />
              <div className="space-y-2">
                {data.languages.map((lang, idx) => (
                  <Removable key={idx} onRemove={() => onRemove(["languages"], idx)}>
                    <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-1">
                      <Editable
                        className="font-bold"
                        value={lang.language}
                        onUpdate={(v) => onUpdate(["languages", idx, "language"], v)}
                      />
                      <Editable
                        className="text-gray-500 italic"
                        value={lang.proficiency}
                        onUpdate={(v) => onUpdate(["languages", idx, "proficiency"], v)}
                      />
                    </div>
                  </Removable>
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
                <Removable key={edu.id} onRemove={() => onRemove(["education"], idx)} className="mb-3">
                  <div>
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
                </Removable>
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
                  <Removable key={i} onRemove={() => onRemove(["interests"], i)} className="inline-block">
                    <span className="bg-gray-100 px-2 py-1 rounded inline-block">
                      <Editable value={int} onUpdate={(v) => onUpdate(["interests", i], v)} />
                    </span>
                  </Removable>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- ECOMMERCE 2: Brand Modern (Sidebar Layout) ---
  if (style === "ecommerce-2") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, display: "flex" }}>
        {/* Sidebar */}
        <div className="w-[30%] bg-gray-900 text-white p-8 flex flex-col gap-8">
          <div className="text-center">
            {image && (
              <img
                src={image}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-gray-700"
              />
            )}
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Kontakt</h2>
            <div className="text-sm space-y-2 opacity-90">
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
            </div>
          </div>

          <div>
            <Editable
              tag="h3"
              className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-gray-700 pb-1"
              value={labels.skills}
              onUpdate={(v) => onUpdate(["labels", "skills"], v)}
            />
            <div className="space-y-4">
              {data.skills.map((skill, idx) => (
                <Removable key={idx} onRemove={() => onRemove(["skills"], idx)}>
                  <div>
                    <Editable
                      className="font-bold text-sm block mb-1 text-blue-300"
                      value={skill.category}
                      onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                    />
                    <div className="flex flex-wrap gap-2">
                      {skill.items.map((item, i) => (
                        <Removable
                          key={i}
                          onRemove={() => onRemove(["skills", idx, "items"], i)}
                          className="inline-block"
                        >
                          <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 inline-block">
                            <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                          </span>
                        </Removable>
                      ))}
                    </div>
                  </div>
                </Removable>
              ))}
            </div>
          </div>

          {/* Languages Added */}
          <div>
            <Editable
              tag="h3"
              className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-gray-700 pb-1"
              value={labels.languages}
              onUpdate={(v) => onUpdate(["labels", "languages"], v)}
            />
            <div className="space-y-3">
              {data.languages.map((lang, idx) => (
                <Removable key={idx} onRemove={() => onRemove(["languages"], idx)}>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <Editable
                        className="font-bold text-gray-200"
                        value={lang.language}
                        onUpdate={(v) => onUpdate(["languages", idx, "language"], v)}
                      />
                      <Editable
                        className="text-gray-500"
                        value={lang.proficiency}
                        onUpdate={(v) => onUpdate(["languages", idx, "proficiency"], v)}
                      />
                    </div>
                    <div className="w-full bg-gray-700 h-1 mt-1 rounded-full">
                      <div className="bg-blue-500 h-1 rounded-full" style={{ width: "75%" }}></div>
                    </div>
                  </div>
                </Removable>
              ))}
            </div>
          </div>

          <div>
            <Editable
              tag="h3"
              className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-gray-700 pb-1"
              value={labels.education}
              onUpdate={(v) => onUpdate(["labels", "education"], v)}
            />
            {data.education.map((edu, idx) => (
              <Removable key={idx} onRemove={() => onRemove(["education"], idx)} className="mb-4 text-sm">
                <div>
                  <Editable
                    className="font-bold block text-white"
                    value={edu.school}
                    onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                  />
                  <Editable
                    className="text-gray-400 block"
                    value={edu.degree}
                    onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                  />
                  <Editable
                    className="text-xs text-gray-500 block"
                    value={edu.year}
                    onUpdate={(v) => onUpdate(["education", idx, "year"], v)}
                  />
                </div>
              </Removable>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-10 bg-white">
          <header className="mb-10 border-b-2 border-gray-100 pb-8">
            <Editable
              tag="h1"
              className="text-5xl font-bold text-gray-900 leading-tight mb-2"
              value={data.fullName}
              onUpdate={(v) => onUpdate(["fullName"], v)}
            />
            <Editable
              tag="p"
              className="text-2xl text-blue-600 font-light"
              value={data.title}
              onUpdate={(v) => onUpdate(["title"], v)}
            />
          </header>

          <section className="mb-10">
            <Editable
              tag="h3"
              className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4"
              value={labels.aboutMe}
              onUpdate={(v) => onUpdate(["labels", "aboutMe"], v)}
            />
            <div className="space-y-4">
              {data.aboutMe.map((item, idx) => (
                <Removable key={item.id} onRemove={() => onRemove(["aboutMe"], idx)}>
                  <div>
                    <p className="font-bold text-gray-900 text-sm mb-1">
                      <Editable value={item.main} onUpdate={(v) => onUpdate(["aboutMe", idx, "main"], v)} />
                    </p>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      <Editable value={item.text} onUpdate={(v) => onUpdate(["aboutMe", idx, "text"], v)} />
                    </p>
                  </div>
                </Removable>
              ))}
            </div>
          </section>

          <section>
            <Editable
              tag="h3"
              className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6"
              value={labels.experience}
              onUpdate={(v) => onUpdate(["labels", "experience"], v)}
            />
            <div className="space-y-8">
              {data.experience.map((exp, idx) => (
                <Removable key={exp.id} onRemove={() => onRemove(["experience"], idx)}>
                  <div className="relative pl-6 border-l-2 border-gray-100">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-50 border-2 border-blue-500"></div>
                    <div className="flex justify-between items-baseline mb-1">
                      <Editable
                        tag="h4"
                        className="text-lg font-bold text-gray-900"
                        value={exp.role}
                        onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                      />
                      <Editable
                        tag="span"
                        className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded"
                        value={exp.duration}
                        onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                      />
                    </div>
                    <Editable
                      className="text-sm font-semibold text-gray-500 mb-3 block"
                      value={exp.company}
                      onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                    />
                    <ul className="list-disc list-outside ml-4 text-sm text-gray-600 space-y-1">
                      {exp.description.map((desc, i) => (
                        <Removable key={i} onRemove={() => onRemove(["experience", idx, "description"], i)}>
                          <li>
                            <Editable
                              value={desc}
                              onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)}
                            />
                          </li>
                        </Removable>
                      ))}
                    </ul>
                  </div>
                </Removable>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // --- MARKETING 1: Modern Bold (High Contrast Headers) ---
  if (style === "marketing-1") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "50px" }}>
        <header className="mb-10">
          <div className="flex justify-between items-end border-b-4 border-black pb-4">
            <div>
              <Editable
                tag="h1"
                className="text-6xl font-extrabold tracking-tight text-black mb-1"
                value={data.fullName}
                onUpdate={(v) => onUpdate(["fullName"], v)}
              />
              <Editable
                tag="p"
                className="text-2xl font-bold text-purple-600"
                value={data.title}
                onUpdate={(v) => onUpdate(["title"], v)}
              />
            </div>
            {image && (
              <img src={image} alt="Profile" className="w-24 h-24 object-cover border-4 border-black rounded-lg mb-2" />
            )}
          </div>
          <div className="flex gap-6 mt-2 text-sm font-bold text-gray-600">
            <Editable value={data.contact.email} onUpdate={(v) => onUpdate(["contact", "email"], v)} />
            <span>|</span>
            <Editable value={data.contact.phone} onUpdate={(v) => onUpdate(["contact", "phone"], v)} />
            <span>|</span>
            <Editable value={data.contact.location} onUpdate={(v) => onUpdate(["contact", "location"], v)} />
          </div>
        </header>

        <div className="grid grid-cols-3 gap-10">
          <div className="col-span-1 space-y-10">
            <section>
              <Editable
                tag="h3"
                className="text-lg font-black uppercase border-l-4 border-purple-600 pl-3 mb-4"
                value={labels.skills}
                onUpdate={(v) => onUpdate(["labels", "skills"], v)}
              />
              {data.skills.map((skill, idx) => (
                <Removable key={idx} onRemove={() => onRemove(["skills"], idx)} className="mb-4">
                  <div>
                    <Editable
                      className="font-bold text-sm block mb-1 text-gray-800"
                      value={skill.category}
                      onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                    />
                    <div className="flex flex-wrap gap-1">
                      {skill.items.map((item, i) => (
                        <Removable
                          key={i}
                          onRemove={() => onRemove(["skills", idx, "items"], i)}
                          className="inline-block"
                        >
                          <span className="text-xs border border-gray-300 px-1 rounded text-gray-600 inline-block">
                            <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                          </span>
                        </Removable>
                      ))}
                    </div>
                  </div>
                </Removable>
              ))}
            </section>

            {/* Languages Added */}
            <section>
              <Editable
                tag="h3"
                className="text-lg font-black uppercase border-l-4 border-purple-600 pl-3 mb-4"
                value={labels.languages}
                onUpdate={(v) => onUpdate(["labels", "languages"], v)}
              />
              <ul className="space-y-2">
                {data.languages.map((lang, idx) => (
                  <Removable key={idx} onRemove={() => onRemove(["languages"], idx)}>
                    <li className="flex justify-between text-sm border-b border-gray-100 pb-1">
                      <Editable
                        className="font-bold"
                        value={lang.language}
                        onUpdate={(v) => onUpdate(["languages", idx, "language"], v)}
                      />
                      <Editable
                        className="text-gray-500"
                        value={lang.proficiency}
                        onUpdate={(v) => onUpdate(["languages", idx, "proficiency"], v)}
                      />
                    </li>
                  </Removable>
                ))}
              </ul>
            </section>

            <section>
              <Editable
                tag="h3"
                className="text-lg font-black uppercase border-l-4 border-purple-600 pl-3 mb-4"
                value={labels.education}
                onUpdate={(v) => onUpdate(["labels", "education"], v)}
              />
              {data.education.map((edu, idx) => (
                <Removable key={idx} onRemove={() => onRemove(["education"], idx)} className="mb-4">
                  <div>
                    <Editable
                      className="font-bold block text-sm"
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
                </Removable>
              ))}
            </section>
          </div>

          <div className="col-span-2 space-y-10">
            <section>
              <Editable
                tag="h3"
                className="text-lg font-black uppercase border-l-4 border-black pl-3 mb-4"
                value={labels.aboutMe}
                onUpdate={(v) => onUpdate(["labels", "aboutMe"], v)}
              />
              {data.aboutMe.map((item, idx) => (
                <Removable key={item.id} onRemove={() => onRemove(["aboutMe"], idx)} className="mb-3">
                  <div>
                    <span className="font-bold mr-1 text-purple-700">
                      <Editable value={item.main} onUpdate={(v) => onUpdate(["aboutMe", idx, "main"], v)} />
                    </span>
                    <span className="text-gray-700 text-sm">
                      <Editable value={item.text} onUpdate={(v) => onUpdate(["aboutMe", idx, "text"], v)} />
                    </span>
                  </div>
                </Removable>
              ))}
            </section>

            <section>
              <Editable
                tag="h3"
                className="text-lg font-black uppercase border-l-4 border-black pl-3 mb-6"
                value={labels.experience}
                onUpdate={(v) => onUpdate(["labels", "experience"], v)}
              />
              {data.experience.map((exp, idx) => (
                <Removable key={exp.id} onRemove={() => onRemove(["experience"], idx)} className="mb-6">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Editable
                        tag="h4"
                        className="text-xl font-bold"
                        value={exp.role}
                        onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                      />
                      <Editable
                        tag="span"
                        className="text-sm font-bold bg-black text-white px-2 py-1"
                        value={exp.duration}
                        onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                      />
                    </div>
                    <Editable
                      className="text-sm font-semibold text-purple-600 mb-2 block"
                      value={exp.company}
                      onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                    />
                    <ul className="list-square list-outside ml-4 text-sm text-gray-700">
                      {exp.description.map((desc, i) => (
                        <Removable key={i} onRemove={() => onRemove(["experience", idx, "description"], i)}>
                          <li>
                            <Editable
                              value={desc}
                              onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)}
                            />
                          </li>
                        </Removable>
                      ))}
                    </ul>
                  </div>
                </Removable>
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- MARKETING 2: Creative (Soft Colors & Rounded) ---
  if (style === "marketing-2") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "40px" }}>
        <header className="bg-pink-50 -mx-[40px] -mt-[40px] p-[40px] mb-8 flex items-center gap-6">
          {image && <img src={image} alt="Profile" className="w-32 h-32 rounded-full object-cover shadow-lg" />}
          <div>
            <Editable
              tag="h1"
              className="text-4xl font-black text-gray-800 mb-1"
              value={data.fullName}
              onUpdate={(v) => onUpdate(["fullName"], v)}
            />
            <Editable
              tag="p"
              className="text-xl font-medium text-pink-600"
              value={data.title}
              onUpdate={(v) => onUpdate(["title"], v)}
            />
            <div className="flex gap-4 mt-3 text-sm text-gray-600">
              <Editable value={data.contact.email} onUpdate={(v) => onUpdate(["contact", "email"], v)} />
              <Editable value={data.contact.phone} onUpdate={(v) => onUpdate(["contact", "phone"], v)} />
              <Editable value={data.contact.location} onUpdate={(v) => onUpdate(["contact", "location"], v)} />
            </div>
          </div>
        </header>

        <section className="mb-8 p-6 bg-gray-50 rounded-2xl">
          <Editable
            tag="h3"
            className="text-sm font-bold text-pink-500 uppercase tracking-widest mb-3"
            value={labels.aboutMe}
            onUpdate={(v) => onUpdate(["labels", "aboutMe"], v)}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.aboutMe.map((item, idx) => (
              <Removable key={item.id} onRemove={() => onRemove(["aboutMe"], idx)}>
                <div className="bg-white p-3 rounded-lg shadow-sm h-full">
                  <p className="font-bold text-gray-800 text-sm mb-1">
                    <Editable value={item.main} onUpdate={(v) => onUpdate(["aboutMe", idx, "main"], v)} />
                  </p>
                  <p className="text-xs text-gray-500">
                    <Editable value={item.text} onUpdate={(v) => onUpdate(["aboutMe", idx, "text"], v)} />
                  </p>
                </div>
              </Removable>
            ))}
          </div>
        </section>

        <div className="flex gap-8">
          <div className="flex-1">
            <section className="mb-8">
              <Editable
                tag="h3"
                className="text-sm font-bold text-pink-500 uppercase tracking-widest mb-4 border-b border-pink-100 pb-2"
                value={labels.experience}
                onUpdate={(v) => onUpdate(["labels", "experience"], v)}
              />
              {data.experience.map((exp, idx) => (
                <Removable key={exp.id} onRemove={() => onRemove(["experience"], idx)} className="mb-6 relative">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Editable
                        tag="h4"
                        className="text-lg font-bold text-gray-800"
                        value={exp.role}
                        onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                      />
                      <Editable
                        tag="span"
                        className="text-xs font-medium text-gray-400"
                        value={exp.duration}
                        onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                      />
                    </div>
                    <Editable
                      className="text-sm font-semibold text-pink-400 mb-2 block"
                      value={exp.company}
                      onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                    />
                    <ul className="list-disc ml-4 text-sm text-gray-600 leading-relaxed">
                      {exp.description.map((desc, i) => (
                        <Removable key={i} onRemove={() => onRemove(["experience", idx, "description"], i)}>
                          <li>
                            <Editable
                              value={desc}
                              onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)}
                            />
                          </li>
                        </Removable>
                      ))}
                    </ul>
                  </div>
                </Removable>
              ))}
            </section>
          </div>

          <div className="w-1/3 space-y-8">
            <section>
              <Editable
                tag="h3"
                className="text-sm font-bold text-pink-500 uppercase tracking-widest mb-4 border-b border-pink-100 pb-2"
                value={labels.skills}
                onUpdate={(v) => onUpdate(["labels", "skills"], v)}
              />
              {data.skills.map((skill, idx) => (
                <Removable key={idx} onRemove={() => onRemove(["skills"], idx)} className="mb-3">
                  <div>
                    <Editable
                      className="font-bold text-sm block mb-1"
                      value={skill.category}
                      onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                    />
                    <div className="flex flex-wrap gap-1">
                      {skill.items.map((item, i) => (
                        <Removable
                          key={i}
                          onRemove={() => onRemove(["skills", idx, "items"], i)}
                          className="inline-block"
                        >
                          <span className="text-xs bg-pink-50 text-pink-800 px-2 py-1 rounded-full inline-block">
                            <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                          </span>
                        </Removable>
                      ))}
                    </div>
                  </div>
                </Removable>
              ))}
            </section>

            {/* Languages Added */}
            <section>
              <Editable
                tag="h3"
                className="text-sm font-bold text-pink-500 uppercase tracking-widest mb-4 border-b border-pink-100 pb-2"
                value={labels.languages}
                onUpdate={(v) => onUpdate(["labels", "languages"], v)}
              />
              <ul className="space-y-2">
                {data.languages.map((lang, idx) => (
                  <Removable key={idx} onRemove={() => onRemove(["languages"], idx)}>
                    <li className="flex justify-between text-sm">
                      <Editable
                        className="font-bold text-gray-800"
                        value={lang.language}
                        onUpdate={(v) => onUpdate(["languages", idx, "language"], v)}
                      />
                      <Editable
                        className="text-pink-400 text-xs"
                        value={lang.proficiency}
                        onUpdate={(v) => onUpdate(["languages", idx, "proficiency"], v)}
                      />
                    </li>
                  </Removable>
                ))}
              </ul>
            </section>

            <section>
              <Editable
                tag="h3"
                className="text-sm font-bold text-pink-500 uppercase tracking-widest mb-4 border-b border-pink-100 pb-2"
                value={labels.education}
                onUpdate={(v) => onUpdate(["labels", "education"], v)}
              />
              {data.education.map((edu, idx) => (
                <Removable key={idx} onRemove={() => onRemove(["education"], idx)} className="mb-2">
                  <div>
                    <Editable
                      className="font-bold block text-sm"
                      value={edu.school}
                      onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                    />
                    <Editable
                      className="text-xs text-gray-500 block"
                      value={edu.degree}
                      onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                    />
                  </div>
                </Removable>
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGISTICS 1: Corporate (Serif, Traditional) ---
  if (style === "logistics-1") {
    return (
      <div id={wrapperId} className={`${baseClass} font-serif`} style={{ ...commonStyles, padding: "40px" }}>
        <header className="text-center border-b-2 border-gray-300 pb-6 mb-8">
          <Editable
            tag="h1"
            className="text-4xl font-bold text-gray-900 uppercase tracking-wide mb-2"
            value={data.fullName}
            onUpdate={(v) => onUpdate(["fullName"], v)}
          />
          <Editable
            tag="p"
            className="text-lg text-gray-600 mb-3"
            value={data.title}
            onUpdate={(v) => onUpdate(["title"], v)}
          />
          <div className="text-sm text-gray-500 flex justify-center gap-4">
            <Editable value={data.contact.email} onUpdate={(v) => onUpdate(["contact", "email"], v)} />
            <span>•</span>
            <Editable value={data.contact.phone} onUpdate={(v) => onUpdate(["contact", "phone"], v)} />
            <span>•</span>
            <Editable value={data.contact.location} onUpdate={(v) => onUpdate(["contact", "location"], v)} />
          </div>
        </header>

        <section className="mb-6">
          <h3 className="text-sm font-bold uppercase border-b border-gray-400 mb-3 pb-1 text-gray-700">
            <Editable value={labels.aboutMe} onUpdate={(v) => onUpdate(["labels", "aboutMe"], v)} />
          </h3>
          <div className="text-sm text-gray-800 leading-relaxed text-justify">
            {data.aboutMe.map((item, idx) => (
              <Removable key={item.id} onRemove={() => onRemove(["aboutMe"], idx)} className="inline-block mr-2">
                <span>
                  <strong>
                    <Editable value={item.main} onUpdate={(v) => onUpdate(["aboutMe", idx, "main"], v)} />
                  </strong>{" "}
                  <Editable value={item.text} onUpdate={(v) => onUpdate(["aboutMe", idx, "text"], v)} />
                </span>
              </Removable>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="text-sm font-bold uppercase border-b border-gray-400 mb-4 pb-1 text-gray-700">
            <Editable value={labels.experience} onUpdate={(v) => onUpdate(["labels", "experience"], v)} />
          </h3>
          {data.experience.map((exp, idx) => (
            <Removable key={exp.id} onRemove={() => onRemove(["experience"], idx)} className="mb-5">
              <div>
                <div className="flex justify-between font-bold text-gray-900 text-sm">
                  <Editable value={exp.role} onUpdate={(v) => onUpdate(["experience", idx, "role"], v)} />
                  <Editable value={exp.duration} onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)} />
                </div>
                <div className="text-sm italic text-gray-700 mb-1">
                  <Editable value={exp.company} onUpdate={(v) => onUpdate(["experience", idx, "company"], v)} />
                </div>
                <ul className="list-disc ml-5 text-sm text-gray-800 leading-snug">
                  {exp.description.map((desc, i) => (
                    <Removable key={i} onRemove={() => onRemove(["experience", idx, "description"], i)}>
                      <li>
                        <Editable value={desc} onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)} />
                      </li>
                    </Removable>
                  ))}
                </ul>
              </div>
            </Removable>
          ))}
        </section>

        <div className="grid grid-cols-2 gap-8">
          <section>
            <h3 className="text-sm font-bold uppercase border-b border-gray-400 mb-3 pb-1 text-gray-700">
              <Editable value={labels.education} onUpdate={(v) => onUpdate(["labels", "education"], v)} />
            </h3>
            {data.education.map((edu, idx) => (
              <Removable key={idx} onRemove={() => onRemove(["education"], idx)} className="text-sm mb-2">
                <div>
                  <div className="font-bold">
                    <Editable value={edu.school} onUpdate={(v) => onUpdate(["education", idx, "school"], v)} />
                  </div>
                  <div>
                    <Editable value={edu.degree} onUpdate={(v) => onUpdate(["education", idx, "degree"], v)} />
                  </div>
                  <div className="text-gray-500 text-xs">
                    <Editable value={edu.year} onUpdate={(v) => onUpdate(["education", idx, "year"], v)} />
                  </div>
                </div>
              </Removable>
            ))}
          </section>

          <div className="flex flex-col gap-6">
            <section>
              <h3 className="text-sm font-bold uppercase border-b border-gray-400 mb-3 pb-1 text-gray-700">
                <Editable value={labels.skills} onUpdate={(v) => onUpdate(["labels", "skills"], v)} />
              </h3>
              {data.skills.map((skill, idx) => (
                <Removable key={idx} onRemove={() => onRemove(["skills"], idx)} className="mb-2 text-sm">
                  <div>
                    <span className="font-bold mr-2">
                      <Editable value={skill.category} onUpdate={(v) => onUpdate(["skills", idx, "category"], v)} />:
                    </span>
                    <span>
                      {skill.items.map((item, i) => (
                        <Removable
                          key={i}
                          onRemove={() => onRemove(["skills", idx, "items"], i)}
                          className="inline-block"
                        >
                          <span className="after:content-[',_'] last:after:content-['']">
                            <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                          </span>
                        </Removable>
                      ))}
                    </span>
                  </div>
                </Removable>
              ))}
            </section>
            {/* Languages Added */}
            <section>
              <h3 className="text-sm font-bold uppercase border-b border-gray-400 mb-3 pb-1 text-gray-700">
                <Editable value={labels.languages} onUpdate={(v) => onUpdate(["labels", "languages"], v)} />
              </h3>
              <div className="text-sm">
                {data.languages.map((lang, idx) => (
                  <Removable key={idx} onRemove={() => onRemove(["languages"], idx)}>
                    <div className="flex justify-between mb-1">
                      <Editable
                        className="font-semibold"
                        value={lang.language}
                        onUpdate={(v) => onUpdate(["languages", idx, "language"], v)}
                      />
                      <Editable
                        className="italic text-gray-600"
                        value={lang.proficiency}
                        onUpdate={(v) => onUpdate(["languages", idx, "proficiency"], v)}
                      />
                    </div>
                  </Removable>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGISTICS 2: Dense Data (Compact Grid) ---
  if (style === "logistics-2") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "30px" }}>
        <header className="flex justify-between items-start border-b-2 border-blue-900 pb-4 mb-4">
          <div>
            <Editable
              tag="h1"
              className="text-3xl font-bold text-blue-900 uppercase"
              value={data.fullName}
              onUpdate={(v) => onUpdate(["fullName"], v)}
            />
            <Editable
              tag="p"
              className="text-md font-bold text-gray-600"
              value={data.title}
              onUpdate={(v) => onUpdate(["title"], v)}
            />
          </div>
          <div className="text-right text-xs leading-tight">
            <Editable
              className="block font-bold"
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
          </div>
        </header>

        <section className="bg-gray-100 p-3 mb-4 rounded border border-gray-200">
          <h3 className="text-xs font-bold text-blue-900 uppercase mb-1">
            <Editable value={labels.aboutMe} onUpdate={(v) => onUpdate(["labels", "aboutMe"], v)} />
          </h3>
          <div className="flex flex-wrap gap-4 text-xs">
            {data.aboutMe.map((item, idx) => (
              <Removable key={item.id} onRemove={() => onRemove(["aboutMe"], idx)} className="flex-1 min-w-[200px]">
                <div>
                  <span className="font-bold text-gray-800">
                    <Editable value={item.main} onUpdate={(v) => onUpdate(["aboutMe", idx, "main"], v)} />
                  </span>
                  : <Editable value={item.text} onUpdate={(v) => onUpdate(["aboutMe", idx, "text"], v)} />
                </div>
              </Removable>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8">
            <section>
              <h3 className="bg-blue-900 text-white text-xs font-bold px-2 py-1 mb-2 uppercase">
                <Editable value={labels.experience} onUpdate={(v) => onUpdate(["labels", "experience"], v)} />
              </h3>
              {data.experience.map((exp, idx) => (
                <Removable
                  key={exp.id}
                  onRemove={() => onRemove(["experience"], idx)}
                  className="mb-4 border-l-2 border-gray-300 pl-3"
                >
                  <div>
                    <div className="flex justify-between items-baseline">
                      <Editable
                        tag="h4"
                        className="text-sm font-bold text-gray-900"
                        value={exp.role}
                        onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                      />
                      <Editable
                        tag="span"
                        className="text-xs font-mono text-gray-500"
                        value={exp.duration}
                        onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                      />
                    </div>
                    <Editable
                      className="text-xs font-bold text-blue-800 mb-1 block"
                      value={exp.company}
                      onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                    />
                    <ul className="list-square ml-4 text-xs text-gray-700 leading-tight">
                      {exp.description.map((desc, i) => (
                        <Removable key={i} onRemove={() => onRemove(["experience", idx, "description"], i)}>
                          <li>
                            <Editable
                              value={desc}
                              onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)}
                            />
                          </li>
                        </Removable>
                      ))}
                    </ul>
                  </div>
                </Removable>
              ))}
            </section>
          </div>

          <div className="col-span-4 space-y-4">
            <section>
              <h3 className="bg-gray-700 text-white text-xs font-bold px-2 py-1 mb-2 uppercase">
                <Editable value={labels.skills} onUpdate={(v) => onUpdate(["labels", "skills"], v)} />
              </h3>
              <div className="text-xs">
                {data.skills.map((skill, idx) => (
                  <Removable key={idx} onRemove={() => onRemove(["skills"], idx)} className="mb-2">
                    <div>
                      <Editable
                        className="font-bold block text-gray-800"
                        value={skill.category}
                        onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                      />
                      <div className="leading-tight text-gray-600">
                        {skill.items.map((item, i) => (
                          <Removable
                            key={i}
                            onRemove={() => onRemove(["skills", idx, "items"], i)}
                            className="inline-block"
                          >
                            <span className="after:content-[',_'] last:after:content-['']">
                              <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                            </span>
                          </Removable>
                        ))}
                      </div>
                    </div>
                  </Removable>
                ))}
              </div>
            </section>

            {/* Languages Added */}
            <section>
              <h3 className="bg-gray-700 text-white text-xs font-bold px-2 py-1 mb-2 uppercase">
                <Editable value={labels.languages} onUpdate={(v) => onUpdate(["labels", "languages"], v)} />
              </h3>
              <div className="text-xs">
                {data.languages.map((lang, idx) => (
                  <Removable key={idx} onRemove={() => onRemove(["languages"], idx)}>
                    <div className="flex justify-between mb-1 border-b border-gray-100 pb-1">
                      <Editable
                        className="font-semibold"
                        value={lang.language}
                        onUpdate={(v) => onUpdate(["languages", idx, "language"], v)}
                      />
                      <Editable
                        className="text-gray-500"
                        value={lang.proficiency}
                        onUpdate={(v) => onUpdate(["languages", idx, "proficiency"], v)}
                      />
                    </div>
                  </Removable>
                ))}
              </div>
            </section>

            <section>
              <h3 className="bg-gray-700 text-white text-xs font-bold px-2 py-1 mb-2 uppercase">
                <Editable value={labels.education} onUpdate={(v) => onUpdate(["labels", "education"], v)} />
              </h3>
              {data.education.map((edu, idx) => (
                <Removable
                  key={idx}
                  onRemove={() => onRemove(["education"], idx)}
                  className="mb-2 text-xs border-b border-gray-200 pb-1 last:border-0"
                >
                  <div>
                    <Editable
                      className="font-bold block"
                      value={edu.school}
                      onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                    />
                    <Editable
                      className="block text-gray-600"
                      value={edu.degree}
                      onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                    />
                    <Editable
                      className="block text-gray-400 text-[10px]"
                      value={edu.year}
                      onUpdate={(v) => onUpdate(["education", idx, "year"], v)}
                    />
                  </div>
                </Removable>
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- ENGINEERING 1: Terminal (Monospace, Tech) ---
  if (style === "engineering-1") {
    return (
      <div
        id={wrapperId}
        className={`${baseClass} font-mono`}
        style={{ ...commonStyles, padding: "40px", color: "#1a1a1a" }}
      >
        <header className="border-b-2 border-dashed border-gray-400 pb-6 mb-8">
          <Editable
            tag="h1"
            className="text-3xl font-bold mb-1"
            value={`> ${data.fullName}`}
            onUpdate={(v) => onUpdate(["fullName"], v.replace("> ", ""))}
          />
          <Editable
            tag="p"
            className="text-sm text-gray-600 mb-2"
            value={`// ${data.title}`}
            onUpdate={(v) => onUpdate(["title"], v.replace("// ", ""))}
          />
          <div className="text-xs bg-gray-100 p-2 inline-block rounded">
            const contact = {"{"}
            <span className="ml-2 block">
              email: "
              <Editable value={data.contact.email} onUpdate={(v) => onUpdate(["contact", "email"], v)} />
              ",
            </span>
            <span className="ml-2 block">
              phone: "
              <Editable value={data.contact.phone} onUpdate={(v) => onUpdate(["contact", "phone"], v)} />
              ",
            </span>
            <span className="ml-2 block">
              loc: "
              <Editable value={data.contact.location} onUpdate={(v) => onUpdate(["contact", "location"], v)} />"
            </span>
            {"}"};
          </div>
        </header>

        <section className="mb-8">
          <h3 className="text-sm font-bold border-b border-gray-300 mb-2">
            /* <Editable value={labels.aboutMe} onUpdate={(v) => onUpdate(["labels", "aboutMe"], v)} /> */
          </h3>
          <div className="text-xs space-y-2">
            {data.aboutMe.map((item, idx) => (
              <Removable key={item.id} onRemove={() => onRemove(["aboutMe"], idx)}>
                <div>
                  <span className="font-bold text-blue-800">
                    <Editable value={item.main} onUpdate={(v) => onUpdate(["aboutMe", idx, "main"], v)} />
                  </span>
                  {" => "}
                  <Editable value={item.text} onUpdate={(v) => onUpdate(["aboutMe", idx, "text"], v)} />
                </div>
              </Removable>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h3 className="text-sm font-bold border-b border-gray-300 mb-4">
            /* <Editable value={labels.experience} onUpdate={(v) => onUpdate(["labels", "experience"], v)} /> */
          </h3>
          {data.experience.map((exp, idx) => (
            <Removable
              key={exp.id}
              onRemove={() => onRemove(["experience"], idx)}
              className="mb-6 relative pl-4 border-l-2 border-gray-200"
            >
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Editable
                    className="font-bold"
                    value={exp.role}
                    onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                  />
                  <Editable value={exp.duration} onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)} />
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  @ <Editable value={exp.company} onUpdate={(v) => onUpdate(["experience", idx, "company"], v)} />
                </div>
                <ul className="list-none text-xs space-y-1">
                  {exp.description.map((desc, i) => (
                    <Removable key={i} onRemove={() => onRemove(["experience", idx, "description"], i)}>
                      <li className="before:content-['>_']">
                        <Editable value={desc} onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)} />
                      </li>
                    </Removable>
                  ))}
                </ul>
              </div>
            </Removable>
          ))}
        </section>

        <div className="grid grid-cols-2 gap-8">
          <section>
            <h3 className="text-sm font-bold border-b border-gray-300 mb-2">
              /* <Editable value={labels.skills} onUpdate={(v) => onUpdate(["labels", "skills"], v)} /> */
            </h3>
            <div className="text-xs">
              {data.skills.map((skill, idx) => (
                <Removable key={idx} onRemove={() => onRemove(["skills"], idx)} className="mb-2">
                  <div>
                    <span className="text-blue-800 font-bold">
                      <Editable value={skill.category} onUpdate={(v) => onUpdate(["skills", idx, "category"], v)} />
                    </span>
                    : [{" "}
                    {skill.items.map((item, i) => (
                      <Removable
                        key={i}
                        onRemove={() => onRemove(["skills", idx, "items"], i)}
                        className="inline-block"
                      >
                        <span className="after:content-[',_'] last:after:content-['']">
                          "
                          <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />"
                        </span>
                      </Removable>
                    ))}{" "}
                    ]
                  </div>
                </Removable>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-6">
            {/* Languages Added */}
            <section>
              <h3 className="text-sm font-bold border-b border-gray-300 mb-2">
                /* <Editable value={labels.languages} onUpdate={(v) => onUpdate(["labels", "languages"], v)} /> */
              </h3>
              <div className="text-xs">
                const languages = [{" "}
                {data.languages.map((lang, idx) => (
                  <Removable key={idx} onRemove={() => onRemove(["languages"], idx)} className="block pl-4">
                    <span>
                      {'{ lang: "'}
                      <Editable value={lang.language} onUpdate={(v) => onUpdate(["languages", idx, "language"], v)} />
                      {'", level: "'}
                      <Editable
                        value={lang.proficiency}
                        onUpdate={(v) => onUpdate(["languages", idx, "proficiency"], v)}
                      />
                      {'" }'},
                    </span>
                  </Removable>
                ))}
                ]
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold border-b border-gray-300 mb-2">
                /* <Editable value={labels.education} onUpdate={(v) => onUpdate(["labels", "education"], v)} /> */
              </h3>
              {data.education.map((edu, idx) => (
                <Removable key={idx} onRemove={() => onRemove(["education"], idx)} className="mb-2 text-xs">
                  <div>
                    <div className="font-bold">
                      <Editable value={edu.school} onUpdate={(v) => onUpdate(["education", idx, "school"], v)} />
                    </div>
                    <div>
                      <Editable value={edu.degree} onUpdate={(v) => onUpdate(["education", idx, "degree"], v)} />
                    </div>
                    <div className="text-gray-500">
                      <Editable value={edu.year} onUpdate={(v) => onUpdate(["education", idx, "year"], v)} />
                    </div>
                  </div>
                </Removable>
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- ENGINEERING 2: Tech Clean (Minimalist Blue) ---
  if (style === "engineering-2") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "40px" }}>
        <header className="flex justify-between items-start mb-8">
          <div>
            <Editable
              tag="h1"
              className="text-4xl font-light text-gray-800 tracking-tight"
              value={data.fullName}
              onUpdate={(v) => onUpdate(["fullName"], v)}
            />
            <Editable
              tag="p"
              className="text-lg font-bold text-blue-600 mt-1"
              value={data.title}
              onUpdate={(v) => onUpdate(["title"], v)}
            />
          </div>
          <div className="text-right text-xs text-gray-500 space-y-1">
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
          </div>
        </header>

        <section className="mb-8">
          <Editable
            tag="h3"
            className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3"
            value={labels.aboutMe}
            onUpdate={(v) => onUpdate(["labels", "aboutMe"], v)}
          />
          <div className="grid grid-cols-3 gap-4">
            {data.aboutMe.map((item, idx) => (
              <Removable
                key={item.id}
                onRemove={() => onRemove(["aboutMe"], idx)}
                className="border-t-2 border-blue-100 pt-2"
              >
                <div>
                  <p className="font-bold text-sm text-gray-800 mb-1">
                    <Editable value={item.main} onUpdate={(v) => onUpdate(["aboutMe", idx, "main"], v)} />
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <Editable value={item.text} onUpdate={(v) => onUpdate(["aboutMe", idx, "text"], v)} />
                  </p>
                </div>
              </Removable>
            ))}
          </div>
        </section>

        <div className="flex gap-8">
          <div className="w-2/3">
            <section>
              <Editable
                tag="h3"
                className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4"
                value={labels.experience}
                onUpdate={(v) => onUpdate(["labels", "experience"], v)}
              />
              {data.experience.map((exp, idx) => (
                <Removable key={exp.id} onRemove={() => onRemove(["experience"], idx)} className="mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <Editable
                        tag="h4"
                        className="text-lg font-bold text-gray-800"
                        value={exp.role}
                        onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                      />
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <Editable
                        tag="span"
                        className="text-xs font-bold text-blue-600"
                        value={exp.duration}
                        onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                      />
                    </div>
                    <Editable
                      className="text-sm font-medium text-gray-500 mb-2 block"
                      value={exp.company}
                      onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                    />
                    <ul className="list-disc ml-4 text-sm text-gray-600 space-y-1">
                      {exp.description.map((desc, i) => (
                        <Removable key={i} onRemove={() => onRemove(["experience", idx, "description"], i)}>
                          <li>
                            <Editable
                              value={desc}
                              onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)}
                            />
                          </li>
                        </Removable>
                      ))}
                    </ul>
                  </div>
                </Removable>
              ))}
            </section>
          </div>

          <div className="w-1/3 space-y-8">
            <section>
              <Editable
                tag="h3"
                className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4"
                value={labels.skills}
                onUpdate={(v) => onUpdate(["labels", "skills"], v)}
              />
              {data.skills.map((skill, idx) => (
                <Removable key={idx} onRemove={() => onRemove(["skills"], idx)} className="mb-4">
                  <div>
                    <Editable
                      className="font-bold text-sm text-gray-800 block mb-1"
                      value={skill.category}
                      onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                    />
                    <div className="flex flex-wrap gap-2">
                      {skill.items.map((item, i) => (
                        <Removable
                          key={i}
                          onRemove={() => onRemove(["skills", idx, "items"], i)}
                          className="inline-block"
                        >
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                            <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                          </span>
                        </Removable>
                      ))}
                    </div>
                  </div>
                </Removable>
              ))}
            </section>

            {/* Languages Added */}
            <section>
              <Editable
                tag="h3"
                className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4"
                value={labels.languages}
                onUpdate={(v) => onUpdate(["labels", "languages"], v)}
              />
              <div className="space-y-2">
                {data.languages.map((lang, idx) => (
                  <Removable key={idx} onRemove={() => onRemove(["languages"], idx)}>
                    <div className="flex justify-between text-xs border-b border-gray-100 pb-1">
                      <Editable
                        className="font-bold text-gray-700"
                        value={lang.language}
                        onUpdate={(v) => onUpdate(["languages", idx, "language"], v)}
                      />
                      <Editable
                        className="text-blue-500"
                        value={lang.proficiency}
                        onUpdate={(v) => onUpdate(["languages", idx, "proficiency"], v)}
                      />
                    </div>
                  </Removable>
                ))}
              </div>
            </section>

            <section>
              <Editable
                tag="h3"
                className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4"
                value={labels.education}
                onUpdate={(v) => onUpdate(["labels", "education"], v)}
              />
              {data.education.map((edu, idx) => (
                <Removable
                  key={idx}
                  onRemove={() => onRemove(["education"], idx)}
                  className="mb-3 border-l-2 border-gray-200 pl-3"
                >
                  <div>
                    <Editable
                      className="font-bold block text-sm text-gray-800"
                      value={edu.school}
                      onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                    />
                    <Editable
                      className="text-xs text-gray-600 block"
                      value={edu.degree}
                      onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                    />
                    <Editable
                      className="text-xs text-gray-400 block"
                      value={edu.year}
                      onUpdate={(v) => onUpdate(["education", idx, "year"], v)}
                    />
                  </div>
                </Removable>
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }

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
