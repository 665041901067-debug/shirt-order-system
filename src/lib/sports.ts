export const SPORT_TYPES = [
  "ไม่ได้เล่นกีฬา",
  "ฟุตบอล",
  "ฟุตซอล",
  "บาสเกตบอล",
  "วอลเลย์บอล",
  "แบดมินตัน",
  "เปตอง",
  "ปิงปอง/เทเบิลเทนนิส",
  "ตะกร้อ",
] as const;

export type SportType = (typeof SPORT_TYPES)[number];

export function getSportBadgeColor(sport?: string): string {
  switch (sport) {
    case "ฟุตบอล":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "ฟุตซอล":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "บาสเกตบอล":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "วอลเลย์บอล":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "แบดมินตัน":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "เปตอง":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "ปิงปอง/เทเบิลเทนนิส":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "ตะกร้อ":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "ไม่ได้เล่นกีฬา":
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export function extractSportType(item?: { note?: string | null; options?: any[] }): string {
  if (!item) return "ไม่ได้เล่นกีฬา";

  // 1. Check options
  if (Array.isArray(item.options)) {
    const sportOpt = item.options.find(
      (o: any) =>
        o?.option_name === "ประเภทกีฬา" ||
        o?.group?.name === "ประเภทกีฬา" ||
        o?.name === "ประเภทกีฬา"
    );
    if (sportOpt) {
      return (
        sportOpt.option_value ||
        sportOpt.value?.name ||
        sportOpt.option_value_name ||
        "ไม่ได้เล่นกีฬา"
      );
    }
  }

  // 2. Check note pattern [กีฬา: ...]
  if (item.note) {
    const match = item.note.match(/\[กีฬา:\s*([^\]]+)\]/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "ไม่ได้เล่นกีฬา";
}

export function cleanNoteWithoutSport(note?: string | null): string {
  if (!note) return "";
  return note.replace(/\[กีฬา:\s*[^\]]+\]\s*/g, "").trim();
}

export function buildSportNote(sportType: string, customNote?: string): string {
  const cleanSport = sportType.trim() || "ไม่ได้เล่นกีฬา";
  const noteContent = (customNote || "").trim();
  return `[กีฬา: ${cleanSport}]${noteContent ? ` ${noteContent}` : ""}`;
}
