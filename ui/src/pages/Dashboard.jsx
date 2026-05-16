import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from '../hooks/useAuth';

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────
const Icon = ({ name, size = 18, className = "" }) => {
  const icons = {
    linkedin: <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
    user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>,
    play: <polygon points="5 3 19 12 5 21 5 3" />,
    stop: <rect x="3" y="3" width="18" height="18" rx="2" />,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    check: <><polyline points="20 6 9 17 4 12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    upload: <><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></>,
    chevron: <polyline points="6 9 12 15 18 9" />,
    file: <><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></>,
    info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
    award: <><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {icons[name]}
    </svg>
  );
};

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? "http://127.0.0.1:5000/api"
  : "/api";

const api = {
  getProfiles: () => fetch(`${API_BASE}/profiles`).then(r => r.json()),
  createProfile: (data) => fetch(`${API_BASE}/profiles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  updateProfile: (id, data) => fetch(`${API_BASE}/profiles/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteProfile: (id) => fetch(`${API_BASE}/profiles/${id}`, { method: "DELETE" }).then(r => r.json()),
  uploadResume: (id, file) => {
    const fd = new FormData();
    fd.append("resume", file);
    return fetch(`${API_BASE}/profiles/${id}/upload-resume`, { method: "POST", body: fd }).then(r => r.json());
  },
  startBot: (data) => fetch(`${API_BASE}/start-bot`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  getSession: (id) => fetch(`${API_BASE}/sessions/${id}`).then(r => r.json()),
  getSessions: () => fetch(`${API_BASE}/sessions`).then(r => r.json()),
};

// ─── Components ───────────────────────────────────────────────────────────────

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    yellow: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    red: "bg-red-500/15 text-red-400 border-red-500/30",
    purple: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    gray: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

const Stat = ({ label, value, icon, color }) => (
  <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-800/60 border border-zinc-700/50">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
      <Icon name={icon} size={16} />
    </div>
    <div className="text-2xl font-bold text-white mt-1">{value}</div>
    <div className="text-xs text-zinc-500 font-medium">{label}</div>
  </div>
);

// ─── Profile Form ─────────────────────────────────────────────────────────────

const Field = ({ form, set, label, field, type = "text", placeholder = "", half = false, required = false }) => (
  <div className={half ? "col-span-1" : "col-span-2"}>
    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
    <input
      type={type}
      value={form[field] || ""}
      onChange={e => set(field, e.target.value)}
      placeholder={placeholder}
      className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all"
    />
  </div>
);

const SelectField = ({ form, set, label, field, options, half = false }) => (
  <div className={half ? "col-span-1" : "col-span-2"}>
    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">{label}</label>
    <select
      value={form[field] || ""}
      onChange={e => set(field, e.target.value)}
      className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const ProfileForm = ({ profile, onSave, onCancel }) => {
  const [form, setForm] = useState(profile || {
    first_name: "", last_name: "", email: "", password: "",
    phone: "", city: "", country: "United States",
    linkedin_url: "", github: "", website: "",
    years_experience: "1", experience_level: "entry",
    education_level: "bachelor", expected_salary: "",
    gpa: "", headline: "", summary: "",
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      let result;
      if (form.id) {
        result = await api.updateProfile(form.id, form);
      } else {
        result = await api.createProfile(form);
      }
      if (resumeFile && (form.id || result.id)) {
        await api.uploadResume(form.id || result.id, resumeFile);
      }
      onSave();
    } catch {
      alert("Backend not running. Running in demo mode.");
      onSave();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700/60 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-white">{form.id ? "Edit Profile" : "Create Profile"}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Your details will be used to auto-fill applications</p>
          </div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors p-1">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* LinkedIn Credentials */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center"><Icon name="linkedin" size={12} /></div>
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">LinkedIn Credentials</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field form={form} set={set} label="Email / LinkedIn Login" field="email" type="email" placeholder="you@email.com" required />
              <Field form={form} set={set} label="Password" field="password" type="password" placeholder="••••••••" required />
            </div>
          </div>

          <div className="border-t border-zinc-800" />

          {/* Personal Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-violet-600 rounded-lg flex items-center justify-center"><Icon name="user" size={12} /></div>
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Personal Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field form={form} set={set} label="First Name" field="first_name" placeholder="John" half required />
              <Field form={form} set={set} label="Last Name" field="last_name" placeholder="Doe" half required />
              <Field form={form} set={set} label="Phone" field="phone" placeholder="+1 555 000 0000" half />
              <Field form={form} set={set} label="City" field="city" placeholder="San Francisco" half />
              <SelectField form={form} set={set} label="Country" field="country" half options={[
                { value: "United States", label: "🇺🇸 United States" },
                { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
                { value: "Canada", label: "🇨🇦 Canada" },
                { value: "India", label: "🇮🇳 India" },
                { value: "Germany", label: "🇩🇪 Germany" },
                { value: "Australia", label: "🇦🇺 Australia" },
                { value: "Other", label: "🌍 Other" },
              ]} />
            </div>
          </div>

          <div className="border-t border-zinc-800" />

          {/* Professional Details */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center"><Icon name="briefcase" size={12} /></div>
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Professional Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField form={form} set={set} label="Experience Level" field="experience_level" half options={[
                { value: "internship", label: "Internship" },
                { value: "entry", label: "Entry Level (0-2 yrs)" },
                { value: "associate", label: "Associate (2-4 yrs)" },
                { value: "mid-senior", label: "Mid-Senior (4-8 yrs)" },
                { value: "director", label: "Director (8+ yrs)" },
              ]} />
              <Field form={form} set={set} label="Years of Experience" field="years_experience" placeholder="2" half />
              <SelectField form={form} set={set} label="Education Level" field="education_level" half options={[
                { value: "high school", label: "High School" },
                { value: "associate", label: "Associate's Degree" },
                { value: "bachelor", label: "Bachelor's Degree" },
                { value: "master", label: "Master's Degree" },
                { value: "phd", label: "PhD / Doctorate" },
              ]} />
              <Field form={form} set={set} label="Expected Salary (Annual)" field="expected_salary" placeholder="80000" half />
              <Field form={form} set={set} label="GPA (optional)" field="gpa" placeholder="3.8" half />
            </div>
          </div>

          <div className="border-t border-zinc-800" />

          {/* Online Presence */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-cyan-600 rounded-lg flex items-center justify-center"><Icon name="layers" size={12} /></div>
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Online Presence</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field form={form} set={set} label="LinkedIn URL" field="linkedin_url" placeholder="linkedin.com/in/johndoe" />
              <Field form={form} set={set} label="GitHub" field="github" placeholder="github.com/johndoe" half />
              <Field form={form} set={set} label="Portfolio / Website" field="website" placeholder="johndoe.dev" half />
            </div>
          </div>

          <div className="border-t border-zinc-800" />

          {/* Resume Upload */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-amber-600 rounded-lg flex items-center justify-center"><Icon name="file" size={12} /></div>
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Resume</h3>
            </div>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:border-blue-500/50 transition-colors group">
              <Icon name="upload" size={24} className="text-zinc-600 group-hover:text-blue-400 transition-colors mb-2" />
              <p className="text-sm text-zinc-500 group-hover:text-zinc-400">
                {resumeFile ? (
                  <span className="text-emerald-400 font-medium">✓ {resumeFile.name}</span>
                ) : form.resume_name ? (
                  <span className="text-blue-400">{form.resume_name} (click to replace)</span>
                ) : (
                  <>Click to upload <span className="text-zinc-600">PDF or DOCX</span></>
                )}
              </p>
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => setResumeFile(e.target.files[0])} />
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 px-6 py-4 flex gap-3 rounded-b-3xl">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-medium transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
            {saving ? <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </> : <>
              <Icon name="check" size={16} />
              Save Profile
            </>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Bot Launcher ─────────────────────────────────────────────────────────────

const BotLauncher = ({ profiles, onLaunch }) => {
  const [profileId, setProfileId] = useState(profiles[0]?.id || "");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [maxJobs, setMaxJobs] = useState(20);
  const [expLevel, setExpLevel] = useState("");
  const [jobType, setJobType] = useState("");
  const [datePosted, setDatePosted] = useState("");
  const [launching, setLaunching] = useState(false);

  const launch = async () => {
    if (!profileId || !jobTitle) return;
    setLaunching(true);
    try {
      const result = await api.startBot({
        profile_id: profileId,
        job_title: jobTitle,
        location,
        max_jobs: maxJobs,
        filters: { experience_level: expLevel, job_type: jobType, date_posted: datePosted }
      });
      onLaunch(result.session_id);
    } catch {
      // Demo mode
      onLaunch("demo-" + Date.now());
    }
    setLaunching(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Profile to Use</label>
        <select value={profileId} onChange={e => setProfileId(e.target.value)}
          className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/70 appearance-none">
          {profiles.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.email}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Job Title <span className="text-red-400">*</span></label>
          <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
            placeholder="Frontend Developer"
            className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="San Francisco, CA"
            className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Experience</label>
          <select value={expLevel} onChange={e => setExpLevel(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/70 appearance-none">
            <option value="">Any</option>
            <option value="internship">Internship</option>
            <option value="entry">Entry Level</option>
            <option value="associate">Associate</option>
            <option value="mid-senior">Mid-Senior</option>
            <option value="director">Director</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Job Type</label>
          <select value={jobType} onChange={e => setJobType(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/70 appearance-none">
            <option value="">Any</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Posted</label>
          <select value={datePosted} onChange={e => setDatePosted(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/70 appearance-none">
            <option value="">Any time</option>
            <option value="past_1h">Past 1h</option>
            <option value="past_24h">Past 24h</option>
            <option value="past_week">Past week</option>
            <option value="past_month">Past month</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Max Applications: <span className="text-white">{maxJobs}</span></label>
        <input type="range" min="1" max="100" value={maxJobs} onChange={e => setMaxJobs(+e.target.value)}
          className="w-full accent-blue-500" />
        <div className="flex justify-between text-xs text-zinc-600 mt-1">
          <span>1</span><span>50</span><span>100</span>
        </div>
      </div>

      <button onClick={launch} disabled={launching || !profileId || !jobTitle}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
        {launching ? <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Launching Bot...
        </> : <>
          <Icon name="zap" size={16} />
          Launch Automation
        </>}
      </button>
    </div>
  );
};

// ─── Live Session Monitor ─────────────────────────────────────────────────────

const SessionMonitor = ({ sessionId, onClose }) => {
  const [session, setSession] = useState(null);
  const [demoLogs, setDemoLogs] = useState([]);
  const logsEndRef = useRef(null);
  const isDemo = sessionId?.startsWith("demo-");

  // Demo mode simulation
  useEffect(() => {
    if (!isDemo) return;
    const msgs = [
      ["🚀 Starting Chrome browser...", "info"],
      ["✅ Chrome browser launched successfully", "success"],
      ["🔐 Navigating to LinkedIn login...", "info"],
      ["⏳ Waiting for login to complete...", "info"],
      ["✅ Successfully logged into LinkedIn!", "success"],
      ["🔍 Searching for jobs...", "info"],
      ["✅ Job search results loaded", "success"],
      ["📋 Collecting up to 20 job listings...", "info"],
      ["📌 Found 18 job listings", "info"],
      ["🚀 Starting to apply to 18 jobs...", "info"],
      ["📊 Processing job 1/18...", "info"],
      ["📌 Viewing: Frontend Developer at TechCorp", "info"],
      ["✨ Attempting Easy Apply: Frontend Developer at TechCorp", "info"],
      ["📝 Filling form step 1...", "info"],
      ["📎 Resume uploaded successfully", "success"],
      ["🎉 Application SUBMITTED for Frontend Developer at TechCorp!", "success"],
      ["📊 Processing job 2/18...", "info"],
      ["📌 Viewing: React Developer at StartupXYZ", "info"],
      ["✨ Attempting Easy Apply: React Developer at StartupXYZ", "info"],
      ["🎉 Application SUBMITTED for React Developer at StartupXYZ!", "success"],
      ["📊 Processing job 3/18...", "info"],
      ["⏭️ Skipping (no Easy Apply): Senior Dev at BigCorp", "warning"],
      ["📊 Processing job 4/18...", "info"],
      ["🎉 Application SUBMITTED for UI Engineer at DesignCo!", "success"],
      ["🏁 Automation complete!", "success"],
      ["📈 Results: 12 applied, 4 skipped, 2 failed", "success"],
    ];
    let i = 0;
    const timer = setInterval(() => {
      if (i < msgs.length) {
        setDemoLogs(prev => [...prev, { timestamp: new Date().toISOString(), message: msgs[i][0], level: msgs[i][1] }]);
        i++;
      } else {
        clearInterval(timer);
      }
    }, 800);
    return () => clearInterval(timer);
  }, [isDemo]);

  // Real mode polling
  useEffect(() => {
    if (isDemo) return;
    const poll = async () => {
      try {
        const s = await api.getSession(sessionId);
        setSession(s);
        if (s.status === "running") setTimeout(poll, 2000);
      } catch { setTimeout(poll, 3000); }
    };
    poll();
  }, [sessionId, isDemo]);

  const logs = useMemo(() => isDemo ? demoLogs : (session?.logs || []), [isDemo, demoLogs, session?.logs]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const levelColor = { info: "text-zinc-400", success: "text-emerald-400", warning: "text-amber-400", error: "text-red-400" };
  const levelBg = { info: "", success: "bg-emerald-500/5", warning: "bg-amber-500/5", error: "bg-red-500/5" };

  const stats = isDemo
    ? { applied: demoLogs.filter(l => l.message.includes("SUBMITTED")).length, skipped: demoLogs.filter(l => l.message.includes("Skipping")).length, failed: 0 }
    : (session?.stats || { applied: 0, skipped: 0, failed: 0 });

  const status = isDemo
    ? (demoLogs.length > 0 && demoLogs[demoLogs.length - 1]?.message.includes("complete") ? "completed" : "running")
    : (session?.status || "running");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700/60 rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${status === "running" ? "bg-emerald-400 animate-pulse" : status === "completed" ? "bg-blue-400" : "bg-red-400"}`} />
            <h2 className="font-bold text-white">Bot Running</h2>
            <Badge color={status === "running" ? "green" : status === "completed" ? "blue" : "red"}>
              {status}
            </Badge>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-zinc-800">
          <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="text-xl font-bold text-emerald-400">{stats.applied}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Applied</div>
          </div>
          <div className="text-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="text-xl font-bold text-amber-400">{stats.skipped}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Skipped</div>
          </div>
          <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="text-xl font-bold text-red-400">{stats.failed}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Failed</div>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className={`flex gap-3 px-3 py-1.5 rounded-lg ${levelBg[log.level] || ""}`}>
              <span className="text-zinc-700 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className={levelColor[log.level] || "text-zinc-400"}>{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        <div className="border-t border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-medium transition-all">
            {status === "running" ? "Minimize (bot continues)" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── OTP Lock Screen ──────────────────────────────────────────────────────────

const OTPLock = ({ onUnlock }) => {
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [error, setError] = useState(false);
  const correctOtp = "84689";
  const inputs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(false);

    if (value && index < 4) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleSubmit = () => {
    if (otp.join("") === correctOtp) {
      onUnlock();
    } else {
      setError(true);
      setOtp(["", "", "", "", ""]);
      inputs.current[0].focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-2xl text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
          <Icon name="linkedin" size={32} />
        </div>
        
        <h1 className="text-2xl font-extrabold text-white mb-2">Security Verification</h1>
        <p className="text-zinc-500 text-sm mb-8">Enter the 5-digit security code to access the automation dashboard</p>

        <div className="flex justify-center gap-3 mb-8">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-12 h-16 bg-zinc-800/50 border-2 rounded-2xl text-center text-2xl font-bold text-white focus:outline-none transition-all ${error ? 'border-red-500/50 shake' : 'border-zinc-700/50 focus:border-blue-500/50 focus:bg-zinc-800'}`}
            />
          ))}
        </div>

        {error && <p className="text-red-400 text-xs font-semibold mb-6 uppercase tracking-wider animate-bounce">Invalid code. Please try again.</p>}

        <button 
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
        >
          Unlock Dashboard
        </button>

        <style>{`
          .shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
          @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
          }
        `}</style>
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { logout } = useAuth();
  const [tab, setTab] = useState("launch");
  const [profiles, setProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editProfile, setEditProfile] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [backendOk, setBackendOk] = useState(null);

  const loadProfiles = useCallback(async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
      // Demo profiles
      setProfiles([{
        id: "demo-1", first_name: "Alex", last_name: "Johnson",
        email: "alex@example.com", phone: "+1 555 123 4567",
        city: "San Francisco", country: "United States",
        experience_level: "entry", years_experience: "2",
        resume_name: "Alex_Johnson_Resume.pdf"
      }]);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch {
      setSessions([{
        id: "demo-s1", status: "completed", job_title: "Frontend Developer",
        location: "San Francisco", started_at: new Date().toISOString(),
        stats: { applied: 12, skipped: 4, failed: 2 }
      }]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProfiles();
      loadSessions();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProfiles, loadSessions]);

  const tabs = [
    { id: "launch", label: "Launch Bot", icon: "zap" },
    { id: "profiles", label: "Profiles", icon: "user" },
    { id: "history", label: "History", icon: "activity" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 99px; }
        input[type=range] { height: 4px; border-radius: 99px; }
        select option { background: #18181b; }
      `}</style>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Icon name="linkedin" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">LinkedInAuto</h1>
              <p className="text-xs text-zinc-500">Easy Apply Automation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${backendOk === true ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : backendOk === false ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${backendOk === true ? "bg-emerald-400 animate-pulse" : backendOk === false ? "bg-amber-400" : "bg-zinc-600"}`} />
              {backendOk === true ? "Backend Connected" : backendOk === false ? "Demo Mode" : "Checking..."}
            </div>
            <button onClick={logout} className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">Sign Out</button>
          </div>
        </div>

        {/* Backend warning */}
        {backendOk === false && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
            <Icon name="info" size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-amber-300 font-semibold">Running in Demo Mode</p>
              <p className="text-xs text-amber-500/80 mt-1">
                To use real automation, ensure your local server is running: <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">python server.py</code>
              </p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <Stat label="Profiles" value={profiles.length} icon="user" color="bg-blue-500/15 text-blue-400" />
          <Stat label="Total Applied" value={sessions.reduce((a, s) => a + (s.stats?.applied || 0), 0)} icon="check" color="bg-emerald-500/15 text-emerald-400" />
          <Stat label="Sessions Run" value={sessions.length} icon="activity" color="bg-violet-500/15 text-violet-400" />
          <Stat label="Success Rate" value={sessions.length ? Math.round(sessions.reduce((a, s) => a + (s.stats?.applied || 0), 0) / Math.max(1, sessions.reduce((a, s) => a + (s.stats?.applied || 0) + (s.stats?.failed || 0), 0)) * 100) + "%" : "—"} icon="award" color="bg-amber-500/15 text-amber-400" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-800/60 border border-zinc-700/40 rounded-2xl mb-6 w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Launch Tab ── */}
        {tab === "launch" && (
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6">
              <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                <Icon name="search" size={18} className="text-blue-400" />
                Configure Job Search
              </h2>
              {profiles.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="user" size={32} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">Create a profile first to start applying</p>
                  <button onClick={() => setTab("profiles")}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white transition-colors">
                    Create Profile
                  </button>
                </div>
              ) : (
                <BotLauncher profiles={profiles} onLaunch={id => { setActiveSession(id); loadSessions(); }} />
              )}
            </div>

            <div className="col-span-2 space-y-4">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5">
                <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                  <Icon name="zap" size={15} className="text-amber-400" />
                  How it works
                </h3>
                <div className="space-y-3">
                  {[
                    ["Opens Chrome", "Launches a real browser instance"],
                    ["Logs into LinkedIn", "Using your saved credentials"],
                    ["Searches jobs", "Filters by your criteria"],
                    ["Finds Easy Apply", "Identifies one-click apply jobs"],
                    ["Auto-fills forms", "Uses your profile details"],
                    ["Submits applications", "Tracks success & failures"],
                  ].map(([title, desc], i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0 mt-0.5">{i + 1}</div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-300">{title}</p>
                        <p className="text-xs text-zinc-600">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-500/8 border border-amber-500/20 rounded-3xl p-5">
                <div className="flex gap-2">
                  <Icon name="info" size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-300 mb-1">Important Notice</p>
                    <p className="text-xs text-amber-600/80 leading-relaxed">Use responsibly. LinkedIn may detect automation. Consider using a secondary account and applying in small batches.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Profiles Tab ── */}
        {tab === "profiles" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Saved Profiles</h2>
              <button onClick={() => { setEditProfile(null); setShowProfileForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white transition-colors">
                <Icon name="plus" size={16} />
                Add Profile
              </button>
            </div>

            {profiles.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
                <Icon name="user" size={40} className="text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">No profiles yet</p>
                <p className="text-zinc-600 text-sm mt-1">Create one to start automating applications</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {profiles.map(p => (
                  <div key={p.id} className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 flex items-center justify-between transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-lg font-bold">
                        {(p.first_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{p.first_name} {p.last_name}</p>
                        <p className="text-sm text-zinc-500">{p.email}</p>
                        <div className="flex gap-2 mt-1.5">
                          {p.experience_level && <Badge color="blue">{p.experience_level}</Badge>}
                          {p.city && <Badge color="gray">{p.city}</Badge>}
                          {p.resume_name && <Badge color="green"><Icon name="file" size={10} />{p.resume_name}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditProfile(p); setShowProfileForm(true); }}
                        className="p-2 rounded-xl hover:bg-zinc-700 text-zinc-500 hover:text-white transition-all">
                        <Icon name="edit" size={16} />
                      </button>
                      <button onClick={async () => {
                        if (confirm("Delete this profile?")) {
                          try { await api.deleteProfile(p.id); } catch (err) { console.error(err); }
                          loadProfiles();
                        }
                      }} className="p-2 rounded-xl hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── History Tab ── */}
        {tab === "history" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Application History</h2>
              <button onClick={loadSessions} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-xl transition-all">
                <Icon name="activity" size={13} />
                Refresh
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
                <Icon name="activity" size={40} className="text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">No sessions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(s => (
                  <div key={s.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge color={s.status === "completed" ? "green" : s.status === "running" ? "blue" : "red"}>
                          <div className={`w-1.5 h-1.5 rounded-full ${s.status === "running" ? "bg-blue-400 animate-pulse" : "bg-current"}`} />
                          {s.status}
                        </Badge>
                        <span className="font-semibold text-white">{s.job_title}</span>
                        {s.location && <span className="text-zinc-500 text-sm flex items-center gap-1"><Icon name="map" size={12} />{s.location}</span>}
                      </div>
                      <span className="text-xs text-zinc-600">
                        {s.started_at ? new Date(s.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 font-bold">{s.stats?.applied || 0}</span>
                        <span className="text-zinc-600">applied</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-amber-400 font-bold">{s.stats?.skipped || 0}</span>
                        <span className="text-zinc-600">skipped</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-red-400 font-bold">{s.stats?.failed || 0}</span>
                        <span className="text-zinc-600">failed</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showProfileForm && (
        <ProfileForm
          profile={editProfile}
          onSave={() => { setShowProfileForm(false); setEditProfile(null); loadProfiles(); }}
          onCancel={() => { setShowProfileForm(false); setEditProfile(null); }}
        />
      )}

      {activeSession && (
        <SessionMonitor sessionId={activeSession} onClose={() => { setActiveSession(null); loadSessions(); }} />
      )}
    </div>
  );
}
