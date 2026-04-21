// ============================================
// Supabase Database Types
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// プラン種別
export type PlanType = 'starter' | 'pro' | 'enterprise'

// 組織メンバーロール
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'editor' | 'viewer'

export interface Database {
  public: {
    Tables: {
      // ============================================
      // 組織（テナント）テーブル
      // ============================================
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo: string | null
          email: string | null
          phone: string | null
          website: string | null
          address: string | null
          frontend_url: string | null
          frontend_api_key: string | null
          shop_subdomain: string | null
          plan: PlanType
          plan_started_at: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          // Stripe Connect 用
          stripe_account_id: string | null
          stripe_account_status: 'not_connected' | 'pending' | 'active' | 'restricted' | null
          stripe_onboarding_complete: boolean
          settings: Json
          features: Json
          owner_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          address?: string | null
          frontend_url?: string | null
          frontend_api_key?: string | null
          shop_subdomain?: string | null
          plan?: PlanType
          plan_started_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          // Stripe Connect 用
          stripe_account_id?: string | null
          stripe_account_status?: 'not_connected' | 'pending' | 'active' | 'restricted' | null
          stripe_onboarding_complete?: boolean
          settings?: Json
          features?: Json
          owner_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          address?: string | null
          frontend_url?: string | null
          frontend_api_key?: string | null
          shop_subdomain?: string | null
          plan?: PlanType
          plan_started_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          // Stripe Connect 用
          stripe_account_id?: string | null
          stripe_account_status?: 'not_connected' | 'pending' | 'active' | 'restricted' | null
          stripe_onboarding_complete?: boolean
          settings?: Json
          features?: Json
          owner_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // ============================================
      // 組織メンバーテーブル
      // ============================================
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: OrganizationRole
          invited_by: string | null
          invited_at: string | null
          joined_at: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: OrganizationRole
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: OrganizationRole
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // ============================================
      // 招待テーブル
      // ============================================
      organization_invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: Exclude<OrganizationRole, 'owner'>
          token: string
          invited_by: string | null
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role?: Exclude<OrganizationRole, 'owner'>
          token: string
          invited_by?: string | null
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: Exclude<OrganizationRole, 'owner'>
          token?: string
          invited_by?: string | null
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          organization_id: string
          name: string
          slug: string
          description: string | null
          parent_id: string | null
          sort_order: number
          image: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          slug: string
          description?: string | null
          parent_id?: string | null
          sort_order?: number
          image?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          slug?: string
          description?: string | null
          parent_id?: string | null
          sort_order?: number
          image?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      content_categories: {
        Row: {
          id: string
          organization_id: string
          name: string
          slug: string
          description: string | null
          type: string
          parent_id: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          slug: string
          description?: string | null
          type: string
          parent_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          slug?: string
          description?: string | null
          type?: string
          parent_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      content_category_relations: {
        Row: {
          content_id: string
          category_id: string
        }
        Insert: {
          content_id: string
          category_id: string
        }
        Update: {
          content_id?: string
          category_id?: string
        }
      }
      contents: {
        Row: {
          id: string
          organization_id: string
          type: string
          title: string
          slug: string
          excerpt: string | null
          blocks: Json
          status: 'draft' | 'review' | 'published' | 'archived'
          author_id: string | null
          featured_image: string | null
          tags: string[]
          related_product_ids: string[]
          seo_title: string | null
          seo_description: string | null
          custom_fields: Json
          published_at: string | null
          scheduled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          type: string
          title: string
          slug: string
          excerpt?: string | null
          blocks?: Json
          status?: 'draft' | 'review' | 'published' | 'archived'
          author_id?: string | null
          featured_image?: string | null
          tags?: string[]
          related_product_ids?: string[]
          seo_title?: string | null
          seo_description?: string | null
          custom_fields?: Json
          published_at?: string | null
          scheduled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          type?: string
          title?: string
          slug?: string
          excerpt?: string | null
          blocks?: Json
          status?: 'draft' | 'review' | 'published' | 'archived'
          author_id?: string | null
          featured_image?: string | null
          tags?: string[]
          related_product_ids?: string[]
          seo_title?: string | null
          seo_description?: string | null
          custom_fields?: Json
          published_at?: string | null
          scheduled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customer_addresses: {
        Row: {
          id: string
          customer_id: string
          postal_code: string
          prefecture: string
          city: string
          line1: string
          line2: string | null
          phone: string | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          postal_code: string
          prefecture: string
          city: string
          line1: string
          line2?: string | null
          phone?: string | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          postal_code?: string
          prefecture?: string
          city?: string
          line1?: string
          line2?: string | null
          phone?: string | null
          is_default?: boolean
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          organization_id: string
          type: 'individual' | 'business'
          name: string
          email: string
          phone: string | null
          company: string | null
          notes: string | null
          total_orders: number
          total_spent: number
          tags: string[]
          role: 'personal' | 'buyer' | 'supplier'
          status: 'pending' | 'active' | 'suspended'
          metadata: Json | null
          prefecture: string | null
          business_type: string | null
          custom_fields: Json
          password_hash: string | null
          email_verified: boolean
          last_login_at: string | null
          referral_code: string | null
          referred_by_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          type?: 'individual' | 'business'
          name: string
          email: string
          phone?: string | null
          company?: string | null
          notes?: string | null
          total_orders?: number
          total_spent?: number
          tags?: string[]
          role?: 'personal' | 'buyer' | 'supplier'
          status?: 'pending' | 'active' | 'suspended'
          metadata?: Json | null
          prefecture?: string | null
          business_type?: string | null
          custom_fields?: Json
          password_hash?: string | null
          email_verified?: boolean
          last_login_at?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          type?: 'individual' | 'business'
          name?: string
          email?: string
          phone?: string | null
          company?: string | null
          notes?: string | null
          total_orders?: number
          total_spent?: number
          tags?: string[]
          role?: 'personal' | 'buyer' | 'supplier'
          status?: 'pending' | 'active' | 'suspended'
          metadata?: Json | null
          prefecture?: string | null
          business_type?: string | null
          custom_fields?: Json
          password_hash?: string | null
          email_verified?: boolean
          last_login_at?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          variant_id: string | null
          product_name: string
          variant_name: string
          sku: string
          quantity: number
          unit_price: number
          total_price: number
          custom_fields: Record<string, string> | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          variant_id?: string | null
          product_name: string
          variant_name: string
          sku: string
          quantity: number
          unit_price: number
          total_price: number
          custom_fields?: Record<string, string> | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          variant_id?: string | null
          product_name?: string
          variant_name?: string
          sku?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          custom_fields?: Record<string, string> | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          organization_id: string
          order_number: string
          customer_id: string | null
          customer_name: string
          customer_email: string
          subtotal: number
          shipping_cost: number
          tax: number
          total: number
          status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_method: string | null
          shipping_address: Json
          billing_address: Json | null
          notes: string | null
          tracking_number: string | null
          shipped_at: string | null
          delivered_at: string | null
          agent_id: string | null
          agent_code: string | null
          agent_commission_rate: number | null
          agent_commission_amount: number | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          order_number: string
          customer_id?: string | null
          customer_name: string
          customer_email: string
          subtotal: number
          shipping_cost?: number
          tax?: number
          total: number
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_method?: string | null
          shipping_address: Json
          billing_address?: Json | null
          notes?: string | null
          tracking_number?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          agent_id?: string | null
          agent_code?: string | null
          agent_commission_rate?: number | null
          agent_commission_amount?: number | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          order_number?: string
          customer_id?: string | null
          customer_name?: string
          customer_email?: string
          subtotal?: number
          shipping_cost?: number
          tax?: number
          total?: number
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_method?: string | null
          shipping_address?: Json
          billing_address?: Json | null
          notes?: string | null
          tracking_number?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          agent_id?: string | null
          agent_code?: string | null
          agent_commission_rate?: number | null
          agent_commission_amount?: number | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      product_categories: {
        Row: {
          product_id: string
          category_id: string
        }
        Insert: {
          product_id: string
          category_id: string
        }
        Update: {
          product_id?: string
          category_id?: string
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          alt: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          alt?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          alt?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          name: string
          sku: string
          price: number
          compare_at_price: number | null
          stock: number
          low_stock_threshold: number
          options: Json
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          sku: string
          price: number
          compare_at_price?: number | null
          stock?: number
          low_stock_threshold?: number
          options?: Json
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          name?: string
          sku?: string
          price?: number
          compare_at_price?: number | null
          stock?: number
          low_stock_threshold?: number
          options?: Json
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          organization_id: string
          name: string
          slug: string
          description: string | null
          short_description: string | null
          status: 'draft' | 'published' | 'archived'
          tags: string[]
          seo_title: string | null
          seo_description: string | null
          featured: boolean
          custom_fields: Json
          approval_status: 'pending' | 'approved' | 'rejected' | null
          approved_at: string | null
          approved_by: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          slug: string
          description?: string | null
          short_description?: string | null
          status?: 'draft' | 'published' | 'archived'
          tags?: string[]
          seo_title?: string | null
          seo_description?: string | null
          featured?: boolean
          custom_fields?: Json
          approval_status?: 'pending' | 'approved' | 'rejected' | null
          approved_at?: string | null
          approved_by?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          slug?: string
          description?: string | null
          short_description?: string | null
          status?: 'draft' | 'published' | 'archived'
          tags?: string[]
          seo_title?: string | null
          seo_description?: string | null
          featured?: boolean
          custom_fields?: Json
          approval_status?: 'pending' | 'approved' | 'rejected' | null
          approved_at?: string | null
          approved_by?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          product_id: string | null
          variant_id: string | null
          product_name: string
          variant_name: string
          quantity: number
          unit_price: number
          discount: number
          total_price: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          product_id?: string | null
          variant_id?: string | null
          product_name: string
          variant_name: string
          quantity: number
          unit_price: number
          discount?: number
          total_price: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          product_id?: string | null
          variant_id?: string | null
          product_name?: string
          variant_name?: string
          quantity?: number
          unit_price?: number
          discount?: number
          total_price?: number
          notes?: string | null
          created_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          organization_id: string
          quote_number: string
          customer_id: string | null
          customer_name: string
          customer_company: string | null
          subtotal: number
          discount: number
          tax: number
          total: number
          status: 'draft' | 'sent' | 'negotiating' | 'accepted' | 'rejected' | 'expired' | 'ordered'
          valid_until: string
          notes: string | null
          terms: string | null
          order_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          quote_number: string
          customer_id?: string | null
          customer_name: string
          customer_company?: string | null
          subtotal: number
          discount?: number
          tax?: number
          total: number
          status?: 'draft' | 'sent' | 'negotiating' | 'accepted' | 'rejected' | 'expired' | 'ordered'
          valid_until: string
          notes?: string | null
          terms?: string | null
          order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          quote_number?: string
          customer_id?: string | null
          customer_name?: string
          customer_company?: string | null
          subtotal?: number
          discount?: number
          tax?: number
          total?: number
          status?: 'draft' | 'sent' | 'negotiating' | 'accepted' | 'rejected' | 'expired' | 'ordered'
          valid_until?: string
          notes?: string | null
          terms?: string | null
          order_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          variant_id: string
          type: 'in' | 'out' | 'adjustment' | 'transfer'
          quantity: number
          previous_stock: number
          new_stock: number
          reason: string | null
          reference: string | null
          lot_number: string | null
          user_id: string | null
          created_by: string | null
          product_name: string | null
          variant_name: string | null
          sku: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          variant_id: string
          type: 'in' | 'out' | 'adjustment' | 'transfer'
          quantity: number
          previous_stock: number
          new_stock: number
          reason?: string | null
          reference?: string | null
          lot_number?: string | null
          user_id?: string | null
          created_by?: string | null
          product_name?: string | null
          variant_name?: string | null
          sku?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string
          variant_id?: string
          type?: 'in' | 'out' | 'adjustment' | 'transfer'
          quantity?: number
          previous_stock?: number
          new_stock?: number
          reason?: string | null
          reference?: string | null
          lot_number?: string | null
          user_id?: string | null
          created_by?: string | null
          product_name?: string | null
          variant_name?: string | null
          sku?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar: string | null
          role: 'admin' | 'manager' | 'editor' | 'viewer'
          current_organization_id: string | null
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          avatar?: string | null
          role?: 'admin' | 'manager' | 'editor' | 'viewer'
          current_organization_id?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar?: string | null
          role?: 'admin' | 'manager' | 'editor' | 'viewer'
          current_organization_id?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // ============================================
      // API使用量テーブル
      // ============================================
      api_usage: {
        Row: {
          id: string
          organization_id: string
          endpoint: string
          method: string
          status_code: number | null
          response_time_ms: number | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          endpoint: string
          method: string
          status_code?: number | null
          response_time_ms?: number | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          endpoint?: string
          method?: string
          status_code?: number | null
          response_time_ms?: number | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      // ============================================
      // レート制限設定テーブル
      // ============================================
      rate_limits: {
        Row: {
          plan: string
          requests_per_minute: number
          requests_per_day: number
        }
        Insert: {
          plan: string
          requests_per_minute: number
          requests_per_day: number
        }
        Update: {
          plan?: string
          requests_per_minute?: number
          requests_per_day?: number
        }
      }
      // ============================================
      // API使用量日次集計テーブル
      // ============================================
      api_usage_daily: {
        Row: {
          id: string
          organization_id: string
          date: string
          total_requests: number
          successful_requests: number
          failed_requests: number
          avg_response_time_ms: number
          endpoints: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          date: string
          total_requests?: number
          successful_requests?: number
          failed_requests?: number
          avg_response_time_ms?: number
          endpoints?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          date?: string
          total_requests?: number
          successful_requests?: number
          failed_requests?: number
          avg_response_time_ms?: number
          endpoints?: Json
          created_at?: string
          updated_at?: string
        }
      }
      // ============================================
      // 代理店テーブル
      // ============================================
      agents: {
        Row: {
          id: string
          organization_id: string
          code: string
          company: string
          name: string
          email: string
          phone: string | null
          address: string | null
          status: 'active' | 'inactive' | 'pending'
          commission_rate: number
          total_sales: number
          total_commission: number
          notes: string | null
          joined_at: string
          created_at: string
          updated_at: string
          custom_fields: Record<string, string> | null
        }
        Insert: {
          id?: string
          organization_id: string
          code: string
          company: string
          name: string
          email: string
          phone?: string | null
          address?: string | null
          status?: 'active' | 'inactive' | 'pending'
          commission_rate?: number
          total_sales?: number
          total_commission?: number
          notes?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
          custom_fields?: Record<string, string> | null
        }
        Update: {
          id?: string
          organization_id?: string
          code?: string
          company?: string
          name?: string
          email?: string
          phone?: string | null
          address?: string | null
          status?: 'active' | 'inactive' | 'pending'
          commission_rate?: number
          total_sales?: number
          total_commission?: number
          notes?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
          custom_fields?: Record<string, string> | null
        }
      }
      // ============================================
      // 通知BOXテーブル (021)
      // ============================================
      notifications: {
        Row: {
          id: string
          organization_id: string
          customer_id: string
          type: 'message_received' | 'review_posted' | 'product_approved' | 'event_announced' | 'general'
          title: string
          body: string | null
          related_id: string | null
          related_type: 'message' | 'event' | 'product' | 'review' | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          customer_id: string
          type?: 'message_received' | 'review_posted' | 'product_approved' | 'event_announced' | 'general'
          title: string
          body?: string | null
          related_id?: string | null
          related_type?: 'message' | 'event' | 'product' | 'review' | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          customer_id?: string
          type?: 'message_received' | 'review_posted' | 'product_approved' | 'event_announced' | 'general'
          title?: string
          body?: string | null
          related_id?: string | null
          related_type?: 'message' | 'event' | 'product' | 'review' | null
          is_read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// ============================================
// テナント機能フラグ型定義 (021)
// organizations.features JSONB のスキーマ
// ============================================
export interface OrganizationFeatures {
  /** ① 通知BOX機能: 会員の通知履歴を管理する */
  notification_box: boolean
  /** ② イベント告知 → 通知配信: POST /events 時に通知BOXへも記録する */
  event_notification: boolean
  /** ③ 紹介コード（アフィリエイト）機能: 会員登録時に referral_code を自動生成 */
  referral_code: boolean
  /** ④ メルマガ配信頻度制限: null=無制限, number=月n回まで */
  newsletter_frequency_limit: number | null
  /** ⑤ メッセージ月間送信上限: null=無制限, number=月n社まで */
  message_monthly_limit: number | null
  /** ⑥ 商品審査フロー: 商品登録後に審査中→承認→公開のワークフローを有効化 */
  product_approval_flow: boolean
  /** アナリティクス機能（020から引継ぎ） */
  analytics?: boolean
}

export const DEFAULT_ORGANIZATION_FEATURES: OrganizationFeatures = {
  notification_box: false,
  event_notification: false,
  referral_code: false,
  newsletter_frequency_limit: null,
  message_monthly_limit: null,
  product_approval_flow: false,
}
