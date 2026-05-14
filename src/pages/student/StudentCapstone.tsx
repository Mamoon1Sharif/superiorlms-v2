import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Lock, GraduationCap, Plus, X, Upload, Loader2, FileText, Link as LinkIcon, ExternalLink, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getCourseCompletions } from "@/lib/courseProgress";

const ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

type FileEntry = { name: string; url: string; kind: "submission" | "earnings" };

export default function StudentCapstone() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["capstone-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("capstone_settings").select("*").eq("id", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: student } = useQuery({
    queryKey: ["my-student", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, name, campus_id").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: campusCourses } = useQuery({
    queryKey: ["campus-courses-capstone", student?.campus_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_campuses")
        .select("courses(id, status, sequence)")
        .eq("campus_id", student!.campus_id!);
      if (error) throw error;
      return (data?.map((cc: any) => cc.courses).filter(Boolean) ?? []).filter((c: any) => c.status === "Published");
    },
    enabled: !!student?.campus_id,
  });

  const { data: completions } = useQuery({
    queryKey: ["course-completions-capstone", student?.id, campusCourses?.map((c: any) => c.id).join(",")],
    queryFn: async () => getCourseCompletions(student!.id, (campusCourses ?? []).map((c: any) => c.id)),
    enabled: !!student && !!campusCourses?.length,
  });

  const allCoursesDone = !!campusCourses?.length && campusCourses.every((c: any) => completions?.[c.id]?.isComplete);

  const { data: submission } = useQuery({
    queryKey: ["my-capstone", student?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("capstone_submissions").select("*").eq("student_id", student!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!student,
  });

  const [profileLinks, setProfileLinks] = useState<string[]>([""]);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploadingKind, setUploadingKind] = useState<"submission" | "earnings" | null>(null);

  useEffect(() => {
    if (!submission) return;
    const links = (submission.profile_links as string[]) ?? [];
    setProfileLinks(links.length ? links : [""]);
    setDescription(submission.description ?? "");
    setFiles((submission.files as FileEntry[]) ?? []);
  }, [submission]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: "submission" | "earnings") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxMB = settings?.max_file_size_mb ?? 25;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`File must be smaller than ${maxMB}MB`);
      return;
    }
    setUploadingKind(kind);
    try {
      const ext = file.name.split(".").pop();
      const path = `${student!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("capstone-files").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("capstone-files").getPublicUrl(path);
      setFiles((prev) => [...prev, { name: file.name, url: data.publicUrl, kind }]);
      toast.success("File uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingKind(null);
      e.target.value = "";
    }
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const save = useMutation({
    mutationFn: async () => {
      const cleanedLinks = profileLinks.map((l) => l.trim()).filter(Boolean);
      const payload = {
        student_id: student!.id,
        profile_links: cleanedLinks,
        files,
        description,
        status: submission?.graded ? submission.status : "Pending",
      };
      const { error } = await supabase.from("capstone_submissions").upsert(payload, { onConflict: "student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Capstone submission saved");
      qc.invalidateQueries({ queryKey: ["my-capstone"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!student) return <div className="text-center text-muted-foreground py-12">Loading...</div>;

  if (!settings?.is_published) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="p-8 text-center space-y-3">
          <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Capstone not available yet</h2>
          <p className="text-sm text-muted-foreground">The Final Capstone Project hasn't been published. Please check back later.</p>
          <Link to="/student"><Button variant="outline" size="sm">← Back</Button></Link>
        </CardContent>
      </Card>
    );
  }

  if (!allCoursesDone) {
    const remaining = (campusCourses ?? []).filter((c: any) => !completions?.[c.id]?.isComplete).length;
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="p-8 text-center space-y-3">
          <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Capstone locked</h2>
          <p className="text-sm text-muted-foreground">Complete all your courses to unlock the Final Capstone Project. {remaining} course{remaining === 1 ? "" : "s"} remaining.</p>
          <Link to="/student"><Button variant="outline" size="sm">← Back to courses</Button></Link>
        </CardContent>
      </Card>
    );
  }

  const submissionFiles = files.filter((f) => f.kind === "submission");
  const earningsFiles = files.filter((f) => f.kind === "earnings");
  const deadlinePassed = settings.deadline && new Date(settings.deadline) < new Date();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/student"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> {settings.title || "Final Capstone Project"}
          </h1>
        </div>
        {submission && (
          <Badge variant={submission.status === "Approved" ? "default" : submission.status === "Rejected" ? "destructive" : "secondary"}>
            {submission.status}
          </Badge>
        )}
      </div>

      {settings.cover_url && (
        <div className="relative w-full h-32 sm:h-40 rounded-lg overflow-hidden bg-muted">
          <img src={settings.cover_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {settings.deadline && (
        <p className={`text-xs ${deadlinePassed ? "text-destructive" : "text-muted-foreground"}`}>
          Deadline: {new Date(settings.deadline).toLocaleString()}
        </p>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Instructions</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{settings.instructions || "No instructions provided."}</p>
        </CardContent>
      </Card>

      {submission?.graded && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              {submission.status === "Approved" ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <p className="font-medium text-sm">Reviewed by your teacher</p>
              {submission.grade !== null && submission.grade !== undefined && (
                <Badge variant="outline" className="ml-auto">Grade: {submission.grade}/100</Badge>
              )}
            </div>
            {submission.grading_comments && (
              <p className="text-sm text-muted-foreground">{submission.grading_comments}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Profile / portfolio links</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {profileLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={link}
                placeholder="https://linkedin.com/in/..., https://github.com/...,  portfolio URL"
                onChange={(e) => setProfileLinks((p) => p.map((v, idx) => (idx === i ? e.target.value : v)))}
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setProfileLinks((p) => p.filter((_, idx) => idx !== i))} disabled={profileLinks.length === 1}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setProfileLinks((p) => [...p, ""])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add another link
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Project files (PDF, DOC, JPG, PNG)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {submissionFiles.length > 0 && (
            <div className="space-y-1.5">
              {submissionFiles.map((f) => {
                const idx = files.indexOf(f);
                return (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-xs text-primary truncate flex-1 underline">{f.name}</a>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(idx)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                );
              })}
            </div>
          )}
          <Label className="cursor-pointer">
            <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => handleUpload(e, "submission")} disabled={uploadingKind === "submission"} />
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                {uploadingKind === "submission" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                Upload project file
              </span>
            </Button>
          </Label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Proof of earnings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Upload screenshots or documents showing income from your skills (Fiverr/Upwork screenshots, payment confirmations, invoices, etc.)</p>
          {earningsFiles.length > 0 && (
            <div className="space-y-1.5">
              {earningsFiles.map((f) => {
                const idx = files.indexOf(f);
                return (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-xs text-primary truncate flex-1 underline">{f.name}</a>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(idx)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                );
              })}
            </div>
          )}
          <Label className="cursor-pointer">
            <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => handleUpload(e, "earnings")} disabled={uploadingKind === "earnings"} />
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                {uploadingKind === "earnings" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                Upload proof of earnings
              </span>
            </Button>
          </Label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} maxLength={3000}
            placeholder="Describe your capstone project, what you built, what you learned, and any relevant context for your reviewer." />
          <p className="text-[11px] text-muted-foreground mt-1">{description.length}/3000</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving..." : submission ? "Update Submission" : "Submit Capstone"}
          <ExternalLink className="h-3.5 w-3.5 ml-2 opacity-0" />
        </Button>
      </div>
    </div>
  );
}
