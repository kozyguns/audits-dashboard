import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase/client';
import { corsHeaders } from '@/utils/cors';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'OPTIONS') {
    res.status(200).json({ message: 'CORS preflight request success' });
    return;
}

res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  try {
    const { filters } = req.body;

    let query = supabase
      .from('sales_data')
      .select('SoldQty, subcategory_label');

    if (filters && filters.length > 0) {
      filters.forEach((filter: { column: string, value: string }) => {
        query = query.ilike(filter.column, `%${filter.value}%`);
      });
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalDROS = data.reduce((total, row) => {
      if (row.subcategory_label) {
        return total + (row.SoldQty || 0);
      }
      return total;
    }, 0);

    res.status(200).json({ totalDROS });
  } catch (error) {
    console.error('Error calculating total DROS:', error);
    res.status(500).json({ error: 'Failed to calculate total DROS' });
  }
};