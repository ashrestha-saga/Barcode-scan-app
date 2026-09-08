/** Chrome throws NotFoundError if React unmounts a focused input. */
export function blurActiveElement() {
  if (typeof document === "undefined") return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

/** Wait until after the next paint so blur can settle before unmount. */
export function afterNextPaint(): Promise<void> {
  if (typeof requestAnimationFrame !== "function") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * React 19 can throw NotFoundError when the DOM was mutated outside React
 * (translate, extensions, icon SVGs). Keep reconcile from crashing.
 */
export function installDomReconcileGuards() {
  if (typeof Node === "undefined") return;
  const proto = Node.prototype as Node & {
    __scanorderPatched?: boolean;
  };
  if (proto.__scanorderPatched) return;
  proto.__scanorderPatched = true;

  const removeChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child) as T;
  };

  const insertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(
    this: Node,
    node: T,
    child: Node | null,
  ): T {
    if (child && child.parentNode !== this) return node;
    return insertBefore.call(this, node, child) as T;
  };
}
