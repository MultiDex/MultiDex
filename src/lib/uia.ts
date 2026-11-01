import { invoke } from "@tauri-apps/api/core";

export type WindowInfo = {
  runtimeId: number[];
  name: string;
  classname: string;
  processId: number;
};

export type Node = {
  name: string;
  automationId: string;
  classname: string;
  controlType: string;
  rect: [number, number, number, number];
  path: number[];
  truncated: boolean;
  children: Node[];
};

export type ElementDetail = {
  name: string;
  automationId: string;
  classname: string;
  controlType: string;
  enabled: boolean;
  offscreen: boolean;
  value: string | null;
  readonly: boolean;
  toggleState: string | null;
  actions: string[];
};

/** Element do phím tắt toàn cục chộp được */
export type Located = { runtimeId: number[]; path: number[]; windowName: string };

export const keyOf = (w: WindowInfo) => JSON.stringify(w.runtimeId);
export const pathKey = (p: number[]) => p.join("-");

export const countNodes = (n: Node): number => 1 + n.children.reduce((sum, c) => sum + countNodes(c), 0);

/** Đi theo chỉ số con để lấy đúng node trong cây đã dựng */
export function nodeAtPath(tree: Node, path: number[]): Node | null {
  let current: Node | undefined = tree;
  for (const index of path) {
    current = current?.children[index];
    if (!current) return null;
  }
  return current ?? null;
}

/**
 * Giữ lại nhánh có node khớp `query`; node không khớp mà không có con nào khớp thì bỏ.
 * Trả null khi cả nhánh không dính gì.
 */
export function filterTree(node: Node, query: string): Node | null {
  const haystack = `${node.name} ${node.automationId} ${node.controlType} ${node.classname}`;
  const hit = haystack.toLowerCase().includes(query);
  const children = node.children
    .map((child) => filterTree(child, query))
    .filter((child): child is Node => child !== null);
  if (!hit && children.length === 0) return null;
  return { ...node, children };
}

export const listWindows = () => invoke<WindowInfo[]>("list_windows");

export const inspectWindow = (runtimeId: number[]) => invoke<Node>("inspect_window", { runtimeId });

export const describeElement = (runtimeId: number[], path: number[]) =>
  invoke<ElementDetail>("describe_element", { runtimeId, path });

export const runAction = (runtimeId: number[], path: number[], action: string, text: string) =>
  invoke<string>("run_action", { runtimeId, path, action, text });

export const captureElement = (runtimeId: number[], path: number[]) =>
  invoke<ArrayBuffer>("capture_element", { runtimeId, path });

export const showHighlight = (rect: [number, number, number, number]) =>
  invoke<void>("show_highlight", {
    x: rect[0],
    y: rect[1],
    width: Math.max(0, rect[2] - rect[0]),
    height: Math.max(0, rect[3] - rect[1]),
  });

export const hideHighlight = () => invoke<void>("hide_highlight");

export type FocusEvent = {
  name: string;
  automationId: string;
  classname: string;
  controlType: string;
  processId: number;
};

export const startFocusLog = () => invoke<void>("start_focus_log");

export const stopFocusLog = () => invoke<void>("stop_focus_log");

export const isElevated = () => invoke<boolean>("is_elevated");

export const relaunchAsAdmin = () => invoke<void>("relaunch_as_admin");
