// api/tip-today.js
const { supabase } = require("../lib/supabase");
const { generateTip } = require("../lib/generateTip");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = jst.toISOString().split("T")[0];

  try {
    const { data, error } = await supabase
      .from("tips")
      .select("*")
      .eq("date", dateStr)
      .single();

    if (data && !error) {
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({ tip: data, source: "db" });
    }

    const tip = await generateTip(dateStr);

    supabase.from("tips").insert([{
      date: tip.date,
      date_label: tip.dateLabel,
      title: tip.title,
      body: tip.body,
      emoji: tip.emoji,
      tag: tip.tag,
    }]).then(({ error: e }) => {
      if (e) console.error("保存エラー:", e.message);
    });

    return res.status(200).json({ tip, source: "generated" });
  } catch (err) {
    console.error("tip-today エラー:", err);
    return res.status(200).json({
      tip: {
        date: dateStr,
        title: "今日も6:30に集まれた",
        body: "早起きして朝の場に来るだけで、あなたは平均よりずっと前に進んでいます。",
        emoji: "🌅",
        tag: "習慣",
      },
      source: "fallback",
    });
  }
};
