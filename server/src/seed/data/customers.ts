import type { DeviceCondition } from '../../models/Device.js';
import type { DeviceType, Locale } from '../../types/domain.js';

export interface CustomerSeed {
  name: string;
  phone: string;
  phoneAlt?: string;
  email?: string;
  city: string;
  address: string;
  locale: Locale;
  notes?: string;
  branchCode: string;
  /** Devices this customer owns, seeded in the same pass. */
  devices: DeviceSeed[];
}

export interface DeviceSeed {
  deviceType: DeviceType;
  brand: string;
  model: string;
  color?: string;
  condition: DeviceCondition;
  serialNumber?: string;
  imei?: string;
  accessories: string[];
  reportedIssue: string;
  unlockCode?: string;
  notes?: string;
}

/**
 * Phase 03 demo data: six customers with the devices they actually own.
 *
 * Written so the UI has something meaningful to exercise — a customer with two
 * devices, a corporate account, an unlocked phone waiting on a PIN, a device in
 * poor condition — rather than rows that only prove a form works.
 */
export const CUSTOMERS: CustomerSeed[] = [
  {
    name: 'Hesham Adel Barakat',
    phone: '+20 100 552 3311',
    email: 'hesham.barakat@gmail.com',
    city: 'Cairo',
    address: 'Flat 7, Bldg 14, El-Tagamoa El-Khames, New Cairo',
    locale: 'ar',
    notes: 'Prefers WhatsApp for approval updates.',
    branchCode: 'CAI-01',
    devices: [
      {
        deviceType: 'smartphone',
        brand: 'Samsung',
        model: 'Galaxy S24 Ultra',
        color: 'Titanium Gray',
        condition: 'good',
        imei: '356938035643809',
        accessories: ['USB-C cable', 'Silicone case'],
        reportedIssue:
          'Cracked display assembly after a drop. Touch does not respond on the top third of the screen.',
        unlockCode: '2580',
      },
      {
        deviceType: 'laptop',
        brand: 'Lenovo',
        model: 'ThinkPad T14 Gen 3',
        color: 'Black',
        condition: 'fair',
        serialNumber: 'PF3XK92L',
        accessories: ['65W charger'],
        reportedIssue: 'Overheating and fan noise under load; battery drains in about two hours.',
      },
    ],
  },
  {
    name: 'Mariam Tarek El-Gohary',
    phone: '+20 111 778 4402',
    email: 'mariam.elgohary@outlook.com',
    city: 'Cairo',
    address: 'Bldg 3, Zahraa El-Maadi, Cairo',
    locale: 'ar',
    branchCode: 'CAI-01',
    devices: [
      {
        deviceType: 'smartphone',
        brand: 'Apple',
        model: 'iPhone 14 Pro',
        color: 'Deep Purple',
        condition: 'good',
        imei: '353285110478221',
        accessories: ['Lightning cable'],
        reportedIssue: 'Battery health at 76%. Phone shuts down unexpectedly below 20%.',
      },
    ],
  },
  {
    name: 'Omar Sherif Nabil',
    phone: '+20 106 224 9087',
    email: 'omar.nabil@company.com',
    city: 'Giza',
    address: '11 El-Nahda St., Dokki, Giza',
    locale: 'en',
    notes: 'Corporate account — invoices must carry the VAT number.',
    branchCode: 'CAI-01',
    devices: [
      {
        deviceType: 'desktop',
        brand: 'Dell',
        model: 'OptiPlex 7090',
        color: 'Black',
        condition: 'fair',
        serialNumber: 'D1OP7090X42',
        accessories: ['Power cable'],
        reportedIssue: 'Will not POST. Diagnostic LEDs show a memory fault on slot 2.',
      },
      {
        deviceType: 'tablet',
        brand: 'Apple',
        model: 'iPad Air 5',
        color: 'Space Gray',
        condition: 'excellent',
        serialNumber: 'GQ7XK2MNPL',
        accessories: ['Apple Pencil 2', 'Folio case'],
        reportedIssue: 'Charging port intermittent — requires the cable to be held at an angle.',
      },
    ],
  },
  {
    name: 'Rania Fouad Selim',
    phone: '+20 128 889 1120',
    city: 'Alexandria',
    address: '22 Sidi Gaber St., Alexandria',
    locale: 'ar',
    branchCode: 'ALX-02',
    devices: [
      {
        deviceType: 'appliance',
        brand: 'Bosch',
        model: 'WAT2846XGC Washing Machine',
        color: 'White',
        condition: 'fair',
        serialNumber: 'BOS2846A771',
        accessories: [],
        reportedIssue: 'Drum does not spin during the spin cycle; water drains normally.',
      },
    ],
  },
  {
    name: 'Ziad Khaled Hosny',
    phone: '+20 122 401 7766',
    email: 'ziad.hosny@gmail.com',
    city: 'Alexandria',
    address: '5 El-Geish Rd., Smouha, Alexandria',
    locale: 'ar',
    branchCode: 'ALX-02',
    devices: [
      {
        deviceType: 'ac',
        brand: 'Carrier',
        model: 'Optimax 1.5HP Split',
        color: 'White',
        condition: 'good',
        serialNumber: 'CAROPT15-88213',
        accessories: ['Remote control'],
        reportedIssue: 'Cooling is weak and the outdoor unit makes a rhythmic knocking sound.',
      },
      {
        deviceType: 'tv',
        brand: 'LG',
        model: 'OLED55C2',
        color: 'Black',
        condition: 'damaged',
        serialNumber: 'LG55C2-4471',
        accessories: ['Magic remote', 'Stand'],
        reportedIssue:
          'Screen shows vertical banding across the middle after a power surge. Panel suspected.',
      },
    ],
  },
  {
    name: 'Aya Mahmoud Roshdy',
    phone: '+20 109 667 3325',
    email: 'aya.roshdy@gmail.com',
    city: 'Cairo',
    address: '9 Mostafa El-Nahhas St., Nasr City, Cairo',
    locale: 'ar',
    branchCode: 'CAI-01',
    devices: [
      {
        deviceType: 'laptop',
        brand: 'Apple',
        model: 'MacBook Air M2',
        color: 'Midnight',
        condition: 'good',
        serialNumber: 'FVFGK2L9Q6L4',
        accessories: ['35W dual charger', 'USB-C cable'],
        reportedIssue: 'Left hinge is loose and the lid does not stay open. Keyboard is fine.',
      },
    ],
  },
];
