import {
  LayoutDashboard,
  Package,
  Users,
  Star,
  Settings,
  Ticket,
  Image,
  ChartNoAxesCombined,
  Tags,
  BaggageClaim,
  ScrollText,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";

const adminSidebarMenuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: <LayoutDashboard />,
  },
  {
    id: "products",
    label: "Products",
    path: "/admin/products",
    icon: <BaggageClaim />,
  },
  {
    id: "categorys",
    label: "Categorys",
    path: "/admin/categorys",
    icon: <Tags />,
  },
  {
    id: "orders",
    label: "Orders",
    path: "/admin/orders",
    icon: <Package />,
  },
  {
    id: "customers",
    label: "Customers",
    path: "/admin/customers",
    icon: <Users />,
  },
  {
    id: "reviews",
    label: "Reviews",
    path: "/admin/reviews",
    icon: <Star />,
  },
  {
    id: "settings",
    label: "Settings",
    path: "/admin/settings",
    icon: <Settings />,
  },
  {
    id: "sales-report",
    label: "Sales Report",
    path: "/admin/sales-report",
    icon: <ScrollText />,
  },
  {
    id: "coupons",
    label: "Coupons",
    path: "/admin/coupons",
    icon: <Ticket />,
  },
  {
    id: "banner",
    label: "Banner",
    path: "/admin/banner",
    icon: <Image />,
  },
];

const MenuItems = ({ setOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeItem = adminSidebarMenuItems.find(item => location.pathname.includes(item.path))?.id || "dashboard";

  return (
    <nav className="mt-6 flex flex-col gap-2 px-4">
      {adminSidebarMenuItems.map((menuItem) => (
        <div
          key={menuItem.id}
          onClick={() => {
            navigate(menuItem.path);
            if (setOpen) setOpen(false);
          }}
          className={`group flex cursor-pointer text-sm font-medium items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
            activeItem === menuItem.id 
              ? "bg-[#8CC63F] text-white shadow-md shadow-[#8CC63F]/20" 
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <div className={`transition-colors duration-200 ${activeItem === menuItem.id ? "text-white" : "text-slate-400 group-hover:text-white"}`}>
            {menuItem.icon}
          </div>
          <span>{menuItem.label}</span>
        </div>
      ))}
    </nav>
  );
};

function AdminSideBar({ open, setOpen }) {
  const navigate = useNavigate();

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-slate-900 border-r border-slate-800 text-white">
          <div className="flex flex-col h-full py-6 overflow-y-auto custom-scrollbar">
            <div className="px-6 mb-6">
              <div
                onClick={() => {
                  navigate("/admin/dashboard");
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-3 transition-transform hover:scale-105"
              >
                <ChartNoAxesCombined className="text-[#8CC63F]" size={32} />
                <h1 className="text-2xl font-black tracking-tight text-white">Admin Panel</h1>
              </div>
            </div>
            <MenuItems setOpen={setOpen} />
          </div>
        </SheetContent>
      </Sheet>
      <aside className="hidden lg:flex w-[250px] flex-col border-r border-slate-800 bg-slate-900 fixed inset-y-0 left-0 z-50 shadow-lg text-white">
        <div className="h-20 flex items-center px-8 border-b border-slate-800">
          <div
            onClick={() => navigate("/admin/dashboard")}
            className="flex cursor-pointer items-center gap-3 transition-transform hover:scale-105"
          >
            <ChartNoAxesCombined className="text-[#8CC63F]" size={28} />
            <h1 className="text-xl font-black tracking-tight text-white">Admin Panel</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          <MenuItems />
        </div>
      </aside>
    </>
  );
}

export default AdminSideBar;
