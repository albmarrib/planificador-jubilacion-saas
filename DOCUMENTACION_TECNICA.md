# Documento Técnico y Fiscal: Algoritmo de Optimización de Descapitalización en Jubilación

**Propósito del Sistema:** Proyectar la viabilidad del patrimonio de un individuo a lo largo de su esperanza de vida, aplicando reglas dinámicas de inflación, interés compuesto y una estrategia de extracción algorítmica que minimiza el impacto en el Impuesto sobre la Renta de las Personas Físicas (IRPF) según la legislación española vigente.

---

### 1. Parametrización Legal y Macroeconómica (Modal de Ajustes Globales)
El sistema no opera con variables legales fijas en el código (hardcodeadas), garantizando su perpetuidad y adaptabilidad ante cambios legislativos. Todos los cálculos beben de un "Estado Global" que el usuario o administrador configura a través de un panel dedicado:
- **Tramos IRPF (Base General):** Array de tramos progresivos (Rendimientos del Trabajo y Capital Inmobiliario). Ej: 19% hasta 12.450€, 24% hasta 20.200€, etc.
- **Tramos IRPF (Base del Ahorro):** Array de tramos para Ganancias Patrimoniales y Rendimientos del Capital Mobiliario. Ej: 19% hasta 6.000€, 21% hasta 50.000€, 23% hasta 200.000€, etc.
- **Topes y Límites:** Pensión máxima estatal anual.
- **Variables Macroeconómicas:** Inflación general (IPC estimado), Inflación específica para el límite de actualización de rentas de alquileres, y tasa de Revalorización Inmobiliaria Anual (IPV).

---

### 2. Necesidades de Capital y "Tramos de Vida" (La Sonrisa del Gasto)
El modelo asume que el gasto durante la jubilación no es lineal. El algoritmo procesa un array de "Tramos de Vida" definidos por el usuario (ej. de 65 a 75 años: 4.000€/mes; de 76 a 85 años: 2.500€/mes).
- **Indexación (Fórmula de Mantenimiento de Poder Adquisitivo):** En cada ciclo anual ($t$), el ingreso deseado mensual ($I_d$) y la pensión pública ($P$) se incrementan exponencialmente según el IPC estimado ($i$).
  ```text
  I_d(t) = I_d(t-1) * (1 + i)
  P(t) = P(t-1) * (1 + i)
  ```
- **Déficit Neto a Cubrir ($D$):** Diferencia requerida de los ahorros para alcanzar el estilo de vida deseado. Se calcula como el Ingreso Deseado Neto Anual menos la Pensión Neta Anual (obtenida tras aplicar el IRPF correspondiente de la Base General a la Pensión Bruta anual en 14 pagas).

---

### 3. Módulo Inmobiliario Avanzado: Rentas, Apreciación y Enajenaciones
El sistema clasifica los activos inmobiliarios como ilíquidos pero potencialmente generadores de flujo de caja y ganancias de capital a largo plazo.

#### A. Rentas de Alquiler (Rendimientos del Capital Inmobiliario)
Para los inmuebles marcados en régimen de arrendamiento, el sistema realiza la siguiente depuración antes de sumar el capital:
- **Flujo de Caja Neto:** El alquiler bruto se somete a una deducción por gastos deducibles estructurales (IBI, seguros, comunidad), parametrizable por el usuario (estándar 20%-30%).
- **Impacto Fiscal (Integración en Base General):** Esta renta neta anual se suma inexcusablemente a la Pensión Pública. Actúa minorando el Déficit Bruto ($D$), pero eleva la tributación del individuo en la Base Imponible General, reduciendo el margen disponible para rescatar Planes de Pensiones de forma óptima.
- **Actualización de Rentas:** La renta bruta se actualiza anualmente utilizando la variable separada "Inflación Alquileres" del panel global.

