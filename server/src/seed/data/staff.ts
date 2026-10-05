import type { Locale, UserRole } from '../../types/domain.js';

export interface BranchSeed {
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
}

export interface StaffSeed {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  branchCode: string | null;
  locale: Locale;
  headline: string;
}

/**
 * Fixer demo tenant: a small Egyptian repair chain with a flagship
 * workshop and a satellite service point.
 */
export const BRANCHES: BranchSeed[] = [
  {
    name: 'Nasr City Flagship Workshop',
    code: 'CAI-01',
    city: 'Cairo',
    address: '12 Abbas El-Akkad St., Nasr City, Cairo',
    phone: '+20 2 2670 4412',
  },
  {
    name: 'Smouha Service Point',
    code: 'ALX-02',
    city: 'Alexandria',
    address: '8 Victor Emanuel Sq., Smouha, Alexandria',
    phone: '+20 3 425 8890',
  },
];

export const STAFF: StaffSeed[] = [
  {
    name: 'Mahmoud Said El-Sebaey',
    email: 'mahmoud.elsebaey@fixer.app',
    phone: '+20 100 447 2210',
    role: 'super_admin',
    branchCode: null,
    locale: 'ar',
    headline: 'Platform owner — full access across every branch',
  },
  {
    name: 'Nourhan Abdelaziz',
    email: 'nourhan.abdelaziz@fixer.app',
    phone: '+20 101 336 8890',
    role: 'admin',
    branchCode: 'CAI-01',
    locale: 'ar',
    headline: 'Operations administrator',
  },
  {
    name: 'Karim Fathy Mansour',
    email: 'karim.mansour@fixer.app',
    phone: '+20 106 778 1123',
    role: 'manager',
    branchCode: 'CAI-01',
    locale: 'ar',
    headline: 'Flagship workshop manager',
  },
  {
    name: 'Youssef Hany Ragab',
    email: 'youssef.ragab@fixer.app',
    phone: '+20 111 902 5540',
    role: 'technician',
    branchCode: 'CAI-01',
    locale: 'ar',
    headline: 'Senior board-level technician — micro-soldering',
  },
  {
    name: 'Salma Ibrahim Zaki',
    email: 'salma.zaki@fixer.app',
    phone: '+20 128 445 9012',
    role: 'technician',
    branchCode: 'ALX-02',
    locale: 'en',
    headline: 'Laptop and desktop specialist',
  },
  {
    name: 'Ahmed Gamal Sherif',
    email: 'ahmed.sherif@fixer.app',
    phone: '+20 122 665 3388',
    role: 'receptionist',
    branchCode: 'CAI-01',
    locale: 'ar',
    headline: 'Front desk — intake and customer approval',
  },
  {
    name: 'Doaa Mostafa Kamel',
    email: 'doaa.kamel@fixer.app',
    phone: '+20 109 223 7741',
    role: 'inventory_manager',
    branchCode: 'CAI-01',
    locale: 'ar',
    headline: 'Spare parts and supplier control',
  },
  {
    name: 'Mostafa Adel Shaker',
    email: 'mostafa.shaker@fixer.app',
    phone: '+20 115 340 6621',
    role: 'technician',
    branchCode: 'CAI-01',
    locale: 'ar',
    headline: 'Smartphone diagnostics and water-damage recovery',
  },
  {
    name: 'Hana Walid Farouk',
    email: 'hana.farouk@fixer.app',
    phone: '+20 120 887 4410',
    role: 'technician',
    branchCode: 'CAI-01',
    locale: 'en',
    headline: 'Tablet and appliance repair',
  },
  {
    name: 'Tarek Samir Abdallah',
    email: 'tarek.abdallah@fixer.app',
    phone: '+20 127 556 1198',
    role: 'technician',
    branchCode: 'ALX-02',
    locale: 'ar',
    headline: 'Air-conditioning and home appliance service',
  },
  {
    name: 'Menna Hossam Eldin',
    email: 'menna.hossam@fixer.app',
    phone: '+20 112 664 2277',
    role: 'receptionist',
    branchCode: 'ALX-02',
    locale: 'ar',
    headline: 'Alexandria front desk',
  },
];
