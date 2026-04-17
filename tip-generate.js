// api/tip-generate.js
// Vercel Cron Job から呼ばれる関数
// 毎朝 6:00 JST (= 21:00 UTC 前日) に自動実行し、今日のTipsを生成・保存する
//
// vercel.json で以下のように設定:
// "crons": [{ "path": "/api/tip-generate", "schedule": "0 21 * * *" }]

const { supabase } = require("../lib/supabase");
const { generateTip } = require("../lib/generateTip");

module.exports = async function handler(req, res) {
  // Vercel Cron または手動実行のみ許可
  const authHeader = req.headers.authorization;
  if (
    req.method !== "GET" ||
    (authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      process.env.NODE_ENV !== "development")
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // JST での今日の日付を取得
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = jst.toISOString().split("T")[0];

  try {
    // すでに今日のTipsが存在するか確認
    const { data: existing } = await supabase
      .from("tips")
      .select("id")
      .eq("date", dateStr)
      .single();

    if (existing) {
      return res.status(200).json({
        message: "今日のTipsはすでに生成済みです",
        date: dateStr,
      });
    }

    // Claude API でTipsを生成
    console.log(`[${dateStr}] Tips を生成中...`);
    const tip = await generateTip(dateStr);

    // Supabase に保存
    const { error } = await supabase.from("tips").insert([
      {
        date: tip.date,
        date_label: tip.dateLabel,
        title: tip.title,
        body: tip.body,
        emoji: tip.emoji,
        tag: tip.tag,
      },
    ]);

    if (error) throw error;

    console.log(`[${dateStr}] Tips を保存しました: ${tip.title}`);
    return res.status(200).json({ message: "Tips を生成しました", tip });
  } catch (err) {
    console.error("Tips 生成エラー:", err);
    return res.status(500).json({ error: err.message });
  }
};
