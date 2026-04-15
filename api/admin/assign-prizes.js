import { supabase } from '../../lib/supabase.js';

// Prize distribution (customize these percentages)
const PRIZE_DISTRIBUTION = [
  { type: 'gift_card', value: '$5 Starbucks Gift Card', weight: 40 },
  { type: 'gift_card', value: '$10 Target Gift Card', weight: 25 },
  { type: 'gift_card', value: '$25 Amazon Gift Card', weight: 15 },
  { type: 'gift_card', value: '$50 Sephora Gift Card', weight: 10 },
  { type: 'electronics', value: 'AirPods Pro', weight: 5 },
  { type: 'electronics', value: 'Apple Watch', weight: 3 },
  { type: 'electronics', value: 'iPad', weight: 1.5 },
  { type: 'jackpot', value: '$10,000 Grand Prize', weight: 0.5 },
];

function getRandomPrize() {
  const totalWeight = PRIZE_DISTRIBUTION.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const prize of PRIZE_DISTRIBUTION) {
    random -= prize.weight;
    if (random <= 0) {
      return prize;
    }
  }
  
  return PRIZE_DISTRIBUTION[0]; // Fallback
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { codes, admin_key } = req.body;

    // Simple admin auth
    if (admin_key !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!codes || !Array.isArray(codes)) {
      return res.status(400).json({ error: 'Invalid codes array' });
    }

    const records = codes.map(code => {
      const prize = getRandomPrize();
      return {
        code,
        prize_type: prize.type,
        prize_value: prize.value,
        is_claimed: false,
      };
    });

    const { data, error } = await supabase
      .from('nfc_codes')
      .insert(records)
      .select();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ 
        error: 'Failed to assign prizes', 
        details: error.message,
        hint: error.hint 
      });
    }

    return res.status(200).json({
      success: true,
      count: data.length,
      prizes: data,
    });
  } catch (error) {
    console.error('Assign prizes error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
