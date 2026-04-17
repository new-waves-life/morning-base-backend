// lib/supabase.js
// Supabase クライアント（サーバーサイド専用）

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role key（サーバー専用・公開不可）
);

module.exports = { supabase };
