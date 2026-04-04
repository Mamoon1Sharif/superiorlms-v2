import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Users, BookOpen, User } from "lucide-react";

export default function Campuses() {
  const { data: campuses } = useQuery({
    queryKey: ["campuses-detail"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: students } = useQuery({
    queryKey: ["students-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, campus_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("id, campus_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: courseCampuses } = useQuery({
    queryKey: ["course-campuses-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_campuses").select("campus_id");
      if (error) throw error;
      return data;
    },
  });

  const enriched = (campuses ?? []).map((c) => ({
    ...c,
    studentCount: students?.filter((s) => s.campus_id === c.id).length ?? 0,
    teacherCount: teachers?.filter((t) => t.campus_id === c.id).length ?? 0,
    courseCount: courseCampuses?.filter((cc) => cc.campus_id === c.id).length ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campuses</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your campus network</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Campus</Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {enriched.map((campus) => (
          <Card key={campus.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{campus.name}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5" /> {campus.city}
                  </p>
                </div>
                <Badge variant="default" className="text-[11px]">{campus.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted">
                  <Users className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">{campus.studentCount}</p>
                  <p className="text-[11px] text-muted-foreground">Students</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <User className="h-4 w-4 mx-auto text-accent mb-1" />
                  <p className="text-lg font-bold">{campus.teacherCount}</p>
                  <p className="text-[11px] text-muted-foreground">Teachers</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <BookOpen className="h-4 w-4 mx-auto text-warning mb-1" />
                  <p className="text-lg font-bold">{campus.courseCount}</p>
                  <p className="text-[11px] text-muted-foreground">Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
