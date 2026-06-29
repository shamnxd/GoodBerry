import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import PropTypes from "prop-types";

export default function AdminTable({
  title,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  addButtonText,
  onAddClick,
  filterValue,
  onFilterChange,
  filterOptions = [],
  headers = [],
  data = [],
  renderRow,
  isLoading = false,
  pagination,
  filterElement,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm pb-4">
      {/* Table Top Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Search Input */}
            {onSearchChange !== undefined && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full h-10 border-slate-200 focus:border-slate-300 text-sm rounded-xl bg-white shadow-sm"
                />
              </div>
            )}

            {/* Custom Filter Select (Inline options mapping) */}
            {onFilterChange !== undefined && filterOptions.length > 0 && (
              <Select value={filterValue} onValueChange={onFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl bg-white border-slate-200 shadow-sm text-sm">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Alternative custom filter element (e.g. AddCategoryModal Dialog trigger) */}
            {filterElement}

            {/* Add Button */}
            {addButtonText && onAddClick && (
              <Button onClick={onAddClick} className="h-10 px-4 rounded-xl bg-[#8CC63F] hover:bg-[#7db238] text-white shadow-sm font-semibold text-sm transition-all duration-200 hover:scale-[1.02]">
                <Plus className="w-4 h-4 mr-2" />
                {addButtonText}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Table Area */}
      <div className="border rounded-lg mx-4 mt-4 overflow-x-auto">
        <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-slate-100">
                {headers.map((header, idx) => (
                  <TableHead key={idx} className={`h-12 text-slate-600 font-bold ${header.className || ""}`}>
                    {header.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <TableRow key={rIdx} className="h-16 border-b border-slate-100">
                    {headers.map((_, cIdx) => (
                      <TableCell key={cIdx} className="py-3 px-4">
                        <Skeleton className="h-5 w-full bg-slate-100" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headers.length} className="h-64 text-center text-slate-500 font-medium">
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => renderRow(item, index))
              )}
            </TableBody>
          </Table>
      </div>

      {/* Pagination Section */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-end mt-5 mr-4 gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="h-9 px-3 rounded-xl border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm font-medium text-slate-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="h-9 px-3 rounded-xl border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

AdminTable.propTypes = {
  title: PropTypes.string.isRequired,
  searchPlaceholder: PropTypes.string,
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  addButtonText: PropTypes.string,
  onAddClick: PropTypes.func,
  filterValue: PropTypes.string,
  onFilterChange: PropTypes.func,
  filterOptions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ),
  headers: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      className: PropTypes.string,
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  renderRow: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  pagination: PropTypes.shape({
    currentPage: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    onPageChange: PropTypes.func.isRequired,
  }),
  filterElement: PropTypes.node,
};
