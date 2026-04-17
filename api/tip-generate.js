const { supabase } = require("../lib/supabase");
const { generateTip } = require("../lib/generateTip");

module.exports = async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (
    req.method !== "GET" ||
    (authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      process.env.NODE_ENV !== "development")
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = jst.toISOString().split("T")[0];

  try {
    const { data: existing } = await supabase
      .from("tips").select("id").eq("date", dateStr).single();

    if (existing) {
      return res.status(200).json({ message: "今日のTipsはすでに生成済みです", date: dateStr });
    }

    const tip = await generateTip(dateStr);

    const { error } = await supabase.from("tips").insert([{
      date: tip.date,
      date_label: tip.dateLabel,
      title: tip.title,
      body: tip.body,
      emoji: tip.emoji,
      tag: tip.tag,
    }]);

    if (error) throw error;
    return res.status(200).json({ message: "Tips を生成しました", tip });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
