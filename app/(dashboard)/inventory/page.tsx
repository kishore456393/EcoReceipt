"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package, Loader2, AlertTriangle, Database } from "lucide-react";

interface Item {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  category: string;
  unit: string;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

interface ItemForm {
  name: string;
  barcode: string;
  price: string;
  category: string;
  unit: string;
  stock: string;
  lowStockThreshold: string;
}

const emptyForm: ItemForm = {
  name: "",
  barcode: "",
  price: "",
  category: "General",
  unit: "piece",
  stock: "0",
  lowStockThreshold: "5",
};

const categories = [
  "General", "Groceries", "Dairy", "Beverages", "Snacks",
  "Household", "Personal Care", "Stationery", "Vegetables", "Fruits",
];

const units = ["piece", "kg", "g", "litre", "ml", "pack", "dozen", "box"];

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(`/api/items?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        barcode: form.barcode.trim() || null,
        price: parseFloat(form.price),
        category: form.category,
        unit: form.unit,
        stock: parseInt(form.stock) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
      };

      const url = editingId ? `/api/items/${editingId}` : "/api/items";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(editingId ? "Item updated!" : "Item added!");
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchItems();
    } catch {
      toast.error("Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      barcode: item.barcode || "",
      price: item.price.toString(),
      category: item.category,
      unit: item.unit,
      stock: item.stock.toString(),
      lowStockThreshold: item.lowStockThreshold.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this item?")) return;
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Item removed");
      fetchItems();
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const handleSeedGrocery = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/items/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load dataset");
      toast.success(data.message);
      fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load grocery dataset";
      toast.error(message);
    } finally {
      setSeeding(false);
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">
            Manage your shop items. {items.length} item{items.length !== 1 ? "s" : ""} total.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button onClick={openAddDialog} />}
          >
              <Plus size={18} className="mr-2" />
              Add Item
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Item" : "Add New Item"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Update item details" : "Add a new item to your inventory"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Item Name *</Label>
                  <Input
                    placeholder="Rice 1kg"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Barcode</Label>
                  <Input
                    placeholder="8901234567890"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Price (₹) *</Label>
                  <Input
                    type="number"
                    step="0.50"
                    placeholder="50.00"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? "General" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v ?? "piece" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Alert</Label>
                  <Input
                    type="number"
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Update" : "Add Item"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Package size={40} />
              <p>No items found. Add your first item to get started.</p>
              <Button
                variant="outline"
                onClick={handleSeedGrocery}
                disabled={seeding}
                className="mt-2"
              >
                {seeding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database size={16} className="mr-2" />
                )}
                {seeding ? "Loading 150+ items..." : "Load Indian Grocery Dataset"}
              </Button>
              <p className="text-xs text-muted-foreground max-w-sm text-center">
                Pre-load 150+ common Indian grocery items including grains, dals, spices, dairy, snacks, vegetables, fruits & more. Prices are editable.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.barcode && (
                          <p className="text-xs text-muted-foreground">{item.barcode}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{item.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.stock <= item.lowStockThreshold && (
                          <AlertTriangle size={14} className="text-amber-500" />
                        )}
                        <span className={item.stock <= item.lowStockThreshold ? "text-amber-600 font-medium" : ""}>
                          {item.stock}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">{item.unit}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
