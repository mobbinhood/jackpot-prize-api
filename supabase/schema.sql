-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NFC Codes & Prize Assignment
CREATE TABLE nfc_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  prize_type TEXT NOT NULL,
  prize_value TEXT NOT NULL,
  is_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Prize Claims
CREATE TABLE prize_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nfc_code TEXT NOT NULL,
  email TEXT NOT NULL,
  photo_url TEXT,
  verified BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_nfc_code FOREIGN KEY (nfc_code) REFERENCES nfc_codes(code)
);

-- Create indexes for performance
CREATE INDEX idx_nfc_codes_code ON nfc_codes(code);
CREATE INDEX idx_nfc_codes_claimed ON nfc_codes(is_claimed);
CREATE INDEX idx_prize_claims_nfc ON prize_claims(nfc_code);
CREATE INDEX idx_prize_claims_email ON prize_claims(email);

-- Row Level Security (RLS) - Optional but recommended
ALTER TABLE nfc_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_claims ENABLE ROW LEVEL SECURITY;

-- Public read access to nfc_codes (for claim verification)
CREATE POLICY "Allow public read access to nfc_codes"
  ON nfc_codes FOR SELECT
  USING (true);

-- Public insert access to prize_claims (for submissions)
CREATE POLICY "Allow public insert to prize_claims"
  ON prize_claims FOR INSERT
  WITH CHECK (true);
