export interface ShopProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  price: number;
  stock: number;
  images: string[];
  rating: number;
  reviewsCount: number;
  specs: Record<string, string>;
  isFeatured: boolean;
  isNew: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  count?: number;
}

export interface ShopCustomer {
  id: string;
  devoteeId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  totalSpent: number;
  ordersCount: number;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  price: number;
  quantity: number;
  total: number;
}

export interface ShopOrderTimelineStep {
  status: string;
  timestamp: string;
  title: string;
  description: string;
}

export interface ShopOrder {
  id: string;
  customerId?: string | null;
  devoteeId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    name: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
  };
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  trackingNumber?: string | null;
  timeline: ShopOrderTimelineStep[];
  couponCode?: string | null;
  items?: ShopOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ShopCoupon {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  value: number;
  minSpend: number;
  description?: string;
  active: boolean;
  expiresAt?: string | null;
}

export interface ShopReview {
  id: string;
  productId: string;
  productName?: string;
  customerName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}
