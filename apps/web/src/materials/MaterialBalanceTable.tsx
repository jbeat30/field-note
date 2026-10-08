import type { MaterialBalanceItem } from '@field-note/shared';

type MaterialBalanceTableProps = {
  items: readonly MaterialBalanceItem[];
};

// 프로젝트별 자재 현황: 자재마다 반입·사용·반출·폐기와 잔량. 잔량이 마이너스면 반입 기록 누락을 의심하도록 경고 (막지 않음)
export const MaterialBalanceTable = ({ items }: MaterialBalanceTableProps) => {
  if (items.length === 0) {
    return <p className="text-sm text-foreground/70">아직 자재 기록이 없습니다</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.materialId}
          className="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">
              {item.name}
              {item.spec ? ` ${item.spec}` : ''}
            </span>
            <span
              className={item.isNegative ? 'text-xl font-bold text-danger' : 'text-xl font-bold'}
              aria-label={`${item.name} 잔량`}
            >
              잔량 {item.remaining}
              {item.unit}
            </span>
          </div>
          <dl className="grid grid-cols-4 gap-2 text-center text-sm">
            {(
              [
                ['반입', item.received],
                ['사용', item.used],
                ['반출', item.returned],
                ['폐기', item.discarded],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded bg-muted px-1 py-1.5">
                <dt className="text-xs text-foreground/70">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {(item.usedForChange > 0 || item.usedForAfterService > 0) && (
            <p className="text-sm text-foreground/70">
              {[
                item.usedForChange > 0 && `변경·추가 작업에 ${item.usedForChange}${item.unit}`,
                item.usedForAfterService > 0 &&
                  `사후 작업에 ${item.usedForAfterService}${item.unit}`,
              ]
                .filter(Boolean)
                .join(' · ')}{' '}
              사용
            </p>
          )}
          {item.isNegative && (
            <p role="alert" className="text-sm text-danger">
              잔량이 마이너스입니다. 반입 기록이 빠졌는지 확인해 주세요
            </p>
          )}
        </li>
      ))}
    </ul>
  );
};
