interface BankInfo {
  name: string;
  bg: string;
  color: string;
}

export const BANKS: Record<string, BankInfo> = {
    itau: { name: "Itaú", bg: "#EC7000", color: "#FFF4EB" },
    bradesco: { name: "Bradesco", bg: "#CC092F", color: "#FFF0F3" },
    caixa: { name: "Caixa", bg: "#005CA9", color: "#EBF4FF" },
    sicoob: { name: "Sicoob", bg: "#007A3E", color: "#EBFAF3" },
    sicredi: { name: "Sicredi", bg: "#0ec244ff", color: "#EBFAF3" },
    nubank: { name: "Nubank", bg: "#820AD1", color: "#F5EBFF" },
    inter: { name: "Inter", bg: "#FF6A00", color: "#FFF3EB" },
    santander: { name: "Santander", bg: "#EC0000", color: "#FFEBEB" },
    outro: { name: "Outro", bg: "#6B7280", color: "#F3F4F6" },
};

export function detectBank(str: string | null | undefined): string {
    if (!str) return "outro";
    const normalized = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const bankKey = Object.keys(BANKS).find(key => normalized.includes(key));
    return bankKey || "outro";
}
