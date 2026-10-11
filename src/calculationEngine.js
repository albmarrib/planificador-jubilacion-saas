function calculateTaxes(profit, taxBrackets) {
  if (profit <= 0) return 0;

  let taxes = 0;
  let remainingProfit = profit;
  let previousLimit = 0;

  for (const bracket of taxBrackets) {
    const bracketSize = bracket.limit - previousLimit;
    const taxableInBracket = Math.min(remainingProfit, bracketSize);

    if (taxableInBracket > 0) {
      taxes += taxableInBracket * bracket.rate;
      remainingProfit -= taxableInBracket;
    }

    previousLimit = bracket.limit;
    if (remainingProfit <= 0) break;
  }

  return taxes;
}

export function projectRetirement(params) {
  let {
    retirementYear = 2030,
    currentAge = 65,
    endAge = 85,
    pensionMonthly,
    desiredIncomeStages = [],
    inflationRate,
    rentInflationRate = 2.0,
    realEstateAppreciationRate = 2.0,
    generalTaxBrackets = [],
    savingsTaxBrackets = [],
    savings // Array of { name, amount, expectedReturn, type }
  } = params;

  const yearsToProject = endAge - currentAge + 1;

  let currentPension = pensionMonthly * 14;

  // Copia profunda para no modificar el estado original de React
  let currentSavings = savings.map(s => ({ ...s }));
  const results = [];

  // Track cumulative inflation
  let cumulativeInflation = 1.0;
  let cumulativeRentInflation = 1.0;

  for (let i = 0; i < yearsToProject; i++) {
    const year = retirementYear + i;
    const age = currentAge + i;

    // Determine base desired income for this age
    let baseDesiredIncomeMonthly = 0;
    for (const stage of desiredIncomeStages) {
      if (age >= stage.startAge && age <= stage.endAge) {
        baseDesiredIncomeMonthly = stage.amount;
        break;
      }
    }
    
    // Apply inflation to desired income (Ingreso Deseado Neto)
    const currentDesiredIncome = baseDesiredIncomeMonthly * 12 * cumulativeInflation;

    let withdrawnFromPension = 0;
    let withdrawnFromSavings = 0;
    let totalRentIncome = 0;

    // PRE-PASO: Venta de Inmuebles y Alquileres
    for (const acc of currentSavings) {
      if (acc.type === 'real_estate') {
        const isSoldThisYear = year === parseInt(acc.expectedSaleYear);
        
        if (isSoldThisYear) {
          acc.type = 'liquid_real_estate'; // Se vuelve líquido este año
          
          let capitalGain = acc.amount - (parseFloat(acc.acquisitionPrice) || 0);
          if (capitalGain < 0) capitalGain = 0;
          
          // Exención por vivienda habitual > 65 años
          if (acc.isPrimaryResidence && age >= 65) {
            capitalGain = 0;
          }
          
          acc.pendingCapitalGain = capitalGain;
        } else if (acc.isRented) {
          // Si no se vende y está alquilado
          const grossMonthly = parseFloat(acc.grossMonthlyRent) || 0;
          const expensesPercent = parseFloat(acc.expensePercentage) || 20;
          const grossAnnual = grossMonthly * 12 * cumulativeRentInflation;
          const netAnnual = grossAnnual * (1 - expensesPercent / 100);
          totalRentIncome += netAnnual;
        }
      }
    }

    // 1. Pensión Pública Bruta y Cálculo de Impuestos Base de la Pensión
    const ingresoAnualPension = currentPension;
    const impuestosDeLaPension = calculateTaxes(ingresoAnualPension, generalTaxBrackets);
    const pensionNetaAnual = ingresoAnualPension - impuestosDeLaPension;

    // Base General previa a rescates de planes de pensiones (Pensión Bruta + Alquileres Netos)
    const baseGeneralPreRescate = ingresoAnualPension + totalRentIncome;
    const impuestosBaseGeneralPreRescate = calculateTaxes(baseGeneralPreRescate, generalTaxBrackets);
    const totalNetoDisponiblePreRescate = baseGeneralPreRescate - impuestosBaseGeneralPreRescate;

    // Faltante (Déficit a cubrir) = Ingreso Deseado Neto - Ingresos Netos Disponibles
    const gap = currentDesiredIncome - totalNetoDisponiblePreRescate;
    let remainingGap = gap > 0 ? gap : 0;

    // PASO A: Determinar en qué tramo de la Base General se encuentra el usuario antes de rescates
    let currentBracket = generalTaxBrackets[generalTaxBrackets.length - 1];
    for (const bracket of generalTaxBrackets) {
      if (baseGeneralPreRescate < bracket.limit) {
        currentBracket = bracket;
        break;
      }
    }

    // PASO B: Calcular margen hasta el siguiente tramo
    let remainingMarginGross = Math.max(0, currentBracket.limit - baseGeneralPreRescate);

    // PASO C: Extraer de 'pension_plan' SOLO hasta rellenar ese margen
    // FRENO DE EMERGENCIA FISCAL: Si el tipo marginal supera el 30% (ej. 37%), es ineficiente extraer del plan de pensiones frente a la Base del Ahorro.
    if (currentBracket.rate <= 0.30) {
      for (const acc of currentSavings) {
        if (remainingGap <= 0 || remainingMarginGross <= 0) break;
        if (acc.type === 'pension_plan' && acc.amount > 0) {
          const grossNeeded = remainingGap / (1 - currentBracket.rate);
          const grossToExtract = Math.min(grossNeeded, remainingMarginGross, acc.amount);
          const netExtracted = grossToExtract * (1 - currentBracket.rate);
          
          acc.amount -= grossToExtract;
          remainingGap -= netExtracted;
          remainingMarginGross -= grossToExtract;
          
          withdrawnFromPension += grossToExtract;
        }
      }
    }

    // PASO D: Extraer el déficit restante de los activos tipo 'savings' y inmuebles líquidos
    for (const acc of currentSavings) {
      if (remainingGap <= 0) break;
      if ((acc.type === 'savings' || acc.type === 'liquid_real_estate') && acc.amount > 0) {
        const withdraw = Math.min(acc.amount, remainingGap);
        acc.amount -= withdraw;
        remainingGap -= withdraw;
        withdrawnFromSavings += withdraw;
      }
    }

    // PASO SUPERVIVENCIA: Si queda déficit y hay saldo en el plan de pensiones, se fuerza el rescate
    // (Supervivencia > Optimización Fiscal)
    if (remainingGap > 0) {
      for (const acc of currentSavings) {
        if (remainingGap <= 0) break;
        if (acc.type === 'pension_plan' && acc.amount > 0) {
          // Extraemos con el tipo marginal actual asumiendo impacto fiscal de emergencia
          const grossNeeded = remainingGap / (1 - currentBracket.rate);
          const grossToExtract = Math.min(grossNeeded, acc.amount);
          const netExtracted = grossToExtract * (1 - currentBracket.rate);
          
          acc.amount -= grossToExtract;
          remainingGap -= netExtracted;
          
          withdrawnFromPension += grossToExtract;
        }
      }
    }

    // IRPF total final del año en la Base General:
    // El importe rescatado del Plan de Pensiones se suma al ingreso bruto de la pensión (y rentas)
    const totalBaseGeneralBrutaFinal = baseGeneralPreRescate + withdrawnFromPension;
    const taxGeneral = calculateTaxes(totalBaseGeneralBrutaFinal, generalTaxBrackets);

    // Flujo de caja neto real anual y mensual
    const rescateNetoAnual = gap > 0 ? Math.max(0, gap - remainingGap) : 0;
    const ingresoNetoRealAnual = totalNetoDisponiblePreRescate + rescateNetoAnual;
    const realMonthlyIncome = ingresoNetoRealAnual / 12;
    const desiredMonthlyIncome = currentDesiredIncome / 12;

    // 2. Calcular beneficio global para aplicar correctamente la progresividad fiscal en Base del Ahorro
    let totalProfitSavingsBase = 0;
    for (const acc of currentSavings) {
      if (acc.amount > 0) {
        if (acc.type === 'savings') {
          acc.currentProfit = acc.amount * (parseFloat(acc.expectedReturn) / 100 || 0);
          totalProfitSavingsBase += acc.currentProfit;
        } else if (acc.type === 'liquid_real_estate') {
          acc.currentProfit = acc.pendingCapitalGain || 0;
          totalProfitSavingsBase += acc.currentProfit;
          acc.pendingCapitalGain = 0;
        } else if (acc.type === 'pension_plan') {
          acc.currentProfit = acc.amount * (parseFloat(acc.expectedReturn) / 100 || 0);
        } else {
          acc.currentProfit = 0;
        }
      } else {
        acc.currentProfit = 0;
      }
    }

    // 3. Calcular impuestos sobre el global y hallar el tipo efectivo
    const totalTaxesSavings = calculateTaxes(totalProfitSavingsBase, savingsTaxBrackets);
    const effectiveTaxRate = totalProfitSavingsBase > 0 ? (totalTaxesSavings / totalProfitSavingsBase) : 0;

    // 4. Sumar el beneficio neto a cada cuenta y separar líquidos de ilíquidos
    let capitalLiquido = 0;
    let capitalIliquido = 0;
    
    for (const acc of currentSavings) {
      if (acc.amount > 0) {
        if (acc.type === 'savings' || acc.type === 'liquid_real_estate') {
          const netProfit = acc.currentProfit - (acc.currentProfit * effectiveTaxRate);
          acc.amount += netProfit;
          
          if (acc.type === 'liquid_real_estate') {
            acc.type = 'savings';
            acc.expectedReturn = 0; // El cash no renta por defecto
          }
          capitalLiquido += acc.amount;
        } else if (acc.type === 'pension_plan') {
          acc.amount += acc.currentProfit;
          capitalLiquido += acc.amount;
        } else if (acc.type === 'real_estate') {
          capitalIliquido += acc.amount;
        }
      }
    }
    
    const totalSavingsYearEnd = capitalLiquido + capitalIliquido;

    results.push({
      year,
      age,
      pension: currentPension,
      pensionNetaAnual,
      impuestosDeLaPension,
      rentIncome: totalRentIncome,
      desiredIncome: currentDesiredIncome,
      desiredMonthlyIncome,
      realMonthlyIncome,
      rescateNetoAnual,
      gap,
      totalCapital: totalSavingsYearEnd,
      capitalLiquido,
      capitalIliquido,
      withdrawnFromPension,
      withdrawnFromSavings,
      estimatedTaxes: taxGeneral + totalTaxesSavings,
      uncoveredDeficit: remainingGap
    });

    // 5. Aplicar inflación para el siguiente año y revalorización de inmuebles
    currentPension *= (1 + inflationRate / 100);
    cumulativeInflation *= (1 + inflationRate / 100);
    cumulativeRentInflation *= (1 + rentInflationRate / 100);

    for (const acc of currentSavings) {
      if (acc.type === 'real_estate' && acc.amount > 0) {
        // El inmueble se revaloriza anualmente según su propio índice de mercado (IPV)
        acc.amount *= (1 + realEstateAppreciationRate / 100);
      }
    }
  }

  return results;
}

