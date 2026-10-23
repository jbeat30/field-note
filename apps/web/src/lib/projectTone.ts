// 프로젝트 구분 칩 모양 (달력·인력 배치 공통): 주황, 잉크, 라임, 외곽선, 모래, 진주황 순서
// 색만으로 구분하지 않도록 칩 안에는 항상 프로젝트 이름을 함께 씀
const CHIP_CLASSES = [
  'bg-accent text-[#14110d]',
  'bg-foreground text-surface',
  'bg-highlight text-[#14110d]',
  'border-[1.5px] border-foreground bg-transparent text-foreground',
  'bg-[#cdbf9c] text-[#14110d]',
  'bg-[#a83f0c] text-[#fbf7ee]',
] as const;

export const projectChipClass = (colorIndex: number) =>
  CHIP_CLASSES[colorIndex % CHIP_CLASSES.length] ?? CHIP_CLASSES[0];
