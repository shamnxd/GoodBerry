import { AlignJustify, LogOut, Search, User } from "lucide-react";
import { Button } from "../ui/button";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "@/store/auth-slice";
import { Input } from "../ui/input";
import { useLocation } from "react-router-dom";

function AdminHeader({ setOpen }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const getHeaderTitle = (pathname) => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length <= 1) return "Dashboard";
    
    const section = parts[1];
    
    if (section === "products") {
      if (parts.includes("edit")) return "Edit Product";
      if (parts.includes("add")) return "Add Product";
      return "Products";
    }
    if (section === "orders") {
      if (parts.length > 2) return "Order Details";
      return "Orders";
    }
    if (section === "categorys" || section === "categories") {
      return "Categories";
    }
    if (section === "customers") {
      return "Customers";
    }
    if (section === "coupon" || section === "coupons") {
      return "Coupons";
    }
    if (section === "dashboard") {
      return "Dashboard";
    }

    const lastPart = parts[parts.length - 1];
    const isId = /^[0-9a-fA-F]{24}$/.test(lastPart) || !isNaN(lastPart);
    const displayPart = isId && parts.length > 2 ? parts[parts.length - 2] : lastPart;
    
    return displayPart.charAt(0).toUpperCase() + displayPart.slice(1);
  };

  const title = getHeaderTitle(location.pathname);

  function handleLogout() {
    dispatch(logoutUser());
  }

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[250px] h-20 flex items-center justify-between px-6 lg:px-10 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 z-40">
      <div className="flex items-center gap-4">
        <Button onClick={() => setOpen(true)} className="lg:hidden" variant="ghost" size="icon">
          <AlignJustify className="h-6 w-6 text-slate-700" />
        </Button>
        <div className="hidden md:block">
           <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4 lg:gap-6">
        <div className="flex items-center gap-2 lg:gap-4 border-l border-slate-200 pl-4 lg:pl-6">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-900">{user?.userName || "Admin User"}</span>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{user?.role || "Administrator"}</span>
          </div>
          
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#8CC63F] border border-slate-200/50 shadow-sm">
             <User size={20} />
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
