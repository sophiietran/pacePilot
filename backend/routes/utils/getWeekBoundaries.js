// shared week-boundary helpers for the goal/coaching-plan feature.
// uses UTC Date arithmetic, not local time. 

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// returns { weekStart, weekEnd } as UTC Dates for the Monday-Sunday week
function getWeekBoundaries(weekOffset = 0){
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const dayOfWeek = new Date(todayUTC).getUTCDay(); // 0 = Sunday
  const diffToMonday = (dayOfWeek + 6) % 7;

  const mondayUTC = todayUTC - diffToMonday * ONE_DAY_MS + weekOffset * 7 * ONE_DAY_MS;

  const weekStart = new Date(mondayUTC);
  const weekEnd = new Date(mondayUTC + 7 * ONE_DAY_MS - 1);

  return { weekStart, weekEnd };
}

// returns an array of { weekStart, weekEnd } pairs
// Used to hand Claude the exact list of weeks to fill in.
function getWeekBoundariesUntil(targetDate, startOffset = 0){
  const boundaries = [];
  let offset = startOffset;

  while (true){
    const week = getWeekBoundaries(offset);
    boundaries.push(week);

    if (week.weekEnd >= targetDate) break;
    offset++;
  }

  return boundaries;
}

module.exports = { getWeekBoundaries, getWeekBoundariesUntil };
