// api/tip-today.js
// フロントエンドから呼ばれる API
// 今日のTipsを返す。DBになければ即時生成してから返す（フォールバック）

const { supabase } = require("../lib/supabase");
const { generateTip } = require("../lib/generateTip");

// CORS ヘッダー（Netlify の frontend からのリクエストを許可）
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  // JST での今日の日付
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = jst.toISOString().split("T")[0];

  try {
    // Supabase から今日のTipsを取得
    const { data, error } = await supabase
      .from("tips")
      .select("*")
      .eq("date", dateStr)
      .single();

    if (data && !error) {
      // キャッシュヘッダー：1時間キャッシュ
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({ tip: data, source: "db" });
    }

    // DBになければ即時生成（CronJob が間に合わなかった場合のフォールバック）
    console.log(`[${dateStr}] DBにTipsなし → 即時生成`);
    const tip = await generateTip(dateStr);

    // 生成したものをDBにも保存（非同期、失敗しても続行）
    supabase.from("tips").insert([{
      date: tip.date,
      date_label: tip.dateLabel,
      title: tip.title,
      body: tip.body,
      emoji: tip.emoji,
      tag: tip.tag,
    }]).then(({ error: e }) => {
      if (e) console.error("フォールバック保存エラー:", e.message);
    });

    return res.status(200).json({ tip, source: "generated" });
  } catch (err) {
    console.error("tip-today エラー:", err);

    // 完全なフォールバック（APIもDBも失敗した場合）
    return res.status(200).json({
      tip: {
        date: dateStr,
        date_label: formatDateLabel(dateStr),
        title: "今日も6:30に集まれた",
        body: "早起きして朝の場に来るだけで、あなたは平均よりずっと前に進んでいます。コンディショニングは結果ではなく、継続そのものが目的です。今日もここにいることが、すでに成果です。",
        emoji: "🌅",
        tag: "習慣",
      },
      source: "fallback",
    });
  }
};

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const weekdayJa = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${weekdayJa}）`;
}
