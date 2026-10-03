"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const C = "#0067c8"; // Rotary Azure (validated single-series hue)
const GRID = "rgba(0,0,0,0.08)";
const AXIS = { fontSize: 11, fill: "#54565a" };
const tip = { contentStyle: { borderRadius: 6, border: "1px solid rgba(0,0,0,.14)", fontSize: 12, color: "#000" }, cursor: { fill: "rgba(0,103,200,0.06)", stroke: "rgba(0,0,0,.2)" } };

function Empty() {
  return <div className="flex h-56 items-center justify-center text-sm text-stone">No sessions in this range yet.</div>;
}

export function LineSeries({ data, x, y, name }: { data: Record<string, unknown>[]; x: string; y: string; name: string }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tip} formatter={(v) => [v as number, name]} labelFormatter={(l, p) => (p?.[0]?.payload?.title ? `${l} · ${p[0].payload.title}` : String(l))} />
        <Line type="monotone" dataKey={y} name={name} stroke={C} strokeWidth={2} dot={{ r: 4, fill: C, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarSeries({ data, x, y, name, horizontal }: { data: Record<string, unknown>[]; x: string; y: string; name: string; horizontal?: boolean }) {
  if (!data.length) return <Empty />;
  if (horizontal)
    return (
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey={x} tick={AXIS} tickLine={false} axisLine={false} width={150} />
          <Tooltip {...tip} formatter={(v) => [v as number, name]} />
          <Bar dataKey={y} name={name} fill={C} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    );
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }} barCategoryGap={4}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...tip} formatter={(v) => [v as number, name]} />
        <Bar dataKey={y} name={name} fill={C} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
