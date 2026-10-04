import type { DeviceType } from '@/types/domain';

/** Customer and device vocabulary, mirrored from the server models. */

export const DEVICE_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'] as const;
export type DeviceCondition = (typeof DEVICE_CONDITIONS)[number];

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  phoneAlt?: string;
  email?: string;
  city?: string;
  address?: string;
  notes?: string;
  preferredLanguage: 'ar' | 'en';
  branch: string;
  isActive: boolean;
  lastVisitAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Present on list responses only. */
  deviceCount?: number;
}

export interface DeviceImage {
  url: string;
  publicId?: string;
  caption?: string;
}

export interface Device {
  id: string;
  customer: string;
  branch: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  displayName: string;
  serialNumber?: string;
  imei?: string;
  color?: string;
  condition: DeviceCondition;
  accessories: string[];
  reportedIssue: string;
  /** Present only on the single-device endpoint. */
  unlockCode?: string;
  images: DeviceImage[];
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present on list responses only. */
  customerName?: string;
  customerCode?: string;
  customerPhone?: string;
}

export interface CustomerPayload {
  name: string;
  phone: string;
  phoneAlt?: string;
  email?: string;
  city?: string;
  address?: string;
  notes?: string;
  preferredLanguage?: 'ar' | 'en';
  branch?: string;
  isActive?: boolean;
}

export interface DevicePayload {
  customer: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  serialNumber?: string;
  imei?: string;
  color?: string;
  condition?: DeviceCondition;
  accessories?: string[];
  reportedIssue: string;
  unlockCode?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  isActive?: 'true' | 'false';
  sort?: string;
}

export interface DeviceQuery {
  page?: number;
  limit?: number;
  search?: string;
  customer?: string;
  deviceType?: DeviceType;
  condition?: DeviceCondition;
  isActive?: 'true' | 'false';
  sort?: string;
}
