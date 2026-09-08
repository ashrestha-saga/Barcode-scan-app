"use client";

export function Keypad({
  onDigit,
  onClear,
  onBackspace,
  leftKey,
}: {
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  leftKey?: { label: string; onPress: () => void };
}) {
  const keepInputFocus = (e: { preventDefault: () => void }) => {
    e.preventDefault();
  };

  return (
    <div className="so-pad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button
          key={n}
          type="button"
          onMouseDown={keepInputFocus}
          onClick={() => onDigit(String(n))}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onMouseDown={keepInputFocus}
        onClick={leftKey ? leftKey.onPress : onClear}
      >
        {leftKey?.label ?? "C"}
      </button>
      <button type="button" onMouseDown={keepInputFocus} onClick={() => onDigit("0")}>
        0
      </button>
      <button type="button" onMouseDown={keepInputFocus} onClick={onBackspace}>
        ⌫
      </button>
    </div>
  );
}
