export interface ExpiredRowMetaProps {
  expiredAt: Date;
  expiredAtLabel: string;
}
export function ExpiredRowMeta(props: ExpiredRowMetaProps) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
      {props.expiredAtLabel}
    </span>
  );
}
