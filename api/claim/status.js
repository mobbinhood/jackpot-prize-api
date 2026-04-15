import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing code parameter' });
    }

    const { data, error } = await supabase
      .from('nfc_codes')
      .select('code, prize_type, prize_value, is_claimed, claimed_at')
      .eq('code', code)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Code not found' });
    }

    return res.status(200).json({
      code: data.code,
      prize: data.prize_value,
      is_claimed: data.is_claimed,
      claimed_at: data.claimed_at,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
