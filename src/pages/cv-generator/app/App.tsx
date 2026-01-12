import React, { useState, useEffect, useRef, useCallback } from "react";
// Import the component and types from the new file
import { TemplateRenderer } from "./CVTemplates.tsx";
import type { CVData, CVStyle } from "./CVTemplates.tsx";

// --- Constants ---
const DEFAULT_MARGIN_TOP = 50;
const DEFAULT_MARGIN_BOTTOM = 0;

// --- Initial Data ---
const INITIAL_DATA: CVData = {
  labels: {
    summary: "Profile",
    experience: "Work Experience",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    interests: "Interests",
  },
  fullName: "Alex J. Developer",
  title: "Head of Ecommerce & Growth",
  summary:
    "Results-oriented ecommerce professional with 6+ years driving D2C growth. Expert in CRO, Shopify development, and data-driven marketing strategies. Proven track record of scaling revenue by 200% YoY.",
  contact: {
    email: "alex.dev@example.com",
    phone: "+1 (555) 123-4567",
    linkedin: "linkedin.com/in/alexjdev",
    location: "New York, NY",
  },
  skills: [
    { category: "Platforms", items: ["Shopify Plus", "WooCommerce", "Magento", "Amazon Seller Central"] },
    { category: "Marketing", items: ["SEO/SEM", "Google Ads", "Facebook Ads", "Email Automation"] },
    { category: "Analytics", items: ["Google Analytics 4", "Hotjar", "Excel", "Looker"] },
  ],
  languages: [
    { language: "English", proficiency: "Native" },
    { language: "Spanish", proficiency: "Conversational" },
  ],
  interests: ["Dropshipping", "UI/UX Design", "Investing", "Cycling"],
  experience: [
    {
      id: "1",
      role: "Ecommerce Manager",
      company: "Urban Style Brands",
      duration: "2021 - Present",
      description: [
        "Managed P&L for a $5M annual revenue D2C store.",
        "Optimized checkout flow increasing conversion rate by 1.5%.",
        "Led a team of 5 developers and marketers to launch a new mobile app.",
      ],
    },
    {
      id: "2",
      role: "Digital Marketing Specialist",
      company: "Growth Agency",
      duration: "2018 - 2021",
      description: [
        "Managed $50k/mo ad spend across Meta and Google.",
        "Implemented A/B testing strategies that reduced CAC by 20%.",
        "Developed automated email flows in Klaviyo generating $200k in additional revenue.",
      ],
    },
  ],
  education: [
    {
      id: "1",
      degree: "B.S. Marketing",
      school: "State University",
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
