import type { InventoryCategory } from '../../models/InventoryItem.js';

export interface SeedInventoryItem {
  name: string;
  category: InventoryCategory;
  brand?: string;
  unit: string;
  quantityOnHand: number;
  minQuantity: number;
  unitCost: number;
  sellPrice: number;
  location?: string;
  supplier?: string;
  branchCode: string;
}

/** Demo spare parts for the seeded branches (CAI-01, ALX-02). */
export const INVENTORY_ITEMS: SeedInventoryItem[] = [
  {
    name: 'OLED assembly — Galaxy S24 Ultra',
    category: 'screen',
    brand: 'Samsung',
    unit: 'pcs',
    quantityOnHand: 4,
    minQuantity: 2,
    unitCost: 2800,
    sellPrice: 4200,
    location: 'A-01',
    supplier: 'Cairo Parts Hub',
    branchCode: 'CAI-01',
  },
  {
    name: 'Battery — iPhone 14 / 14 Pro',
    category: 'battery',
    brand: 'Apple',
    unit: 'pcs',
    quantityOnHand: 12,
    minQuantity: 5,
    unitCost: 450,
    sellPrice: 850,
    location: 'B-03',
    supplier: 'Delta Mobile Supply',
    branchCode: 'CAI-01',
  },
  {
    name: 'Hinge kit — MacBook Air M2',
    category: 'board',
    brand: 'Apple',
    unit: 'set',
    quantityOnHand: 2,
    minQuantity: 2,
    unitCost: 1900,
    sellPrice: 3200,
    location: 'C-02',
    supplier: 'Cairo Parts Hub',
    branchCode: 'CAI-01',
  },
  {
    name: 'Thermal paste — 4g syringe',
    category: 'adhesive',
    brand: 'Arctic',
    unit: 'syringe',
    quantityOnHand: 18,
    minQuantity: 6,
    unitCost: 35,
    sellPrice: 90,
    location: 'D-01',
    supplier: 'Tech Tools EG',
    branchCode: 'CAI-01',
  },
  {
    name: 'USB-C charging port — ThinkPad T14',
    category: 'connector',
    brand: 'Lenovo',
    unit: 'pcs',
    quantityOnHand: 1,
    minQuantity: 3,
    unitCost: 220,
    sellPrice: 480,
    location: 'A-04',
    supplier: 'Delta Mobile Supply',
    branchCode: 'CAI-01',
  },
  {
    name: 'LCD assembly — iPhone 13',
    category: 'screen',
    brand: 'Apple',
    unit: 'pcs',
    quantityOnHand: 6,
    minQuantity: 3,
    unitCost: 1100,
    sellPrice: 1900,
    location: 'A-02',
    supplier: 'Cairo Parts Hub',
    branchCode: 'ALX-02',
  },
  {
    name: 'Charging flex — Galaxy A54',
    category: 'cable',
    brand: 'Samsung',
    unit: 'pcs',
    quantityOnHand: 9,
    minQuantity: 4,
    unitCost: 85,
    sellPrice: 200,
    location: 'B-01',
    supplier: 'Delta Mobile Supply',
    branchCode: 'ALX-02',
  },
  {
    name: 'Precision screwdriver set',
    category: 'tool',
    brand: 'iFixit',
    unit: 'set',
    quantityOnHand: 5,
    minQuantity: 2,
    unitCost: 320,
    sellPrice: 0,
    location: 'T-01',
    supplier: 'Tech Tools EG',
    branchCode: 'ALX-02',
  },
  {
    name: 'Back glass — iPhone 12',
    category: 'case',
    brand: 'Apple',
    unit: 'pcs',
    quantityOnHand: 0,
    minQuantity: 2,
    unitCost: 380,
    sellPrice: 750,
    location: 'A-05',
    supplier: 'Cairo Parts Hub',
    branchCode: 'ALX-02',
  },
  {
    name: 'Microphone module — Pixel 7',
    category: 'board',
    brand: 'Google',
    unit: 'pcs',
    quantityOnHand: 3,
    minQuantity: 2,
    unitCost: 160,
    sellPrice: 340,
    location: 'C-01',
    supplier: 'Delta Mobile Supply',
    branchCode: 'CAI-01',
  },
];
