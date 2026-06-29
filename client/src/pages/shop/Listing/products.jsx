import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { ChevronRight, ChevronLeft, Menu, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PriceFilter, CategoryFilter, FlavorFilter, StatusFilter, MobileFilters } from "@/components/ui/filters"
import { cn } from "@/lib/utils"
import ProductCard from "./product-card"
import { FiGrid } from "react-icons/fi"
import { BiSolidGrid } from "react-icons/bi"
import { TfiLayoutGrid4Alt } from "react-icons/tfi"
import { useDispatch, useSelector } from "react-redux"
import { getProducts, getCategories } from "@/store/shop-slice"
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "new-arrivals", label: "New Arrivals" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
]

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Initialize state from URL or defaults
  const [view, setView] = useState("grid-4")
  const [sort, setSort] = useState(searchParams.get("sort") || "featured")
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page")) || 1)
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)

  const initialCategories = useMemo(() => searchParams.get("categories")?.split(",").filter(Boolean) || [], [searchParams])
  const initialFlavors = useMemo(() => searchParams.get("flavors")?.split(",").filter(Boolean) || [], [searchParams])
  const initialStatuses = useMemo(() => searchParams.get("statuses")?.split(",").filter(Boolean) || [], [searchParams])
  const initialMinPrice = parseInt(searchParams.get("minPrice")) || 0
  const initialMaxPrice = parseInt(searchParams.get("maxPrice")) || 100000

  const [priceRange, setPriceRange] = useState([initialMinPrice, initialMaxPrice])
  const [selectedCategories, setSelectedCategories] = useState(initialCategories)
  const [selectedFlavors, setSelectedFlavors] = useState(initialFlavors)
  const [selectedStatuses, setSelectedStatuses] = useState(initialStatuses)
  const [filterTrigger, setFilterTrigger] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setView("grid-2")
      } else if (window.innerWidth < 1024) {
        setView("grid-3")
      } else {
        setView("grid-4")
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const dispatch = useDispatch()

  const { products, pagination, loading } = useSelector((state) => state.shop)

  useEffect(() => {
    dispatch(getCategories())
  }, [dispatch])

  useEffect(() => {
    const params = {}
    
    if (currentPage > 1) params.page = currentPage.toString()
    if (sort !== "featured") params.sort = sort
    if (debouncedSearchTerm) params.search = debouncedSearchTerm
    
    // Only add price if it's not the default range
    if (priceRange[0] !== 0) params.minPrice = priceRange[0].toString()
    if (priceRange[1] !== 100000) params.maxPrice = priceRange[1].toString()
    
    if (selectedCategories.length > 0) params.categories = selectedCategories.join(",")
    if (selectedFlavors.length > 0) params.flavors = selectedFlavors.join(",")
    if (selectedStatuses.length > 0) params.statuses = selectedStatuses.join(",")

    setSearchParams(params, { replace: true })
  }, [currentPage, sort, debouncedSearchTerm, filterTrigger, setSearchParams])

  useEffect(() => {
    dispatch(
      getProducts({
        page: currentPage,
        limit: 8,
        sort,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        categories: selectedCategories,
        flavors: selectedFlavors,
        statuses: selectedStatuses,
        search: debouncedSearchTerm,
      }),
    )
  }, [dispatch, currentPage, sort, debouncedSearchTerm, filterTrigger])

  const handleApplyFilters = () => {
    setFilterTrigger(prev => prev + 1);
  }

  const handlePriceFilter = () => {
    handleApplyFilters();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        <div className="container mx-auto !max-w-[1400px] px-4 lg:pt-15 md:pt-10 pt-4">
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 ">
            <div className="hidden lg:block space-y-8">
              <PriceFilter value={priceRange} onValueChange={setPriceRange} onFilter={handlePriceFilter} />
              <CategoryFilter
                selectedCategories={selectedCategories}
                onCategoryChange={(categoryId) => {
                  setSelectedCategories((prev) =>
                    prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
                  )
                }}
              />
              <FlavorFilter
                selectedFlavors={selectedFlavors}
                onFlavorChange={(flavorId) => {
                  setSelectedFlavors((prev) =>
                    prev.includes(flavorId) ? prev.filter((id) => id !== flavorId) : [...prev, flavorId],
                  )
                }}
              />
              <StatusFilter
                selectedStatuses={selectedStatuses}
                onStatusChange={(statusId) => {
                  setSelectedStatuses((prev) =>
                    prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId],
                  )
                }}
              />
              <Button 
                className="w-full bg-[#8CC63F] hover:bg-[#7AB32F] text-white font-medium py-6 rounded-xl"
                onClick={handleApplyFilters}
              >
                APPLY ALL FILTERS
              </Button>
            </div>

            {/* Products */}
            <div>
              {/* Toolbar */}
              <div className="px-0 py-3 lg:p-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-8 h-10 rounded-lg"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MobileFilters
                      priceRange={priceRange}
                      setPriceRange={setPriceRange}
                      selectedCategories={selectedCategories}
                      setSelectedCategories={setSelectedCategories}
                      selectedFlavors={selectedFlavors}
                      setSelectedFlavors={setSelectedFlavors}
                      selectedStatuses={selectedStatuses}
                      setSelectedStatuses={setSelectedStatuses}
                      handleApplyFilters={handleApplyFilters}
                    />
                    <Button
                      variant={view === "menu" ? "secondary" : "outline"}
                      size="icon"
                      onClick={() => setView("menu")}
                      className="!rounded-lg"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={view === "grid-2" ? "secondary" : "outline"}
                      size="icon"
                      onClick={() => setView("grid-2")}
                      className="grid place-items-center lg:hidden !rounded-lg"
                    >
                      <FiGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={view === "grid-3" ? "secondary" : "outline"}
                      size="icon"
                      onClick={() => setView("grid-3")}
                      className="grid place-items-center hidden sm:grid lg:hidden !rounded-lg"
                    >
                      <BiSolidGrid style={{ height: "20px", width: "20px" }} />
                    </Button>
                    <Button
                      variant={view === "grid-4" ? "secondary" : "outline"}
                      size="icon"
                      onClick={() => setView("grid-4")}
                      className="grid place-items-center hidden sm:grid !rounded-lg"
                    >
                      <TfiLayoutGrid4Alt style={{ height: "16px", width: "16px" }} />
                    </Button>
                    <Select value={sort} onValueChange={setSort}>
                      <SelectTrigger className="w-[180px] h-10 rounded-lg">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-4 w-48" />
                ) : (
                  <p className="text-sm text-gray-500">
                    Showing {pagination.start}-{pagination.end} of {pagination.total} results
                  </p>
                )}
              </div>

              {/* Product grid */}
              <div
                className={cn(
                  "grid gap-3 sm:gap-6 lg:pt-4 pt-2 lg:pl-4 pl-0",
                  view === "grid-4" && "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
                  view === "grid-3" && "grid-cols-2 md:grid-cols-3",
                  view === "grid-2" && "grid-cols-2",
                  view === "menu" && "grid-cols-1",
                )}
              >
                {loading
                  ? Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)
                  : products.map((product) => <ProductCard key={product._id} product={product} id={product._id} view={view} />)}
              </div>

              {/* Pagination */}
              {!loading && pagination.totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <nav className="flex items-center gap-2" aria-label="Pagination">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setCurrentPage(currentPage - 1)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: pagination.totalPages }).map((_, i) => (
                      <Button
                        key={i + 1}
                        variant={currentPage === i + 1 ? "default" : "outline"}
                        size="icon"
                        onClick={() => {
                          setCurrentPage(i + 1)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setCurrentPage(currentPage + 1)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      disabled={currentPage === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

