"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Calendar,
  User,
  Wrench
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
import { workOrdersApi } from "@/lib/api/work-orders"
import { equipmentApi } from "@/lib/api/equipment"
import type { WorkOrderResponse, EquipmentResponse } from "@/lib/api/types"
import { format, formatDistanceToNow } from "date-fns"
import { fr, enUS, ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { WorkOrderTypeBadge } from "@/components/work-order-type-badge"
import { StatusBadge } from "@/components/status-badge"
import { EquipmentSelector } from "@/components/equipment-selector"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function WorkOrdersPage() {
  const { t, language } = useI18n()
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrderResponse[]>([])
  const [equipmentList, setEquipmentList] = useState<EquipmentResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filter, showArchived])

  const dateLocale = language === 'fr' ? fr : language === 'ar' ? ar : enUS

  const [newWO, setNewWO] = useState({
    title: "",
    description: "",
    equipmentId: "",
    woType: "CORRECTIVE",
    priority: "MEDIUM",
    dueDate: ""
  })

  // ... (keeping loadData and handleSubmit logic)


  const loadData = async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const [woData, eqData] = await Promise.all([
        workOrdersApi.list(),
        equipmentApi.getAll()
      ])
      setWorkOrders(woData)
      setEquipmentList(eqData)
    } catch (error) {
      console.error("Failed to load work orders", error)
    } finally {
      setIsLoading(false)
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
      await workOrdersApi.create({
        ...newWO,
        equipmentId: parseInt(newWO.equipmentId)
      })
      setIsDialogOpen(false)
      setNewWO({
        title: "",
        description: "",
        equipmentId: "",
        woType: "CORRECTIVE",
        priority: "MEDIUM",
        dueDate: ""
      })
      loadData()
    } catch (error) {
      console.error("Failed to create work order", error)
    }
  }

  const filteredOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const q = search.toLowerCase()
      const matchesSearch = wo.title.toLowerCase().includes(q) || 
                           wo.woCode.toLowerCase().includes(q) ||
                           (wo.equipmentName?.toLowerCase().includes(q) ?? false)

      const f = filter.toLowerCase()
      if (f === "all") return matchesSearch
      
      // Check for type filter
      if (f === "preventive" || f === "corrective" || f === "predictive") {
        return matchesSearch && wo.woType.toLowerCase() === f
      }

      // Check for status filter
      return matchesSearch && wo.status.toLowerCase() === f
    })
  }, [workOrders, search, filter])

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredOrders, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

  const getPriorityBadge = (priority: string) => {
    const p = priority.toUpperCase()
    if (p === 'CRITICAL') return <Badge variant="destructive">Critical</Badge>
    if (p === 'HIGH') return <Badge className="bg-warning/10 text-warning border-warning/20 hover:bg-warning/20">High</Badge>
    if (p === 'MEDIUM') return <Badge className="bg-info/10 text-info border-info/20 hover:bg-info/20">Medium</Badge>
    return <Badge variant="secondary">Low</Badge>
  }

  return (
    <div className="space-y-3">
      {/* Header - Compact */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-base font-semibold text-foreground">{t('workOrders')}</h1>
        <div className="flex gap-1.5">
          {!user?.hasRole('TECHNICIAN') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 gap-1.5 bg-primary">
                  <Plus className="h-3 w-3" />
                  {t('newWorkOrder')}
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border shadow-2xl">
              <DialogHeader>
                <DialogTitle>Create Maintenance Intervention</DialogTitle>
                <DialogDescription>
                  Fill in the details to generate a new work order.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input 
                    required 
                    placeholder="e.g., Annual MRI Inspection" 
                    value={newWO.title}
                    onChange={(e) => setNewWO({...newWO, title: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <EquipmentSelector
                    equipmentList={equipmentList}
                    value={newWO.equipmentId}
                    onChange={(val) => setNewWO({...newWO, equipmentId: val})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Type</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={newWO.woType}
                      onChange={(e) => setNewWO({...newWO, woType: e.target.value})}
                    >
                      <option value="CORRECTIVE">Corrective</option>
                      <option value="PREVENTIVE">Preventive</option>
                      <option value="PREDICTIVE">Predictive</option>
                      <option value="REGULATORY">Regulatory</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Priority</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={newWO.priority}
                      onChange={(e) => setNewWO({...newWO, priority: e.target.value})}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter technical details..."
                    value={newWO.description}
                    onChange={(e) => setNewWO({...newWO, description: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary text-primary-foreground">Create Work Order</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </motion.div>

      {/* Stats - Compact Grid */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('inProgress'), value: workOrders.filter(wo => wo.status === 'IN_PROGRESS').length, icon: Clock, color: "text-info", bg: "bg-info/10" },
          { label: t('created'), value: workOrders.filter(wo => wo.status === 'CREATED').length, icon: AlertCircle, color: "text-primary", bg: "bg-primary/10" },
          { label: t('completed'), value: workOrders.filter(wo => wo.status === 'COMPLETED').length, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
          { label: t('urgent'), value: workOrders.filter(wo => wo.priority === 'CRITICAL').length, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
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

      {/* Filters - Compact */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder={t('searchWorkOrders')} 
            className="h-7 pl-7 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className={cn("h-7 text-xs", showArchived && "bg-primary/10 border-primary text-primary")}
        >
          {showArchived ? t('hideArchived') : t('showArchived')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <Filter className="h-3 w-3" />
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border">
              <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 mb-1">Status</div>
              <DropdownMenuItem onClick={() => setFilter("all")}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("created")}>Created</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("assigned")}>Assigned</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("in_progress")}>In Progress</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("completed")}>Completed</DropdownMenuItem>
              
              <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 my-1">Type</div>
              <DropdownMenuItem onClick={() => setFilter("preventive")} className="gap-2">
                <WorkOrderTypeBadge type="PREVENTIVE" lang={language as any} size="sm" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("corrective")} className="gap-2">
                <WorkOrderTypeBadge type="CORRECTIVE" lang={language as any} size="sm" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("regulatory")} className="gap-2">
                <WorkOrderTypeBadge type="REGULATORY" lang={language as any} size="sm" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("predictive")} className="gap-2">
                <WorkOrderTypeBadge type="PREDICTIVE" lang={language as any} size="sm" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Work Orders Table */}
      <Card>
        <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground animate-pulse">Loading work orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20">
                <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No work orders found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="whitespace-nowrap">Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.map((wo) => (
                      <TableRow key={wo.woId} className="cursor-pointer hover:bg-muted/30 group">
                        <TableCell className="font-mono text-xs text-primary font-bold">
                          {wo.woCode}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="font-medium text-foreground truncate">{wo.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{wo.description}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                             <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {wo.assignedToName?.split(' ').map(n => n[0]).join('') || '?'}
                             </div>
                            <span className="font-medium">{wo.assignedToName || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground truncate">
                            <Wrench className="h-3 w-3" />
                            <span>{wo.equipmentName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{wo.estimatedDuration || '—'}h</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <WorkOrderTypeBadge type={wo.woType} lang={language as any} size="sm" />
                        </TableCell>
                         <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <StatusBadge status={wo.status} />
                            {wo.hasPendingAdHocTasks && (
                              <Badge variant="outline" className="w-fit text-[9px] px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50/50 flex items-center gap-1">
                                <AlertCircle className="h-2.5 w-2.5" />
                                Review Req.
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground font-medium text-xs">
                            <Calendar className="h-3.5 w-3.5 opacity-50" />
                            <span>
                              {wo.updatedAt 
                                ? formatDistanceToNow(new Date(wo.updatedAt), { addSuffix: true, locale: dateLocale }) 
                                : formatDistanceToNow(new Date(wo.createdAt), { addSuffix: true, locale: dateLocale })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/work-orders/${wo.woId}`}>
                            <Button variant="ghost" size="sm" className="h-8 p-2 text-primary hover:bg-primary/10 rounded-lg">
                              {t('manage')}
                            </Button>
                          </Link>
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
                {t('showing')} <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> {t('to')} <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> {t('of')} <span className="font-medium">{filteredOrders.length}</span> {t('results')}
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
    </div>
  )
}
