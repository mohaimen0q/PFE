"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  Trash2,
  Filter,
  Layers,
  MapPin,
  Truck,
  History,
  CheckCircle,
  XCircle,
  TrendingDown,
  DollarSign,
  CalendarDays,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { inventoryApi } from "@/lib/api/inventory"
import type { SparePartResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function InventoryPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { t } = useI18n()
  const [parts, setParts] = useState<SparePartResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25
  useEffect(() => {
    setCurrentPage(1)
  }, [search, categoryFilter])

  const [valuation, setValuation] = useState(0)
  const [pendingRestocks, setPendingRestocks] = useState<any[]>([])
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false)
  const [selectedPartForRestock, setSelectedPartForRestock] = useState<number | null>(null)
  const [restockQty, setRestockQty] = useState(10)

  // Manager specific states
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<any | null>(null)
  const [approvalQty, setApprovalQty] = useState<number>(0)

  const [isDirectAddDialogOpen, setIsDirectAddDialogOpen] = useState(false)
  const [selectedPartForDirectAdd, setSelectedPartForDirectAdd] = useState<number | null>(null)
  const [directAddQty, setDirectAddQty] = useState(10)

  const [newPart, setNewPart] = useState({
    name: "",
    sku: "",
    category: "",
    quantityInStock: 0,
    minStockLevel: 5,
    unitCost: 0,
    location: "",
    supplier: ""
  })

  const loadData = async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const [partsData, valuationData, pendingData] = await Promise.all([
        inventoryApi.list(),
        inventoryApi.getValuation(),
        inventoryApi.getPendingRestocks()
      ])
      setParts(partsData)
      setValuation(valuationData)
      setPendingRestocks(pendingData)
    } catch (error) {
      console.error("Failed to load inventory data", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRestock = async () => {
    if (!selectedPartForRestock || !user?.id) return
    try {
      await inventoryApi.requestRestock(selectedPartForRestock, restockQty, user.id)
      setIsRestockDialogOpen(false)
      loadData()
    } catch (error) {
      console.error(error)
    }
  }

  const handleApproveRestock = async () => {
    if (!selectedRequestForApproval || !user?.id) return
    try {
      await inventoryApi.approveRestock(selectedRequestForApproval.requestId, user.id, approvalQty)
      setIsApprovalDialogOpen(false)
      loadData()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDirectAddStock = async () => {
    if (!selectedPartForDirectAdd || !user?.id) return
    try {
      await inventoryApi.addStock(selectedPartForDirectAdd, directAddQty, user.id, user.fullName || user.email)
      setIsDirectAddDialogOpen(false)
      loadData()
    } catch (error) {
      console.error(error)
    }
  }

  const handleRejectRestock = async (id: number) => {
    if (!user?.id) return
    try {
      await inventoryApi.rejectRestock(id, user.id)
      loadData()
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, isAuthLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await inventoryApi.create(newPart)
      setIsDialogOpen(false)
      setNewPart({
        name: "",
        sku: "",
        category: "",
        quantityInStock: 0,
        minStockLevel: 5,
        unitCost: 0,
        location: "",
        supplier: ""
      })
      loadData()
    } catch (error) {
      console.error("Failed to add spare part", error)
    }
  }

  const filteredParts = useMemo(() => {
    return parts.filter(part => {
      const matchesSearch = (part.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
                           (part.sku?.toLowerCase() || "").includes(search.toLowerCase())
      const matchesCategory = categoryFilter === "all" || part.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [parts, search, categoryFilter])

  const paginatedParts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredParts.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredParts, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredParts.length / itemsPerPage)


  const categories = useMemo(() => {
    const cats = new Set(parts.map(p => p.category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [parts])

  const getStockBadge = (part: SparePartResponse) => {
    const isLow = part.quantityInStock <= part.minStockLevel
    if (part.quantityInStock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>
    }
    if (isLow) {
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Low Stock</Badge>
    }
    return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">In Stock</Badge>
  }

  return (
    <div className="space-y-3">
      {/* Header - Compact */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-base font-semibold text-foreground">{t('sparePartsInventory')}</h1>
        <div className="flex gap-1.5">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 gap-1.5 bg-primary">
                <Plus className="h-3 w-3" />
                {t('addSparePart')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border shadow-2xl text-foreground">
              <DialogHeader>
                <DialogTitle>Register Spare Part</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Enroll a new item in the clinical inventory system.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Part Name</label>
                    <Input 
                      required 
                      placeholder="e.g. MRI Cooling Fan" 
                      value={newPart.name}
                      onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">SKU / Reference</label>
                    <Input 
                      required 
                      placeholder="REF-123456" 
                      value={newPart.sku}
                      onChange={(e) => setNewPart({...newPart, sku: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Category</label>
                    <Input 
                      placeholder="e.g. Mechanical" 
                      value={newPart.category}
                      onChange={(e) => setNewPart({...newPart, category: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Unit Cost ($)</label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={newPart.unitCost}
                      onChange={(e) => setNewPart({...newPart, unitCost: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Initial Stock</label>
                    <Input 
                      type="number"
                      required
                      value={newPart.quantityInStock}
                      onChange={(e) => setNewPart({...newPart, quantityInStock: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Alert Level (Min)</label>
                    <Input 
                      type="number"
                      required
                      value={newPart.minStockLevel}
                      onChange={(e) => setNewPart({...newPart, minStockLevel: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Storage Location</label>
                  <Input 
                    placeholder="Shelf B-12" 
                    value={newPart.location}
                    onChange={(e) => setNewPart({...newPart, location: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary text-primary-foreground">Save Part</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats - Compact Grid */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Valuation", value: `$${valuation.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, icon: DollarSign, color: "text-success", bg: "bg-success/10" },
          { label: "Low Stock", value: parts.filter(p => p.quantityInStock <= p.minStockLevel).length, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Pending Restocks", value: pendingRestocks.length, icon: Truck, color: "text-warning", bg: "bg-warning/10" },
          { label: "Stock Integrity", value: "100%", icon: CheckCircle, color: "text-info", bg: "bg-info/10" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-2 p-2.5">
              <div className={`rounded p-1.5 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground uppercase truncate">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Manager Review - Compact */}
      {(user?.roleName === 'ADMIN' || user?.roleName === 'MAINTENANCE_MANAGER') && pendingRestocks.length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {pendingRestocks.map(req => {
                const part = parts.find(p => p.partId === req.partId)
                return (
                  <div key={req.requestId} className="flex items-center justify-between p-2 rounded border border-warning/10 bg-background/50">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-warning" />
                      <div>
                        <p className="text-xs font-medium">{part?.name || 'Unknown'} (x{req.quantity})</p>
                        <p className="text-[9px] text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => handleRejectRestock(req.requestId)}>Decline</Button>
                      <Button size="sm" className="h-6 text-xs bg-warning hover:bg-warning/90" onClick={() => { setSelectedRequestForApproval(req); setApprovalQty(req.quantity); setIsApprovalDialogOpen(true); }}>Approve</Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters - Compact */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder={t('searchByNameOrSKU')} 
            className="h-7 pl-7 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <Filter className="h-3 w-3" />
              {categoryFilter === 'all' ? 'All' : categoryFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setCategoryFilter("all")}>All Categories</DropdownMenuItem>
            {categories.map(cat => (
              <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)}>{cat}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part Info</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Stock Level</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedParts.map((part) => (
                      <TableRow key={part.partId} className="cursor-pointer hover:bg-muted/30 group">
                        <TableCell>
                          <div className="font-medium text-base">{part.name}</div>
                          <div className="text-xs text-muted-foreground">{part.category}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{part.sku}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">{part.quantityInStock}</span>
                            {getStockBadge(part)}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                            Min: {part.minStockLevel} units
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{part.location || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          ${part.unitCost?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                             <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 gap-1 px-2 border border-transparent hover:border-amber-500/20 hover:text-amber-500 transition-all"
                              onClick={() => {
                                if (user?.roleName === 'MAINTENANCE_MANAGER' || user?.roleName === 'ADMIN') {
                                  setSelectedPartForDirectAdd(part.partId)
                                  setDirectAddQty(10)
                                  setIsDirectAddDialogOpen(true)
                                } else {
                                  setSelectedPartForRestock(part.partId)
                                  setRestockQty(10)
                                  setIsRestockDialogOpen(true)
                                }
                              }}
                             >
                              <History className="h-4 w-4" />
                              {user?.roleName === 'MAINTENANCE_MANAGER' || user?.roleName === 'ADMIN' ? 'Add Stock' : 'Restock'}
                             </Button>
                             <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                               <Edit2 className="h-4 w-4" />
                             </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4">
              <p className="text-sm text-muted-foreground">
                {t('showing')} <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> {t('to')} <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredParts.length)}</span> {t('of')} <span className="font-medium">{filteredParts.length}</span> {t('results')}
              </p>
              <div className="flex flex-wrap gap-2 min-w-0">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  {t('previous')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restock Request Dialog (Technicians/Fall-through) */}
      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Stock Replenishment</DialogTitle>
            <DialogDescription>
              Create a formal request for new inventory. High priority items will notify the manager.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Quantity to Order</label>
              <Input 
                type="number" 
                value={restockQty}
                onChange={(e) => setRestockQty(parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsRestockDialogOpen(false)}>Cancel</Button>
             <Button onClick={handleCreateRestock} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manager Approval Dialog with adjustment */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Approve Stock Arrival</DialogTitle>
            <DialogDescription>
              Confirm receipt of parts. You can adjust the quantity if the actual delivery differs.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Arrival Quantity</label>
              <Input 
                type="number" 
                value={approvalQty}
                onChange={(e) => setApprovalQty(parseInt(e.target.value))}
              />
              {selectedRequestForApproval && approvalQty !== selectedRequestForApproval.quantity && (
                <p className="text-xs text-amber-600 font-medium italic">
                  Note: Requested quantity was {selectedRequestForApproval.quantity}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>Cancel</Button>
             <Button onClick={handleApproveRestock} className="bg-amber-600 text-white shadow-lg shadow-amber-600/20 font-bold">Confirm & Add to Stock</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct Add Stock Dialog (Managers Only) */}
      <Dialog open={isDirectAddDialogOpen} onOpenChange={setIsDirectAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Quick Stock Addition</DialogTitle>
            <DialogDescription>
              Directly increment the stock level for this item. This bypasses the request/approval workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Amount to Add</label>
              <Input 
                type="number" 
                value={directAddQty}
                onChange={(e) => setDirectAddQty(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                This will be logged as a direct inventory reception.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsDirectAddDialogOpen(false)}>Cancel</Button>
             <Button onClick={handleDirectAddStock} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">Add Directly</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
