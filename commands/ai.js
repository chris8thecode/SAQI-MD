/* SAQI-MD — AI: saari AI aliases (gpt/gemini/claude/grok...) ek hi Gemini engine par.
 * GEMINI_API_KEY .env me ho to sab live, warna har command clearly batati hy.
 */
const config = require('../config');

const STYLE_NOTES = {
  grok: 'Jawab thoda witty aur sharp style me do.',
  claude: 'Jawab thoughtful aur clear style me do.',
  deepseek: 'Coding ya technical sawal ho to detail se jawab do.',
  mathgpt: 'Ye maths sawal hy — step by step solve karo.',
  grammar: 'Ye grammar check ka sawal hy — sahi karo aur galtiyan batao.',
};

const AI_MODELS = [config.GEMINI_MODEL, 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'].filter((v, i, a) => v && a.indexOf(v) === i);

async function askGemini(prompt, imageBase64 = null) {
  const parts = [{ text: prompt }];
  if (imageBase64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } });
  let lastErr;
  for (const model of AI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: 800 } }),
        signal: AbortSignal.timeout(20000), // hang par agli model try — kabhi atka nahi
      });
      if (!res.ok) { lastErr = new Error(`AI API error ${res.status}`); continue; }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('');
      if (text) return text;
      lastErr = new Error('Koi jawab nahi mila');
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('AI API error');
}

async function downloadImageBase64(msg) {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const stream = await downloadContentFromMessage(msg, 'image');
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks).toString('base64');
}

async function handler(m, sock) {
  if (!config.GEMINI_API_KEY) {
    return m.reply('⚠️ AI key set nahi hy — owner se GEMINI_API_KEY mangwao (aistudio.google.com/apikey par free milti hy).');
  }
  let prompt = m.arg;
  let img = null;
  const imgMsg = m.message?.imageMessage || m.quoted?.message?.imageMessage;
  if (imgMsg) {
    prompt = prompt || 'Is image ko describe karo.';
    img = await downloadImageBase64(imgMsg);
  }
  if (!prompt) return m.reply(`❌ Sawal likho. Example: ${config.PREFIX}${m.command} Pakistan ka capital kya hy?`);
  const style = STYLE_NOTES[m.command.replace(/[0-9]/g, '')] || '';
  const answer = await askGemini(style ? `${prompt}\n(${style})` : prompt, img);
  await m.reply(`🤖 *${config.BOT_NAME} AI*\n\n${answer}`);
}

// JAWAD-MD ke menu wali poora AI alias list
const NAMES = [
  'ai','bot','gpt','gpt3','gpt35turbo','gpt4','gpt4turbo','gpt4o','gpt4omini','gpt4vision','gpt4all',
  'gpt5','gpt5mini','chatgpt','chatgpt35','chatgpt4','chatgpt4o','chatgpt4turbo','chatgptplus','chatgptelite',
  'o1','o1mini','o1preview','o3','o3mini','o4','copilot','mscopilot','elitecopilot',
  'deepseek','deepseekv2','deepseekv3','deepseekr1','deepseekcoder','deepseekcoder2','deepseekmath','deepseekllm','deepseekvl','deepseekchat',
  'gemini','geminipro','geminiultra','geminiano','gemini15','gemini15pro','gemini15flash','gemini20','gemini20flash','gemini25','gemini25pro','gemini25flash',
  'bard','palm','palm2','grok','grok1','grok15','grok2','grok2mini','grok3','grok3mini','grok4','grokbeta','grokvision',
  'claude','claude1','claude2','claudeinstant','claude3','claude3opus','claude3sonnet','claude3haiku','claude35','claude35sonnet','claude35haiku','claude37','claude37sonnet','claude4','claude4opus','claude4sonnet','claudeopus','claudesonnet','claudehaiku',
  'qwen','qwen15','qwen2','qwen25','qwen3','qwencoder','qwenmath','qwenvl','qwenmax','qwenplus','qwenturbo',
  'llama2','llama3','mistral','mixtral','falcon','bloom','bloomz','orca','vicuna','alpaca','phi2','wizard',
  'codet5','codex','starcoder','codegen','kimi','perplexity','yi','yi34b','command','jurassic','ai21','solar',
  'lumin','redpajama','dolly','hugging','openassistant','gptneo','gptj','flant5','starlin','talkai','brain',
  'elite','elitegpt','assistant','smart','genius','proai','ultra','maxai','nova','zenith','apex','vertex',
  'pulse','quantum','neo','omega','mathgpt','grammar',
];

module.exports.commands = NAMES.map(name => ({
  name, desc: name === 'ai' ? 'AI sawal poocho (Gemini)' : 'AI chat', category: 'AI', handler,
}));