export function calculateRequiredReturn(params) {
  const isSustainable = (res) => res.every(yearData => yearData.totalCapital > 0 && (yearData.uncoveredDeficit || 0) <= 0.01);

  // 1. Verificar si con 0% es suficiente
  const paramsZero = { 
    ...params, 
    savings: params.savings.map(s => s.type === 'savings' ? { ...s, expectedReturn: 0 } : { ...s }) 
  };
  const resZero = projectRetirement(paramsZero);
  if (isSustainable(resZero)) return 0;

  // 2. Verificar si con 15% es suficiente
  const paramsMax = { 
    ...params, 
    savings: params.savings.map(s => s.type === 'savings' ? { ...s, expectedReturn: 15 } : { ...s }) 
  };
  const resMax = projectRetirement(paramsMax);
  if (!isSustainable(resMax)) return null; // Imposible en el rango 0-15%

  let low = 0;
  let high = 15;
  let optimal = null;

  // Búsqueda binaria (aprox 40 iteraciones dan altísima precisión)
  for (let i = 0; i < 40; i++) {
    let mid = (low + high) / 2;
    const testParams = { 
      ...params, 
      savings: params.savings.map(s => s.type === 'savings' ? { ...s, expectedReturn: mid } : { ...s }) 
    };
    const res = projectRetirement(testParams);

    if (isSustainable(res)) {
      optimal = mid;
      high = mid; // Intentar buscar una rentabilidad menor que también sirva
    } else {
      low = mid; // Nos quedamos cortos, necesitamos más rentabilidad
    }
  }

  return optimal !== null ? Number(optimal.toFixed(2)) : null;
}
