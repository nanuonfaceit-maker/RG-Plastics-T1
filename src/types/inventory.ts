export interface Godown {
  id: string;
  companyId: string;
  name: string;
  location?: string;
  isDefault?: boolean;
}

export interface StockItem {
  id: string;
  companyId: string;
  name: string;
  unit: string; // e.g. "kg", "pcs", "bags", "mtr", "ton"
  hsnCode?: string;
  gstRate: number; // 0, 5, 12, 18, 28
  openingQty: number;
  openingRate: number;
  openingValue: number;
  godownId?: string;
}

export interface ItemEntryLine {
  id: string;
  itemId: string;
  itemName: string;
  godownId?: string;
  godownName?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate: number;
  hsnCode?: string;
  cgst: number;
  sgst: number;
  igst: number;
}
