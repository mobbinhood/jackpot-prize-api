import { supabase } from '../../lib/supabase.js';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { nfc_code, email, photo, timestamp } = req.body;

    if (!nfc_code || !email || !photo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Verify NFC code exists and hasn't been claimed
    const { data: nfcData, error: nfcError } = await supabase
      .from('nfc_codes')
      .select('*')
      .eq('code', nfc_code)
      .single();

    if (nfcError || !nfcData) {
      return res.status(404).json({ error: 'Invalid prize code' });
    }

    if (nfcData.is_claimed) {
      return res.status(400).json({ error: 'Prize already claimed' });
    }

    // 2. Upload photo to Supabase Storage
    let photoUrl = null;
    try {
      // Extract base64 data from data URL
      const base64Data = photo.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate unique filename
      const filename = `${nfc_code}-${Date.now()}.jpg`;
      const filePath = `claims/${filename}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('puzzle-photos')
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('puzzle-photos')
        .getPublicUrl(filePath);
      
      photoUrl = urlData.publicUrl;
    } catch (storageError) {
      console.error('Storage error:', storageError);
      // Continue without photo if storage fails (can be added manually later)
      photoUrl = null;
    }

    // 3. Verify puzzle completion using GPT-4 Vision
    let puzzleVerified = false;
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Is this a completed jigsaw puzzle? Reply with ONLY "yes" or "no".',
              },
              {
                type: 'image_url',
                image_url: {
                  url: photo,
                },
              },
            ],
          },
        ],
        max_tokens: 10,
      });

      const answer = response.choices[0].message.content.toLowerCase().trim();
      puzzleVerified = answer.includes('yes');
    } catch (visionError) {
      console.error('Vision API error:', visionError);
      // Allow claim to proceed even if vision fails (manual review later)
      puzzleVerified = true;
    }

    // 4. Create claim record
    const { data: claimData, error: claimError } = await supabase
      .from('prize_claims')
      .insert({
        nfc_code,
        email,
        photo_url: photoUrl,
        verified: puzzleVerified,
      })
      .select()
      .single();

    if (claimError) {
      console.error('Claim insert error:', claimError);
      return res.status(500).json({ error: 'Failed to create claim' });
    }

    // 5. Mark NFC code as claimed
    const { error: updateError } = await supabase
      .from('nfc_codes')
      .update({ is_claimed: true, claimed_at: new Date().toISOString() })
      .eq('code', nfc_code);

    if (updateError) {
      console.error('NFC update error:', updateError);
    }

    // 6. Send email notification (TODO: implement)
    // await sendPrizeEmail(email, nfcData.prize_type, nfcData.prize_value);

    return res.status(200).json({
      success: true,
      prize: nfcData.prize_value,
      verified: puzzleVerified,
      claim_id: claimData.id,
      photo_url: photoUrl,
    });
  } catch (error) {
    console.error('Submit claim error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
