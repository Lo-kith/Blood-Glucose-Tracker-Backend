const TZ = process.env.APP_TZ || 'Asia/Kolkata';

// today's date in the user's timezone, e.g. '2026-11-15'
const todayStr = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

const iso = d => d.toISOString().slice(0, 10);

function getRanges(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const pad = n => String(n).padStart(2, '0');
  return {
    daily:        { from: dateStr, to: dateStr },
    monthToDate:  { from: `${y}-${pad(m)}-01`, to: dateStr },
    monthly: {                                        // whole previous month
      from: iso(new Date(Date.UTC(y, m - 2, 1))),
      to:   iso(new Date(Date.UTC(y, m - 1, 0))),
    },
  };
}
module.exports = { todayStr, getRanges };