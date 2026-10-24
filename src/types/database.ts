export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PaymentMethod = "cash" | "card" | "transfer";
export type SaleStatus = "completed" | "voided";
export type MovementType = "entry" | "adjustment" | "sale" | "void" | "expiry";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Tables: {
      roles: TableDefinition<
        {
          id: number;
          code: string;
          name: string;
          description: string | null;
          created_at: string;
        },
        {
          id?: number;
          code: string;
          name: string;
          description?: string | null;
          created_at?: string;
        }
      >;
      permissions: TableDefinition<
        {
          id: number;
          code: string;
          description: string;
          created_at: string;
        }
      >;
      role_permissions: TableDefinition<{
        role_id: number;
        permission_id: number;
      }>;
      profiles: TableDefinition<
        {
          id: string;
          email: string;
          full_name: string;
          role_id: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          email: string;
          full_name: string;
          role_id: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      categories: TableDefinition<
        {
          id: string;
          name: string;
          description: string | null;
          active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          description?: string | null;
          active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      products: TableDefinition<
        {
          id: string;
          sku: string;
          barcode: string | null;
          name: string;
          description: string | null;
          category_id: string | null;
          sale_price: number;
          min_stock: number;
          track_lots: boolean;
          active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          sku: string;
          barcode?: string | null;
          name: string;
          description?: string | null;
          category_id?: string | null;
          sale_price: number;
          min_stock?: number;
          track_lots?: boolean;
          active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      product_lots: TableDefinition<
        {
          id: string;
          product_id: string;
          lot_code: string;
          expires_on: string | null;
          unit_cost: number;
          quantity: number;
          received_at: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          product_id: string;
          lot_code: string;
          expires_on?: string | null;
          unit_cost?: number;
          quantity?: number;
          received_at?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      sales: TableDefinition<
        {
          id: string;
          ticket_number: number;
          status: SaleStatus;
          payment_method: PaymentMethod;
          total: number;
          created_by: string;
          created_at: string;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
        },
        {
          id?: string;
          ticket_number?: number;
          status?: SaleStatus;
          payment_method: PaymentMethod;
          total?: number;
          created_by: string;
          created_at?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
        }
      >;
      sale_items: TableDefinition<
        {
          id: string;
          sale_id: string;
          product_id: string;
          product_name: string;
          product_sku: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at: string;
        }
      >;
      sale_item_lots: TableDefinition<{
        sale_item_id: string;
        lot_id: string;
        quantity: number;
        unit_cost: number;
      }>;
      inventory_movements: TableDefinition<
        {
          id: number;
          product_id: string;
          lot_id: string;
          type: MovementType;
          quantity_delta: number;
          resulting_quantity: number;
          reason: string | null;
          sale_id: string | null;
          created_by: string;
          created_at: string;
        }
      >;
      settings: TableDefinition<
        {
          id: number;
          store_name: string;
          address: string | null;
          phone: string | null;
          currency_code: string;
          timezone: string;
          expiry_alert_days: number;
          prices_include_tax: boolean;
          receipt_footer: string | null;
          updated_by: string | null;
          updated_at: string;
        }
      >;
    };
    Views: {
      products_with_stock: TableDefinition<{
        id: string;
        sku: string;
        barcode: string | null;
        name: string;
        description: string | null;
        category_id: string | null;
        category_name: string | null;
        sale_price: number;
        min_stock: number;
        track_lots: boolean;
        active: boolean;
        created_at: string;
        updated_at: string;
        available_quantity: number;
        expired_quantity: number;
        nearest_expiry: string | null;
        low_stock: boolean;
      }>;
    };
    Functions: {
      adjust_lot: {
        Args: {
          p_lot_id: string;
          p_new_quantity: number;
          p_reason: string;
        };
        Returns: Json;
      };
      create_sale: {
        Args: {
          p_items: Json;
          p_payment_method: PaymentMethod;
        };
        Returns: Json;
      };
      receive_lot: {
        Args: {
          p_product_id: string;
          p_lot_code: string;
          p_expires_on: string | null;
          p_quantity: number;
          p_unit_cost: number;
          p_note?: string | null;
        };
        Returns: Json;
      };
      sales_totals: {
        Args: {
          p_start?: string | null;
          p_end?: string | null;
          p_status?: SaleStatus | null;
          p_payment_method?: PaymentMethod | null;
          p_ticket_number?: number | null;
        };
        Returns: Json;
      };
      void_sale: {
        Args: {
          p_sale_id: string;
          p_reason: string;
        };
        Returns: Json;
      };
      write_off_lot: {
        Args: {
          p_lot_id: string;
          p_reason?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      payment_method: PaymentMethod;
      sale_status: SaleStatus;
      movement_type: MovementType;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type RoleRow = Database["public"]["Tables"]["roles"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductLotRow = Database["public"]["Tables"]["product_lots"]["Row"];
export type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
export type SaleItemRow = Database["public"]["Tables"]["sale_items"]["Row"];
export type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];
export type InventoryMovementRow =
  Database["public"]["Tables"]["inventory_movements"]["Row"];
export type ProductWithStock =
  Database["public"]["Views"]["products_with_stock"]["Row"];

export type CartItem = {
  productId: string;
  quantity: number;
};

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };
