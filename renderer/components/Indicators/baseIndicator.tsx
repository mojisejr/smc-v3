interface IndicatoProps {
  title: string;
  value: number | null;
  unit: string;
  threshold: number;
  isUnavailable?: boolean;
}

const Indicator = ({ title, value, unit, threshold, isUnavailable }: IndicatoProps) => {
  const displayValue = isUnavailable || value === null ? null : value;

  return (
    <>
      <div className="w-full flex flex-col items-center px-2">
        <div className="text-xs">{title}</div>
        {displayValue === null ? (
          <div className="w-full flex flex-col items-center">
            <div className="text-xs text-base-content/50 font-medium">N/A</div>
            <div className="text-xs text-base-content/40">ไม่มีข้อมูล</div>
          </div>
        ) : (
          <>
            <progress
              className={`progress ${
                value < threshold ? "progress-info" : "progress-error"
              }`}
              value={value}
              max="100"
            ></progress>
            <div className="text-xs">{`${value}${unit}`}</div>
          </>
        )}
      </div>
    </>
  );
};

export default Indicator;
