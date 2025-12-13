# Supabase Setup Guide

This guide will help you set up Supabase for the chat room application.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details and wait for it to be created

## 2. Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## 3. Set Up Environment Variables

1. Create a `.env` file in the root of your project
2. Add the following:

```
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace `your_project_url_here` and `your_anon_key_here` with the values from step 2.

## 4. Create the Messages Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Run the following SQL to create the messages table:

```sql
-- Create messages table
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read messages
CREATE POLICY "Anyone can read messages"
  ON messages
  FOR SELECT
  USING (true);

-- Create a policy that allows anyone to insert messages
CREATE POLICY "Anyone can insert messages"
  ON messages
  FOR INSERT
  WITH CHECK (true);

-- Create an index on created_at for faster queries
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

3. Click "Run" to execute the SQL

## 5. Enable Realtime (Optional but Recommended)

1. In your Supabase dashboard, go to **Database** → **Replication**
2. Find the `messages` table
3. Toggle the switch to enable replication for the `messages` table

This enables real-time updates when new messages are added.

## 6. Test the Setup

1. Start your development server: `npm run dev`
2. Enter a name and join the chat room
3. Send a message - it should be saved to the database
4. Refresh the page - your messages should still be there!

## Troubleshooting

- **"Missing Supabase environment variables"**: Make sure your `.env` file exists and has the correct variable names
- **"Failed to send message"**: Check that the `messages` table exists and RLS policies are set up correctly
- **Messages not appearing in real-time**: Make sure Realtime is enabled for the `messages` table
