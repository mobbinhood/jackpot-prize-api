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

    // 2. Verify puzzle completion using GPT-4 Vision FIRST (before uploading photo)
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
                text: 'Look at this image carefully. Is this a COMPLETED jigsaw puzzle with all pieces in place? Reply with ONLY "yes" if the puzzle is fully complete, or "no" if pieces are missing, puzzle is incomplete, or this is not a puzzle.',
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
      
      console.log('Vision API response:', answer, 'Verified:', puzzleVerified);
    } catch (visionError) {
      console.error('Vision API error:', visionError);
      return res.status(500).json({ 
        error: 'Failed to verify puzzle. Please try again.',
        retry: true 
      });
    }

    // 3. If puzzle is NOT complete, reject without claiming the code
    if (!puzzleVerified) {
      return res.status(400).json({ 
        error: 'You must complete your puzzle to access your prize',
        puzzle_incomplete: true,
        retry: true 
      });
    }

    // 4. Upload photo to Supabase Storage (only if puzzle is verified)
    let photoUrl = null;
    try {
      const base64Data = photo.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      const filename = `${nfc_code}-${Date.now()}.jpg`;
      const filePath = `claims/${filename}`;
      
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

      const { data: urlData } = supabase.storage
        .from('puzzle-photos')
        .getPublicUrl(filePath);
      
      photoUrl = urlData.publicUrl;
    } catch (storageError) {
      console.error('Storage error:', storageError);
      photoUrl = null;
    }

    // 5. Create claim record
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

    // 6. Mark NFC code as claimed
    const { error: updateError } = await supabase
      .from('nfc_codes')
      .update({ is_claimed: true, claimed_at: new Date().toISOString() })
      .eq('code', nfc_code);

    if (updateError) {
      console.error('NFC update error:', updateError);
    }

    // 7. Send email notification (TODO: implement)
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
