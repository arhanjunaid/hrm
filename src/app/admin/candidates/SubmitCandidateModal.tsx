"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { Upload, Plus, Send, ArrowLeft, UserPlus, Users } from "lucide-react";

export interface SubmitDefaults {
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  jobId: string;
  jobCode: string;
  jobTitle: string;
}

interface ClientOpt { id: string; name: string; code: string }
interface ProjectOpt { id: string; name: string; status: string }
interface JobOpt { id: string; jobCode: string; title: string; status: string; projectName: string | null }
interface CvOpt { id: string; fileName: string; description: string | null; isObsolete: boolean; createdAt: string }
interface CandidateHit {
  id: string; name: string; email: string; phone: string;
  totalExperience: string; currentCompany: string | null; currentDesignation: string | null;
  cvs: CvOpt[];
}

interface Props {
  defaultSelection?: SubmitDefaults;
  onSuccess?: () => void;
  buttonLabel?: string;
  buttonVariant?: "primary" | "secondary" | "outline";
}

const emptyCandidate = {
  name: "",
  email: "",
  phone: "",
  totalExperience: "",
  relevantExperience: "",
  currentCompany: "",
  currentDesignation: "",
  currentLocation: "",
  preferredLocation: "",
  skills: "",
  noticePeriod: "",
  currentSalary: "",
  expectedSalary: "",
  source: "",
  recruiter: "",
  notes: "",
};

