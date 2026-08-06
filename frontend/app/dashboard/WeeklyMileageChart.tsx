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

export default function WeeklyMileageChart({ weeklyMiles }: WeeklyMileageChartProps) {
    
    const totalMiles = weeklyMiles.reduce((sum, day) => sum + day.miles, 0);

    return (
      <div className="flex items-center gap-4">
        {/* bar graph */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
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
                domain={[0, (dataMax: number) => Math.max(8, Math.ceil(dataMax))]}
              />
              <Bar dataKey="miles" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* total week mileage */}
        <div className="flex h-33 w-33 flex-none items-center justify-center rounded-full border-4 border-[#8884d8]">
          <span className="font-semibold text-3xl">
            {totalMiles.toFixed(2)}
            <span className="text-sm ml-1.5">mi</span>
          </span>
        
        </div>
      </div>
    );
}
