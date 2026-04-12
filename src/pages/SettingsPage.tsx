import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your admin portal</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input defaultValue="Superior Group of Colleges" />
          </div>
          <div className="space-y-2">
            <Label>Admin Email</Label>
            <Input defaultValue="admin@superior.edu.pk" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">Receive email for new registrations</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Deadline reminders</p>
              <p className="text-xs text-muted-foreground">Auto-remind students before deadlines</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <RegionManager />
      <CampusManager />
      <ClassManager />

      <Button>Save Changes</Button>
    </div>
  );
}

function RegionManager() {
  const queryClient = useQueryClient();
  const [newRegion, setNewRegion] = useState("");

  const { data: regions, isLoading } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addRegion = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("regions").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      setNewRegion("");
      toast.success("Region added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRegion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("regions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      toast.success("Region deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Regions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Lahore, Multan, Gujranwala"
            value={newRegion}
            onChange={(e) => setNewRegion(e.target.value)}
          />
          <Button size="sm" onClick={() => newRegion.trim() && addRegion.mutate(newRegion.trim())} disabled={addRegion.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        <div className="space-y-1">
          {(regions ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
              <span className="text-sm">{r.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRegion.mutate(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CampusManager() {
  const queryClient = useQueryClient();
  const [campusName, setCampusName] = useState("");
  const [campusCity, setCampusCity] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: campuses, isLoading } = useQuery({
    queryKey: ["campuses-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("*, regions:region_id(name)").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addCampus = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("campuses").insert({
        name: campusName,
        city: campusCity,
        region_id: selectedRegion || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campuses-all"] });
      setCampusName("");
      setCampusCity("");
      toast.success("Campus added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCampus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campuses-all"] });
      toast.success("Campus deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Campuses</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Campus name" value={campusName} onChange={(e) => setCampusName(e.target.value)} />
          <Input placeholder="City" value={campusCity} onChange={(e) => setCampusCity(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
            <SelectContent>
              {(regions ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => campusName.trim() && campusCity.trim() && addCampus.mutate()}
            disabled={addCampus.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        <div className="space-y-1">
          {(campuses ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
              <div>
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{c.city}</span>
                {(c as any).regions?.name && (
                  <span className="text-xs text-muted-foreground ml-2">• {(c as any).regions.name}</span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCampus.mutate(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ClassManager() {
  const queryClient = useQueryClient();
  const [className, setClassName] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("");

  const { data: campuses } = useQuery({
    queryKey: ["campuses-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("id, name, city").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*, campuses:campus_id(name, city)").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addClass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("classes").insert({
        name: className,
        campus_id: selectedCampus,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes-all"] });
      setClassName("");
      toast.success("Class added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes-all"] });
      toast.success("Class deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Classes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Class name (e.g. BSCS-1A)" value={className} onChange={(e) => setClassName(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Select value={selectedCampus} onValueChange={setSelectedCampus}>
            <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
            <SelectContent>
              {(campuses ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} — {c.city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => className.trim() && selectedCampus && addClass.mutate()}
            disabled={addClass.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        <div className="space-y-1">
          {(classes ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
              <div>
                <span className="text-sm font-medium">{c.name}</span>
                {(c as any).campuses && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {(c as any).campuses.name} — {(c as any).campuses.city}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteClass.mutate(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
