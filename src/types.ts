export interface UserProfile {
  uid: string;
  email: string;
  balance: number;
  ordersCount: number;
  isAdmin: boolean;
  createdAt: string;
}

export interface SMMOrder {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  link: string;
  quantity: number;
  charge: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'partial' | 'error';
  externalOrderId?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  utr?: string;
  type: 'add_funds' | 'order';
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  createdAt: string;
}

export interface SMMService {
  service: string;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  description: string;
  dripfeed: boolean;
  refill: boolean;
  cancel: boolean;
}
