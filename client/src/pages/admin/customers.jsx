import { useEffect, useState, useCallback, useRef } from "react";
import MESSAGES from '../../constants/messages';
import AdminTable from "@/components/admin/AdminTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Search,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, updateUserStatus } from "@/store/admin-slice";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function CustomersPage() {
  const dispatch = useDispatch();
  const { users, isLoading, totalPages, currentPage } = useSelector(
    (state) => state.admin
  );
  const searchInputRef = useRef(null);
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage] = useState(5);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = useCallback(
    (page = 1) => {
      dispatch(
        fetchUsers({
          page,
          limit: itemsPerPage,
          search: debouncedSearch,
          status: statusFilter,
        })
      );
    },
    [dispatch, debouncedSearch, statusFilter, itemsPerPage]
  );

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
    loadUsers(1);
  }, [debouncedSearch, statusFilter, loadUsers]);

  const handleBlockUnblock = async () => {
    if (selectedUser) {
      const isBlocked = !selectedUser.isBlocked;
      const userId = selectedUser._id;
      dispatch(updateUserStatus({ id: userId, isBlocked }))
        .then(() => {
          toast({
            title: `User ${isBlocked ? "blocked" : "unblocked"} successfully`,
          });
        })
        .catch(() => {
          toast({ title: MESSAGES.SOMETHING_WENT_WRONG, variant: "destructive" });
        });
      setSelectedUser(null);
    }
  };

  const handlePageChange = (newPage) => {
    loadUsers(newPage);
  };

  return (
    <div className="p-2 md:p-4 space-y-4">
      <AdminTable
        title="Customers"
        searchPlaceholder="Search customers..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={[
          { label: "All Statuses", value: "all" },
          { label: "Active", value: "active" },
          { label: "Blocked", value: "blocked" }
        ]}
        headers={[
          { label: "No", className: "w-[80px] pl-6" },
          { label: "Name" },
          { label: "Email" },
          { label: "Phone" },
          { label: "Join Date" },
          { label: "Orders" },
          { label: "Status" },
          { label: "Actions", className: "text-right pr-6" }
        ]}
        data={users}
        isLoading={isLoading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: handlePageChange
        }}
        renderRow={(customer, index) => (
          <TableRow key={customer._id} className="h-16 border-b border-slate-100">
            <TableCell className="py-3 px-4 pl-6 font-medium text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
            <TableCell className="py-3 px-4 font-semibold text-slate-800">
              {customer.username}
            </TableCell>
            <TableCell className="py-3 px-4 text-slate-600">{customer.email}</TableCell>
            <TableCell className="py-3 px-4 text-slate-500">{customer.phone || "Not Added"}</TableCell>
            <TableCell className="py-3 px-4 text-slate-500">
              {new Date(customer.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="py-3 px-4">
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  customer.orderCount
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {customer.orderCount ? customer.orderCount : "0"}
              </span>
            </TableCell>
            <TableCell className="py-3 px-4">
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  customer.isBlocked
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {customer.isBlocked ? "Blocked" : "Active"}
              </span>
            </TableCell>
            <TableCell className="py-3 px-4 text-right pr-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setSelectedUser(customer)}
                    className={
                      customer.isBlocked
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {customer.isBlocked ? "Unblock" : "Block"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        )}
      />

      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogTrigger />
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="mb-3">Confirm Action</DialogTitle>
              <DialogDescription>
                Are you sure you want to {selectedUser.isBlocked ? 'unblock' : 'block'} this user?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>No, keep it</Button>
              <Button variant="default" onClick={handleBlockUnblock}>Yes, 
                {selectedUser.isBlocked ? ' unblock' : ' block'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
