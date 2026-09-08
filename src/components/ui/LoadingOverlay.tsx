"use client";

export function LoadingOverlay({
  message,
  relative = false,
}: {
  message: string;
  relative?: boolean;
}) {
  return (
    <div className="so-loading on" style={relative ? { position: "relative" } : undefined}>
      <div>
        <div className="so-spin" />
        <p>{message}</p>
      </div>
    </div>
  );
}
