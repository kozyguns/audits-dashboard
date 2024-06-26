// pages/api/updateEmployee.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '@/utils/cors';
import { supabase } from '@/utils/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).json({ message: 'CORS preflight request success' });
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'POST') {
    const { user_uuid, name, department, contact_info } = req.body;

    // Step 1: Check if an entry with the given email exists
    const { data: existingEmployee, error: fetchError } = await supabase
      .from('employees')
      .select('*')
      .eq('contact_info', contact_info.toLowerCase())
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than 'no rows returned'
      console.error('Error fetching existing employee:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    // Step 2: If an entry with the email exists, update it with user_uuid
    if (existingEmployee) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ user_uuid, name, department })
        .eq('contact_info', contact_info.toLowerCase());

      if (updateError) {
        console.error('Error updating employee:', updateError);
        return res.status(500).json({ error: updateError.message });
      }

      return res.status(200).json({ message: 'User updated successfully for existing employee' });
    }

    // Step 3: If no entry with the email exists, proceed with upsert
    const { data, error } = await supabase
      .from('employees')
      .upsert({
        user_uuid,
        name,
        department,
        contact_info: contact_info.toLowerCase()
      }, {
        onConflict: 'user_uuid'
      });

    if (error) {
      console.error('Error updating or creating employee:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: 'User created or updated successfully', data });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
