import { supabase } from '@/integrations/supabase/client';

/**
 * Busca todos os registros de uma tabela, paginando automaticamente
 * para contornar o limite de 1000 registros do Supabase.
 */
export async function fetchAll(
  table: string,
  options?: {
    select?: string;
    eq?: [string, any];
    order?: [string, { ascending: boolean }];
  }
): Promise<any[]> {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(table)
      .select(options?.select || '*')
      .range(from, from + PAGE_SIZE - 1);

    if (options?.eq) {
      query = query.eq(options.eq[0], options.eq[1]);
    }
    if (options?.order) {
      query = query.order(options.order[0], options.order[1]);
    }

    const { data, error } = await query;
    if (error) throw error;

    allData = allData.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allData;
}
