import CommonForm from "@/components/common/form";
import { Button } from "@/components/ui/button";
import { loginFormControls } from "@/config";
import { useToast } from "@/hooks/use-toast";
import { loginUser, logoutUser } from "@/store/auth-slice";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdAdminPanelSettings } from "react-icons/md";

const initialState = {
  email: "",
  password: "",
};

const adminDemo = {
  email: "admin@gmail.com",
  password: "Admin@1234",
};

function AdminLoginPage() {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const dispatch = useDispatch();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = (credentials) => {
    dispatch(loginUser(credentials)).then((data) => {
      const payload = data?.payload;
      if (payload?.success) {
        if (payload?.user?.role === "admin") {
          toast({ title: payload?.message || "Welcome, Admin!" });
          navigate("/admin/dashboard");
        } else {
          // Immediately destroy the session — normal users must not stay logged in here
          dispatch(logoutUser()).then(() => {
            toast({
              title: "Access Denied",
              description: "This portal is for administrators only. Please use the regular login page.",
              variant: "destructive",
            });
          });
        }
      } else {
        toast({
          title: "Invalid Credentials",
          description: "The email or password you entered is incorrect.",
          variant: "destructive",
        });
      }
    });
  };

  function onSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;
    handleLogin(formData);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-[350px] space-y-6">

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold font-signika text-gray-900">Admin Login</h1>
          <p className="text-sm text-gray-500">Sign in to access the admin dashboard</p>
        </div>

        {/* Form */}
        <CommonForm
          formControls={loginFormControls}
          buttonText={"Sign In"}
          formData={formData}
          setFormData={setFormData}
          onSubmit={onSubmit}
          formType="admin-login"
          errors={errors}
        />

        {/* Demo Admin button */}
        <div className="flex">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleLogin(adminDemo)}
          >
            <MdAdminPanelSettings style={{ width: "20px", height: "20px" }} />
            Demo Admin
          </Button>
        </div>

      </div>
    </div>
  );
}

export default AdminLoginPage;
