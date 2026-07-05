import { Navigate, useLocation } from "react-router-dom";

function CheckAuth({ isAuthenticated, user, children }) {
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const isAdminPage = location.pathname.startsWith("/admin");
  const isAdminLogin = location.pathname === "/admin/login";

  // Redirect authenticated users away from auth/login pages
  const isAuthPage = location.pathname.includes("/auth") || isAdminLogin;
  if (isAuthenticated && isAuthPage) {
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" />;
    }
    return <Navigate to="/" />;
  }

  // Redirect unauthenticated users from protected shop routes
  const isProtectedShopRoute = location.pathname.includes("/shop/");
  if (!isAuthenticated && isProtectedShopRoute) {
    return <Navigate to="/auth/login" />;
  } 

  const isAccountPage = location.pathname.startsWith("/account");
  if (!isAuthenticated && isAccountPage) {
    return <Navigate to="/auth/login" />;
  }

  // Redirect unauthenticated users from admin pages to admin login
  if (!isAuthenticated && isAdminPage && !isAdminLogin) {
    return <Navigate to="/admin/login" />;
  }

  // Redirect non-admin authenticated users from admin pages to unauth-page
  if (isAuthenticated && isAdminPage && !isAdmin && !isAdminLogin) {
    return <Navigate to="/unauth-page" />;
  }

  // Prevent admin users from accessing shop routes
  if (isAuthenticated && isAdmin && location.pathname.startsWith("/shop")) {
    return <Navigate to="/admin/dashboard" />;
  }

  // Allow access to protected routes if conditions are met
  return children;
}

export default CheckAuth;
