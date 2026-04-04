import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

export default function StudentRegister() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campusId, setCampusId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: campuses } = useQuery({
    queryKey: ["campuses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("id, name, city");
      if (error) throw error;
      return data;
    },
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) {
      toast.error("Please select a campus");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, campus_id: campusId },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Registration successful!");
      navigate("/student");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Join EduAdmin to access your courses</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmed Hassan" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Campus</Label>
              <Select value={campusId} onValueChange={setCampusId}>
                <SelectTrigger><SelectValue placeholder="Select your campus" /></SelectTrigger>
                <SelectContent>
                  {(campuses ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Already have an account? <Link to="/student/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