#### B. Evento de Enajenación y Revalorización (Venta de Inmuebles)
El motor inyecta el "Valor Actual" del inmueble como capital líquido en el año programado para su venta.
- **Apreciación por Interés Compuesto:** Antes del evento de venta, el valor del inmueble no permanece estático. El motor aplica un interés compuesto anual basado en la "Revalorización Inmobiliaria Anual" configurada (desacoplada del IPC general). Esto proyecta un precio de venta futuro realista y evita subestimar la base imponible.
- **Tributación por Plusvalías:** Para segundas residencias o ventas previas a los 65 años, se calcula la Ganancia Patrimonial (Valor Proyectado de Venta - Precio de Adquisición). Dado que la ley actual no permite coeficientes de actualización, este importe se integra automáticamente en la Base Imponible del Ahorro del ejercicio de venta, liquidándose los impuestos según la tabla progresiva.
- **Exención por Edad y Residencia Habitual:** Si se cumplen los criterios (Edad ≥ 65 y es vivienda habitual), la plusvalía generada queda totalmente exenta de tributación (art. 33.4.b LIRPF).

---

### 4. Algoritmo de Extracción Óptima (El Árbol de Decisión Fiscal)
Para cubrir el Déficit ($D$) restante, el sistema discrimina el origen del capital para evitar saltos de tramo impositivo.
- **Paso 1: Cálculo de la Base General Previa.** Se evalúa el tramo de IRPF actual sumando Pensión Pública + Rentas Netas Inmobiliarias.
- **Paso 2: Margen de Tramo (The Buffer).** Se calcula cuánta base imponible puede añadirse antes de que el tipo marginal salte al siguiente escalón (ej. el margen disponible al 30% antes de tributar al 37%).
- **Paso 3: Extracción de Plan de Pensiones (Margen de Seguridad).** El sistema rescata fondos del Plan de Pensiones hasta cubrir el Déficit, pero limitado estrictamente por el Margen de Tramo. Mecanismo de seguridad: Si los ingresos pasivos ya sitúan al usuario en un tramo ineficiente (ej. ≥ 37%), el algoritmo bloquea las extracciones del plan (0€) para proteger el capital y evitar el impacto fiscal confiscatorio.
- **Paso 4: Extracción de Fondos y Cuentas (Base del Ahorro).** El importe no cubierto por el Plan de Pensiones se extrae de la cartera líquida financiera, gozando de la fiscalidad favorable de la Base del Ahorro (19-28%).
- **Paso 5: Override Fiscal (Protocolo de Supervivencia).** El sistema prioriza la solvencia de caja sobre la optimización tributaria. Si tras agotar al 100% los activos líquidos de la Base del Ahorro (Paso 4) aún persiste un déficit anual no cubierto, el algoritmo anula el "Freno de Emergencia" del Paso 3. Automáticamente, forzará el rescate del Plan de Pensiones necesario para cubrir el coste de vida, asumiendo la penalización fiscal en el IRPF, con el fin de evitar la quiebra técnica del usuario.

---

### 5. Rentabilidad Financiera, Liquidación y Retribución Ejecutiva (RSUs)
El capital líquido que sobrevive a la extracción permanece invertido, capitalizando a la rentabilidad bruta configurada.
- **Aclaración sobre la Rentabilidad Anual Bruta:** En la configuración de activos (Cuentas, Fondos, Planes), el usuario introduce siempre la Rentabilidad Anual Bruta. El motor prohíbe deducir impuestos a ojo porque transforma la rentabilidad bruta en neta dinámicamente: calcula el beneficio anual, lo pasa por los tramos de la Base del Ahorro, descuenta la retención exacta (tipo medio efectivo) y solo capitaliza el neto.
- **Tratamiento de Retribución Ejecutiva (RSUs / Stock Options):** Las acciones consolidadas (vested) de corporaciones multinacionales, sobre las cuales el contribuyente ya ha tributado en nómina (salario en especie en la Base General) en el momento de su liberación, se clasifican explícitamente en el sistema como "Fondos / Acciones / Cuentas". El algoritmo proyectará su rentabilidad y, al realizar ventas para cubrir liquidez, gravará exclusivamente la plusvalía latente (beneficio) en la Base del Ahorro. Esto garantiza el rigor contable y evita simulaciones de doble imposición.

---

