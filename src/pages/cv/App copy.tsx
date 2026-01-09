import React, { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type CVStyle = "marketing-1" | "marketing-2" | "logistics-1" | "logistics-2" | "engineering-1" | "engineering-2";

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
    "Passionate professional with 6+ years of experience. Expert in optimizing workflows and building scalable solutions. Proven track record of leading teams and driving performance improvements.",
  contact: {
    email: "alex.dev@example.com",
    phone: "+1 (555) 123-4567",
    linkedin: "linkedin.com/in/alexjdev",
    location: "San Francisco, CA",
  },
  skills: [
    { category: "Core", items: ["Strategic Planning", "Project Management", "Data Analysis"] },
    { category: "Technical", items: ["Python", "SQL", "Tableau", "SAP"] },
    { category: "Soft Skills", items: ["Leadership", "Communication", "Problem Solving"] },
  ],
  experience: [
    {
      id: "1",
      role: "Senior Project Manager",
      company: "Global Solutions Inc.",
      duration: "2021 - Present",
      description: [
        "Led cross-functional teams to deliver projects 20% under budget.",
        "Implemented new operational workflows increasing efficiency by 35%.",
        "Mentored junior staff and conducted quarterly performance reviews.",
      ],
    },
    {
      id: "2",
      role: "Operations Analyst",
      company: "LogiTech Systems",
      duration: "2018 - 2021",
      description: [
        "Analyzed supply chain data to identify bottlenecks.",
        "Collaborated with vendors to negotiate better contract terms.",
        "Automated reporting processes using Python scripts.",
      ],
    },
  ],
  education: [
    {
      id: "1",
      degree: "B.S. Business Administration",
      school: "University of Technology",
      year: "2018",
    },
  ],
};

