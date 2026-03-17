// =============================================================================
// AI Summary Module — Gemini / OpenAI / Claude 対応
// =============================================================================

const PROVIDERS = {
  gemini: {
    url: (model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    buildRequest: (prompt, apiKey) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }),
    parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    defaultModel: 'gemini-1.5-flash',
  },
  openai: {
    url: () => 'https://api.openai.com/v1/chat/completions',
    buildRequest: (prompt, apiKey, model) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || '',
    defaultModel: 'gpt-4o-mini',
  },
  claude: {
    url: () => 'https://api.anthropic.com/v1/messages',
    buildRequest: (prompt, apiKey, model) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    }),
    parseResponse: (data) => data.content?.[0]?.text || '',
    defaultModel: 'claude-haiku-4-5-20251001',
  },
};

// Build the batch prompt for summarization
function buildPrompt(tabs) {
  const tabList = tabs
    .map((t, i) => `${i + 1}. [${t.title}](${t.url})`)
    .join('\n');

  return `あなたは情報整理の専門家です。以下のブラウザタブの一覧を分析し、JSON形式で要約してください。

## タブ一覧
${tabList}

## 出力フォーマット（厳密なJSON）
{
  "category": "タブ群の主要カテゴリ（例: 技術リサーチ, ニュース, ショッピング等）",
  "summary": "全体の要約（2-3文）",
  "tabs": [
    {
      "title": "タブタイトル",
      "url": "URL",
      "oneLiner": "このページの1行要約"
    }
  ],
  "actionItems": ["次にやるべきアクション（あれば）"]
}

JSONのみ出力してください。説明文は不要です。`;
}

// Parse AI response — handle markdown code blocks
function parseAIResponse(text) {
  let cleaned = text.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Summarize a batch of tabs using the configured AI provider.
 * Returns an archive entry object ready for storage.
 */
export async function summarizeAndArchiveTabs(tabs) {
  const settings = await chrome.storage.local.get({
    aiProvider: 'gemini',
    apiKey: '',
    aiModel: '',
    subscriptionActive: false,
  });

  const providerKey = settings.aiProvider;
  const provider = PROVIDERS[providerKey];
  if (!provider) throw new Error(`Unknown AI provider: ${providerKey}`);

  const apiKey = settings.apiKey;
  if (!apiKey) {
    throw new Error(
      'APIキーが設定されていません。オプションページで設定してください。'
    );
  }

  const model = settings.aiModel || provider.defaultModel;
  const prompt = buildPrompt(tabs);
  const requestInit = provider.buildRequest(prompt, apiKey, model);
  const url = provider.url(model);

  const response = await fetch(url, requestInit);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawText = provider.parseResponse(data);

  let parsed;
  try {
    parsed = parseAIResponse(rawText);
  } catch {
    // Fallback: create a simple summary without AI parsing
    parsed = {
      category: 'Uncategorized',
      summary: rawText.slice(0, 200),
      tabs: tabs.map((t) => ({
        title: t.title,
        url: t.url,
        oneLiner: t.title,
      })),
      actionItems: [],
    };
  }

  return {
    id: crypto.randomUUID(),
    archivedAt: new Date().toISOString(),
    category: parsed.category,
    summary: parsed.summary,
    tabs: parsed.tabs,
    actionItems: parsed.actionItems || [],
  };
}
