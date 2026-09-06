// formats getWeeklyStats() output into system and builds user prompt to send to Claude

// format pace to MM:SS/mi
function formatPace(secondsPerMile){
    const minutes = Math.floor(secondsPerMile / 60);
    const seconds = Math.round(secondsPerMile % 60);

    return `${minutes}:${String(seconds).padStart(2, "0")}/mi`;
}

// System prompt for claude
const SYSTEM_PROMPT = `You are a running coach writing a short weekly recap for a runner.
Given this week's stats (and last week's, if available), write one short, paragraph that:
- states total miles run and number of runs this week
- states average pace, and compares it to last week's average pace if last week's data is provided
- mentions the longest run's distance and which day it happened
- ends with a brief, genuine note of encouragement
If no runs were logged this week, don't mention pace or longest run. Instead, acknowledge it was a rest week, and encourage the runner to rest up and get back to it soon.
Keep it to 2-4 sentences. Don't reuse the same sentence structure every time. Don't use em-dashes in the summary.`;

function buildMsgForSummary(thisWeek, lastWeek){
    const thisWeekText = `This week: ${thisWeek.totalMiles.toFixed(2)} miles across ${thisWeek.runCount} runs, average pace ${formatPace(thisWeek.avgPace)}, longest run ${thisWeek.longestRun.miles.toFixed(2)} miles on ${thisWeek.longestRun.day}.`;

    const lastWeekText = lastWeek
      ? `Last week: ${lastWeek.totalMiles.toFixed(2)} miles, average pace ${formatPace(lastWeek.avgPace)}.`
      : `No data from last week to compare against.`;

    return `${thisWeekText}\n${lastWeekText}`;
}

function buildRestWeekMessage(lastWeek){
    const lastWeekText = lastWeek
      ? `Last week: ${lastWeek.totalMiles.toFixed(2)} miles, average pace ${formatPace(lastWeek.avgPace)}.`
      : `No data from last week to compare against.`;

    return `No runs were logged this week.\n${lastWeekText}`;
}

module.exports = { SYSTEM_PROMPT, buildMsgForSummary, buildRestWeekMessage };