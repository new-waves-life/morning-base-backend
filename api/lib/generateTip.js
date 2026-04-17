const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TAGS = ["パフォーマンス", "身体", "習慣", "回復", "メンタル", "栄養"];

function getTodayTag(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return TAGS[d.getDay() % TAGS.length];
}

async function generateTip(dateStr) {
  const tag = getTodayTag(dateStr);
  const d = new Date(dateStr + "T00:00:00");
  const weekdayJa = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  const dateLabel = `${d.getMonth() + 1}/${d.getDate()}（${weekdayJa}）`;

  const prompt = `あなたはMORNING BASEのAIコーチです。
MORNING BASEは経営者・ハイキャリア層向けの平日朝6:30・15分のオンライン朝コンディショニングコミュニティです。

今日（${dateLabel}）のテーマカテゴリは「${tag}」です。

以下の条件でTipsを1件生成してください：
- 経営者・ハイキャリア層が朝6:30に読んで「なるほど」と思える内容
- 朝のコンディショニングや今日のパフォーマンスに直結する実践的な知見
- 抽象論ではなく「今日この瞬間に使える」具体的な話

必ずJSON形式のみで返してください：
{
  "title": "Tips のタイトル（20字以内）",
  "body": "Tips の本文（100〜150字、3〜4文）",
  "emoji": "タイトルに合う絵文字1文字",
  "tag": "${tag}"
}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSONが返ってきませんでした: " + text);

  const tip = JSON.parse(jsonMatch[0]);
  if (!tip.title || !tip.body || !tip.emoji || !tip.tag) {
    throw new Error("フィールド不足: " + JSON.stringify(tip));
  }

  return { ...tip, date: dateStr, dateLabel };
}

module.exports = { generateTip };
