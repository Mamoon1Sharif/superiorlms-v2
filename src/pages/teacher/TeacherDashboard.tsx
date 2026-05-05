import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TeacherDashboard() {
  const { user } = useAuth();

  const { data: teacher } = useQuery({
    queryKey: ["my-teacher-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("*, campuses(name)").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: classAssignments } = useQuery({
    queryKey: ["my-class-assignments-dash", teacher?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_class_assignments")
        .select("*, classes(name, campus_id, campuses(name)), sections(name)")
        .eq("teacher_id", teacher!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!teacher,
  });

  const assignedClassIds = Array.from(new Set((classAssignments ?? []).map((a: any) => a.class_id)));

  const { data: students } = useQuery({
    queryKey: ["my-students-dash", assignedClassIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id")
        .in("class_id", assignedClassIds);
      if (error) throw error;
      return data;
    },
    enabled: assignedClassIds.length > 0,
  });

  const studentIds = (students ?? []).map((s: any) => s.id);

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["my-pending-grading", studentIds],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assignment_submissions")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .eq("graded", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: studentIds.length > 0,
  });

  const campusName = (teacher as any)?.campuses?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Teacher Dashboard{campusName ? ` · ${campusName}` : ""}
        </h1>
        <p className="text-muted-foreground">Welcome back, {teacher?.name ?? user?.email}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Classes (Sections)</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classAssignments?.length ?? 0}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {classAssignments?.map((a: any) => (
                <Badge key={a.id} variant="outline" className="text-[10px]">
                  {a.classes?.name} ({a.sections?.name ?? "All Sections"})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