### 6. Oráculo de Viabilidad (Módulo Goal Seek y Robo-Advisor)
- **Propósito del Sistema:** Herramienta de diagnóstico financiero inverso que calcula la Tasa Interna de Retorno (TIR) mínima necesaria en activos líquidos para sostener el nivel de vida sin descapitalización total.
- **Mecanismo (Búsqueda Binaria Iterativa):** El motor lanza hasta 40 simulaciones completas de la vida del usuario (iterando variables fiscales e inflación), probando porcentajes en un rango de 0% a 15%.
- **Condición de Éxito:** Una tasa es válida solo si el saldo líquido se mantiene > 0€ en absolutamente todos los años del horizonte.
- **Termómetro de Riesgo y Perfilado:** La TIR resultante se cruza con una matriz de riesgo, mostrando un semáforo (Conservador, Moderado, Arriesgado, Peligro) con enlaces directos a los portales educativos de la CNMV para orientar la estructuración de la cartera.

---

### 7. Arquitectura Dual de Diagnóstico: Solvencia Patrimonial vs. Flujo de Caja
El sistema incorpora un doble panel analítico para disociar la riqueza latente de la liquidez operativa (Ingreso Neto Real), previniendo escenarios de insolvencia técnica (House Rich, Cash Poor).
- **Gráfico 1: Evolución del Patrimonio (Solvencia):** Monitoriza el balance general. Proyecta el saldo de los activos financieros (liquidez) y el valor latente de los activos inmobiliarios (ladrillo), reflejando la curva de capitalización y los picos de inyección de liquidez tras eventos de enajenación.
- **Gráfico 2: Nivel de Vida (Flujo de Caja):** Un indicador dinámico que contrasta el "Ingreso Deseado Mensual" frente al flujo de caja operativo disponible.
- **Motor de Cálculo del Ingreso Neto Real:** La métrica crítica del simulador se define mediante la siguiente ecuación integradora:
  ```text
  Ingreso Neto Real (Mes) = (Pensión Neta Anual + Rentas Inmobiliarias Netas Anuales + Rescate Neto Anual de liquidez) / 12
  ```
- **Detección de Caída de Nivel de Vida:** Mientras exista capital líquido rescatable, el Ingreso Neto Real iguala al Ingreso Deseado. Ante el agotamiento de la liquidez, el motor cancela la extracción y el gráfico evidencia matemáticamente un "acantilado financiero", desplomando el nivel de vida mensual del usuario hasta el suelo vitalicio de la Pensión Neta + Rentas.

---

### 8. Gestión B2B de Expedientes y Persistencia de Datos
El sistema está diseñado para entornos de asesoría (SaaS) integrando conexión directa con bases de datos no relacionales (Firebase/Firestore). Permite archivar el "Estado Global" y la parametrización individual como un Expediente de Cliente, garantizando la recuperación, edición iterativa y seguimiento interanual del plan de jubilación sin pérdida de contexto ni reintroducción de datos.

---

### 9. Módulo de Diagnóstico Analítico y Fiscal Inteligente
El motor post-procesa el array de resultados matemáticos para emitir dictámenes automatizados en tiempo real. Este módulo busca patrones de ineficiencia y traduce los datos crudos a un lenguaje comercial accionable para el cliente final, incluyendo fundamentos jurídicos vinculados directamente al Boletín Oficial del Estado (BOE) o autoridades competentes:
- **Regla 1 (Ineficiencia Marginal en Rescates):**
  - **Condición algorítmica:** El rescate del Plan de Pensiones > 0 y la Base General resultante supera el tope del tramo máximo configurado.
  - **Alerta UI:** Tarjeta amarilla (Warning).
  - **Mensaje al cliente:** "Hachazo fiscal por rescate excesivo. En el año [X], sacar tanto del Plan de Pensiones de golpe te empuja al tramo máximo de Hacienda. Acción sugerida: Reduce tu 'Ingreso Deseado' en esta etapa para rescatar el plan poco a poco y pagar muchos menos impuestos."
  - **Fundamento:** Art. 63 LIRPF - Escalas de gravamen.
- **Regla 2 (Protocolo de Supervivencia / Desastre Fiscal):**
  - **Condición algorítmica:** La liquidez financiera (Fondos/Cuentas) se agota (0€) provocando un rescate forzoso masivo del Plan de Pensiones para cubrir el déficit.
  - **Alerta UI:** Tarjeta roja (Critical).
  - **Mensaje al cliente:** "Alerta de desastre fiscal por falta de liquidez. En el año [X], te quedas sin ahorros líquidos. Para mantener tu tren de vida, el sistema se ve obligado a vaciar tu Plan de Pensiones de golpe, asumiendo una penalización fiscal brutal. Acción sugerida: Ajusta tus gastos antes de llegar a este año."
  - **Fundamento:** Art. 17.2.a LIRPF - Tributación de Planes de Pensiones.
