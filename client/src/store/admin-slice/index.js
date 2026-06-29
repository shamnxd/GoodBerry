import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";

const initialState = {
  users: [],
  categories: [],
  products: [],
  data: {
    totalRevenue: { value: 0, change: 0 },
    newCustomers: { value: 0, change: 0 },
    totalSales: { value: 0, change: 0 },
    totalCancelled: { value: 0, change: 0 },
    recentSales: [],
    overviewData: [],
    top10Products: [],
    top10Categories: []
  },
  status: 'idle',
};



// Thunk to Fetch Users
export const fetchUsers = createAsyncThunk(
  "admin/fetchUsers",
  async ({ page = 1, limit = 5, search = '', status = 'all' } = {}, thunkAPI) => {
    try {
      const response = await api.get(`${API_ENDPOINTS.ADMIN.USERS}`, {
        params: { page, limit, search, status },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Thunk to Update Block/Unblock Status
export const updateUserStatus = createAsyncThunk(
  "admin/updateStatus",
  async ({ id, isBlocked }, thunkAPI) => {
    try {
      await api.patch(
        `${API_ENDPOINTS.ADMIN.USERS_BLOCK(id)}`,
        { isBlocked },
        { withCredentials: true }
      );
      return { id, isBlocked };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Failed to update status");
    }
  }
);

export const getAllCategories = createAsyncThunk(
  "admin/getAllCategories",
  async (params = {}, thunkAPI) => {
    try {
      const response = await api.get(`${API_ENDPOINTS.ADMIN.CATEGORIES}`,
      {
        params,
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);


export const updateCategory = createAsyncThunk(
  "admin/updateCategory",
  async ({ id, name, status, image }, thunkAPI) => {
    try {
      const response = await api.put(
        `${API_ENDPOINTS.ADMIN.CATEGORY(id)}`,
        { name, status, image },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Failed to update category");
    }
  }
)


export const addCategory = createAsyncThunk(
  "admin/addCategory",

  async (newCategory) => {
    const response = await api.post(
      `${API_ENDPOINTS.ADMIN.CATEGORIES}`,
      newCategory,
      {
        withCredentials: true,
      }
    );
    return response.data;
  }
);

export const addProduct = createAsyncThunk(
  "admin/addProduct",
  async (formData) => {
    const response = await api.post(
      `${API_ENDPOINTS.ADMIN.PRODUCTS}`,
      formData,
      {
        withCredentials: true,
      }
    );
    return response.data;
  }
);

export const editProduct = createAsyncThunk(
  'admin/editProduct',
  async (formData) => {
      const response = await api.put(`${API_ENDPOINTS.ADMIN.PRODUCT(formData.id)}`, 
        formData,
        {
          withCredentials: true,
        }
      );
      return response.data;
    }
);


export const getProductDetails = createAsyncThunk(
  "admin/getProductDetails",
  async (id) => {
    const response = await api.get(`${API_ENDPOINTS.ADMIN.PRODUCT(id)}`, {
      withCredentials: true,
    });
    return response.data;
  }
);

export const uploadToCloudinary = createAsyncThunk(
  "admin/uploadToCloudinary",
  async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await api.post(API_ENDPOINTS.COMMON.UPLOAD, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }
);

export const unlistProduct = createAsyncThunk(
  "admin/unlistProduct",
  async (id) => {
    const response = await api.patch(
      `${API_ENDPOINTS.ADMIN.PRODUCT(id)}`,{},
      {
        withCredentials: true,
      }
    );
    return response.data;
  }
)

// Thunk to Fetch Products
export const fetchProducts = createAsyncThunk(
  "admin/fetchProducts",
  async ({ page = 1, limit = 5, search = '', status = 'all' } = {}, thunkAPI) => {
    try {
      const response = await api.get(`${API_ENDPOINTS.ADMIN.PRODUCTS}`, {
        params: { page, limit, search, status },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchDashboardData',
  async (timeRange = 'weekly') => {
    const response = await api.get(`${API_ENDPOINTS.ADMIN.DASHBOARD}?timeRange=${timeRange}`, {
      withCredentials: true
    });
    return response.data;
  }
);

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    setUsers(state, action) {
      state.users = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload.users;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
      })
      .addCase(getAllCategories.fulfilled, (state, action) => {
        state.categories = action.payload.categories;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        if (action.payload && action.payload.success) {
          state.categories.push(action.payload.category);
        } else {
          console.error("Failed to add category:", action.payload?.message || "Unknown error");
        }
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        const { id, isBlocked } = action.payload;
        const user = state.users.find((user) => user._id === id);
        if (user) {
          user.isBlocked = isBlocked; 
        }
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const updatedCategory = action.payload.category;
        const index = state.categories.findIndex((cat) => cat._id === updatedCategory._id);
        if (index !== -1) {
          state.categories[index] = updatedCategory;
        }
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        if (action.payload && action.payload.success) {
          state.products.push(action.payload.product);
        }
      })
      .addCase(unlistProduct.fulfilled, (state, action) => {
        const { productId }= action.payload;
        state.products = state.products.map(product =>
          product._id === productId ? { ...product, unListed: !product.unListed } : product
        );
      })
      .addCase(editProduct.fulfilled, (state, action) => {
        const { productId }= action.payload;
        state.products = state.products.map(product =>
          product._id === productId ? { ...product, ...action.payload.product } : product
        );
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.products = action.payload.products;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
      })
      .addCase(fetchDashboardData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = 'success';
      })
      .addCase(fetchDashboardData.rejected, (state) => {
        state.status = 'failed';
      });

  },
});

export const { setUsers } = adminSlice.actions;
export default adminSlice.reducer;
