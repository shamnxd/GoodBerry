import { lazy, Suspense } from 'react';
import BallScaleMultiple from "./components/ui/loading";
import { Route, Routes } from "react-router-dom";
import AuthLayout from "./components/auth/layout";
import AuthLogin from "./pages/auth/login";
import AuthRegister from "./pages/auth/register";
import ShopLayout from "./components/shop/layout";
import ShoppingHome from "./pages/shop/Home/home";
import ShoppingCheckout from "./pages/shop/cart/checkout";
import NotFound from "./pages/404";
import CheckAuth from "./components/common/check-auth";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { checkAuth } from "./store/auth-slice";
import ShoppingListing from "./pages/shop/Listing/products";
import ProductPage from "./pages/shop/Product/product-page";
import ForgetPassword from "./pages/auth/forget-password";
import VeryOtp from "./pages/auth/verify-otp";
import Account from "./pages/user";
import OrdersPage from "./pages/user/orders";
import WishlistPage from "./pages/user/wishlist";
import PasswordPage from "./pages/user/password";
import AddressPage from "./pages/user/address";
import AccountDetailPage from "./pages/user/account-detail"; 
import WalletPage from "./pages/user/wallet";
import AccountOverview from "./pages/user/account-overview";
import ReferAndEarn from "./pages/user/reffer";
import { fetchCart, syncCartAfterLogin } from "./store/shop-slice/cart-slice";
import ShoppingCart from "./pages/shop/cart/shopping-cart";
import OrderView from "./pages/shop/cart/view-order";
import ResetPassword from "./pages/auth/reset-password";
import SearchProduct from "./pages/shop/Listing/search-product";
import Unauthorized from './pages/unauth';
import UnderConstruction from './pages/construction';
import ContactPage from './pages/contact';
import AboutPage from './pages/about';

// Lazy load admin components
const AdminLayout = lazy(() => import("./components/admin/layout"));
const AdminDashboard = lazy(() => import("./pages/admin/dashboard"));
const CustomersPage = lazy(() => import("./pages/admin/customers"));
const AdminProducts = lazy(() => import("./pages/admin/ProductsCategorys/products"));
const ProductForm = lazy(() => import("./pages/admin/ProductsCategorys/product-form"));
const AdminCategorys = lazy(() => import("./pages/admin/ProductsCategorys/categorys"));
const AdminOrders = lazy(() => import("./pages/admin/order/orders"));
const OrderDetails = lazy(() => import("./pages/admin/order/order-details"));
const AdminFeatures = lazy(() => import("./pages/admin/features"));
const CouponManagement = lazy(() => import("./pages/admin/coupon"));
const SalesReportPage = lazy(() => import("./pages/admin/sales-report"));
const AdminLogin = lazy(() => import("./pages/admin/admin-login"));

function App() {
  const { isAuthenticated, user, isLoading } = useSelector(
    (state) => state.auth
  );
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);
  
  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch, user]);

  useEffect(() => {
    if (user) {
      dispatch(syncCartAfterLogin());
    }
  }, [dispatch, user]);

  if (isLoading)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 ">
        <BallScaleMultiple />
      </div>
    );

  return (
    <div className="flex flex-col overflow-hidden bg-white">
      <Suspense 
        fallback={
          <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <BallScaleMultiple />
          </div>
        }
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<ShopLayout />}>
            <Route index element={<ShoppingHome />} /> {/* Home Page */}
            <Route path='contact' element={<ContactPage />} />
            <Route path='about' element={<AboutPage />} />
            <Route path="shop" element={<ShoppingListing />} />
            <Route path="shop/product/:id" element={<ProductPage />} />
            <Route path="search" element={<SearchProduct/>}/>
          </Route>

          {/* Protected Shop Routes */}
          <Route
            path="/shop"
            element={
              <CheckAuth isAuthenticated={isAuthenticated} user={user}>
                <ShopLayout />
              </CheckAuth>
            }
          >
            <Route path="cart">
              <Route index element={<ShoppingCart />} />
              <Route path="checkout" element={<ShoppingCheckout />} />
            </Route>
          </Route>

          <Route
            path="/account"
            element={
              <CheckAuth isAuthenticated={isAuthenticated} user={user}>
                <ShopLayout />
              </CheckAuth>
            }
          >
            <Route element={<Account />}>
              <Route index element={<AccountOverview />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="details" element={<AccountDetailPage />} />
              <Route path="address" element={<AddressPage />} />
              <Route path="password" element={<PasswordPage />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="refer" element={<ReferAndEarn />} />
            </Route>
            <Route path="order/:id" element={<OrderView />} />
          </Route>

          {/* Auth Routes */}
          <Route
            path="/auth"
            element={
              <CheckAuth isAuthenticated={isAuthenticated} user={user}>
                <AuthLayout />
              </CheckAuth>
            }
          >
            <Route index element={<AuthLogin />} />
            <Route path="login" element={<AuthLogin />} />
            <Route path="register" element={<AuthRegister />} />
            <Route path="verify-email" element={<VeryOtp />} />
            <Route path="login/forgot-password" element={<ForgetPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
          </Route>

          <Route
            path="/admin/login"
            element={
              <CheckAuth isAuthenticated={isAuthenticated} user={user}>
                <AdminLogin />
              </CheckAuth>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <CheckAuth isAuthenticated={isAuthenticated} user={user}>
                <AdminLayout />
              </CheckAuth>
            }
            >
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="reviews" element={<UnderConstruction />} />
            <Route path="settings" element={<UnderConstruction />} />
            <Route path="banner" element={<UnderConstruction />} />
            <Route path="products">
              <Route index element={<AdminProducts />} />
              <Route path="add" element={<ProductForm />} />
              <Route path="edit/:id" element={<ProductForm />} />
            </Route>
            <Route path="categorys" element={<AdminCategorys />} />
            <Route path="orders">
              <Route index element={<AdminOrders />} />
              <Route path=":orderId" element={<OrderDetails />} />
            </Route>
            <Route path="features" element={<AdminFeatures />} />
            <Route path="coupons" element={<CouponManagement />} />
            <Route path="sales-report" element={<SalesReportPage />} />
          </Route>

          <Route path="/unauth-page" element={<Unauthorized />} />
          {/* Catch-All Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;