-- Supabase Database Schema for Dumpzone
-- Run this in your Supabase SQL Editor

-- Current Day Content Table
CREATE TABLE IF NOT EXISTS current_day (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_id TEXT,
  mutation_id TEXT,
  UNIQUE(user_id, date)
);

-- Dump Entries (History) Table
CREATE TABLE IF NOT EXISTS dump_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_current_day_user_date ON current_day(user_id, date);
CREATE INDEX IF NOT EXISTS idx_dump_entries_user_id ON dump_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_dump_entries_timestamp ON dump_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dump_entries_date ON dump_entries(date DESC);

-- Enable Row Level Security
ALTER TABLE current_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE dump_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for current_day
CREATE POLICY "Users can view their own current day"
  ON current_day FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own current day"
  ON current_day FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own current day"
  ON current_day FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own current day"
  ON current_day FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for dump_entries
CREATE POLICY "Users can view their own dump entries"
  ON dump_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dump entries"
  ON dump_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dump entries"
  ON dump_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dump entries"
  ON dump_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Enable real-time for both tables (if real-time is enabled in your project)
-- Note: If you get an error here, go to Settings → API → Realtime and enable it first
DO $$
BEGIN
  -- Add tables to realtime publication if not already added
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE current_day;
    EXCEPTION WHEN OTHERS THEN
      -- Table might already be in publication, ignore error
      NULL;
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE dump_entries;
    EXCEPTION WHEN OTHERS THEN
      -- Table might already be in publication, ignore error
      NULL;
    END;
  END IF;
END $$;

