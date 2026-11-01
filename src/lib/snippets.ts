import type { ElementDetail, WindowInfo } from "./uia";

/** Escape cho chuỗi nháy đơn kiểu Python / C# / PowerShell */
const sq = (value: string) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
/** Escape cho chuỗi nháy kép kiểu C# */
const dq = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
/** PowerShell nhân đôi nháy đơn để escape */
const ps = (value: string) => `'${value.replace(/'/g, "''")}'`;

export type SnippetInput = {
  window: WindowInfo | undefined;
  detail: ElementDetail;
  text: string;
  isWindow: boolean;
};

/** Hành động chính của element, suy từ pattern nó hỗ trợ */
function primaryAction(detail: ElementDetail): "invoke" | "toggle" | "value" | "keys" | "read" {
  if (detail.actions.includes("invoke")) return "invoke";
  if (detail.actions.includes("toggle")) return "toggle";
  if (detail.actions.includes("value")) return "value";
  return "read";
}

function pythonUiautomation({ window, detail, text, isWindow }: SnippetInput) {
  const winArgs = [
    window?.classname && `ClassName=${sq(window.classname)}`,
    window?.name && `Name=${sq(window.name)}`,
  ].filter(Boolean);
  const elArgs = [
    detail.automationId && `AutomationId=${sq(detail.automationId)}`,
    !detail.automationId && detail.name && `Name=${sq(detail.name)}`,
    !detail.automationId && !detail.name && detail.classname && `ClassName=${sq(detail.classname)}`,
  ].filter(Boolean);

  const act = {
    invoke: "el.Click()",
    toggle: "el.GetTogglePattern().Toggle()",
    value: `el.GetValuePattern().SetValue(${sq(text)})`,
    keys: `el.SendKeys(${sq(text)})`,
    read: "print(el.Name)",
  }[primaryAction(detail)];

  return [
    "import uiautomation as auto",
    "",
    `win = auto.WindowControl(${winArgs.join(", ")})`,
    isWindow ? "el = win" : `el = win.${detail.controlType || "Custom"}Control(${elArgs.join(", ")})`,
    act,
  ].join("\n");
}

function pywinauto({ window, detail, text, isWindow }: SnippetInput) {
  const winArgs = [
    window?.classname && `class_name=${sq(window.classname)}`,
    window?.name && `title=${sq(window.name)}`,
  ].filter(Boolean);
  const elArgs = [
    detail.automationId && `auto_id=${sq(detail.automationId)}`,
    !detail.automationId && detail.name && `title=${sq(detail.name)}`,
    detail.controlType && `control_type=${sq(detail.controlType)}`,
  ].filter(Boolean);

  const act = {
    invoke: "el.invoke()",
    toggle: "el.toggle()",
    value: `el.set_edit_text(${sq(text)})`,
    keys: `el.type_keys(${sq(text)})`,
    read: "print(el.window_text())",
  }[primaryAction(detail)];

  return [
    "from pywinauto import Desktop",
    "",
    `win = Desktop(backend='uia').window(${winArgs.join(", ")})`,
    isWindow ? "el = win" : `el = win.child_window(${elArgs.join(", ")})`,
    act,
  ].join("\n");
}

function flaui({ window, detail, text, isWindow }: SnippetInput) {
  const winBy = window?.classname ? `cf.ByClassName(${dq(window.classname)})` : `cf.ByName(${dq(window?.name ?? "")})`;
  const elBy = detail.automationId ? `cf.ByAutomationId(${dq(detail.automationId)})` : `cf.ByName(${dq(detail.name)})`;

  const act = {
    invoke: "el.AsButton().Invoke();",
    toggle: "el.AsToggleButton().Toggle();",
    value: `el.AsTextBox().Text = ${dq(text)};`,
    keys: `el.Focus();\nFlaUI.Core.Input.Keyboard.Type(${dq(text)});`,
    read: "Console.WriteLine(el.Name);",
  }[primaryAction(detail)];

  return [
    "using FlaUI.Core.AutomationElements;",
    "using FlaUI.UIA3;",
    "",
    "using var automation = new UIA3Automation();",
    `var win = automation.GetDesktop().FindFirstChild(cf => ${winBy});`,
    isWindow ? "var el = win;" : `var el = win.FindFirstDescendant(cf => ${elBy});`,
    act,
  ].join("\n");
}

function powershell({ window, detail, text, isWindow }: SnippetInput) {
  const winProp = window?.classname ? "ClassNameProperty" : "NameProperty";
  const winValue = ps(window?.classname || window?.name || "");
  const elProp = detail.automationId ? "AutomationIdProperty" : "NameProperty";
  const elValue = ps(detail.automationId || detail.name);

  const act = {
    invoke: "$el.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()",
    toggle: "$el.GetCurrentPattern([Windows.Automation.TogglePattern]::Pattern).Toggle()",
    value: `$el.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).SetValue(${ps(text)})`,
    keys: `$el.SetFocus(); [Windows.Forms.SendKeys]::SendWait(${ps(text)})`,
    read: "$el.Current.Name",
  }[primaryAction(detail)];

  return [
    "Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes",
    "$root = [Windows.Automation.AutomationElement]::RootElement",
    "",
    `$winCond = New-Object Windows.Automation.PropertyCondition(`,
    `  [Windows.Automation.AutomationElement]::${winProp}, ${winValue})`,
    "$win = $root.FindFirst('Children', $winCond)",
    ...(isWindow
      ? ["$el = $win"]
      : [
          "$elCond = New-Object Windows.Automation.PropertyCondition(",
          `  [Windows.Automation.AutomationElement]::${elProp}, ${elValue})`,
          "$el = $win.FindFirst('Descendants', $elCond)",
        ]),
    act,
  ].join("\n");
}

export const SNIPPETS = [
  { label: "Python · uiautomation", build: pythonUiautomation },
  { label: "Python · pywinauto", build: pywinauto },
  { label: "C# · FlaUI", build: flaui },
  { label: "PowerShell", build: powershell },
];
