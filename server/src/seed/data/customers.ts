import type { Locale } from '../../types/domain.js';

export interface CustomerSeed {
  name: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  locale: Locale;
  notes?: string;
}

/**
 * Phase 01 ships the shape of the demo data so the seed runner and the
 * credential report are real. Phase 03 persists these customers together with
 * their devices and Phase 04 attaches repair tickets.
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
  },
  {
    name: 'Mariam Tarek El-Gohary',
    phone: '+20 111 778 4402',
    email: 'mariam.elgohary@outlook.com',
    city: 'Cairo',
    address: 'Bldg 3, Zahraa El-Maadi, Cairo',
    locale: 'ar',
  },
  {
    name: 'Omar Sherif Nabil',
    phone: '+20 106 224 9087',
    email: 'omar.nabil@company.com',
    city: 'Giza',
    address: '11 El-Nahda St., Dokki, Giza',
    locale: 'en',
    notes: 'Corporate account — invoices must carry the VAT number.',
  },
  {
    name: 'Rania Fouad Selim',
    phone: '+20 128 889 1120',
    city: 'Alexandria',
    address: '22 Sidi Gaber St., Alexandria',
    locale: 'ar',
  },
  {
    name: 'Ziad Khaled Hosny',
    phone: '+20 122 401 7766',
    email: 'ziad.hosny@gmail.com',
    city: 'Alexandria',
    address: '5 El-Geish Rd., Smouha, Alexandria',
    locale: 'ar',
  },
  {
    name: 'Aya Mahmoud Roshdy',
    phone: '+20 109 667 3325',
    email: 'aya.roshdy@gmail.com',
    city: 'Cairo',
    address: '9 Mostafa El-Nahhas St., Nasr City, Cairo',
    locale: 'ar',
  },
];