- **Regla 3 (Tensión de Tesorería por Activo Ilíquido - House Rich, Cash Poor):**
  - **Condición algorítmica:** Capital líquido = 0€, Valor Inmobiliario > 0€, Faltante a Cubrir > 0€.
  - **Alerta UI:** Tarjeta roja (Critical).
  - **Mensaje al cliente:** "Peligro: Rico en ladrillo, pobre en el banco. En el año [X], te quedas sin liquidez para el día a día a pesar de tener patrimonio inmobiliario. Acción sugerida: Programa la venta, alquiler o hipoteca inversa del inmueble antes de esta fecha."
  - **Fundamento:** Principio de Liquidez y Solvencia - Criterios CNMV.
- **Regla 4 (Caída Forzosa del Nivel de Vida):**
  - **Condición algorítmica:** El Ingreso Neto Real mensual cae matemáticamente por debajo del Ingreso Deseado.
  - **Alerta UI:** Tarjeta roja (Critical).
  - **Mensaje al cliente:** "Caída brusca de tu nivel de vida. A partir del año [X], tus ahorros se agotan por completo. Tu ingreso mensual caerá en picado y tendrás que sobrevivir únicamente con tu pensión pública."
  - **Fundamento:** Diagnóstico Matemático de Insolvencia Financiera.
- **Escenario Óptimo (Viabilidad Sostenible):**
  - **Condición algorítmica:** No se activa ninguna de las alertas críticas o fiscales anteriores.
  - **Alerta UI:** Tarjeta verde (Success) certificando que la desacumulación cubre el nivel de vida sin incurrir en penalizaciones.

---

### 10. Generación de Informes y Entregables (Arquitectura de Impresión Nativa PDF)
Para resolver las incompatibilidades históricas entre componentes SVG dinámicos (Recharts) y librerías de clonación canvas, el sistema delega la generación del informe final (PDF) en el motor de impresión nativo del navegador. Mediante CSS avanzado (`print:` modifiers de Tailwind), la UI interactiva se transmuta en un expediente A4 institucional: ocultando sidebars y controles, forzando paletas de color imprimibles y garantizando una resolución vectorial infinita en los gráficos de Solvencia y Nivel de Vida, evitando pixelados y rupturas de contenedores responsivos.

---

### Anexo: Guía de Actualización Anual (Mantenimiento Legal)
Para mantener la precisión matemática, se debe realizar una revisión anual en el panel "Ajustes Globales" (preferiblemente entre enero y febrero, tras la aprobación de los PGE).

#### A. Tramos del IRPF (Base General y Base del Ahorro)
- **Qué es:** Porcentajes de impuestos aplicables a ingresos y ganancias.
- **Dónde consultarlo:** Agencia Tributaria (sede.agenciatributaria.gob.es), "Manual Práctico de Renta".

#### B. Pensión Pública Estimada (Bruta / 14 pagas)
- **Qué es:** Importe mensual bruto en 14 pagas estimado por el sistema público de la Seguridad Social. El motor deduce automáticamente su IRPF según los tramos generales para obtener la pensión neta de bolsillo y calcular el déficit con precisión.
- **Dónde consultarlo:** Portal Tu Seguridad Social (sede-tu.seg-social.gob.es) o simulador oficial de jubilación.

#### C. Inflación (IPC e IPC de Alquileres)
- **Qué es:** Porcentaje estimado de encarecimiento del coste de vida y topes legales a rentas.
- **Dónde consultarlo:** Instituto Nacional de Estadística (ine.es) y previsiones del Banco de España (bde.es).

#### D. Revalorización Inmobiliaria Anual (IPV)
- **Qué es:** Porcentaje de crecimiento anual proyectado para el mercado inmobiliario, utilizado por el motor para aplicar interés compuesto al valor de las propiedades antes de su venta simulada.
- **Dónde consultarlo:** Índice de Precios de Vivienda (IPV) publicado por el Instituto Nacional de Estadística (ine.es).
- **Cómo actualizarlo:** Se recomienda introducir una Tasa de Variación Anual media histórica (ej. 2% - 4%) en el panel de Ajustes Globales, evitando la volatilidad de los datos trimestrales a corto plazo.
