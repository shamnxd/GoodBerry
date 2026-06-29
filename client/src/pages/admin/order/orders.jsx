import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, ChevronRight, ChevronLeft, Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllOrders } from '@/store/admin-slice/order-slice';
import AdminTable from '@/components/admin/AdminTable';

function AdminOrders() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { orders, isLoading, error, currentPage, totalPages } = useSelector((state) => state.adminOrder);
  const searchInputRef = useRef(null);
  
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const loadOrders = useCallback((page = 1) => {
    dispatch(fetchAllOrders({ 
      page, 
      limit: 5, 
      search: debouncedSearch, 
      status: statusFilter,
    }));
  }, [dispatch, debouncedSearch, statusFilter]);

  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  useEffect(() => {
    loadOrders(1);
  }, [debouncedSearch, statusFilter, loadOrders]);

  const handleStatusChange = (value) => {
    setStatusFilter(value);
  };

  const handlePageChange = (newPage) => {
    loadOrders(newPage);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'shipped': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'delivered': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'returned': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'failed' : return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const hasReturnRequest = (items) => {
    return items.some(item => item.returnRequest);
  };

  if (error) {
    return <div className="flex items-center justify-center h-screen">Error fetching orders: {error}</div>;
  }

  return (
    <div className="p-4 space-y-8">
      <AdminTable
        title="Orders"
        searchPlaceholder="Search by Order ID or Customer Name"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        filterValue={statusFilter}
        onFilterChange={handleStatusChange}
        filterOptions={[
          { label: "All Statuses", value: "all" },
          { label: "Processing", value: "processing" },
          { label: "Shipped", value: "shipped" },
          { label: "Delivered", value: "delivered" },
          { label: "Cancelled", value: "cancelled" },
          { label: "Returned", value: "returned" },
          { label: "Failed", value: "failed" }
        ]}
        headers={[
          { label: "No", className: "w-[80px] pl-6" },
          { label: "Order ID" },
          { label: "Customer Name" },
          { label: "Order Date" },
          { label: "Status" },
          { label: "Total Amount" },
          { label: "Actions", className: "text-right pr-6" }
        ]}
        data={orders}
        isLoading={isLoading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: handlePageChange
        }}
        renderRow={(order, index) => (
          <TableRow key={order._id} className="h-16 border-b border-slate-100">
            <TableCell className="py-3 px-4 pl-6 font-medium text-slate-500">{(currentPage - 1) * 5 + index + 1}</TableCell>
            <TableCell className="py-3 px-4 font-semibold text-slate-800">#{order.orderId}</TableCell>
            <TableCell className="py-3 px-4 text-slate-700">{order?.userId?.username || order?.addressId?.name || "N/A"}</TableCell>
            <TableCell className="py-3 px-4 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
            <TableCell className="py-3 px-4">
              {hasReturnRequest(order.items) && (
                <>
                  <Badge className="bg-yellow-100 mb-1 text-yellow-800 hover:bg-yellow-200">
                    Return rq
                  </Badge>
                  <br />
                </>
              )} 
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </TableCell>
            <TableCell className="py-3 px-4 font-bold text-slate-800">₹{order.total.toFixed(2)}</TableCell>
            <TableCell className="py-3 px-4 text-right pr-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/admin/orders/${order.orderId}`)}
                className="rounded-lg text-xs"
              >
                View Details
              </Button>
            </TableCell>
          </TableRow>
        )}
      />
    </div>
  );
}

export default AdminOrders;