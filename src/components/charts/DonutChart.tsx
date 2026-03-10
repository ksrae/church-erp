interface DonutChartItem {
  name: string;
  amount: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartItem[];
  size?: "small" | "medium" | "large";
  centerValue?: string;
  centerLabel?: string;
  onClick?: () => void;
}

function DonutChart({
  data,
  size = "medium",
  centerValue,
  centerLabel,
  onClick
}: DonutChartProps) {
  const sizeClasses = {
    small: "mini-donut-chart",
    medium: "mini-donut-chart mini-donut-chart--large",
    large: "donut-chart-large",
  };

  const strokeWidth = size === "large" ? 16 : 20;
  const centerClass = size === "large" ? "donut-center-large" : "donut-center";

  const total = data.reduce((s, i) => s + i.amount, 0);

  const renderCircles = () => {
    if (data.length === 0 || total === 0) {
      return (
        <circle
          cx="50" cy="50" r="40"
          fill="transparent"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
      );
    }

    let cumulative = 0;
    return data.map((item, idx) => {
      const percentage = (item.amount / total) * 100;
      const offset = cumulative;
      cumulative += percentage;
      return (
        <circle
          key={idx}
          cx="50" cy="50" r="40"
          fill="transparent"
          stroke={item.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
          strokeDashoffset={-offset * 2.51}
          transform="rotate(-90 50 50)"
        />
      );
    });
  };

  return (
    <div className={sizeClasses[size]} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <svg viewBox="0 0 100 100">
        {renderCircles()}
      </svg>
      <div className={centerClass}>
        {size === "large" ? (
          <>
            <span className="total">{centerValue}</span>
            {centerLabel && <small>{centerLabel}</small>}
          </>
        ) : (
          <span>{centerValue || data.length}</span>
        )}
      </div>
    </div>
  );
}

export default DonutChart;