export const SubmitCandidateModal: React.FC<Props> = ({
  defaultSelection,
  onSuccess,
  buttonLabel = "Submit a Candidate",
  buttonVariant = "primary",
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; title: string; message?: string } | null>(null);

  // Step 1 — target
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [jobs, setJobs] = useState<JobOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [jobId, setJobId] = useState("");
  const locked = !!defaultSelection;

  // Step 2 — mode + data
  const [mode, setMode] = useState<"choose" | "existing" | "new">("choose");
  const [candQuery, setCandQuery] = useState("");
  const [candHits, setCandHits] = useState<CandidateHit[]>([]);
  const [candSearching, setCandSearching] = useState(false);
  const [selectedCand, setSelectedCand] = useState<CandidateHit | null>(null);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [newCand, setNewCand] = useState(emptyCandidate);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [cvDescription, setCvDescription] = useState("");

  const targetComplete = locked || (clientId !== "" && projectId !== "" && jobId !== "");
  const effectiveJobId = locked ? defaultSelection.jobId : jobId;

  const reset = () => {
    setClientId(""); setProjectId(""); setJobId("");
    setProjects([]); setJobs([]);
    setMode("choose");
    setCandQuery(""); setCandHits([]); setSelectedCand(null); setSelectedCvId("");
    setNewCand(emptyCandidate); setResumeFile(null); setCvDescription("");
    setToast(null);
  };

  // Load clients when opened
  useEffect(() => {
    if (!isOpen) return;
    reset();
    fetch("/api/admin/submit-options")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setClients(data.clients ?? []);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cascade: client -> projects + jobs
  useEffect(() => {
    if (!isOpen || locked) return;
    if (!clientId) { setProjects([]); setJobs([]); return; }
    fetch(`/api/admin/submit-options?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProjects(data.projects ?? []);
          setJobs(data.jobs ?? []);
        }
      })
      .catch(() => {});
  }, [clientId, isOpen, locked]);

  // Cascade: project -> jobs
  useEffect(() => {
    if (!isOpen || locked || !clientId) return;
    const qs = projectId
      ? `?clientId=${encodeURIComponent(clientId)}&projectId=${encodeURIComponent(projectId)}`
      : `?clientId=${encodeURIComponent(clientId)}`;
    fetch(`/api/admin/submit-options${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setJobs(data.jobs ?? []);
      })
      .catch(() => {});
  }, [projectId, isOpen, locked, clientId]);

  // Debounced candidate search
  useEffect(() => {
    if (!isOpen || mode !== "existing" || selectedCand) return;
    const q = candQuery.trim();
    if (q.length < 2) { setCandHits([]); return; }
    setCandSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/candidates/search?q=${encodeURIComponent(q)}&limit=30`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setCandHits(data.candidates ?? []);
        })
        .catch(() => {})
        .finally(() => setCandSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [candQuery, isOpen, mode, selectedCand]);

  const activeCvs = useMemo(
    () => (selectedCand ? selectedCand.cvs.filter((c) => !c.isObsolete) : []),
    [selectedCand]
  );

  const finish = (message: string) => {
    setToast({ type: "success", title: "Candidate Submitted Successfully", message });
    setIsLoading(false);
    setTimeout(() => {
      setIsOpen(false);
      router.refresh();
      if (onSuccess) onSuccess();
    }, 1000);
  };

  const handleSubmitExisting = async () => {
    if (!selectedCand) {
      setToast({ type: "error", title: "Validation Error", message: "Select a candidate first." });
      return;
    }
    if (!selectedCvId) {
      setToast({ type: "error", title: "Validation Error", message: "Select which CV to submit." });
      return;
    }
    setIsLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: effectiveJobId, candidateId: selectedCand.id, resumeFileId: selectedCvId }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setToast({ type: "error", title: "Submission Failed", message: result.error?.message || "Failed to submit candidate." });
        setIsLoading(false);
        return;
      }
      finish(`${selectedCand.name} submitted to the Job Description.`);
    } catch {
      setToast({ type: "error", title: "Network Error", message: "Failed to communicate with server." });
      setIsLoading(false);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCand.name.trim() || !newCand.email.trim() || !newCand.phone.trim() || !newCand.skills.trim()) {
      setToast({ type: "error", title: "Validation Error", message: "Name, email, phone, and skills are required." });
      return;
    }
    if (!resumeFile) {
      setToast({ type: "error", title: "Validation Error", message: "Candidate resume file is required." });
      return;
    }
    setIsLoading(true);
    setToast(null);
    try {
      const data = new FormData();
      Object.entries({ ...newCand, selectedJobId: effectiveJobId, description: cvDescription }).forEach(([k, v]) =>
        data.append(k, v)
      );
      data.append("resume", resumeFile);
      const res = await fetch("/api/candidates/create-and-submit", { method: "POST", body: data });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setToast({ type: "error", title: "Submission Failed", message: result.error?.message || "Failed to create candidate." });
        setIsLoading(false);
        return;
      }
      finish("Candidate created & submitted to the Job Description.");
    } catch {
      setToast({ type: "error", title: "Network Error", message: "Failed to communicate with server." });
      setIsLoading(false);
    }
  };

  const targetBanner = locked && defaultSelection ? (
    <div className="bg-brand-50 border border-brand-200 p-3.5 rounded-xl">
      <span className="text-[11px] font-extrabold uppercase text-brand-700 tracking-wider">
        Target Job Description
      </span>
      <p className="text-sm font-extrabold text-slate-900 mt-0.5">
        {defaultSelection.jobCode} — {defaultSelection.jobTitle}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">
        {defaultSelection.clientName}
        {defaultSelection.projectName ? ` • ${defaultSelection.projectName}` : ""}
      </p>
    </div>
  ) : null;

  return (
    <>
      <Button variant={buttonVariant} onClick={() => setIsOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
        {buttonLabel}
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Submit a Candidate" maxWidth="2xl">
        {toast && (
          <div className="mb-4">
            <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5 text-[11px] font-extrabold uppercase tracking-wider">
          <span className={`px-2.5 py-1 rounded-full ${!targetComplete ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>
            1. Target JD
          </span>
          <span className="text-slate-300">→</span>
          <span className={`px-2.5 py-1 rounded-full ${targetComplete ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"}`}>
            2. Candidate
          </span>
        </div>

        {targetBanner}

        {/* Step 1: Client -> Project -> JD */}
        {!locked && (
          <div className="space-y-3 mt-4">
            <SearchableSelect
              label="Client"
              required
              value={clientId}
              onChange={(v) => { setClientId(v); setProjectId(""); setJobId(""); }}
              placeholder="Select a client"
              options={clients.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
            />
            <SearchableSelect
              label="Project"
              required
              value={projectId}
              onChange={(v) => { setProjectId(v); setJobId(""); }}
              placeholder={clientId ? "Select a project" : "Select a client first"}
              disabled={!clientId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
            <SearchableSelect
              label="Job Description"
              required
              value={jobId}
              onChange={setJobId}
              placeholder={projectId ? "Select a job description" : "Select a project first"}
              disabled={!projectId}
              options={jobs.map((j) => ({
                value: j.id,
                label: `${j.jobCode} — ${j.title} (${j.status})`,
              }))}
            />
          </div>
        )}

        {/* Step 2: choose existing vs new */}
        {targetComplete && mode === "choose" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className="flex flex-col items-start gap-1.5 p-5 rounded-2xl border-2 border-slate-200 hover:border-brand-600 hover:bg-brand-50/50 transition-all text-left"
            >
              <Users className="w-6 h-6 text-brand-700" />
              <span className="text-sm font-extrabold text-slate-900">Submit an existing candidate</span>
              <span className="text-xs text-slate-500">Search the pool, pick a candidate and one of their CVs.</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className="flex flex-col items-start gap-1.5 p-5 rounded-2xl border-2 border-slate-200 hover:border-brand-600 hover:bg-brand-50/50 transition-all text-left"
            >
              <UserPlus className="w-6 h-6 text-brand-700" />
              <span className="text-sm font-extrabold text-slate-900">Create a new candidate</span>
              <span className="text-xs text-slate-500">Enter details, upload a CV, and submit in one step.</span>
            </button>
          </div>
        )}

        {/* Step 2a: existing candidate */}
        {targetComplete && mode === "existing" && (
          <div className="space-y-4 mt-4">
            <button
              type="button"
              onClick={() => { setMode("choose"); setSelectedCand(null); setSelectedCvId(""); setCandQuery(""); setCandHits([]); }}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            {!selectedCand ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Search candidate pool <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="Type at least 2 letters of name, email, phone, or skills…"
                  value={candQuery}
                  onChange={(e) => setCandQuery(e.target.value)}
                />
                <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {candSearching ? (
                    <p className="p-3 text-xs text-slate-400">Searching…</p>
                  ) : candHits.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400 italic">
                      {candQuery.trim().length >= 2 ? "No candidates match." : "Start typing to search."}
                    </p>
                  ) : (
                    candHits.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedCand(c); setSelectedCvId(""); }}
                        className="w-full text-left p-3 hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-sm font-bold text-slate-900">{c.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {c.email} • {c.phone}
                          {c.currentDesignation ? ` • ${c.currentDesignation}` : ""}
                          {c.currentCompany ? ` @ ${c.currentCompany}` : ""} •{" "}
                          {c.cvs.length} CV{c.cvs.length === 1 ? "" : "s"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{selectedCand.name}</p>
                    <p className="text-[11px] text-slate-500">{selectedCand.email} • {selectedCand.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedCand(null); setSelectedCvId(""); }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Change
                  </button>
                </div>

                {selectedCand.cvs.length === 0 ? (
                  <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-xl p-3">
                    This candidate has no CVs yet. Upload one from the candidate record, then submit.
                  </p>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Select CV to submit <span className="text-rose-500">*</span>
                    </p>
                    <div className="space-y-2">
                      {selectedCand.cvs.map((cv) => (
                        <label
                          key={cv.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                            cv.isObsolete
                              ? "border-slate-100 bg-slate-50 opacity-70 cursor-not-allowed"
                              : selectedCvId === cv.id
                                ? "border-brand-600 bg-brand-50/50 cursor-pointer"
                                : "border-slate-200 hover:border-slate-300 cursor-pointer"
                          }`}
                        >
                          <input
                            type="radio"
                            name="cv-pick"
                            disabled={cv.isObsolete}
                            checked={selectedCvId === cv.id}
                            onChange={() => setSelectedCvId(cv.id)}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 truncate">{cv.fileName}</span>
                              {cv.isObsolete && <Badge variant="red">Obsolete</Badge>}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {cv.description || "No description"} • Submitted{" "}
                              {new Date(cv.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {activeCvs.length === 0 && (
                      <p className="text-xs text-amber-700 font-semibold mt-2">
                        All CVs for this candidate are obsolete — none can be submitted.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                isLoading={isLoading}
                disabled={!selectedCand || !selectedCvId}
                onClick={handleSubmitExisting}
                rightIcon={<Send className="w-4 h-4" />}
              >
                Submit Candidate
              </Button>
            </div>
          </div>
        )}

        {/* Step 2b: new candidate */}
        {targetComplete && mode === "new" && (
          <form onSubmit={handleSubmitNew} className="space-y-4 mt-4">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Candidate Name" required value={newCand.name} onChange={(e) => setNewCand({ ...newCand, name: e.target.value })} />
              <Input label="Email Address" type="email" required value={newCand.email} onChange={(e) => setNewCand({ ...newCand, email: e.target.value })} />
              <Input label="Phone Number" required value={newCand.phone} onChange={(e) => setNewCand({ ...newCand, phone: e.target.value })} />
              <Input label="Total Experience (Years)" type="number" step="0.1" value={newCand.totalExperience} onChange={(e) => setNewCand({ ...newCand, totalExperience: e.target.value })} />
              <Input label="Relevant Experience (Years)" type="number" step="0.1" value={newCand.relevantExperience} onChange={(e) => setNewCand({ ...newCand, relevantExperience: e.target.value })} />
              <Input label="Current Company" value={newCand.currentCompany} onChange={(e) => setNewCand({ ...newCand, currentCompany: e.target.value })} />
              <Input label="Current Designation" value={newCand.currentDesignation} onChange={(e) => setNewCand({ ...newCand, currentDesignation: e.target.value })} />
              <Input label="Current Location" value={newCand.currentLocation} onChange={(e) => setNewCand({ ...newCand, currentLocation: e.target.value })} />
              <Input label="Preferred Location" value={newCand.preferredLocation} onChange={(e) => setNewCand({ ...newCand, preferredLocation: e.target.value })} />
              <Input label="Notice Period" value={newCand.noticePeriod} onChange={(e) => setNewCand({ ...newCand, noticePeriod: e.target.value })} />
              <Input label="Current Salary" type="number" value={newCand.currentSalary} onChange={(e) => setNewCand({ ...newCand, currentSalary: e.target.value })} />
              <Input label="Expected Salary" type="number" value={newCand.expectedSalary} onChange={(e) => setNewCand({ ...newCand, expectedSalary: e.target.value })} />
              <Input label="Source" value={newCand.source} onChange={(e) => setNewCand({ ...newCand, source: e.target.value })} />
              <Input label="Recruiter" value={newCand.recruiter} onChange={(e) => setNewCand({ ...newCand, recruiter: e.target.value })} />
            </div>

            <Textarea label="Required Skills" required rows={2} value={newCand.skills} onChange={(e) => setNewCand({ ...newCand, skills: e.target.value })} />
            <Textarea label="Recruiter Notes" rows={2} value={newCand.notes} onChange={(e) => setNewCand({ ...newCand, notes: e.target.value })} />

            <div className="border border-dashed border-slate-300 p-4 rounded-xl text-center bg-slate-50 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Upload Resume (PDF, DOC, DOCX) *
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-700 cursor-pointer"
              />
              {resumeFile && (
                <p className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> Selected: {resumeFile.name} ({(resumeFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
              <Input
                placeholder="CV description (optional, e.g. tailored for this JD)"
                value={cvDescription}
                onChange={(e) => setCvDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading} rightIcon={<Send className="w-4 h-4" />}>
                Create & Submit
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
};
