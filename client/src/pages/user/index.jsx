import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Heart,
  MapPin,
  Key,
  User,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Award,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '@/store/auth-slice';

const Account = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const isRoot = location.pathname === '/account' || location.pathname === '/account/';

  const menuItems = [
    { icon: ShoppingCart, text: 'My Orders', path: '/account/orders' },
    { icon: User, text: 'Account Details', path: '/account/details' },
    { icon: Key, text: 'Change Password', path: '/account/password' },
    { icon: MapPin, text: 'Manage Address', path: '/account/address' },
    { icon: Wallet, text: 'Wallet', path: '/account/wallet' },
    { icon: Award, text: 'Refer & Earn', path: '/account/refer' },
    { icon: Heart, text: 'Wishlist', path: '/account/wishlist' },
    { icon: LogOut, text: 'Logout', path: 'logout' },
  ];

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => navigate('/'));
  };

  return (
    <div className="container mx-auto !px-3 !py-6 md:py-10 max-w-[1400px] min-h-[calc(100vh-200px)]">
      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* Sidebar - Hidden on mobile when viewing sub-pages */}
        <div className={`w-full lg:w-80 ${!isRoot ? 'hidden lg:block' : 'block'}`}>
          <div className="overflow-hidden bg-white border border-gray-100 rounded-lg shadow-sm">
            {/* User Hello Sidebar Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Welcome back,</span>
              <h2 className="text-xl font-extrabold text-[#8CC63F] font-signika mt-0.5">
                Hello, {user?.username || user?.userName || "User"}
              </h2>
            </div>
            
            <div className="flex flex-col">
              {menuItems.map((item) => (
                item.path === 'logout' ? (
                  <button
                    key={item.text}
                    onClick={handleLogout}
                    className="flex items-center justify-between w-full px-5 py-5 text-sm font-black text-red-600 hover:bg-red-50 transition-all uppercase font-signika border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <item.icon className="h-5 w-5" />
                      {item.text}
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50 lg:hidden" />
                  </button>
                ) : (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `
                      flex items-center justify-between w-full px-5 py-5 lg:py-4 rounded-md text-sm font-black transition-all uppercase font-signika border-b border-gray-50 last:border-0
                      ${isActive 
                        ? 'bg-[#8CC63F]/10 text-[#8CC63F] lg:border-l-4 border-[#8CC63F]' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon className={`h-5 w-5 ${item.path.includes('details') ? 'stroke-[1]' : ''}`} />
                      {item.text}
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50 lg:hidden" />
                  </NavLink>
                )
              ))}
            </div>
          </div>
        </div>
        
        {/* Content Area - Full width on mobile when viewing sub-pages */}
        <div className={`flex-1 min-w-0 ${isRoot ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white p-0 lg:px-0 lg:py-0 min-h-[600px] relative">
            {/* Back Button for mobile sub-pages */}
            {!isRoot && (
              <Link 
                to="/account" 
                className="lg:hidden flex items-center gap-2 text-[#8CC63F] px-2 font-black text-sm mb-4 lg:mb-6 uppercase font-signika"
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </Link>
            )}
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;