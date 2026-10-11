import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

/**
 * Format currency helper in Spanish standard
 */
const formatEuro = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0 €';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(num);
};

const formatEuroDecimals = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0,00 €';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

/**
 * Generates an executive, institutional PDF report "Expediente de Jubilación"
 */
export async function generateRetirementPDF({
  client,
  config,
  scenario,
  chartData,
  savings,
  desiredIncomeStages,
  patrimonioLiquidoInicial,
  patrimonioInmobiliarioInicial,
  patrimonioTotalInicial,
  liquidityCrisisYear,
  zeroCapitalYear,
  requiredReturnResult,
  chartPatrimonioEl,
  chartFlujoEl
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // Helper to capture charts directly from active DOM to High-DPI PNG Data URLs (Scale 2)
  async function captureChartToImage(element) {
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        return canvas.toDataURL('image/png');
      }
    } catch (err) {
      console.error('html2canvas capture error:', err);
    }
    return null;
  }

  // Capture Charts via html2canvas (fixed-size 800x400 SVGs with isAnimationActive=false)
  let chartPatrimonioImg = await captureChartToImage(chartPatrimonioEl);
  let chartFlujoImg = await captureChartToImage(chartFlujoEl);

  // Current Date in Spanish format
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const clientName = client?.name || 'Cliente de la Gestoría';
  const initialDesiredIncome = desiredIncomeStages[0]?.amount || 0;
  const horizonYears = (parseInt(config.endAge) || 85) - (parseInt(config.currentAge) || 65);
  const pensionAnnual = (parseFloat(config.pensionMonthly) || 0) * 14;
  const crisisYear = liquidityCrisisYear || zeroCapitalYear;

  /* ====================================================================
     PAGE 1: PORTADA / CABECERA, RESUMEN EJECUTIVO Y GRÁFICO 1 (SOLVENCIA)
     ==================================================================== */
  
  // 1. Top Decorative Brand Bar
  doc.setFillColor(15, 23, 42); // Navy slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');
  doc.setFillColor(5, 150, 105); // Emerald accent
  doc.rect(0, 8, pageWidth, 1.8, 'F');

  let currentY = 16;

  // Header Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('EXPEDIENTE DE PLANIFICACIÓN FINANCIERA Y PREVISIÓN SOCIAL', marginX, currentY);

  currentY += 6;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Navy
  doc.text('Estudio de Viabilidad Patrimonial y Optimización Fiscal', marginX, currentY);

  currentY += 6;
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text('Planificación Estratégica para la Jubilación', marginX, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Análisis técnico de solvencia patrimonial, flujos de caja netos y desacumulación progresiva eficiente.', marginX, currentY);

  currentY += 6;

  // Metadata Box (Client, Date, Scenario, Advisor)
  const metaBoxHeight = 17;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, contentWidth, metaBoxHeight, 2, 2, 'FD');

  const metaColW = contentWidth / 4;
  
  // Col 1: Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('NOMBRE DEL CLIENTE', marginX + 4, currentY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(doc.splitTextToSize(clientName, metaColW - 6)[0] || clientName, marginX + 4, currentY + 11.5);

  // Col 2: Fecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('FECHA DE EMISIÓN', marginX + metaColW + 4, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(dateFormatted, marginX + metaColW + 4, currentY + 11.5);

  // Col 3: Escenario
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('ESCENARIO SIMULADO', marginX + metaColW * 2 + 4, currentY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text(doc.splitTextToSize(scenario?.name || 'Escenario Principal', metaColW - 6)[0] || 'Escenario Principal', marginX + metaColW * 2 + 4, currentY + 11.5);

  // Col 4: Despacho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('ÁREA DE ASESORAMIENTO', marginX + metaColW * 3 + 4, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Gestoría & Patrimonio', marginX + metaColW * 3 + 4, currentY + 11.5);

  currentY += metaBoxHeight + 7;

  // SECTION 1: Resumen Ejecutivo
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. RESUMEN EJECUTIVO — RADIOGRAFÍA INICIAL', marginX + 5, currentY + 4.8);

  currentY += 8;

  // Dynamic narrative text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const narrative = `El presente dictamen evalúa la viabilidad económica de la jubilación a partir de los ${config.currentAge} años (${config.retirementDate}), contemplando una esperanza de vida estimada de ${config.endAge} años (${horizonYears} años de horizonte temporal). Para sostener un objetivo de ingreso neto deseado inicial de ${formatEuro(initialDesiredIncome)}/mes ajustado periódicamente por inflación (${config.inflationRate}% anual), se proyecta la concurrencia de la Pensión Pública Bruta estimada (${formatEuro(config.pensionMonthly)}/mes en 14 pagas; ${formatEuro(pensionAnnual)}/año) con la desacumulación estratégica del patrimonio de partida (${formatEuro(patrimonioTotalInicial)}), compuesto por ${formatEuro(patrimonioLiquidoInicial)} en capital líquido e inversiones financieras y ${formatEuro(patrimonioInmobiliarioInicial)} en activos inmobiliarios.`;

  const narrativeLines = doc.splitTextToSize(narrative, contentWidth);
  doc.text(narrativeLines, marginX, currentY);
  currentY += narrativeLines.length * 3.8 + 3;

  // 4 Key Metric KPI Cards
  const kpiW = (contentWidth - 9) / 4;
  const kpiH = 15;

  const kpis = [
    { label: 'EDAD JUBILACIÓN / HORIZONTE', val: `${config.currentAge}a (${config.endAge}a esp.)`, sub: `${horizonYears} años horizonte` },
    { label: 'PENSIÓN PÚBLICA BRUTA', val: `${formatEuro(config.pensionMonthly)}/mes`, sub: `${formatEuro(pensionAnnual)}/año (14p)` },
    { label: 'INGRESO NETO DESEADO', val: `${formatEuro(initialDesiredIncome)}/mes`, sub: 'Poder adquisitivo base' },
    { label: 'PATRIMONIO INICIAL', val: formatEuro(patrimonioTotalInicial), sub: `Líq: ${formatEuro(patrimonioLiquidoInicial)} | Inm: ${formatEuro(patrimonioInmobiliarioInicial)}` }
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = marginX + idx * (kpiW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.roundedRect(kpiX, currentY, kpiW, kpiH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kpiX + 2.5, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, kpiX + 2.5, currentY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.sub, kpiX + 2.5, currentY + 13);
  });

  currentY += kpiH + 4;

  // Diagnosis Badge
  const diagBoxHeight = 11;
  if (crisisYear) {
    doc.setFillColor(254, 242, 242); // Red-50
    doc.setDrawColor(248, 113, 113); // Red-400
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, diagBoxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text(`ALERTA DE DÉFICIT DE TESORERÍA (Año ${crisisYear})`, marginX + 3.5, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(153, 27, 27);
    const diagMsg = requiredReturnResult && typeof requiredReturnResult === 'number'
      ? `Se detecta agotamiento de liquidez en el año ${crisisYear}. Se precisa una rentabilidad anual del ${requiredReturnResult}% en fondos o ajustar el gasto para garantizar cobertura completa hasta los ${config.endAge} años.`
      : `El capital líquido se agota en el año ${crisisYear}, impidiendo cubrir el nivel de vida deseado sin venta de inmuebles o ajuste en los gastos.`;
    doc.text(doc.splitTextToSize(diagMsg, contentWidth - 7), marginX + 3.5, currentY + 8.5);
  } else {
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.setDrawColor(110, 231, 183); // Emerald-300
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, diagBoxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87); // Emerald-700
    doc.text(`PLANIFICACIÓN SOSTENIBLE HASTA LOS ${config.endAge} AÑOS`, marginX + 3.5, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(6, 95, 70);
    const diagMsg = requiredReturnResult === 0
      ? `El patrimonio líquido actual y los flujos previstos garantizan el nivel de vida deseado hasta los ${config.endAge} años incluso con un 0% de rentabilidad.`
      : `El patrimonio proyectado cubre íntegramente la esperanza de vida planificada hasta los ${config.endAge} años sin experimentar tensiones de liquidez ni descubiertos.`;
    doc.text(doc.splitTextToSize(diagMsg, contentWidth - 7), marginX + 3.5, currentY + 8.5);
  }

  currentY += diagBoxHeight + 6;

  // SECTION 2: Diagnóstico Visual - Gráfico 1 (Patrimonio / Solvencia)
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. DIAGNÓSTICO VISUAL: EVOLUCIÓN DEL PATRIMONIO (SOLVENCIA)', marginX + 5, currentY + 4.8);

  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Proyección de capital líquido disponible (Fondos/Cuentas/Planes) vs. patrimonio inmobiliario inmovilizado.', marginX, currentY);

  currentY += 3;

  // Chart 1 Image insertion
  const chartHeight = 72;
  if (chartPatrimonioImg) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, chartHeight, 1.5, 1.5, 'D');
    doc.addImage(chartPatrimonioImg, 'PNG', marginX + 1, currentY + 1, contentWidth - 2, chartHeight - 2);
  }

  currentY += chartHeight + 3.5;

  // Chart 1 Footnote
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Nota técnica: La solvencia analiza la masa patrimonial neta acumulada. Los incrementos bruscos reflejan la materialización de ventas de inmuebles, incrementando la liquidez disponible.', marginX, currentY);

  /* ====================================================================
     PAGE 2: GRÁFICO 2 (FLUJO DE CAJA) & PLAN DE RESCATE (TABLA)
     ==================================================================== */
  doc.addPage();
  currentY = 16;

  // SECTION 3: Diagnóstico Visual - Gráfico 2 (Flujo de Caja / Nivel de Vida)
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DIAGNÓSTICO VISUAL: EVOLUCIÓN DEL NIVEL DE VIDA (FLUJO DE CAJA)', marginX + 5, currentY + 4.8);

  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Comparativa mensual entre el Ingreso Neto Deseado y el Ingreso Neto Real disponible (detección de acantilado financiero).', marginX, currentY);

  currentY += 3;

  // Chart 2 Image insertion
  if (chartFlujoImg) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, chartHeight, 1.5, 1.5, 'D');
    doc.addImage(chartFlujoImg, 'PNG', marginX + 1, currentY + 1, contentWidth - 2, chartHeight - 2);
  }

  currentY += chartHeight + 3.5;

  // Chart 2 Footnote
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Nota técnica: La brecha entre ambas curvas evidencia el "acantilado financiero". Si la liquidez se extingue, el ingreso cae súbitamente a la cuantía neta de la pensión pública básica.', marginX, currentY);

  currentY += 8;

  // SECTION 4: Plan de Rescate (Tabla de Amortización)
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. PLAN DE RESCATE (TABLA DE AMORTIZACIÓN Y DESACUMULACIÓN)', marginX + 5, currentY + 4.8);

  currentY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Desglose anual cronológico: optimización fiscal de rescates de Planes de Pensiones e impacto en el IRPF.', marginX, currentY);

  currentY += 4;

  // Prepare table data
  const tableHeaders = [
    'Año (Edad)',
    'Ingr. Real/Mes',
    'Alquileres',
    'Faltante',
    'Rescate Plan',
    'Rescate Fondos',
    'Impuestos',
    'Capital Restante'
  ];

  const tableRows = chartData.map(row => [
    `${row.year} (${row.age}a)`,
    formatEuroDecimals(row.realMonthlyIncome),
    row.rentIncome > 0 ? formatEuroDecimals(row.rentIncome) : '-',
    formatEuroDecimals(row.gap),
    row.withdrawnFromPension > 0 ? formatEuroDecimals(row.withdrawnFromPension) : '-',
    row.withdrawnFromSavings > 0 ? formatEuroDecimals(row.withdrawnFromSavings) : '-',
    row.estimatedTaxes > 0 ? formatEuroDecimals(row.estimatedTaxes) : '-',
    formatEuroDecimals(row.totalCapital)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableRows,
    margin: { left: marginX, right: marginX, bottom: 18 },
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 24, fontStyle: 'bold', textColor: [5, 150, 105] },
      2: { halign: 'right', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 24, textColor: [5, 150, 105] },
      5: { halign: 'right', cellWidth: 24, textColor: [37, 99, 235] },
      6: { halign: 'right', cellWidth: 22, textColor: [220, 38, 38] },
      7: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }
    },
    didDrawCell: (data) => {
      // Highlight row if there was an uncovered deficit
      if (data.section === 'body') {
        const rowData = chartData[data.row.index];
        if (rowData && rowData.uncoveredDeficit > 0.01 && data.column.index === 1) {
          doc.setTextColor(220, 38, 38);
        }
      }
    }
  });

  // End of table position
  const tableEndY = doc.lastAutoTable.finalY || 200;

  /* ====================================================================
     SECTION 5: METODOLOGÍA Y CONSIDERACIONES FISCALES (ANEXO EXPLICATIVO)
     ==================================================================== */
  // If remaining space on the last page is less than 110mm, add a clean final page
  if (pageHeight - tableEndY < 110) {
    doc.addPage();
    currentY = 16;
  } else {
    currentY = tableEndY + 10;
  }

  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('5. METODOLOGÍA Y CONSIDERACIONES FISCALES (ANEXO EXPLICATIVO)', marginX + 5, currentY + 4.8);

  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Criterios normativos, fundamentos matemáticos del motor de cálculo y consideraciones de riesgo patrimonial.', marginX, currentY);

  currentY += 5;

  const methodologyBlocks = [
    {
      title: 'Optimización Fiscal Progresiva',
      accentColor: [5, 150, 105], // Emerald
      content: 'El algoritmo minimiza el impacto en el IRPF rescatando el plan de pensiones de forma estratégica y unificándolo con la pensión pública bruta en la Base Liquidable General. Dado que los planes de pensiones tributan íntegramente como rendimientos del trabajo a tipos marginales progresivos (hasta el 47%), el rescate anual se limita prioritariamente hasta el tramo impositivo más eficiente, cubriendo las necesidades financieras restantes mediante el rescate de fondos de inversión o liquidez en la Base del Ahorro (con tipos más reducidos del 19% al 28%).'
    },
    {
      title: 'Protección contra Inflación',
      accentColor: [37, 99, 235], // Blue
      content: `El plan asume un incremento anual sostenido del coste de la vida (${config.inflationRate}% anual), actualizando de forma sistemática tanto la pensión pública estimada como el objetivo de ingreso neto deseado a lo largo de toda la jubilación. Esta indexación metodológica evita la ilusión monetaria y previene la pérdida acumulada de poder adquisitivo del jubilado frente al encarecimiento de bienes y servicios.`
    },
    {
      title: 'Riesgo de Liquidez (House Rich, Cash Poor)',
      accentColor: [217, 119, 6], // Amber
      content: 'Advertencia sobre activos ilíquidos: los bienes inmuebles aportan solvencia y solidez al balance patrimonial total, pero no cubren los déficits mensuales de tesorería si no generan ingresos recurrentes por alquiler o no se ejecutan las ventas previstas en las fechas planificadas. Disponer de un elevado patrimonio neto inmovilizado no exime al cliente de sufrir tensiones de liquidez inmediatas en caso de imprevistos.'
    },
    {
      title: 'Aviso Legal y Disclaimer Institucional',
      accentColor: [100, 116, 139], // Slate
      content: 'El presente documento es una simulación económica meramente informativa y pedagógica realizada sobre las hipótesis y datos aportados por el cliente, bajo la legislación fiscal estatal y normativa de la Seguridad Social española vigentes a la fecha de emisión. No constituye asesoramiento financiero garantizado, oferta vinculante ni recomendación contractual de inversión. Las rentabilidades históricas no garantizan rentabilidades futuras.'
    }
  ];

  methodologyBlocks.forEach((block) => {
    // If running out of page, create new page
    if (currentY + 22 > pageHeight - 18) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);

    const blockLines = doc.splitTextToSize(block.content, contentWidth - 8);
    const boxHeight = 9 + blockLines.length * 3.5;

    doc.roundedRect(marginX, currentY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    // Left Accent bar
    doc.setFillColor(...block.accentColor);
    doc.rect(marginX, currentY, 2, boxHeight, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(block.title, marginX + 5, currentY + 4.8);

    // Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(blockLines, marginX + 5, currentY + 8.5);

    currentY += boxHeight + 3.5;
  });

  /* ====================================================================
     GLOBAL PAGE HEADERS & FOOTERS (Iterate through all pages)
     ==================================================================== */
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Header on pages >= 2
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(`Expediente de Jubilación • ${clientName}`, marginX, 10);
      doc.text('DOCUMENTO CONFIDENCIAL', pageWidth - marginX - doc.getTextWidth('DOCUMENTO CONFIDENCIAL'), 10);
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginX, 12, pageWidth - marginX, 12);
    }

    // Footer on ALL pages
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Estudio de Viabilidad Patrimonial y Optimización Fiscal • Gestoría & Planificación SaaS', marginX, pageHeight - 7);

    const pageNumText = `Página ${i} de ${totalPages}`;
    doc.text(pageNumText, pageWidth - marginX - doc.getTextWidth(pageNumText), pageHeight - 7);
  }

  // Trigger download
  const sanitizedClient = (clientName || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Expediente_Jubilacion_${sanitizedClient}_${today.getFullYear()}.pdf`;
  doc.save(filename);
}
