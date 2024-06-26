// src/pages/api/submitRangeRepairs.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).json({ message: 'CORS preflight request success' });
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'POST') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError) {
      return res.status(401).json({ error: userError.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { date_of_repair, lanes_repaired, description, role } = req.body;

    try {
      const { error } = await supabase
        .from('range_repair_reports')
        .insert([
          {
            user_uuid: user.id,
            user_name: user.user_metadata.full_name,
            date_of_repair,
            lanes_repaired,
            description,
            role
          }
        ]);

      if (error) {
        throw error;
      }

      res.status(200).json({ message: 'Report submitted successfully.' });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred.' });
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
