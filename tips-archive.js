// api/tips-archive.js
// 過去30日分のTipsアーカイブを返す

const { supabase } = require("../lib/supabase");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { data, error } = await supabase
      .from("tips")
      .select("*")
      .order("date", { ascending: false })
      .limit(30);

    if (error) throw error;

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ tips: data || [] });
  } catch (err) {
    console.error("tips-archive エラー:", err);
    return res.status(500).json({ error: err.message });
  }
};
