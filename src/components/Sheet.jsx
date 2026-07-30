import { useEffect, useState } from "react";

/* A tiny pub/sub so any component can call openSheet(title, <Content/>) without
   prop-drilling a modal state through the whole tree — mirrors how the original
   single-file app's openSheet()/closeSheet() worked, just React-ified. */
let listeners = [];
let currentState = { open: false, title: "", content: null };

function emit() {
  listeners.forEach((l) => l(currentState));
}

export function openSheet(title, content) {
  currentState = { open: true, title, content };
  emit();
}
export function closeSheet() {
  currentState = { ...currentState, open: false };
  emit();
}

function useSheetState() {
  const [state, setState] = useState(currentState);
  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);
  return state;
}

function Host() {
  const { open, title, content } = useSheetState();
  return (
    <>
      <div className={`sheet-bg ${open ? "open" : ""}`} onClick={closeSheet} />
      <div className={`sheet ${open ? "open" : ""}`}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="x" onClick={closeSheet}>×</button>
        </div>
        <div className="sheet-body">{content}</div>
      </div>
    </>
  );
}

const Sheet = { Host, open: openSheet, close: closeSheet };
export default Sheet;
