/** Truthy className parcalarini boslukla birlestirir. Bagimlilik yok. */
export function cx(
  ...args: Array<string | false | null | undefined>
): string {
  return args.filter(Boolean).join(" ");
}
