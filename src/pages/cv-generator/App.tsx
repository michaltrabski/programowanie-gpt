import React, { useState, useEffect, useRef, useCallback } from "react";

// --- Constants ---
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

// NEW: Summary Item Structure
interface SummaryItem {
  id: string;
  main: string; // The bolded part
  text: string; // The description part
}

interface CVData {
  labels: CVLabels;
  fullName: string;
  title: string;
  summary: SummaryItem[]; // Changed from string to array
  contact: ContactInfo;
  skills: SkillSet[];
  languages: Language[];
  interests: string[];
  experience: Experience[];
  education: Education[];
}

// --- Initial Data (Updated with your specific numbered list) ---
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
      return savedImg && savedImg !== "undefined" && savedImg !== "null" ? savedImg : null;
    }
    return null;
  });

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
        // Ensure structure compatibility if old data is loaded
        if (!Array.isArray(parsed.summary)) {
          // Fallback/Migration for old string summaries
          parsed.summary = [{ id: "1", main: "Summary", text: parsed.summary || "Profile description..." }];
        }
        if (!parsed.labels) parsed.labels = INITIAL_DATA.labels;
        if (!parsed.languages) parsed.languages = INITIAL_DATA.languages;
        if (!parsed.interests) parsed.interests = INITIAL_DATA.interests;
        setData(parsed);
        setError(null);
      } catch (e) {
        setError("Invalid JSON format");
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
      setProfileImage(null);

      // Reset Margins
      setMarginTop(DEFAULT_MARGIN_TOP);
      setMarginBottom(DEFAULT_MARGIN_BOTTOM);

      // Clear Storage
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
            <TemplateRenderer style={selectedStyle} data={data} image={profileImage} onUpdate={handleFieldUpdate} />
          </div>
        </div>
      </div>
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

  // --- ECOMMERCE 2: Brand Modern (Teal Accent, Card Style) ---
  if (style === "ecommerce-2") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "0px" }}>
        <div className="bg-teal-700 text-white p-10 flex items-center justify-between">
          <div className="flex-1">
            <Editable
              tag="h1"
              className="text-4xl font-bold tracking-tight mb-2"
              value={data.fullName}
              onUpdate={(v) => onUpdate(["fullName"], v)}
            />
            <Editable
              tag="p"
              className="text-teal-200 text-lg font-medium"
              value={data.title}
              onUpdate={(v) => onUpdate(["title"], v)}
            />
            <div className="flex gap-4 mt-4 text-sm text-teal-100 font-medium">
              <Editable value={data.contact.email} onUpdate={(v) => onUpdate(["contact", "email"], v)} />
              <span>•</span>
              <Editable value={data.contact.phone} onUpdate={(v) => onUpdate(["contact", "phone"], v)} />
              <span>•</span>
              <Editable value={data.contact.location} onUpdate={(v) => onUpdate(["contact", "location"], v)} />
            </div>
          </div>
          {image && (
            <img
              src={image}
              alt="Profile"
              className="w-28 h-28 rounded-full border-4 border-teal-500 object-cover shadow-lg"
            />
          )}
        </div>

        <div className="p-10 grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-8">
            <section>
              <h3 className="text-teal-700 font-bold uppercase tracking-wider mb-3 border-b border-teal-100 pb-2 flex items-center gap-2">
                <span className="text-xl">★</span>{" "}
                <Editable value={labels.summary} onUpdate={(v) => onUpdate(["labels", "summary"], v)} />
              </h3>
              {/* UPDATED: Summary List */}
              <ol className="list-decimal list-outside ml-5 text-gray-600 leading-relaxed space-y-3">
                {data.summary.map((item, idx) => (
                  <li key={item.id} className="pl-2">
                    <strong className="text-teal-900 block md:inline mr-1">
                      <Editable value={item.main} onUpdate={(v) => onUpdate(["summary", idx, "main"], v)} />
                    </strong>
                    <Editable value={item.text} onUpdate={(v) => onUpdate(["summary", idx, "text"], v)} />
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="text-teal-700 font-bold uppercase tracking-wider mb-6 border-b border-teal-100 pb-2 flex items-center gap-2">
                <span className="text-xl">💼</span>{" "}
                <Editable value={labels.experience} onUpdate={(v) => onUpdate(["labels", "experience"], v)} />
              </h3>
              <div className="space-y-8">
                {data.experience.map((exp, idx) => (
                  <div key={exp.id} className="relative pl-4 border-l-2 border-teal-200">
                    <div className="flex justify-between items-start mb-1">
                      <Editable
                        tag="h4"
                        className="text-xl font-bold text-gray-800"
                        value={exp.role}
                        onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                      />
                      <Editable
                        tag="span"
                        className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-full"
                        value={exp.duration}
                        onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                      />
                    </div>
                    <Editable
                      className="text-gray-500 font-medium mb-2 block"
                      value={exp.company}
                      onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                    />
                    <ul className="list-disc list-outside ml-4 text-gray-600 space-y-1.5 text-sm">
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

          <div className="col-span-1 bg-gray-50 p-6 rounded-xl h-fit">
            <section className="mb-8">
              <h3 className="text-teal-700 font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-1">
                <Editable value={labels.skills} onUpdate={(v) => onUpdate(["labels", "skills"], v)} />
              </h3>
              <div className="space-y-4">
                {data.skills.map((skill, idx) => (
                  <div key={idx}>
                    <Editable
                      className="text-xs font-bold text-gray-400 uppercase mb-1 block"
                      value={skill.category}
                      onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                    />
                    <div className="flex flex-wrap gap-2">
                      {skill.items.map((item, i) => (
                        <span
                          key={i}
                          className="bg-white border border-gray-200 text-teal-700 px-2 py-1 rounded text-xs font-medium"
                        >
                          <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <h3 className="text-teal-700 font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-1">
                <Editable value={labels.languages} onUpdate={(v) => onUpdate(["labels", "languages"], v)} />
              </h3>
              <div className="space-y-2 text-sm">
                {data.languages.map((l, i) => (
                  <div key={i} className="flex justify-between">
                    <Editable value={l.language} onUpdate={(v) => onUpdate(["languages", i, "language"], v)} />
                    <Editable
                      className="text-gray-500"
                      value={l.proficiency}
                      onUpdate={(v) => onUpdate(["languages", i, "proficiency"], v)}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <h3 className="text-teal-700 font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-1">
                <Editable value={labels.education} onUpdate={(v) => onUpdate(["labels", "education"], v)} />
              </h3>
              {data.education.map((edu, idx) => (
                <div key={edu.id} className="mb-3">
                  <Editable
                    className="font-bold text-gray-800 text-sm block"
                    value={edu.school}
                    onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                  />
                  <Editable
                    className="text-xs text-gray-600 block"
                    value={edu.degree}
                    onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                  />
                  <Editable
                    className="text-xs text-teal-500 block"
                    value={edu.year}
                    onUpdate={(v) => onUpdate(["education", idx, "year"], v)}
                  />
                </div>
              ))}
            </section>

            <section>
              <h3 className="text-teal-700 font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-1">
                <Editable value={labels.interests} onUpdate={(v) => onUpdate(["labels", "interests"], v)} />
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.interests.map((int, i) => (
                  <span key={i} className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
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

  // --- MARKETING 1 ---
  if (style === "marketing-1") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "40px" }}>
        <header className="flex flex-col items-center mb-10 border-b-4 border-purple-600 pb-8">
          {image && (
            <img
              src={image}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-purple-100 mb-4 shadow-sm"
            />
          )}
          <Editable
            tag="h1"
            className="text-5xl font-extrabold text-gray-900 tracking-tight mb-2 text-center"
            value={data.fullName}
            onUpdate={(v) => onUpdate(["fullName"], v)}
          />
          <Editable
            tag="p"
            className="text-xl text-purple-600 font-medium mb-4 tracking-wide uppercase"
            value={data.title}
            onUpdate={(v) => onUpdate(["title"], v)}
          />

          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
              <MailIcon /> <Editable value={data.contact.email} onUpdate={(v) => onUpdate(["contact", "email"], v)} />
            </span>
            <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
              <PhoneIcon /> <Editable value={data.contact.phone} onUpdate={(v) => onUpdate(["contact", "phone"], v)} />
            </span>
            <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
              <MapPinIcon />{" "}
              <Editable value={data.contact.location} onUpdate={(v) => onUpdate(["contact", "location"], v)} />
            </span>
          </div>
        </header>

        <section className="mb-10 bg-purple-50 p-6 rounded-xl border border-purple-100">
          <Editable
            tag="h3"
            className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-3 text-center"
            value={labels.summary}
            onUpdate={(v) => onUpdate(["labels", "summary"], v)}
          />
          {/* UPDATED: Summary List - Left aligned even though header is center */}
          <ol className="list-decimal list-outside ml-6 text-gray-700 leading-relaxed text-left text-lg space-y-3">
            {data.summary.map((item, idx) => (
              <li key={item.id} className="pl-2">
                <strong className="text-purple-900 block md:inline mr-1">
                  <Editable value={item.main} onUpdate={(v) => onUpdate(["summary", idx, "main"], v)} />
                </strong>
                <Editable value={item.text} onUpdate={(v) => onUpdate(["summary", idx, "text"], v)} />
              </li>
            ))}
          </ol>
        </section>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-purple-500 text-xl font-bold">#</span>
                <Editable
                  tag="h3"
                  className="text-xl font-bold text-gray-800"
                  value={labels.experience}
                  onUpdate={(v) => onUpdate(["labels", "experience"], v)}
                />
              </div>
              <div className="space-y-8">
                {data.experience.map((exp, idx) => (
                  <div key={exp.id} className="relative pl-6 border-l-2 border-purple-200">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-500 border-4 border-white"></div>
                    <Editable
                      tag="h4"
                      className="text-lg font-bold text-gray-900 block"
                      value={exp.role}
                      onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                    />
                    <div className="text-purple-600 font-medium text-sm mb-2">
                      <Editable value={exp.company} onUpdate={(v) => onUpdate(["experience", idx, "company"], v)} /> •{" "}
                      <Editable value={exp.duration} onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)} />
                    </div>
                    <ul className="list-disc list-outside ml-4 text-gray-600 text-sm space-y-1">
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
              <div className="flex items-center gap-2 mb-6">
                <span className="text-purple-500 text-xl font-bold">#</span>
                <Editable
                  tag="h3"
                  className="text-xl font-bold text-gray-800"
                  value={labels.skills}
                  onUpdate={(v) => onUpdate(["labels", "skills"], v)}
                />
              </div>
              <div className="flex flex-col gap-4">
                {data.skills.map((skill, idx) => (
                  <div key={idx}>
                    <Editable
                      className="text-xs font-bold text-gray-400 uppercase block mb-1"
                      value={skill.category}
                      onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                    />
                    <div className="flex flex-wrap gap-2">
                      {skill.items.map((item, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                          <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-purple-500 text-xl font-bold">#</span>
                <Editable
                  tag="h3"
                  className="text-xl font-bold text-gray-800"
                  value={labels.languages}
                  onUpdate={(v) => onUpdate(["labels", "languages"], v)}
                />
              </div>
              <div className="space-y-2">
                {data.languages.map((lang, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <Editable
                      className="font-medium text-gray-700"
                      value={lang.language}
                      onUpdate={(v) => onUpdate(["languages", idx, "language"], v)}
                    />
                    <Editable
                      className="text-gray-500"
                      value={lang.proficiency}
                      onUpdate={(v) => onUpdate(["languages", idx, "proficiency"], v)}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-purple-500 text-xl font-bold">#</span>
                <Editable
                  tag="h3"
                  className="text-xl font-bold text-gray-800"
                  value={labels.education}
                  onUpdate={(v) => onUpdate(["labels", "education"], v)}
                />
              </div>
              {data.education.map((edu, idx) => (
                <div key={edu.id} className="mb-4">
                  <Editable
                    className="font-bold text-gray-800 text-sm block"
                    value={edu.school}
                    onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                  />
                  <Editable
                    className="text-xs text-gray-500 block"
                    value={edu.degree}
                    onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                  />
                  <Editable
                    className="text-xs text-purple-500 font-medium mt-1 block"
                    value={edu.year}
                    onUpdate={(v) => onUpdate(["education", idx, "year"], v)}
                  />
                </div>
              ))}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-purple-500 text-xl font-bold">#</span>
                <Editable
                  tag="h3"
                  className="text-xl font-bold text-gray-800"
                  value={labels.interests}
                  onUpdate={(v) => onUpdate(["labels", "interests"], v)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {data.interests.map((int, idx) => (
                  <span key={idx} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                    <Editable value={int} onUpdate={(v) => onUpdate(["interests", idx], v)} />
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- MARKETING 2 ---
  if (style === "marketing-2") {
    return (
      <div id={wrapperId} className={baseClass} style={commonStyles}>
        <div className="flex h-full min-h-[297mm]">
          <div className="w-[35%] bg-gray-900 text-white p-8 flex flex-col">
            <div className="flex flex-col items-center mb-10">
              {image && (
                <img
                  src={image}
                  alt="Profile"
                  className="w-36 h-36 rounded-full object-cover border-4 border-gray-700 mb-6"
                />
              )}
              <Editable
                tag="h1"
                className="text-2xl font-bold text-center leading-tight mb-2"
                value={data.fullName}
                onUpdate={(v) => onUpdate(["fullName"], v)}
              />
              <Editable
                tag="p"
                className="text-purple-400 text-sm font-medium tracking-widest uppercase"
                value={data.title}
                onUpdate={(v) => onUpdate(["title"], v)}
              />
            </div>

            <div className="space-y-8 flex-1">
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-3">
                  <MailIcon />{" "}
                  <Editable value={data.contact.email} onUpdate={(v) => onUpdate(["contact", "email"], v)} />
                </div>
                <div className="flex items-center gap-3">
                  <PhoneIcon />{" "}
                  <Editable value={data.contact.phone} onUpdate={(v) => onUpdate(["contact", "phone"], v)} />
                </div>
                <div className="flex items-center gap-3">
                  <MapPinIcon />{" "}
                  <Editable value={data.contact.location} onUpdate={(v) => onUpdate(["contact", "location"], v)} />
                </div>
              </div>

              <div>
                <Editable
                  tag="h3"
                  className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-700 pb-1 block"
                  value={labels.skills}
                  onUpdate={(v) => onUpdate(["labels", "skills"], v)}
                />
                <div className="space-y-4">
                  {data.skills.map((skill, idx) => (
                    <div key={idx}>
                      <Editable
                        className="text-xs text-purple-400 mb-1 block"
                        value={skill.category}
                        onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                      />
                      <div className="flex flex-wrap gap-1">
                        {skill.items.map((item, i) => (
                          <span
                            key={i}
                            className="text-[10px] border border-gray-600 px-1.5 py-0.5 rounded text-gray-300"
                          >
                            <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Editable
                  tag="h3"
                  className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-700 pb-1 block"
                  value={labels.languages}
                  onUpdate={(v) => onUpdate(["labels", "languages"], v)}
                />
                <ul className="text-sm text-gray-300 space-y-1">
                  {data.languages.map((l, i) => (
                    <li key={i} className="flex justify-between">
                      <Editable value={l.language} onUpdate={(v) => onUpdate(["languages", i, "language"], v)} />
                      <Editable
                        className="text-gray-500 text-xs"
                        value={l.proficiency}
                        onUpdate={(v) => onUpdate(["languages", i, "proficiency"], v)}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Editable
                  tag="h3"
                  className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-700 pb-1 block"
                  value={labels.education}
                  onUpdate={(v) => onUpdate(["labels", "education"], v)}
                />
                {data.education.map((edu, idx) => (
                  <div key={edu.id} className="mb-4">
                    <Editable
                      className="font-bold text-white text-sm block"
                      value={edu.school}
                      onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                    />
                    <Editable
                      className="text-xs text-gray-400 block"
                      value={edu.degree}
                      onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                    />
                    <Editable
                      className="text-xs text-purple-400 mt-1 block"
                      value={edu.year}
                      onUpdate={(v) => onUpdate(["education", idx, "year"], v)}
                    />
                  </div>
                ))}
              </div>

              <div>
                <Editable
                  tag="h3"
                  className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-700 pb-1 block"
                  value={labels.interests}
                  onUpdate={(v) => onUpdate(["labels", "interests"], v)}
                />
                <div className="flex flex-wrap gap-2">
                  {data.interests.map((l, i) => (
                    <span key={i} className="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-300">
                      <Editable value={l} onUpdate={(v) => onUpdate(["interests", i], v)} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-[65%] p-10 bg-white">
            <section className="mb-10">
              <Editable
                tag="h2"
                className="text-4xl font-black text-gray-900 mb-6"
                value={labels.summary}
                onUpdate={(v) => onUpdate(["labels", "summary"], v)}
              />
              {/* UPDATED: Summary List */}
              <ol className="list-decimal list-outside ml-6 text-gray-600 leading-loose text-justify border-l-4 border-purple-500 pl-4 space-y-4">
                {data.summary.map((item, idx) => (
                  <li key={item.id} className="pl-2">
                    <span className="font-bold text-gray-800 mr-2">
                      <Editable value={item.main} onUpdate={(v) => onUpdate(["summary", idx, "main"], v)} />
                    </span>
                    <Editable value={item.text} onUpdate={(v) => onUpdate(["summary", idx, "text"], v)} />
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <Editable
                tag="h3"
                className="text-xl font-bold text-gray-900 mb-8 border-b-2 border-gray-100 pb-2"
                value={labels.experience}
                onUpdate={(v) => onUpdate(["labels", "experience"], v)}
              />
              <div className="space-y-8">
                {data.experience.map((exp, idx) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-start mb-1">
                      <Editable
                        tag="h4"
                        className="text-xl font-bold text-gray-800"
                        value={exp.role}
                        onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                      />
                      <Editable
                        tag="span"
                        className="text-sm font-bold bg-gray-100 px-2 py-1 rounded"
                        value={exp.duration}
                        onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                      />
                    </div>
                    <Editable
                      className="text-purple-600 font-medium mb-3 block"
                      value={exp.company}
                      onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                    />
                    <ul className="list-disc list-outside ml-4 text-gray-600 text-sm space-y-2">
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
        </div>
      </div>
    );
  }

  // --- LOGISTICS 1 ---
  if (style === "logistics-1") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "40px" }}>
        <div className="bg-blue-900 text-white p-8 -m-[40px] mb-8 flex items-center gap-6">
          {image && (
            <img src={image} alt="Profile" className="w-24 h-24 rounded-lg object-cover border-2 border-blue-400" />
          )}
          <div className="flex-1">
            <Editable
              tag="h1"
              className="text-4xl font-bold uppercase tracking-wider block"
              value={data.fullName}
              onUpdate={(v) => onUpdate(["fullName"], v)}
            />
            <Editable
              tag="p"
              className="text-lg text-blue-200 font-medium mt-1 block"
              value={data.title}
              onUpdate={(v) => onUpdate(["title"], v)}
            />
          </div>
          <div className="text-right text-sm text-blue-100 space-y-1 text-xs">
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

        <div className="grid grid-cols-3 gap-8 pt-6">
          <div className="col-span-2 space-y-8">
            <section>
              <Editable
                tag="h3"
                className="text-sm font-bold uppercase tracking-wider text-blue-800 border-b-2 border-blue-800 mb-4 pb-1"
                value={labels.summary}
                onUpdate={(v) => onUpdate(["labels", "summary"], v)}
              />
              {/* UPDATED: Summary List */}
              <ol className="list-decimal list-outside ml-5 text-gray-700 text-sm leading-relaxed text-justify space-y-2">
                {data.summary.map((item, idx) => (
                  <li key={item.id} className="pl-2">
                    <strong className="block text-blue-900">
                      <Editable value={item.main} onUpdate={(v) => onUpdate(["summary", idx, "main"], v)} />
                    </strong>
                    <Editable value={item.text} onUpdate={(v) => onUpdate(["summary", idx, "text"], v)} />
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <Editable
                tag="h3"
                className="text-sm font-bold uppercase tracking-wider text-blue-800 border-b-2 border-blue-800 mb-4 pb-1"
                value={labels.experience}
                onUpdate={(v) => onUpdate(["labels", "experience"], v)}
              />
              <div className="space-y-6">
                {data.experience.map((exp, idx) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-baseline">
                      <Editable
                        tag="h4"
                        className="text-lg font-bold text-gray-900"
                        value={exp.role}
                        onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                      />
                      <Editable
                        tag="span"
                        className="text-sm font-bold text-blue-700"
                        value={exp.duration}
                        onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                      />
                    </div>
                    <Editable
                      className="text-sm text-gray-600 font-semibold mb-2 uppercase block"
                      value={exp.company}
                      onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                    />
                    <ul className="list-square list-inside text-gray-700 text-sm space-y-1">
                      {exp.description.map((desc, i) => (
                        <li key={i} className="pl-2 border-l-2 border-gray-200 ml-1">
                          <Editable value={desc} onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="col-span-1 bg-gray-50 p-4 -my-4 rounded border border-gray-100 h-full">
            <section className="mb-8">
              <Editable
                tag="h3"
                className="text-sm font-bold uppercase tracking-wider text-blue-800 mb-4 block"
                value={labels.skills}
                onUpdate={(v) => onUpdate(["labels", "skills"], v)}
              />
              <div className="space-y-4">
                {data.skills.map((skill, idx) => (
                  <div key={idx}>
                    <Editable
                      className="text-xs font-bold text-gray-500 mb-1 block"
                      value={skill.category}
                      onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                    />
                    <ul className="space-y-1">
                      {skill.items.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>{" "}
                          <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <Editable
                tag="h3"
                className="text-sm font-bold uppercase tracking-wider text-blue-800 mb-4 block"
                value={labels.languages}
                onUpdate={(v) => onUpdate(["labels", "languages"], v)}
              />
              <ul className="space-y-2 text-sm text-gray-700">
                {data.languages.map((l, i) => (
                  <li key={i} className="flex justify-between border-b border-gray-200 pb-1">
                    <Editable value={l.language} onUpdate={(v) => onUpdate(["languages", i, "language"], v)} />
                    <Editable
                      className="font-bold text-blue-600"
                      value={l.proficiency}
                      onUpdate={(v) => onUpdate(["languages", i, "proficiency"], v)}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <Editable
                tag="h3"
                className="text-sm font-bold uppercase tracking-wider text-blue-800 mb-4 block"
                value={labels.education}
                onUpdate={(v) => onUpdate(["labels", "education"], v)}
              />
              {data.education.map((edu, idx) => (
                <div key={edu.id} className="mb-4 border-b border-gray-200 pb-2 last:border-0">
                  <Editable
                    className="font-bold text-gray-900 text-sm block"
                    value={edu.school}
                    onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                  />
                  <Editable
                    className="text-xs text-gray-600 block"
                    value={edu.degree}
                    onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                  />
                  <Editable
                    className="text-xs text-blue-600 font-medium mt-1 block"
                    value={edu.year}
                    onUpdate={(v) => onUpdate(["education", idx, "year"], v)}
                  />
                </div>
              ))}
            </section>

            <section>
              <Editable
                tag="h3"
                className="text-sm font-bold uppercase tracking-wider text-blue-800 mb-4 block"
                value={labels.interests}
                onUpdate={(v) => onUpdate(["labels", "interests"], v)}
              />
              <div className="flex flex-wrap gap-2">
                {data.interests.map((int, idx) => (
                  <span key={idx} className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-700">
                    <Editable value={int} onUpdate={(v) => onUpdate(["interests", idx], v)} />
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGISTICS 2 ---
  if (style === "logistics-2") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "30px" }}>
        <div className="border-b-4 border-gray-800 mb-6 pb-6 flex justify-between items-end">
          <div>
            <Editable
              tag="h1"
              className="text-3xl font-black uppercase tracking-tighter mb-1 block"
              value={data.fullName}
              onUpdate={(v) => onUpdate(["fullName"], v)}
            />
            <Editable
              tag="div"
              className="text-sm font-bold bg-gray-800 text-white inline-block px-2 py-0.5"
              value={data.title}
              onUpdate={(v) => onUpdate(["title"], v)}
            />
          </div>
          {image && <img src={image} alt="Profile" className="w-16 h-16 object-cover border border-gray-300" />}
        </div>

        <div className="mb-6 text-xs border-b border-gray-200 pb-6">
          <div className="mb-4">
            <div className="font-bold text-gray-800 uppercase mb-2">
              <Editable tag="span" value={labels.summary} onUpdate={(v) => onUpdate(["labels", "summary"], v)} />
            </div>
            {/* UPDATED: Summary List */}
            <ol className="list-decimal list-outside ml-4 text-gray-600 space-y-2">
              {data.summary.map((item, idx) => (
                <li key={item.id} className="pl-1">
                  <span className="font-bold text-gray-800 mr-1">
                    <Editable value={item.main} onUpdate={(v) => onUpdate(["summary", idx, "main"], v)} />
                  </span>
                  <Editable value={item.text} onUpdate={(v) => onUpdate(["summary", idx, "text"], v)} />
                </li>
              ))}
            </ol>
          </div>

          <div className="flex gap-4 justify-end text-right text-gray-600 border-t border-gray-100 pt-2 mt-4">
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

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <Editable
              tag="h3"
              className="text-sm font-black uppercase border-b-2 border-gray-300 mb-4 block"
              value={labels.experience}
              onUpdate={(v) => onUpdate(["labels", "experience"], v)}
            />
            <div className="space-y-5">
              {data.experience.map((exp, idx) => (
                <div key={exp.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <Editable
                      className="font-bold text-gray-900"
                      value={exp.company}
                      onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                    />
                    <Editable
                      className="font-mono text-gray-500"
                      value={exp.duration}
                      onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                    />
                  </div>
                  <Editable
                    className="text-xs font-bold text-gray-700 uppercase mb-1 block"
                    value={exp.role}
                    onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                  />
                  <ul className="list-disc list-outside ml-4 text-xs text-gray-600 space-y-0.5">
                    {exp.description.map((desc, i) => (
                      <li key={i}>
                        <Editable value={desc} onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-1 bg-gray-50 p-4 border border-gray-100">
            <Editable
              tag="h3"
              className="text-sm font-black uppercase border-b-2 border-gray-300 mb-4 block"
              value={labels.skills}
              onUpdate={(v) => onUpdate(["labels", "skills"], v)}
            />
            <div className="space-y-4">
              {data.skills.map((skill, idx) => (
                <div key={idx}>
                  <Editable
                    className="text-xs font-bold underline mb-1 block"
                    value={skill.category}
                    onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                  />
                  <div className="text-xs text-gray-600 leading-relaxed flex flex-wrap gap-1">
                    {skill.items.map((item, i) => (
                      <span key={i} className="after:content-['•'] last:after:content-[''] after:ml-1">
                        <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Editable
                tag="h3"
                className="text-sm font-black uppercase border-b-2 border-gray-300 mb-4 block"
                value={labels.languages}
                onUpdate={(v) => onUpdate(["labels", "languages"], v)}
              />
              <ul className="text-xs space-y-1">
                {data.languages.map((l, i) => (
                  <li key={i}>
                    <Editable value={l.language} onUpdate={(v) => onUpdate(["languages", i, "language"], v)} /> (
                    <Editable value={l.proficiency} onUpdate={(v) => onUpdate(["languages", i, "proficiency"], v)} />)
                  </li>
                ))}
              </ul>
            </div>

            <Editable
              tag="h3"
              className="text-sm font-black uppercase border-b-2 border-gray-300 mb-4 mt-8 block"
              value={labels.education}
              onUpdate={(v) => onUpdate(["labels", "education"], v)}
            />
            {data.education.map((edu, idx) => (
              <div key={edu.id} className="mb-2">
                <Editable
                  className="font-bold text-gray-900 text-xs block"
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
            ))}

            <div className="mt-8">
              <Editable
                tag="h3"
                className="text-sm font-black uppercase border-b-2 border-gray-300 mb-4 block"
                value={labels.interests}
                onUpdate={(v) => onUpdate(["labels", "interests"], v)}
              />
              <div className="text-xs text-gray-600 flex flex-wrap gap-1">
                {data.interests.map((int, i) => (
                  <span key={i} className="after:content-[','] last:after:content-[''] after:mr-1">
                    <Editable value={int} onUpdate={(v) => onUpdate(["interests", i], v)} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ENGINEERING 1 ---
  if (style === "engineering-1") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "40px" }}>
        <header className="flex justify-between items-start border-b border-gray-300 pb-6 mb-8 font-mono">
          <div>
            <Editable
              tag="h1"
              className="text-3xl font-bold text-gray-900 mb-2 block"
              value={data.fullName}
              onUpdate={(v) => onUpdate(["fullName"], v)}
            />
            <div className="text-lg text-gray-600 flex items-center">
              &lt;
              <Editable value={data.title} onUpdate={(v) => onUpdate(["title"], v)} /> /&gt;
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-4 font-sans">
              <Editable value={data.contact.email} onUpdate={(v) => onUpdate(["contact", "email"], v)} /> |
              <Editable value={data.contact.phone} onUpdate={(v) => onUpdate(["contact", "phone"], v)} /> |
              <Editable value={data.contact.location} onUpdate={(v) => onUpdate(["contact", "location"], v)} />
            </div>
          </div>
          {image && <img src={image} alt="Profile" className="w-24 h-24 object-cover grayscale opacity-90" />}
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 pr-6 border-r border-gray-200">
            <section className="mb-8">
              <Editable
                tag="h3"
                className="font-mono text-sm font-bold text-gray-900 uppercase mb-4 tracking-tight block"
                value={labels.skills}
                onUpdate={(v) => onUpdate(["labels", "skills"], v)}
              />
              <div className="space-y-4">
                {data.skills.map((skill, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-bold text-gray-500 mb-1 font-mono">
                      ./
                      <Editable value={skill.category} onUpdate={(v) => onUpdate(["skills", idx, "category"], v)} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {skill.items.map((item, i) => (
                        <span
                          key={i}
                          className="text-xs border border-gray-300 px-1 py-0.5 rounded text-gray-600 font-mono"
                        >
                          <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <Editable
                tag="h3"
                className="font-mono text-sm font-bold text-gray-900 uppercase mb-4 tracking-tight block"
                value={labels.languages}
                onUpdate={(v) => onUpdate(["labels", "languages"], v)}
              />
              <ul className="text-xs font-mono space-y-2 text-gray-600">
                {data.languages.map((l, i) => (
                  <li key={i}>
                    [<Editable value={l.language} onUpdate={(v) => onUpdate(["languages", i, "language"], v)} />] ::{" "}
                    <Editable value={l.proficiency} onUpdate={(v) => onUpdate(["languages", i, "proficiency"], v)} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <Editable
                tag="h3"
                className="font-mono text-sm font-bold text-gray-900 uppercase mb-4 tracking-tight block"
                value={labels.education}
                onUpdate={(v) => onUpdate(["labels", "education"], v)}
              />
              {data.education.map((edu, idx) => (
                <div key={edu.id} className="mb-4">
                  <Editable
                    className="font-bold text-gray-900 text-sm block"
                    value={edu.school}
                    onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                  />
                  <Editable
                    className="text-xs text-gray-600 italic block"
                    value={edu.degree}
                    onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                  />
                  <div className="text-xs text-gray-400 font-mono mt-1">
                    [<Editable value={edu.year} onUpdate={(v) => onUpdate(["education", idx, "year"], v)} />]
                  </div>
                </div>
              ))}
            </section>

            <section>
              <Editable
                tag="h3"
                className="font-mono text-sm font-bold text-gray-900 uppercase mb-4 tracking-tight block"
                value={labels.interests}
                onUpdate={(v) => onUpdate(["labels", "interests"], v)}
              />
              <div className="text-xs font-mono text-gray-600 flex flex-wrap gap-1">
                {data.interests.map((int, i) => (
                  <span key={i} className="after:content-[','] last:after:content-['']">
                    "<Editable value={int} onUpdate={(v) => onUpdate(["interests", i], v)} />"
                  </span>
                ))}
              </div>
            </section>
          </div>

          <div className="col-span-8">
            <section className="mb-8">
              <h3 className="font-mono text-sm font-bold text-gray-900 uppercase mb-3 tracking-tight">
                git log --stat "
                {<Editable value={labels.summary} onUpdate={(v) => onUpdate(["labels", "summary"], v)} />}"
              </h3>
              {/* UPDATED: Summary List */}
              <div className="text-gray-700 text-sm leading-relaxed font-mono pl-2 border-l-2 border-gray-300">
                {data.summary.map((item, idx) => (
                  <div key={item.id} className="mb-2">
                    <span className="text-blue-600 mr-2">{idx + 1}.</span>
                    <strong className="text-gray-900 mr-1">
                      <Editable value={item.main} onUpdate={(v) => onUpdate(["summary", idx, "main"], v)} />
                    </strong>
                    <span className="block pl-5 text-xs text-gray-500">
                      <Editable value={item.text} onUpdate={(v) => onUpdate(["summary", idx, "text"], v)} />
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-mono text-sm font-bold text-gray-900 uppercase mb-6 tracking-tight">
                ./
                <Editable value={labels.experience} onUpdate={(v) => onUpdate(["labels", "experience"], v)} />
                .log
              </h3>
              <div className="space-y-8">
                {data.experience.map((exp, idx) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <Editable
                        tag="h4"
                        className="text-base font-bold text-gray-800"
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
                    <div className="text-sm text-gray-600 font-medium mb-2 font-mono text-blue-600">
                      @ <Editable value={exp.company} onUpdate={(v) => onUpdate(["experience", idx, "company"], v)} />
                    </div>
                    <ul className="list-disc list-outside ml-4 text-gray-600 text-sm space-y-1 marker:text-gray-400">
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
        </div>
      </div>
    );
  }

  // --- ENGINEERING 2 ---
  return (
    <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "40px" }}>
      <header className="flex gap-6 items-center mb-10">
        {image && <img src={image} alt="Profile" className="w-24 h-24 rounded-2xl object-cover" />}
        <div>
          <Editable
            tag="h1"
            className="text-4xl font-bold tracking-tight text-gray-900 block"
            value={data.fullName}
            onUpdate={(v) => onUpdate(["fullName"], v)}
          />
          <Editable
            tag="p"
            className="text-lg text-slate-500 font-medium block"
            value={data.title}
            onUpdate={(v) => onUpdate(["title"], v)}
          />
          <div className="flex gap-4 text-sm text-slate-400 mt-2">
            <Editable value={data.contact.email} onUpdate={(v) => onUpdate(["contact", "email"], v)} />
            <Editable value={data.contact.phone} onUpdate={(v) => onUpdate(["contact", "phone"], v)} />
            <Editable value={data.contact.location} onUpdate={(v) => onUpdate(["contact", "location"], v)} />
          </div>
        </div>
      </header>

      <section className="mb-8 bg-slate-50 p-4 rounded-lg">
        {/* UPDATED: Summary List */}
        <ol className="list-decimal list-outside ml-4 text-slate-700 space-y-2">
          {data.summary.map((item, idx) => (
            <li key={item.id} className="pl-2">
              <strong className="text-slate-900 mr-1">
                <Editable value={item.main} onUpdate={(v) => onUpdate(["summary", idx, "main"], v)} />
              </strong>
              <Editable value={item.text} onUpdate={(v) => onUpdate(["summary", idx, "text"], v)} />
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8">
          <Editable
            tag="h3"
            className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-6 block"
            value={labels.experience}
            onUpdate={(v) => onUpdate(["labels", "experience"], v)}
          />
          <div className="space-y-8">
            {data.experience.map((exp, idx) => (
              <div key={exp.id} className="relative pl-6 border-l border-slate-200">
                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="flex justify-between items-center mb-1">
                  <Editable
                    tag="h4"
                    className="font-bold text-lg text-slate-800"
                    value={exp.role}
                    onUpdate={(v) => onUpdate(["experience", idx, "role"], v)}
                  />
                  <Editable
                    tag="span"
                    className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded"
                    value={exp.duration}
                    onUpdate={(v) => onUpdate(["experience", idx, "duration"], v)}
                  />
                </div>
                <Editable
                  className="text-slate-600 font-medium mb-2 block"
                  value={exp.company}
                  onUpdate={(v) => onUpdate(["experience", idx, "company"], v)}
                />
                <ul className="text-sm text-slate-600 space-y-1.5">
                  {exp.description.map((desc, i) => (
                    <li key={i}>
                      • <Editable value={desc} onUpdate={(v) => onUpdate(["experience", idx, "description", i], v)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-4 space-y-8">
          <div>
            <Editable
              tag="h3"
              className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4 block"
              value={labels.skills}
              onUpdate={(v) => onUpdate(["labels", "skills"], v)}
            />
            <div className="space-y-4">
              {data.skills.map((skill, idx) => (
                <div key={idx}>
                  <Editable
                    className="text-xs font-bold text-slate-700 mb-2 block"
                    value={skill.category}
                    onUpdate={(v) => onUpdate(["skills", idx, "category"], v)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {skill.items.map((item, i) => (
                      <span key={i} className="text-xs bg-slate-800 text-white px-2 py-1 rounded-md">
                        <Editable value={item} onUpdate={(v) => onUpdate(["skills", idx, "items", i], v)} />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Editable
              tag="h3"
              className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4 block"
              value={labels.languages}
              onUpdate={(v) => onUpdate(["labels", "languages"], v)}
            />
            <div className="space-y-2">
              {data.languages.map((l, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-700 border-b border-slate-100 pb-1">
                  <Editable value={l.language} onUpdate={(v) => onUpdate(["languages", i, "language"], v)} />
                  <Editable
                    className="font-semibold text-slate-500"
                    value={l.proficiency}
                    onUpdate={(v) => onUpdate(["languages", i, "proficiency"], v)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Editable
              tag="h3"
              className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4 block"
              value={labels.education}
              onUpdate={(v) => onUpdate(["labels", "education"], v)}
            />
            {data.education.map((edu, idx) => (
              <div key={edu.id} className="mb-4">
                <Editable
                  className="font-bold text-slate-800 text-sm block"
                  value={edu.school}
                  onUpdate={(v) => onUpdate(["education", idx, "school"], v)}
                />
                <Editable
                  className="text-xs text-slate-500 block"
                  value={edu.degree}
                  onUpdate={(v) => onUpdate(["education", idx, "degree"], v)}
                />
                <Editable
                  className="text-xs text-slate-400 mt-1 block"
                  value={edu.year}
                  onUpdate={(v) => onUpdate(["education", idx, "year"], v)}
                />
              </div>
            ))}
          </div>

          <div>
            <Editable
              tag="h3"
              className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4 block"
              value={labels.interests}
              onUpdate={(v) => onUpdate(["labels", "interests"], v)}
            />
            <div className="flex flex-wrap gap-2">
              {data.interests.map((int, i) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                  <Editable value={int} onUpdate={(v) => onUpdate(["interests", i], v)} />
                </span>
              ))}
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
