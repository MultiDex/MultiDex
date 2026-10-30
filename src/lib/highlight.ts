export type Token = [cls: string, text: string];

const RE =
  /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"(?=\s*:))|("(?:[^"\\\n]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b)|([{}[\],:])/g;
const CLS = ["tk-com", "tk-key", "tk-str", "tk-num", "tk-p"];

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of src.matchAll(RE)) {
    const i = m.index!;
    if (i > last) out.push(["", src.slice(last, i)]);
    out.push([CLS[m.slice(1).findIndex((g) => g !== undefined)], m[0]]);
    last = i + m[0].length;
  }
  if (last < src.length) out.push(["", src.slice(last)]);
  return out;
}
