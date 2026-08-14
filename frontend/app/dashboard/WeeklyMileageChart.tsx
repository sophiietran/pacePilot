"use client"
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
} from "recharts";

type WeeklyMileageChartProps = {
  weeklyMiles: { day: string; miles: number }[];
};

// returns "Mon D - Mon D" for the current week (Monday -> Sunday)
function getWeekRangeLabel(): string {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const diffToMonday = (dayOfWeek + 6) % 7;

    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const format = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

    return `${format(monday)} - ${format(sunday)}`;
}

export default function WeeklyMileageChart({ weeklyMiles }: WeeklyMileageChartProps) {

    const totalMiles = weeklyMiles.reduce((sum, day) => sum + day.miles, 0);
    const weekRange = getWeekRangeLabel();

    return (
      <div className="flex flex-col gap-6">
        {/* date range */}
        <span className="text-2xl font-semibold text-white mb-6">
          {weekRange}
        </span>

        <div className="flex items-center border border-white/20 p-6 gap-6 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg">

          {/* bar graph */}
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={175}>
              <BarChart
                data={weeklyMiles}
                barSize={40}
                barCategoryGap="60%"
                margin={{
                  top: 20,
                  right: 0,
                  left: 0,
                  bottom: 5,
                }}
              >
                <XAxis dataKey="day" />
                <YAxis
                  hide
                  domain={[
                    0,
                    (dataMax: number) => Math.max(8, Math.ceil(dataMax)),
                  ]}
                />
                <Bar dataKey="miles" fill="#f4792c" />
              </BarChart>
            </ResponsiveContainer>
        </div>

          {/* total week mileage */}
          <div className="h-33 w-33 flex items-center justify-center rounded-full border-3 border-white text-white">
            <span className="font-semibold text-3xl">
              {totalMiles.toFixed(2)}
              <span className="text-sm ml-1.5">mi</span>
            </span>
          </div>
        </div>
      </div>
    );
}
