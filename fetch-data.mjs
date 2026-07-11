// 每週自動更新：重抓中油零售油價與國際原油，重算 7D3B 預測，
// 產出 data.json 並更新 history.json（回填實際牌價、附加最新預測）。
// 由 GitHub Action 執行；Node 18+ 內建 fetch / FormData。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASE = 'https://www2.moeaea.gov.tw/oil111';
const HEADERS = {
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (oil-price-predictor auto-updater)'
};
const BARREL_L = 158.987;
const PASSTHROUGH = 0.9;

const p2 = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}/${p2(d.getMonth() + 1)}/${p2(d.getDate())}`;
function nextMonday(dstr) {
  const [y, m, d] = dstr.split('/').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + ((8 - dt.getDay()) % 7 || 7));
  return ymd(dt);
}

async function post(path, obj) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.append(k, v);
  const r = await fetch(BASE + path, { method: 'POST', headers: HEADERS, body: fd });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
}

async function main() {
  const today = ymd(new Date());

  // 1) 零售油價（週）2019 至今
  const rj = await post('/Gasoline/RetailPrice/load', { start: '2019/01/01', end: today });
  const retail = [...rj.data.gasoline].reverse()          // 由舊到新
    .map(r => ({ date: r.Date, A92: r.A92, A95: r.A95, A98: r.A98, Ad: r.Achai }));
  const cur = retail[retail.length - 1];

  // 2) 國際原油（日）：杜拜/布蘭特/匯率
  const cj = await post('/CrudeOil/CrudeOil/load', { unit: 'day' });
  const dyAll = [...cj.data.crudeoil].reverse().filter(d => d.Dubit && d.Burant);

  // 3) 7D3B 預測
  const rows = dyAll.map(d => ({ v: 0.7 * d.Dubit + 0.3 * d.Burant, fx: d.Trade }));
  const fxArr = rows.map(r => r.fx).filter(Boolean);
  const fx = fxArr.reduce((a, b) => a + b, 0) / fxArr.length;
  const n = rows.length;
  const avg = a => a.reduce((s, r) => s + r.v, 0) / a.length;
  const wk1 = rows.slice(n - 7), wk0 = rows.slice(n - 14, n - 7);
  const a1 = avg(wk1), a0 = avg(wk0);
  const dUSD = a1 - a0;
  const dTWDL = dUSD * fx / BARREL_L;
  const predDelta = +(dTWDL * PASSTHROUGH).toFixed(2);
  const predDate = nextMonday(cur.date);
  const predictedA95 = +(cur.A95 + predDelta).toFixed(1);

  // 4) 寫 data.json
  const enc = v => Math.round(v * 10);
  const data = {
    generated: today, fx: +fx.toFixed(3),
    pred: {
      predDate, currentDate: cur.date, currentA95: cur.A95, predictedA95, predDelta,
      thisWeek7D3B: +a1.toFixed(2), lastWeek7D3B: +a0.toFixed(2), dUSD: +dUSD.toFixed(2),
      dTWDL: +dTWDL.toFixed(3), passthrough: PASSTHROUGH, fx: +fx.toFixed(3),
    },
    current: { date: cur.date, A92: cur.A92, A95: cur.A95, A98: cur.A98, Ad: cur.Ad },
    crudeDaily: dyAll.map(d => [d.SurDate.slice(5).replace('/', ''), d.Dubit, d.Burant]),
    dates: retail.map(r => r.date.slice(2).replace(/\//g, '')),
    p92: retail.map(r => enc(r.A92)), p95: retail.map(r => enc(r.A95)),
    p98: retail.map(r => enc(r.A98)), pd: retail.map(r => enc(r.Ad)),
  };
  writeFileSync('data.json', JSON.stringify(data));

  // 5) 更新 history.json
  const retailByDate = new Map(retail.map(r => [r.date, r.A95]));
  let hist = { updated: today, note: '每週由 GitHub Action 自動更新。', entries: [] };
  if (existsSync('history.json')) hist = JSON.parse(readFileSync('history.json', 'utf8'));

  const sgn = x => (Math.abs(x) < 0.05 ? 0 : Math.sign(x));
  // 回填已到期預測的實際牌價
  for (const e of hist.entries) {
    if (e.actual == null && retailByDate.has(e.predDate)) {
      e.actual = retailByDate.get(e.predDate);
      e.correct = sgn(e.predicted - e.basedOn) === sgn(e.actual - e.basedOn);
    }
  }
  // 附加本週最新預測（若尚未存在）
  if (!hist.entries.some(e => e.predDate === predDate)) {
    hist.entries.push({ predDate, madeOn: today, basedOn: cur.A95, predicted: predictedA95, actual: null, correct: null });
  }
  hist.updated = today;
  writeFileSync('history.json', JSON.stringify(hist, null, 2));

  console.log(`OK: ${cur.date} 95=${cur.A95} -> ${predDate} 預測 ${predictedA95} (${predDelta >= 0 ? '+' : ''}${predDelta})`);
}

main().catch(e => { console.error(e); process.exit(1); });
