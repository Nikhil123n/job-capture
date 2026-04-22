type ExtractionWarningProps = {
  kind: "error" | "info";
  message: string;
};

const styles = {
  error: "border-rose-300 bg-rose-50 text-rose-800",
  info: "border-sky-300 bg-sky-50 text-sky-800",
} as const;

export function ExtractionWarning({ kind, message }: ExtractionWarningProps) {
  return (
    <div
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${styles[kind]}`}
      role="status"
    >
      {message}
    </div>
  );
}
