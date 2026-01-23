'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';

// 型定義
type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerAddress = Database['public']['Tables']['customer_addresses']['Row'];

// 顧客とリレーションを含んだ型
export interface CustomerWithAddresses extends Customer {
  addresses: CustomerAddress[];
}

// 顧客一覧を取得
export async function getCustomers(organizationId: string): Promise<{
  data: CustomerWithAddresses[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 顧客を取得
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (customersError) throw customersError;
    if (!customers || customers.length === 0) {
      return { data: [], error: null };
    }

    const customerIds = customers.map(c => c.id);

    // 住所を取得
    const { data: addresses, error: addressesError } = await supabase
      .from('customer_addresses')
      .select('*')
      .in('customer_id', customerIds);

    if (addressesError) throw addressesError;

    // データを結合
    const customersWithAddresses: CustomerWithAddresses[] = customers.map(customer => ({
      ...customer,
      addresses: addresses?.filter(addr => addr.customer_id === customer.id) || [],
    }));

    return { data: customersWithAddresses, error: null };
  } catch (err) {
    console.error('Failed to fetch customers:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch customers',
    };
  }
}

// 顧客詳細を取得
export async function getCustomer(customerId: string): Promise<{
  data: CustomerWithAddresses | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 顧客を取得
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // 住所を取得
    const { data: addresses, error: addressesError } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId);

    if (addressesError) throw addressesError;

    return {
      data: {
        ...customer,
        addresses: addresses || [],
      },
      error: null,
    };
  } catch (err) {
    console.error('Failed to fetch customer:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch customer',
    };
  }
}

// 顧客作成用の入力型
interface CreateCustomerInput {
  organizationId: string;
  type?: 'individual' | 'business';
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  tags?: string[];
  // 住所（オプション）
  address?: {
    postalCode: string;
    prefecture: string;
    city: string;
    line1: string;
    line2?: string;
    phone?: string;
    isDefault?: boolean;
  };
}

// 顧客を作成
export async function createCustomer(input: CreateCustomerInput): Promise<{
  data: CustomerWithAddresses | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 顧客を作成
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        organization_id: input.organizationId,
        type: input.type || 'individual',
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        notes: input.notes,
        tags: input.tags || [],
      })
      .select()
      .single();

    if (customerError) throw customerError;

    let addresses: CustomerAddress[] = [];

    // 住所がある場合は作成
    if (input.address) {
      const { data: addressData, error: addressError } = await supabase
        .from('customer_addresses')
        .insert({
          customer_id: customer.id,
          postal_code: input.address.postalCode,
          prefecture: input.address.prefecture,
          city: input.address.city,
          line1: input.address.line1,
          line2: input.address.line2,
          phone: input.address.phone,
          is_default: input.address.isDefault ?? true,
        })
        .select();

      if (addressError) throw addressError;
      addresses = addressData || [];
    }

    revalidatePath('/customers');

    return {
      data: {
        ...customer,
        addresses,
      },
      error: null,
    };
  } catch (err) {
    console.error('Failed to create customer:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create customer',
    };
  }
}

// 顧客更新用の入力型
interface UpdateCustomerInput {
  id: string;
  type?: 'individual' | 'business';
  name?: string;
  email?: string;
  phone?: string | null;
  company?: string | null;
  notes?: string | null;
  tags?: string[];
}

// 顧客を更新
export async function updateCustomer(input: UpdateCustomerInput): Promise<{
  data: Customer | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const updateData: Record<string, unknown> = {};
    if (input.type !== undefined) updateData.type = input.type;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.company !== undefined) updateData.company = input.company;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.tags !== undefined) updateData.tags = input.tags;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/customers');
    revalidatePath(`/customers/${input.id}`);

    return { data, error: null };
  } catch (err) {
    console.error('Failed to update customer:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update customer',
    };
  }
}

// 顧客を削除
export async function deleteCustomer(customerId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 住所は CASCADE で自動削除される
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) throw error;

    revalidatePath('/customers');

    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to delete customer:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete customer',
    };
  }
}

// 住所を追加
export async function addCustomerAddress(
  customerId: string,
  address: {
    postalCode: string;
    prefecture: string;
    city: string;
    line1: string;
    line2?: string;
    phone?: string;
    isDefault?: boolean;
  }
): Promise<{
  data: CustomerAddress | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // デフォルトに設定する場合、既存のデフォルトを解除
    if (address.isDefault) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', customerId);
    }

    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: customerId,
        postal_code: address.postalCode,
        prefecture: address.prefecture,
        city: address.city,
        line1: address.line1,
        line2: address.line2,
        phone: address.phone,
        is_default: address.isDefault ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/customers/${customerId}`);

    return { data, error: null };
  } catch (err) {
    console.error('Failed to add customer address:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to add customer address',
    };
  }
}

// 住所を削除
export async function deleteCustomerAddress(addressId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', addressId);

    if (error) throw error;

    revalidatePath('/customers');

    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to delete customer address:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete customer address',
    };
  }
}

// 住所をデフォルトに設定
export async function setDefaultAddress(
  customerId: string,
  addressId: string
): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 既存のデフォルトを解除
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);

    // 新しいデフォルトを設定
    const { error } = await supabase
      .from('customer_addresses')
      .update({ is_default: true })
      .eq('id', addressId);

    if (error) throw error;

    revalidatePath(`/customers/${customerId}`);

    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to set default address:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to set default address',
    };
  }
}

