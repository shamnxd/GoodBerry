import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";

const initialState = {
    products: [],
    loading: false,
    categories : [],
    featuredProds: [],
    pagination : {},
    product : {},
    recomentedProds : [],
    pflavors: [],
    wishlist: [], 
    coupon: {},
    error : null
};



export const featuredProducts = createAsyncThunk(
    "shop/featuredProducts",
    async (_, thunkAPI) => {
        try {
            const response = await api.get(`${API_ENDPOINTS.COMMON.FEATURED}`);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue({ error: error.message });
        }    
    }
);


export const getProducts = createAsyncThunk(
    "shop/getProducts",
    async ({ page, limit, sort = 'featured', search = '', minPrice = 0, maxPrice = 100000, categories = '', flavors = '', statuses = ''}) => {
      try {
        const response = await api.get(
          `${API_ENDPOINTS.COMMON.PRODUCTS}?page=${page}&limit=${limit}&sort=${sort}&search=${search}&minPrice=${minPrice}&maxPrice=${maxPrice}&categories=${categories}&flavors=${flavors}&statuses=${statuses}`
        );
        return response.data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    }
  );

export const getSingleProduct = createAsyncThunk(
    "shop/getSingleProduct",
    async (id) => {
      const response = await api.get(`${API_ENDPOINTS.COMMON.PRODUCT(id)}`);
      return response.data;
    }
)

export const getWishlist = createAsyncThunk(
    "wishlist/getWishlist",
    async (_, thunkAPI) => {
        try {
            const response = await api.get(`${API_ENDPOINTS.USER.WISHLIST}`, { withCredentials: true });
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue({ error: error.message });
        }
    }
);

export const addToWishlist = createAsyncThunk(
    "wishlist/addToWishlist",
    async ({productId, variantId}, thunkAPI) => {
        try {
            const response = await api.post(`${API_ENDPOINTS.USER.WISHLIST}`, { productId, variantId }, { withCredentials: true });
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue({ error: error.message });
        }
    }
);

export const removeFromWishlist = createAsyncThunk(
    "wishlist/removeFromWishlist",
    async ({ productId, variantId }, thunkAPI) => {
        try {
            const response = await api.delete(`${API_ENDPOINTS.USER.WISHLIST_ITEM(productId, variantId)}`, { withCredentials: true });
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue({ error: error.message });
        }
    }
);

export const getCategories = createAsyncThunk(
    "shop/getCategories",
    async () => {
      const response = await api.get(`${API_ENDPOINTS.COMMON.CATEGORIES}`, { withCredentials: true });
      return response.data;
    }
  );

export const applyCoupon = createAsyncThunk(
  "shop/applyCoupon",
  async ({ code, total }, thunkAPI) => {
    try {
      const response = await api.post(`${API_ENDPOINTS.USER.APPLY_COUPON}`, { code, total }, { withCredentials: true });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue({ error: error.message });
    }
  }
);

export const checkCoupon = createAsyncThunk(
  "shop/checkCoupon",
  async ({ code, total }, thunkAPI) => {
    try {
      const response = await api.post(`${API_ENDPOINTS.USER.CHECK_COUPON}`, { code, total }, { withCredentials: true });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue({ error: error.message });
    }
  }
);

const shopSlice = createSlice({
    name: "shop",
    initialState,
    reducers: {},
    extraReducers: (builder) => {        
        builder.addCase(featuredProducts.fulfilled, (state, action) => {
            state.featuredProds = action.payload?.data || [];
            state.product = {};
            state.pflavors = [];
            state.recomentedProds = []; 
        })

        .addCase(getProducts.pending, (state) => {
          state.loading = true;
        })
        .addCase(getProducts.fulfilled, (state, action) => {
            state.loading = false
            state.products = action.payload?.data || [];
            state.pagination = action.payload?.pagination || {};
            state.product = {};
            state.pflavors = [];
            state.recomentedProds = []; 
        })
        .addCase(getSingleProduct.pending, (state) => {
            state.product = null;
            state.pflavors = null;
            state.recomentedProds = null; 
            state.error = null;
        })

        .addCase(getSingleProduct.fulfilled, (state, action) => {
            state.product = action.payload?.product || null;
            state.recomentedProds = action.payload?.recommendedProducts || [];
            state.pflavors = action.payload?.variantsFormatted || [];
            state.error = null;
        })

        .addCase(getSingleProduct.rejected, (state) => {
            state.product = null;
            state.pflavors = null;
            state.recomentedProds = null; 
            state.error = "Product not found";
        })

        .addCase(getWishlist.rejected, (state) => {
          state.wishlist = [];
        })
        .addCase(getWishlist.fulfilled, (state, action) => {
            state.wishlist = action.payload?.data || [];
        })
        .addCase(addToWishlist.fulfilled, (state, action) => {
            if (action.payload?.data) {
                state.wishlist.push(action.payload.data);
            }
        })
        .addCase(removeFromWishlist.fulfilled, (state, action) => {
            state.wishlist = (state.wishlist || []).filter(item => item.productId !== action.meta.arg.productId || item.variantId !== action.meta.arg.variantId);
        })

        .addCase(getCategories.fulfilled, (state, action) => {
            state.categories = action.payload?.data || action.payload?.categories || [];
        })
        .addCase(applyCoupon.fulfilled, (state, action) => {
            state.coupon = action.payload;
        })
        .addCase(checkCoupon.fulfilled, (state, action) => {
            state.coupon = action.payload;
        })
    },
});

export default shopSlice.reducer;
