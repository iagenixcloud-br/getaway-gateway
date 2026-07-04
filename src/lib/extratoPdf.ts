import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "../assets/ia-genix-logo.jpg.asset.json";

export interface ExtratoLinha {
  nome: string;
  email: string;
  valor: number;
}

export interface ExtratoParams {
  mesNome: string; // "Junho"
  ano: number;
  ymd: string; // "2026-06-01"
  linhas: ExtratoLinha[];
}

const LICENCA_CRM = 600;

let logoDataUrlCache: string | null = null;

async function getLogoDataUrl(): Promise<string> {
  if (logoDataUrlCache) return logoDataUrlCache;
  const res = await fetch(logoAsset.url);
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  logoDataUrlCache = dataUrl;
  return dataUrl;
}

const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function gerarExtratoPDF({ mesNome, ano, ymd, linhas }: ExtratoParams) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Logo
  try {
    const logo = await getLogoDataUrl();
    doc.addImage(logo, "JPEG", margin, margin, 22, 15);
  } catch {
    // ignore logo failure
  }

  // Cabeçalho IA Genix (ao lado da logo)
  const headerX = margin + 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("IA Genix", headerX, margin + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text("CNPJ 62.468.644/0001-66", headerX, margin + 9);
  doc.text(
    "Rua Prefeito José Basílio de Alvarenga, Centro — Santa Isabel/SP — CEP 07500-000",
    headerX,
    margin + 13.5,
  );

  // Linha separadora
  let y = margin + 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("Cliente", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("Andrade Consultoria Imobiliária", margin, y);
  y += 4.5;
  doc.text("CNPJ 53.573.430/0001-69", margin, y);
  y += 4.5;
  doc.text("Rua General Andrade Neves, nº 85, Centro — Niterói/RJ", margin, y);
  y += 8;

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  const titulo = `Extrato de Cobrança — ${mesNome}/${ano}`;
  doc.text(titulo, pageW / 2, y, { align: "center" });
  y += 6;

  // Tabela
  autoTable(doc, {
    startY: y,
    head: [["Nome", "Email", "Valor"]],
    body: linhas.map((l) => [l.nome, l.email ?? "—", brl(l.valor)]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [17, 17, 17], textColor: [212, 175, 55], fontStyle: "bold" },
    columnStyles: {
      2: { halign: "right", cellWidth: 28 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // Rodapé
      const footerY = pageH - 12;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, footerY - 3, pageW - margin, footerY - 3);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      doc.text(
        "Conforme Cláusulas 5 e 6 do Contrato de Prestação de Serviços",
        margin,
        footerY,
      );
      const hoje = new Date().toLocaleDateString("pt-BR");
      const pageNum = doc.getNumberOfPages();
      doc.text(
        `Emitido em ${hoje}   ·   Página ${pageNum}`,
        pageW - margin,
        footerY,
        { align: "right" },
      );
    },
  });

  // Totais
  const totalUsuarios = linhas.reduce((s, l) => s + Number(l.valor), 0);
  const totalGeral = totalUsuarios + LICENCA_CRM;
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  let ty = finalY + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const rightX = pageW - margin;

  doc.text("Licença CRM:", rightX - 45, ty);
  doc.text(brl(LICENCA_CRM), rightX, ty, { align: "right" });
  ty += 5.5;

  doc.text(
    `Total de usuários (${linhas.length} × R$ 50,00):`,
    rightX - 45,
    ty,
  );
  doc.text(brl(totalUsuarios), rightX, ty, { align: "right" });
  ty += 5.5;

  doc.setDrawColor(180, 180, 180);
  doc.line(rightX - 60, ty - 2, rightX, ty - 2);
  ty += 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(17, 17, 17);
  doc.text("Total geral:", rightX - 45, ty);
  doc.text(brl(totalGeral), rightX, ty, { align: "right" });

  doc.save(`extrato-ia-genix-${ymd.slice(0, 7)}.pdf`);
}
