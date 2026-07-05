import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginUser } from "@/store/auth-slice";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Mail, Lock } from "lucide-react";
import MESSAGES from "@/constants/messages";

export default function AdminLogin() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const actionResult = await dispatch(loginUser(formData));
      const response = actionResult.payload;

      if (response?.success) {
        if (response?.user?.role === "admin") {
          toast({
            title: "Access Granted",
            description: "Welcome to the Admin Dashboard",
          });
          navigate("/admin/dashboard");
        } else {
          toast({
            title: "Access Denied",
            description: "You do not have administrative privileges",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: response?.message || "Login Failed",
          description: "Please check your email and password.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-slate-950 px-4 py-12 overflow-hidden select-none">
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(140,198,63,0.08)_0,transparent_60%)] pointer-events-none" />
      
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl transition-all duration-300 hover:border-slate-700/80">
        <div className="flex flex-col items-center space-y-2 text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8CC63F]/10 text-[#8CC63F]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-signika">
            Admin Portal
          </h1>
          <p className="text-sm text-slate-400">
            Sign in to access your administrative dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 h-11 bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus:border-[#8CC63F] focus:ring-1 focus:ring-[#8CC63F] transition-all rounded-lg"
              />
            </div>
            {errors.email && (
              <span className="text-red-500 text-xs mt-1 block">{errors.email}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-300">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 h-11 bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus:border-[#8CC63F] focus:ring-1 focus:ring-[#8CC63F] transition-all rounded-lg"
              />
            </div>
            {errors.password && (
              <span className="text-red-500 text-xs mt-1 block">{errors.password}</span>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 bg-[#8CC63F] hover:bg-[#7cb337] active:scale-95 text-white font-bold tracking-wide rounded-lg shadow-lg shadow-[#8CC63F]/20 transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing In...
              </div>
            ) : (
              "Sign In to Dashboard"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
