import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function CampusAdminEnrollments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ca } = useQuery({
    queryKey: ["my-campus-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campus_admins").select("campus_id").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const campusId = ca?.campus_id;

  const { data: enrollments } = useQuery({
    queryKey: ["ca-enrollments-all", campusId],
    queryFn: async () => {
      // Get all students for this campus first
      const { data: students, error: sErr } = await supabase
        .from("students")
        .select("id, name, email, campus_id, campuses(name)")
        .eq("campus_id", campusId);
      if (sErr) throw sErr;
      const ids = (students ?? []).map((s) => s.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title)")
        .in("student_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const sMap: Record<string, any> = {};
      (students ?? []).forEach((s) => (sMap[s.id] = s));
      return (data ?? []).map((e: any) => ({ ...e, students: sMap[e.student_id] }));
    },
    enabled: !!campusId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("enrollments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["ca-enrollments-all"] });
      toast.success(`Enrollment ${status.toLowerCase()}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pending = enrollments?.filter((e: any) => e.status === "Pending") ?? [];
  const processed = enrollments?.filter((e: any) => e.status !== "Pending") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Enrollments</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve course enrollment requests for your campus</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Pending Requests ({pending.length})</h3>
        {pending.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No pending enrollment requests</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {pending.map((e: any) => (
              <Card key={e.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {e.students?.name?.split(" ").map((n: string) => n[0]).join("") ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{e.students?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.students?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[11px]">{e.courses?.title}</Badge>
                    <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: e.id, status: "Approved" })} disabled={updateStatus.isPending}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: e.id, status: "Rejected" })} disabled={updateStatus.isPending}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Processed ({processed.length})</h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Course</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processed.map((e: any) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{e.students?.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{e.courses?.title}</td>
                      <td className="py-3 px-4">
                        <Badge variant={e.status === "Approved" ? "default" : "destructive"} className="text-[11px]">{e.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
