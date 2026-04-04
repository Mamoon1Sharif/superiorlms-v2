import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Video, HelpCircle, FileText, GripVertical, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

interface VideoLesson {
  title: string;
  description: string;
  youtube_url: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

interface AssignmentDetail {
  instructions: string;
  deadline: string;
  max_marks: number;
}

interface ModuleData {
  title: string;
  type: "video" | "quiz" | "assignment";
  videos: VideoLesson[];
  questions: QuizQuestion[];
  assignment: AssignmentDetail;
}

const emptyVideo = (): VideoLesson => ({ title: "", description: "", youtube_url: "" });
const emptyQuestion = (): QuizQuestion => ({ question: "", options: ["", "", "", ""], correct_answer: 0 });
const emptyAssignment = (): AssignmentDetail => ({ instructions: "", deadline: "", max_marks: 100 });
const emptyModule = (type: "video" | "quiz" | "assignment"): ModuleData => ({
  title: "",
  type,
  videos: type === "video" ? [emptyVideo()] : [],
  questions: type === "quiz" ? [emptyQuestion()] : [],
  assignment: type === "assignment" ? emptyAssignment() : emptyAssignment(),
});

export default function CreateCourse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: campuses } = useQuery({
    queryKey: ["campuses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("id, name, city");
      if (error) throw error;
      return data;
    },
  });

  const toggleCampus = (id: string) => {
    setSelectedCampuses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const addModule = (type: "video" | "quiz" | "assignment") => {
    setModules((prev) => [...prev, emptyModule(type)]);
  };

  const removeModule = (idx: number) => {
    setModules((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateModule = (idx: number, updates: Partial<ModuleData>) => {
    setModules((prev) => prev.map((m, i) => (i === idx ? { ...m, ...updates } : m)));
  };

  // Video helpers
  const addVideo = (modIdx: number) => {
    const mod = modules[modIdx];
    updateModule(modIdx, { videos: [...mod.videos, emptyVideo()] });
  };
  const removeVideo = (modIdx: number, vidIdx: number) => {
    const mod = modules[modIdx];
    updateModule(modIdx, { videos: mod.videos.filter((_, i) => i !== vidIdx) });
  };
  const updateVideo = (modIdx: number, vidIdx: number, updates: Partial<VideoLesson>) => {
    const mod = modules[modIdx];
    updateModule(modIdx, {
      videos: mod.videos.map((v, i) => (i === vidIdx ? { ...v, ...updates } : v)),
    });
  };

  // Quiz helpers
  const addQuestion = (modIdx: number) => {
    const mod = modules[modIdx];
    updateModule(modIdx, { questions: [...mod.questions, emptyQuestion()] });
  };
  const removeQuestion = (modIdx: number, qIdx: number) => {
    const mod = modules[modIdx];
    updateModule(modIdx, { questions: mod.questions.filter((_, i) => i !== qIdx) });
  };
  const updateQuestion = (modIdx: number, qIdx: number, updates: Partial<QuizQuestion>) => {
    const mod = modules[modIdx];
    updateModule(modIdx, {
      questions: mod.questions.map((q, i) => (i === qIdx ? { ...q, ...updates } : q)),
    });
  };
  const updateOption = (modIdx: number, qIdx: number, optIdx: number, val: string) => {
    const mod = modules[modIdx];
    const q = mod.questions[qIdx];
    const newOpts = q.options.map((o, i) => (i === optIdx ? val : o));
    updateQuestion(modIdx, qIdx, { options: newOpts });
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Course title is required"); return; }
    if (modules.length === 0) { toast.error("Add at least one module"); return; }

    setSaving(true);
    try {
      // 1. Create course
      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .insert({ title, description })
        .select()
        .single();
      if (courseErr) throw courseErr;

      // 2. Assign campuses
      if (selectedCampuses.length > 0) {
        const { error: ccErr } = await supabase.from("course_campuses").insert(
          selectedCampuses.map((cid) => ({ course_id: course.id, campus_id: cid }))
        );
        if (ccErr) throw ccErr;
      }

      // 3. Create modules with content
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        if (!mod.title.trim()) continue;

        const { data: dbModule, error: modErr } = await supabase
          .from("modules")
          .insert({ course_id: course.id, title: mod.title, type: mod.type, sort_order: i })
          .select()
          .single();
        if (modErr) throw modErr;

        if (mod.type === "video" && mod.videos.length > 0) {
          const validVideos = mod.videos.filter((v) => v.title.trim());
          if (validVideos.length > 0) {
            await supabase.from("lessons").insert(
              validVideos.map((v, vi) => ({
                module_id: dbModule.id,
                title: v.title,
                description: v.description,
                youtube_url: v.youtube_url,
                sort_order: vi,
              }))
            );
          }
        }

        if (mod.type === "quiz" && mod.questions.length > 0) {
          const validQs = mod.questions.filter((q) => q.question.trim());
          if (validQs.length > 0) {
            await supabase.from("quiz_questions").insert(
              validQs.map((q, qi) => ({
                module_id: dbModule.id,
                question: q.question,
                options: q.options,
                correct_answer: q.correct_answer,
                sort_order: qi,
              }))
            );
          }
        }

        if (mod.type === "assignment") {
          await supabase.from("assignment_details").insert({
            module_id: dbModule.id,
            instructions: mod.assignment.instructions,
            deadline: mod.assignment.deadline || null,
            max_marks: mod.assignment.max_marks,
          });
        }
      }

      toast.success("Course created successfully!");
      queryClient.invalidateQueries({ queryKey: ["courses-with-details"] });
      navigate("/courses");
    } catch (err: any) {
      toast.error(err.message || "Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/courses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Course</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Add modules with videos, quizzes, and assignments</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Course Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Full Stack Web Development" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Course overview..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Assign to Campuses</Label>
            <div className="flex flex-wrap gap-2">
              {(campuses ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCampus(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedCampuses.includes(c.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modules</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addModule("video")}>
              <Video className="h-3.5 w-3.5 mr-1" /> Add Video Module
            </Button>
            <Button variant="outline" size="sm" onClick={() => addModule("quiz")}>
              <HelpCircle className="h-3.5 w-3.5 mr-1" /> Add Quiz Module
            </Button>
            <Button variant="outline" size="sm" onClick={() => addModule("assignment")}>
              <FileText className="h-3.5 w-3.5 mr-1" /> Add Assignment Module
            </Button>
          </div>
        </div>

        {modules.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No modules yet. Add video, quiz, or assignment modules above.</p>
            </CardContent>
          </Card>
        )}

        {modules.map((mod, modIdx) => (
          <Card key={modIdx}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Badge variant="secondary" className="text-[11px] shrink-0">
                    {mod.type === "video" && <><Video className="h-3 w-3 mr-1" />Video</>}
                    {mod.type === "quiz" && <><HelpCircle className="h-3 w-3 mr-1" />Quiz</>}
                    {mod.type === "assignment" && <><FileText className="h-3 w-3 mr-1" />Assignment</>}
                  </Badge>
                  <Input
                    value={mod.title}
                    onChange={(e) => updateModule(modIdx, { title: e.target.value })}
                    placeholder="Module title"
                    className="font-medium"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeModule(modIdx)} className="text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* VIDEO MODULE */}
              {mod.type === "video" && (
                <div className="space-y-3">
                  {mod.videos.map((vid, vidIdx) => (
                    <div key={vidIdx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Video {vidIdx + 1}</span>
                        {mod.videos.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeVideo(modIdx, vidIdx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Input placeholder="Video title" value={vid.title} onChange={(e) => updateVideo(modIdx, vidIdx, { title: e.target.value })} />
                      <Input placeholder="YouTube URL" value={vid.youtube_url} onChange={(e) => updateVideo(modIdx, vidIdx, { youtube_url: e.target.value })} />
                      <Input placeholder="Description (optional)" value={vid.description} onChange={(e) => updateVideo(modIdx, vidIdx, { description: e.target.value })} />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addVideo(modIdx)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Video
                  </Button>
                </div>
              )}

              {/* QUIZ MODULE */}
              {mod.type === "quiz" && (
                <div className="space-y-3">
                  {mod.questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Question {qIdx + 1}</span>
                        {mod.questions.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeQuestion(modIdx, qIdx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Input placeholder="Question" value={q.question} onChange={(e) => updateQuestion(modIdx, qIdx, { question: e.target.value })} />
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${modIdx}-${qIdx}`}
                              checked={q.correct_answer === optIdx}
                              onChange={() => updateQuestion(modIdx, qIdx, { correct_answer: optIdx })}
                              className="accent-primary"
                            />
                            <Input
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              value={opt}
                              onChange={(e) => updateOption(modIdx, qIdx, optIdx, e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Select the radio button for the correct answer</p>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addQuestion(modIdx)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Question
                  </Button>
                </div>
              )}

              {/* ASSIGNMENT MODULE */}
              {mod.type === "assignment" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Instructions</Label>
                    <Textarea
                      placeholder="Assignment instructions..."
                      value={mod.assignment.instructions}
                      onChange={(e) => updateModule(modIdx, { assignment: { ...mod.assignment, instructions: e.target.value } })}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Deadline</Label>
                      <Input
                        type="datetime-local"
                        value={mod.assignment.deadline}
                        onChange={(e) => updateModule(modIdx, { assignment: { ...mod.assignment, deadline: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max Marks</Label>
                      <Input
                        type="number"
                        value={mod.assignment.max_marks}
                        onChange={(e) => updateModule(modIdx, { assignment: { ...mod.assignment, max_marks: parseInt(e.target.value) || 0 } })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save */}
      <div className="flex gap-3 pb-8">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Create Course"}
        </Button>
        <Button variant="outline" onClick={() => navigate("/courses")}>Cancel</Button>
      </div>
    </div>
  );
}
