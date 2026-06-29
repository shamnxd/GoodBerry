import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";




export const fetchCoupons = createAsyncThunk('coupons/fetchCoupons', async ({ page = 1, search = '', status = 'all', limit = 5 } = {}) => {
  const response = await api.get(`${API_ENDPOINTS.ADMIN.COUPONS}?page=${page}&search=${search}&status=${status}&limit=${limit}`, { withCredentials: true });
  return response.data;
});

export const addCoupon = createAsyncThunk('coupons/addCoupon', async (couponData, { dispatch }) => {
  const response = await api.post(API_ENDPOINTS.ADMIN.COUPONS, couponData, { withCredentials: true });
  dispatch(fetchCoupons({ page: 1, search: '' }));
  return response.data;
});

export const updateCoupon = createAsyncThunk('coupons/updateCoupon', async ({ id, couponData }, { dispatch }) => {
  const response = await api.put(API_ENDPOINTS.ADMIN.COUPON(id), couponData, { withCredentials: true });
  dispatch(fetchCoupons({ page: 1, search: '' }));
  return response.data;
});

export const toggleCouponStatus = createAsyncThunk('coupons/toggleCouponStatus', async (id, { dispatch }) => {
  const response = await api.patch(API_ENDPOINTS.ADMIN.COUPON_TOGGLE(id), {}, { withCredentials: true });
  dispatch(fetchCoupons({ page: 1, search: '' }));
  return response.data;
});

const couponSlice = createSlice({
  name: 'coupons',
  initialState: {
    coupons: [],
    totalPages: 1,
    currentPage: 1,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoupons.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.coupons = action.payload.coupons;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
      })
      .addCase(fetchCoupons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(addCoupon.fulfilled, (state, action) => {
        state.coupons.push(action.payload.coupon);
      })
      .addCase(updateCoupon.fulfilled, (state, action) => {
        const index = state.coupons.findIndex(coupon => coupon._id === action.payload.coupon._id);
        if (index !== -1) {
          state.coupons[index] = action.payload.coupon;
        }
      })
      .addCase(toggleCouponStatus.fulfilled, (state, action) => {
        const index = state.coupons.findIndex(coupon => coupon._id === action.payload.coupon._id);
        if (index !== -1) {
          state.coupons[index] = action.payload.coupon;
        }
      });
  },
});

export default couponSlice.reducer;
