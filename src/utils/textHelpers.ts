export function escapeHtml(text: string): string {
  if (typeof document === "undefined") {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function ensureHtmlContent(conteudo: string): string {
  if (!conteudo) return "";
  // Se já parece HTML (contém tags), retorna como está
  if (/<[a-z][\s\S]*>/i.test(conteudo)) {
    return conteudo;
  }
  // Texto puro: converte quebras de linha em parágrafos
  return conteudo
    .split("\n")
    .filter(line => line.trim() !== "")
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    // Basic regex strip for safety
    return html.replace(/<[^>]*>/g, "");
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}
