const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const METERS_PER_MILE = 1609.34;

function getWeeklyMiles(activities){

    const currentDay = new Date().getDay() // 0-Sunday, 6-Saturday
    const daysSinceMon = (currentDay - 1 + 7) % 7

    const monday = new Date();
    monday.setDate(monday.getDate() - daysSinceMon); // today - days since monday
    monday.setHours(0,0,0,0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23,59,59,999);

    // filter activities down to just this week (mon-sun)
    const weekActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.start_date_local);
        return activityDate >= monday && activityDate <= sunday;
    }); 

    // start each day at 0 miles, keyed by weekday name
    const milesByDay = {};
    DAY_NAMES.forEach((day) => { milesByDay[day] = 0; });

    // add each activity's distance onto its weekday's total
    weekActivities.forEach((activity) => {
        const activityDate = new Date(activity.start_date_local);
        const dayName = DAY_NAMES[activityDate.getDay()];
        milesByDay[dayName] += activity.distance / METERS_PER_MILE;
    });

    // return Mon-Sun order as an array, ready for a graph
    const mondayToSunday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return mondayToSunday.map((day) => ({
        day,
        miles: Math.round(milesByDay[day] * 100) / 100,
    }));
}

module.exports = getWeeklyMiles;