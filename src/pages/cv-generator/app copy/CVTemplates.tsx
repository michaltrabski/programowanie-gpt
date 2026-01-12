import React from "react";

// --- TYPES ---
export type CVStyle =
  | "marketing-1"
  | "marketing-2"
  | "logistics-1"
  | "logistics-2"
  | "engineering-1"
  | "engineering-2"
  | "ecommerce-1"
  | "ecommerce-2";

export interface ContactInfo {
  email: string;
  phone: string;
  linkedin: string;
  location: string;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  duration: string;
  description: string[];
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  year: string;
}

export interface SkillSet {
  category: string;
  items: string[];
}

export interface Language {
  language: string;
  proficiency: string;
}

export interface CVLabels {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  languages: string;
  interests: string;
}

export interface CVData {
  labels: CVLabels;
  fullName: string;
  title: string;
  summary: string;
  contact: ContactInfo;
  skills: SkillSet[];
  languages: Language[];
  interests: string[];
  experience: Experience[];
  education: Education[];
}

// --- HELPER COMPONENT: Editable Text ---
interface EditableProps {
  value: string;
  onUpdate: (newValue: string) => void;
  tag?: keyof JSX.IntrinsicElements;
  className?: string;
  placeholder?: string;
}

export const Editable: React.FC<EditableProps> = ({
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
      Tag !== "h4"
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

// --- ICONS (Used within templates) ---
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

// --- MAIN TEMPLATE RENDERER ---
interface TemplateRendererProps {
  style: CVStyle;
  data: CVData;
  image: string | null;
  onUpdate: (path: (string | number)[], val: string) => void;
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({ style, data, image, onUpdate }) => {
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

  // --- ECOMMERCE 1 ---
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
          <Editable
            tag="p"
            className="text-gray-800 text-lg leading-relaxed font-light"
            value={data.summary}
            onUpdate={(v) => onUpdate(["summary"], v)}
          />
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

  // --- ECOMMERCE 2 ---
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
              <Editable
                tag="p"
                className="text-gray-600 leading-relaxed"
                value={data.summary}
                onUpdate={(v) => onUpdate(["summary"], v)}
              />
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
            className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-3"
            value={labels.summary}
            onUpdate={(v) => onUpdate(["labels", "summary"], v)}
          />
          <Editable
            tag="p"
            className="text-gray-700 leading-relaxed text-center italic text-lg"
            value={data.summary}
            onUpdate={(v) => onUpdate(["summary"], v)}
          />
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
              <Editable
                tag="p"
                className="text-gray-600 leading-loose text-justify border-l-4 border-purple-500 pl-4"
                value={data.summary}
                onUpdate={(v) => onUpdate(["summary"], v)}
              />
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
              <Editable
                tag="p"
                className="text-gray-700 text-justify text-sm leading-relaxed"
                value={data.summary}
                onUpdate={(v) => onUpdate(["summary"], v)}
              />
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
            <section className="mb-8">
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
        <div className="grid grid-cols-4 gap-4 mb-6 text-xs border-b border-gray-200 pb-6">
          <div className="col-span-3">
            <span className="font-bold text-gray-800 uppercase mr-1">
              <Editable tag="span" value={labels.summary} onUpdate={(v) => onUpdate(["labels", "summary"], v)} />:
            </span>
            <Editable
              tag="span"
              className="text-gray-600"
              value={data.summary}
              onUpdate={(v) => onUpdate(["summary"], v)}
            />
          </div>
          <div className="col-span-1 space-y-1 text-right text-gray-600">
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
              <Editable value={data.contact.email} onUpdate={(v) => onUpdate(["contact", "email"], v)} /> |{" "}
              <Editable value={data.contact.phone} onUpdate={(v) => onUpdate(["contact", "phone"], v)} /> |{" "}
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
                git commit -m "<Editable value={labels.summary} onUpdate={(v) => onUpdate(["labels", "summary"], v)} />"
              </h3>
              <Editable
                tag="p"
                className="text-gray-700 text-sm leading-relaxed"
                value={data.summary}
                onUpdate={(v) => onUpdate(["summary"], v)}
              />
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

  // --- ENGINEERING 2 (Default Fallback) ---
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
        <Editable
          tag="p"
          className="text-slate-700 block"
          value={data.summary}
          onUpdate={(v) => onUpdate(["summary"], v)}
        />
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
