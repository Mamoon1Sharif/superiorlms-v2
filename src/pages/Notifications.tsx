import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, CheckCircle2, AlertTriangle, Clock, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const iconMap: Record<string, any> = {
  info: UserPlus,
  success: CheckCircle2,
  warning: AlertTriangle,
  neutral: Clock,
};

const typeColors: Record<string, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  neutral: "text-muted-foreground",
};

export default function Notifications() {
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Stay updated on activity across campuses</p>
      </div>
      <div className="space-y-3 max-w-2xl">
        {(notifications ?? []).map((n) => {
          const Icon = iconMap[n.type] ?? Bell;
          return (
            <Card key={n.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`mt-0.5 ${typeColors[n.type]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