// --- Main Component ---
const CVGenerator: React.FC = () => {
  // --- State with ROBUST LocalStorage Initialization ---
  const [jsonString, setJsonString] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cv_data");
      // FIX: Ensure we don't load the string "undefined" or "null"
      if (saved && saved !== "undefined" && saved !== "null") {
        return saved;
      }
    }
    return JSON.stringify(INITIAL_DATA, null, 2);
  });

  const [data, setData] = useState<CVData>(INITIAL_DATA);

  const [selectedStyle, setSelectedStyle] = useState<CVStyle>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("cv_style") as CVStyle) || "marketing-1";
    }
    return "marketing-1";
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

  // --- Persistence Effects ---
  useEffect(() => {
    if (jsonString && jsonString !== "undefined") {
      localStorage.setItem("cv_data", jsonString);
      try {
        const parsed = JSON.parse(jsonString);
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
        console.error("Image too large to save to local storage");
      }
    } else {
      localStorage.removeItem("cv_image");
    }
  }, [profileImage]);

  // --- Handlers ---
  const handlePrint = () => window.print();

  const handleReset = () => {
    if (window.confirm("Are you sure? This will reset all data to default.")) {
      const defaultJson = JSON.stringify(INITIAL_DATA, null, 2);
      setJsonString(defaultJson);
      setData(INITIAL_DATA);
      setProfileImage(null);
      localStorage.removeItem("cv_data");
      localStorage.removeItem("cv_image");
    }
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProfileImage(null);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-6 font-sans">
      <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          .no-print, .no-print * { display: none !important; }
          body, html, #root, .main-layout {
            width: 100%; height: auto; margin: 0; padding: 0;
            overflow: visible !important; background-color: white !important;
          }
          .cv-preview-wrapper {
            display: block !important; position: absolute !important;
            top: 0 !important; left: 0 !important; width: 100% !important;
            margin: 0 !important; padding: 0 !important; background: white !important;
            border: none !important; box-shadow: none !important; z-index: 9999;
          }
          #printable-cv {
            width: 210mm !important; padding: 0 !important; margin: 0 !important;
            box-shadow: none !important; border-radius: 0 !important; border: none !important;
            min-height: 100vh !important; background-color: white !important;
            color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="main-layout max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* --- LEFT PANEL: CONTROLS --- */}
        <div className="no-print lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-3rem)] sticky top-6">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full border border-gray-200 overflow-y-auto">
            {/* Style Selector */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Choose Template</h2>
                <button onClick={handleReset} className="text-[10px] text-red-500 hover:underline">
                  Reset All
                </button>
              </div>

              <div className="space-y-3">
                {/* Marketing Group */}
                <div>
                  <div className="text-[10px] font-bold text-purple-600 mb-1">MARKETING</div>
                  <div className="grid grid-cols-2 gap-2">
                    <StyleButton
                      active={selectedStyle === "marketing-1"}
                      onClick={() => setSelectedStyle("marketing-1")}
                      label="Modern Bold"
                    />
                    <StyleButton
                      active={selectedStyle === "marketing-2"}
                      onClick={() => setSelectedStyle("marketing-2")}
                      label="Creative Side"
                    />
                  </div>
                </div>

                {/* Logistics Group */}
                <div>
                  <div className="text-[10px] font-bold text-blue-600 mb-1">LOGISTICS & OPS</div>
                  <div className="grid grid-cols-2 gap-2">
                    <StyleButton
                      active={selectedStyle === "logistics-1"}
                      onClick={() => setSelectedStyle("logistics-1")}
                      label="Corporate Grid"
                    />
                    <StyleButton
                      active={selectedStyle === "logistics-2"}
                      onClick={() => setSelectedStyle("logistics-2")}
                      label="Dense Data"
                    />
                  </div>
                </div>

                {/* Engineering Group */}
                <div>
                  <div className="text-[10px] font-bold text-slate-600 mb-1">ENGINEERING</div>
                  <div className="grid grid-cols-2 gap-2">
                    <StyleButton
                      active={selectedStyle === "engineering-1"}
                      onClick={() => setSelectedStyle("engineering-1")}
                      label="Terminal Mono"
                    />
                    <StyleButton
                      active={selectedStyle === "engineering-2"}
                      onClick={() => setSelectedStyle("engineering-2")}
                      label="Tech Clean"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Drag & Drop Image Upload */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Profile Photo</h2>
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all duration-200 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400"
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
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                      title="Remove image"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      className={`mb-2 p-2 rounded-full ${
                        isDragging ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-gray-700">
                        {isDragging ? "Drop image here" : "Drag & Drop or Click"}
                      </p>
                    </div>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
              </div>
            </div>

            {/* JSON Editor */}
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Data Editor</h2>
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
            <TemplateRenderer style={selectedStyle} data={data} image={profileImage} />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENT: Style Button ---
const StyleButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className={`p-2 text-xs font-medium rounded border transition-all ${
      active
        ? "bg-gray-800 border-gray-800 text-white shadow-md"
        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
    }`}
  >
    {label}
  </button>
);

// --- TEMPLATE RENDERER ---

const TemplateRenderer = ({ style, data, image }: { style: CVStyle; data: CVData; image: string | null }) => {
  const wrapperId = "printable-cv";
  const commonStyles = { width: "210mm", minHeight: "297mm", boxSizing: "border-box" as const };
  const baseClass =
    "bg-white text-[#1f2937] shadow-2xl mx-auto rounded-none lg:rounded-md transition-all duration-300 overflow-hidden";

  // --- MARKETING 1: Centered, Colorful, Big Header ---
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
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-2 text-center">{data.fullName}</h1>
          <p className="text-xl text-purple-600 font-medium mb-4 tracking-wide uppercase">{data.title}</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            {data.contact.email && (
              <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                <MailIcon /> {data.contact.email}
              </span>
            )}
            {data.contact.phone && (
              <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                <PhoneIcon /> {data.contact.phone}
              </span>
            )}
            {data.contact.location && (
              <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                <MapPinIcon /> {data.contact.location}
              </span>
            )}
          </div>
        </header>

        <section className="mb-10 bg-purple-50 p-6 rounded-xl border border-purple-100">
          <h3 className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-3">Profile</h3>
          <p className="text-gray-700 leading-relaxed text-center italic text-lg">"{data.summary}"</p>
        </section>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <section className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-purple-500">#</span> Experience
              </h3>
              <div className="space-y-8">
                {data.experience.map((exp) => (
                  <div key={exp.id} className="relative pl-6 border-l-2 border-purple-200">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-500 border-4 border-white"></div>
                    <h4 className="text-lg font-bold text-gray-900">{exp.role}</h4>
                    <div className="text-purple-600 font-medium text-sm mb-2">
                      {exp.company} • {exp.duration}
                    </div>
                    <ul className="list-disc list-outside ml-4 text-gray-600 text-sm space-y-1">
                      {exp.description.map((desc, i) => (
                        <li key={i}>{desc}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="col-span-4">
            <section className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-purple-500">#</span> Skills
              </h3>
              <div className="flex flex-col gap-4">
                {data.skills.map((skill, idx) => (
                  <div key={idx}>
                    <span className="text-xs font-bold text-gray-400 uppercase">{skill.category}</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {skill.items.map((item, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-purple-500">#</span> Education
              </h3>
              {data.education.map((edu) => (
                <div key={edu.id} className="mb-4">
                  <div className="font-bold text-gray-800 text-sm">{edu.school}</div>
                  <div className="text-xs text-gray-500">{edu.degree}</div>
                  <div className="text-xs text-purple-500 font-medium mt-1">{edu.year}</div>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- MARKETING 2: Left Sidebar, Creative, High Contrast ---
  if (style === "marketing-2") {
    return (
      <div id={wrapperId} className={baseClass} style={commonStyles}>
        <div className="flex h-full min-h-[297mm]">
          {/* Sidebar */}
          <div className="w-[35%] bg-gray-900 text-white p-8 flex flex-col">
            <div className="flex flex-col items-center mb-10">
              {image && (
                <img
                  src={image}
                  alt="Profile"
                  className="w-36 h-36 rounded-full object-cover border-4 border-gray-700 mb-6"
                />
              )}
              <h1 className="text-2xl font-bold text-center leading-tight mb-2">{data.fullName}</h1>
              <p className="text-purple-400 text-sm font-medium tracking-widest uppercase">{data.title}</p>
            </div>

            <div className="space-y-8 flex-1">
              <div className="space-y-3 text-sm text-gray-300">
                {data.contact.email && (
                  <div className="flex items-center gap-3">
                    <MailIcon /> <span className="break-all">{data.contact.email}</span>
                  </div>
                )}
                {data.contact.phone && (
                  <div className="flex items-center gap-3">
                    <PhoneIcon /> <span>{data.contact.phone}</span>
                  </div>
                )}
                {data.contact.location && (
                  <div className="flex items-center gap-3">
                    <MapPinIcon /> <span>{data.contact.location}</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-700 pb-1">
                  Skills
                </h3>
                <div className="space-y-4">
                  {data.skills.map((skill, idx) => (
                    <div key={idx}>
                      <div className="text-xs text-purple-400 mb-1">{skill.category}</div>
                      <div className="flex flex-wrap gap-1">
                        {skill.items.map((item, i) => (
                          <span
                            key={i}
                            className="text-[10px] border border-gray-600 px-1.5 py-0.5 rounded text-gray-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-700 pb-1">
                  Education
                </h3>
                {data.education.map((edu) => (
                  <div key={edu.id} className="mb-4">
                    <div className="font-bold text-white text-sm">{edu.school}</div>
                    <div className="text-xs text-gray-400">{edu.degree}</div>
                    <div className="text-xs text-purple-400 mt-1">{edu.year}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-[65%] p-10 bg-white">
            <section className="mb-10">
              <h2 className="text-4xl font-black text-gray-900 mb-6">Hello.</h2>
              <p className="text-gray-600 leading-loose text-justify border-l-4 border-purple-500 pl-4">
                {data.summary}
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-8 border-b-2 border-gray-100 pb-2">Experience</h3>
              <div className="space-y-8">
                {data.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-xl font-bold text-gray-800">{exp.role}</h4>
                      <span className="text-sm font-bold bg-gray-100 px-2 py-1 rounded">{exp.duration}</span>
                    </div>
                    <div className="text-purple-600 font-medium mb-3">{exp.company}</div>
                    <ul className="list-disc list-outside ml-4 text-gray-600 text-sm space-y-2">
                      {exp.description.map((desc, i) => (
                        <li key={i}>{desc}</li>
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

  // --- LOGISTICS 1: Corporate Grid ---
  if (style === "logistics-1") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "40px" }}>
        <div className="bg-blue-900 text-white p-8 -m-[40px] mb-8 flex items-center gap-6">
          {image && (
            <img src={image} alt="Profile" className="w-24 h-24 rounded-lg object-cover border-2 border-blue-400" />
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-bold uppercase tracking-wider">{data.fullName}</h1>
            <p className="text-lg text-blue-200 font-medium mt-1">{data.title}</p>
          </div>
          <div className="text-right text-sm text-blue-100 space-y-1 text-xs">
            {data.contact.email && <div>{data.contact.email}</div>}
            {data.contact.phone && <div>{data.contact.phone}</div>}
            {data.contact.location && <div>{data.contact.location}</div>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 pt-6">
          <div className="col-span-2 space-y-8">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-800 border-b-2 border-blue-800 mb-4 pb-1">
                Professional Profile
              </h3>
              <p className="text-gray-700 text-justify text-sm leading-relaxed">{data.summary}</p>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-800 border-b-2 border-blue-800 mb-4 pb-1">
                Work History
              </h3>
              <div className="space-y-6">
                {data.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-lg font-bold text-gray-900">{exp.role}</h4>
                      <span className="text-sm font-bold text-blue-700">{exp.duration}</span>
                    </div>
                    <div className="text-sm text-gray-600 font-semibold mb-2 uppercase">{exp.company}</div>
                    <ul className="list-square list-inside text-gray-700 text-sm space-y-1">
                      {exp.description.map((desc, i) => (
                        <li key={i} className="pl-2 border-l-2 border-gray-200 ml-1">
                          {desc}
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-800 mb-4">Competencies</h3>
              <div className="space-y-4">
                {data.skills.map((skill, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-bold text-gray-500 mb-1">{skill.category}</div>
                    <ul className="space-y-1">
                      {skill.items.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-800 mb-4">Education</h3>
              {data.education.map((edu) => (
                <div key={edu.id} className="mb-4 border-b border-gray-200 pb-2 last:border-0">
                  <div className="font-bold text-gray-900 text-sm">{edu.school}</div>
                  <div className="text-xs text-gray-600">{edu.degree}</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">{edu.year}</div>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGISTICS 2: Header Grid, Dense Data ---
  if (style === "logistics-2") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "30px" }}>
        <div className="border-b-4 border-gray-800 mb-6 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">{data.fullName}</h1>
            <div className="text-sm font-bold bg-gray-800 text-white inline-block px-2 py-0.5">{data.title}</div>
          </div>
          {image && <img src={image} alt="Profile" className="w-16 h-16 object-cover border border-gray-300" />}
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6 text-xs border-b border-gray-200 pb-6">
          <div className="col-span-3">
            <span className="font-bold text-gray-800">SUMMARY: </span>
            <span className="text-gray-600">{data.summary}</span>
          </div>
          <div className="col-span-1 space-y-1 text-right text-gray-600">
            {data.contact.email && <div>{data.contact.email}</div>}
            {data.contact.phone && <div>{data.contact.phone}</div>}
            {data.contact.location && <div>{data.contact.location}</div>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <h3 className="text-sm font-black uppercase border-b-2 border-gray-300 mb-4">Operational Experience</h3>
            <div className="space-y-5">
              {data.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-gray-900">{exp.company}</span>
                    <span className="font-mono text-gray-500">{exp.duration}</span>
                  </div>
                  <div className="text-xs font-bold text-gray-700 uppercase mb-1">{exp.role}</div>
                  <ul className="list-disc list-outside ml-4 text-xs text-gray-600 space-y-0.5">
                    {exp.description.map((desc, i) => (
                      <li key={i}>{desc}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-1 bg-gray-50 p-4 border border-gray-100">
            <h3 className="text-sm font-black uppercase border-b-2 border-gray-300 mb-4">Skills Matrix</h3>
            <div className="space-y-4">
              {data.skills.map((skill, idx) => (
                <div key={idx}>
                  <div className="text-xs font-bold underline mb-1">{skill.category}</div>
                  <div className="text-xs text-gray-600 leading-relaxed">{skill.items.join(" • ")}</div>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-black uppercase border-b-2 border-gray-300 mb-4 mt-8">Education</h3>
            {data.education.map((edu) => (
              <div key={edu.id} className="mb-2">
                <div className="font-bold text-gray-900 text-xs">{edu.school}</div>
                <div className="text-xs text-gray-600">{edu.degree}</div>
                <div className="text-xs text-gray-400">{edu.year}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- ENGINEERING 1: Terminal Mono (Minimal) ---
  if (style === "engineering-1") {
    return (
      <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "40px" }}>
        <header className="flex justify-between items-start border-b border-gray-300 pb-6 mb-8 font-mono">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.fullName}</h1>
            <p className="text-lg text-gray-600">{`<${data.title} />`}</p>
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-4 font-sans">
              {data.contact.email && <span>{data.contact.email}</span>}
              <span>|</span>
              {data.contact.phone && <span>{data.contact.phone}</span>}
              <span>|</span>
              {data.contact.location && <span>{data.contact.location}</span>}
            </div>
          </div>
          {image && <img src={image} alt="Profile" className="w-24 h-24 object-cover grayscale opacity-90" />}
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 pr-6 border-r border-gray-200">
            <section className="mb-8">
              <h3 className="font-mono text-sm font-bold text-gray-900 uppercase mb-4 tracking-tight">
                Technical_Stack
              </h3>
              <div className="space-y-4">
                {data.skills.map((skill, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-bold text-gray-500 mb-1 font-mono">./{skill.category}</div>
                    <div className="flex flex-wrap gap-1">
                      {skill.items.map((item, i) => (
                        <span
                          key={i}
                          className="text-xs border border-gray-300 px-1 py-0.5 rounded text-gray-600 font-mono"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-mono text-sm font-bold text-gray-900 uppercase mb-4 tracking-tight">Education</h3>
              {data.education.map((edu) => (
                <div key={edu.id} className="mb-4">
                  <div className="font-bold text-gray-900 text-sm">{edu.school}</div>
                  <div className="text-xs text-gray-600 italic">{edu.degree}</div>
                  <div className="text-xs text-gray-400 font-mono mt-1">[{edu.year}]</div>
                </div>
              ))}
            </section>
          </div>

          <div className="col-span-8">
            <section className="mb-8">
              <h3 className="font-mono text-sm font-bold text-gray-900 uppercase mb-3 tracking-tight">
                git commit -m "Summary"
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">{data.summary}</p>
            </section>

            <section>
              <h3 className="font-mono text-sm font-bold text-gray-900 uppercase mb-6 tracking-tight">
                Experience_Log
              </h3>
              <div className="space-y-8">
                {data.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-base font-bold text-gray-800">{exp.role}</h4>
                      <span className="text-xs font-mono text-gray-500">{exp.duration}</span>
                    </div>
                    <div className="text-sm text-gray-600 font-medium mb-2 font-mono text-blue-600">
                      @ {exp.company}
                    </div>
                    <ul className="list-disc list-outside ml-4 text-gray-600 text-sm space-y-1 marker:text-gray-400">
                      {exp.description.map((desc, i) => (
                        <li key={i}>{desc}</li>
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

  // --- ENGINEERING 2: Modern Tech (Clean Sans) ---
  return (
    <div id={wrapperId} className={baseClass} style={{ ...commonStyles, padding: "40px" }}>
      <header className="flex gap-6 items-center mb-10">
        {image && <img src={image} alt="Profile" className="w-24 h-24 rounded-2xl object-cover" />}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">{data.fullName}</h1>
          <p className="text-lg text-slate-500 font-medium">{data.title}</p>
          <div className="flex gap-4 text-sm text-slate-400 mt-2">
            {data.contact.email && <span>{data.contact.email}</span>}
            {data.contact.phone && <span>{data.contact.phone}</span>}
            {data.contact.location && <span>{data.contact.location}</span>}
          </div>
        </div>
      </header>

      <section className="mb-8 bg-slate-50 p-4 rounded-lg">
        <p className="text-slate-700">{data.summary}</p>
      </section>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8">
          <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-6">Work Experience</h3>
          <div className="space-y-8">
            {data.experience.map((exp) => (
              <div key={exp.id} className="relative pl-6 border-l border-slate-200">
                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-lg text-slate-800">{exp.role}</h4>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {exp.duration}
                  </span>
                </div>
                <div className="text-slate-600 font-medium mb-2">{exp.company}</div>
                <ul className="text-sm text-slate-600 space-y-1.5">
                  {exp.description.map((desc, i) => (
                    <li key={i}>• {desc}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-4 space-y-8">
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Skills</h3>
            <div className="space-y-4">
              {data.skills.map((skill, idx) => (
                <div key={idx}>
                  <div className="text-xs font-bold text-slate-700 mb-2">{skill.category}</div>
                  <div className="flex flex-wrap gap-2">
                    {skill.items.map((item, i) => (
                      <span key={i} className="text-xs bg-slate-800 text-white px-2 py-1 rounded-md">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Education</h3>
            {data.education.map((edu) => (
              <div key={edu.id} className="mb-4">
                <div className="font-bold text-slate-800 text-sm">{edu.school}</div>
                <div className="text-xs text-slate-500">{edu.degree}</div>
                <div className="text-xs text-slate-400 mt-1">{edu.year}</div>
              </div>
            ))}
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
