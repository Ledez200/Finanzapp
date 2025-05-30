// Gastos fijos mensuales
const gastosFijos = {
    'Alquiler': 460,
    'Hacienda': 125,
    'Vodafone': 42,
    'Forbe': 58,
    'Internet': 38,
    'Netflix': 14,
    'Pepper': 61,
    'Luz': 60,
    'Abanca': 80
};

// Saldo inicial de las cuotas a crédito (solo para la primera carga)
const saldosInicialesCredito = {
    'Forbe': 377,
    'Vodafone': 769,
    'Pepper': 304,
    'Abanca': 1500,
    'Hacienda': 2264
};

// Objeto para almacenar los saldos restantes de las cuotas a crédito
let creditoSaldosRestantes = {};

// Array para almacenar los ingresos
let ingresos = [];
// Objeto para almacenar el estado de los gastos por mes
let gastosEstado = {};

// Array para almacenar los gastos extras
let gastosExtras = [];

// Variables globales para el chat
let chatHistory = [];
const GROQ_API_KEY = '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'; // Aquí deberás añadir tu API key de Groq

// Elementos del DOM
const ingresoForm = document.getElementById('ingresoForm');
const conceptoIngreso = document.getElementById('conceptoIngreso');
const montoIngreso = document.getElementById('montoIngreso');
const fechaIngreso = document.getElementById('fechaIngreso');
const listaIngresos = document.getElementById('listaIngresos');
const listaGastos = document.getElementById('listaGastos');
const totalIngresosElement = document.getElementById('totalIngresos');
const totalGastosElement = document.getElementById('totalGastos');
const balanceFinalElement = document.getElementById('balanceFinal');
const mesActual = document.getElementById('mesActual');
const añoActual = document.getElementById('añoActual');

// Elementos del DOM para gastos extras
const gastoExtraForm = document.getElementById('gastoExtraForm');
const gastoExtraModal = document.getElementById('gastoExtraModal');
const nuevoGastoExtraBtn = document.getElementById('nuevoGastoExtraBtn');
const listaGastosExtras = document.getElementById('listaGastosExtras');
const gastosPagadosElement = document.getElementById('gastosPagados');
const gastosPendientesElement = document.getElementById('gastosPendientes');

// Variables globales para el gráfico
let graficoBalance = null;

// Gestión de Objetivos de Ahorro
class ObjetivoAhorro {
    constructor(id, nombre, meta, fechaObjetivo) {
        this.id = id;
        this.nombre = nombre;
        this.meta = parseFloat(meta);
        this.fechaObjetivo = new Date(fechaObjetivo);
        this.ahorros = [];
    }

    agregarAhorro(monto, fecha) {
        this.ahorros.push({
            monto: parseFloat(monto),
            fecha: new Date(fecha)
        });
        this.guardarEnLocalStorage();
    }

    getTotalAhorrado() {
        return this.ahorros.reduce((total, ahorro) => total + ahorro.monto, 0);
    }

    getProgreso() {
        return (this.getTotalAhorrado() / this.meta) * 100;
    }

    getDiasRestantes() {
        const hoy = new Date();
        const diferencia = this.fechaObjetivo - hoy;
        return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
    }

    guardarEnLocalStorage() {
        const objetivos = JSON.parse(localStorage.getItem('objetivosAhorro') || '[]');
        const index = objetivos.findIndex(obj => obj.id === this.id);
        
        if (index !== -1) {
            objetivos[index] = this;
        } else {
            objetivos.push(this);
        }
        
        localStorage.setItem('objetivosAhorro', JSON.stringify(objetivos));
    }

    static eliminar(id) {
        const objetivos = JSON.parse(localStorage.getItem('objetivosAhorro') || '[]');
        const nuevosObjetivos = objetivos.filter(obj => obj.id !== id);
        localStorage.setItem('objetivosAhorro', JSON.stringify(nuevosObjetivos));
    }

    static cargarTodos() {
        const objetivos = JSON.parse(localStorage.getItem('objetivosAhorro') || '[]');
        return objetivos.map(obj => {
            const objetivo = new ObjetivoAhorro(obj.id, obj.nombre, obj.meta, obj.fechaObjetivo);
            objetivo.ahorros = obj.ahorros;
            return objetivo;
        });
    }
}

// UI de Objetivos de Ahorro
function inicializarObjetivosAhorro() {
    const btnNuevoObjetivo = document.getElementById('nuevoObjetivoBtn');
    const objetivoModal = document.getElementById('objetivoModal');
    const ahorroModal = document.getElementById('ahorroModal');
    const objetivoForm = document.getElementById('objetivoForm');
    const ahorroForm = document.getElementById('ahorroForm');
    const objetivosGrid = document.getElementById('objetivosGrid');

    // Cargar objetivos existentes
    cargarObjetivos();

    // Event Listeners para modales
    btnNuevoObjetivo.addEventListener('click', () => {
        objetivoModal.classList.add('active');
    });

    document.querySelectorAll('.btn-cerrar').forEach(btn => {
        btn.addEventListener('click', () => {
            objetivoModal.classList.remove('active');
            ahorroModal.classList.remove('active');
        });
    });

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === objetivoModal) objetivoModal.classList.remove('active');
        if (e.target === ahorroModal) ahorroModal.classList.remove('active');
    });

    // Manejar formulario de nuevo objetivo
    objetivoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombreObjetivo').value;
        const meta = document.getElementById('metaObjetivo').value;
        const fecha = document.getElementById('fechaObjetivo').value;

        const objetivo = new ObjetivoAhorro(
            Date.now().toString(),
            nombre,
            meta,
            fecha
        );
        objetivo.guardarEnLocalStorage();
        objetivoForm.reset();
        objetivoModal.classList.remove('active');
        cargarObjetivos();
    });

    // Manejar formulario de ahorro
    ahorroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const objetivoId = ahorroForm.dataset.objetivoId;
        const monto = document.getElementById('montoAhorro').value;
        const fecha = document.getElementById('fechaAhorro').value;

        const objetivos = ObjetivoAhorro.cargarTodos();
        const objetivo = objetivos.find(obj => obj.id === objetivoId);
        
        if (objetivo) {
            objetivo.agregarAhorro(monto, fecha);
            ahorroForm.reset();
            ahorroModal.classList.remove('active');
            cargarObjetivos();
        }
    });
}

function cargarObjetivos() {
    const objetivosGrid = document.getElementById('objetivosGrid');
    const objetivos = ObjetivoAhorro.cargarTodos();
    
    objetivosGrid.innerHTML = '';
    
    objetivos.forEach(objetivo => {
        const totalAhorrado = objetivo.getTotalAhorrado();
        const progreso = objetivo.getProgreso();
        const diasRestantes = objetivo.getDiasRestantes();
        
        const objetivoCard = document.createElement('div');
        objetivoCard.className = 'objetivo-card';
        objetivoCard.innerHTML = `
            <div class="objetivo-header">
                <h3 class="objetivo-titulo">${objetivo.nombre}</h3>
                <button class="btn-eliminar-objetivo" data-id="${objetivo.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="objetivo-meta">
                Meta: ${objetivo.meta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
            <div class="objetivo-progreso">
                <div class="objetivo-progreso-bar" style="width: ${Math.min(progreso, 100)}%"></div>
            </div>
            <div class="objetivo-detalles">
                <span>Ahorrado: ${totalAhorrado.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                <span>${diasRestantes} días restantes</span>
            </div>
            <div class="objetivo-acciones">
                <button class="btn-ahorro" data-id="${objetivo.id}">
                    <i class="fas fa-plus"></i> Registrar Ahorro
                </button>
            </div>
        `;
        
        objetivosGrid.appendChild(objetivoCard);
    });

    // Event listeners para botones de acción
    document.querySelectorAll('.btn-eliminar-objetivo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('¿Estás seguro de que deseas eliminar este objetivo?')) {
                const id = e.currentTarget.dataset.id;
                ObjetivoAhorro.eliminar(id);
                cargarObjetivos();
            }
        });
    });

    document.querySelectorAll('.btn-ahorro').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const ahorroForm = document.getElementById('ahorroForm');
            ahorroForm.dataset.objetivoId = id;
            document.getElementById('ahorroModal').classList.add('active');
        });
    });
}

// Función para manejar la navegación
function inicializarNavegacion() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remover clase active de todos los items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Agregar clase active al item clickeado
            item.classList.add('active');

            // Ocultar todas las secciones
            sections.forEach(section => section.classList.remove('active'));
            // Mostrar la sección correspondiente
            const sectionId = item.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
        });
    });
}

// Función para inicializar la aplicación
function inicializarApp() {
    // Inicializar navegación
    inicializarNavegacion();

    // Cargar ingresos del localStorage si existen
    const ingresosGuardados = localStorage.getItem('ingresos');
    if (ingresosGuardados) {
        ingresos = JSON.parse(ingresosGuardados);
    }

    // Cargar estado de gastos del localStorage si existen
    const gastosEstadoGuardado = localStorage.getItem('gastosEstado');
    if (gastosEstadoGuardado) {
        gastosEstado = JSON.parse(gastosEstadoGuardado);
    }

    // Cargar saldos de crédito restantes del localStorage
    const saldosCreditoGuardados = localStorage.getItem('creditoSaldosRestantes');
    if (saldosCreditoGuardados) {
        creditoSaldosRestantes = JSON.parse(saldosCreditoGuardados);
        
        // Asegurarse de que los nuevos items de credito (como Hacienda) se inicialicen si es necesario
        for (const concepto in saldosInicialesCredito) {
            if (creditoSaldosRestantes[concepto] === undefined) {
                creditoSaldosRestantes[concepto] = saldosInicialesCredito[concepto];
            }
        }

    } else {
        // Si no hay saldos guardados, inicializar con los saldos iniciales
        creditoSaldosRestantes = { ...saldosInicialesCredito };
    }
    localStorage.setItem('creditoSaldosRestantes', JSON.stringify(creditoSaldosRestantes));

    // Inicializar selector de años
    inicializarSelectorAños();

    // Establecer mes y año actual
    const fecha = new Date();
    mesActual.value = fecha.getMonth() + 1;
    añoActual.value = fecha.getFullYear();

    // Mostrar gastos fijos
    mostrarGastosFijos();
    
    // Mostrar ingresos existentes
    mostrarIngresos();
    
    // Actualizar balance y gráfico
    actualizarBalance();

    // Event listeners para cambios de mes y año
    mesActual.addEventListener('change', mostrarGastosFijos);
    añoActual.addEventListener('change', mostrarGastosFijos);

    // Inicializar objetivos de ahorro
    inicializarObjetivosAhorro();

    // Inicializar gastos extras
    inicializarGastosExtras();

    // Inicializar acordeón de ingresos
    inicializarAcordeonIngresos();

    // Inicializar import/export
    inicializarImportExport();

    // Inicializar chat
    inicializarChat();
}

// Función para inicializar el selector de años
function inicializarSelectorAños() {
    const añoActual = new Date().getFullYear();
    const selectorAños = document.getElementById('añoActual');
    
    for (let año = añoActual - 2; año <= añoActual + 2; año++) {
        const option = document.createElement('option');
        option.value = año;
        option.textContent = año;
        selectorAños.appendChild(option);
    }
}

// Función para obtener la clave del mes actual
function obtenerClaveMes() {
    return `${añoActual.value}-${mesActual.value}`;
}

// Función para calcular el total de gastos pagados del mes actual
function calcularGastosPagados() {
    const claveMes = obtenerClaveMes();
    let totalGastosPagados = 0;

    if (gastosEstado[claveMes]) {
        for (const [concepto, estaPagado] of Object.entries(gastosEstado[claveMes])) {
            // Solo sumar si el gasto fijo todavía tiene saldo restante o no es un crédito con saldo 0
            if (estaPagado && (creditoSaldosRestantes[concepto] === undefined || creditoSaldosRestantes[concepto] > 0)) {
                totalGastosPagados += gastosFijos[concepto];
            }
        }
    }

    return totalGastosPagados;
}

// Función para mostrar los gastos fijos
function mostrarGastosFijos() {
    listaGastos.innerHTML = '';
    let totalGastosFijosMes = 0;
    let gastosPagadosMes = 0;
    let gastosPendientesMes = 0;
    const claveMes = obtenerClaveMes();

    // Inicializar el estado del mes si no existe
    if (!gastosEstado[claveMes]) {
        gastosEstado[claveMes] = {};
    }

    for (const [concepto, monto] of Object.entries(gastosFijos)) {
        // Solo mostrar el gasto si tiene saldo restante o no es una cuota a crédito
        if (creditoSaldosRestantes[concepto] === undefined || creditoSaldosRestantes[concepto] > 0) {
            const li = document.createElement('li');
            li.className = 'gasto-item';
            
            const estaPagado = gastosEstado[claveMes][concepto] || false;
            
            // Crear estructura para mostrar el saldo restante si es una cuota a crédito
            const esCuotaCredito = creditoSaldosRestantes[concepto] !== undefined;
            const saldoRestanteHTML = esCuotaCredito
                ? `<span class="gasto-saldo-credito">Saldo restante: ${creditoSaldosRestantes[concepto].toFixed(2)} €</span>`
                : '';

            // Añadir botón de editar solo para cuotas a crédito
            const editarBtnHTML = esCuotaCredito 
                ? `<button type="button" class="btn-editar-gasto-fijo" onclick="editarSaldoCredito('${concepto}')"><i class="fas fa-edit"></i> Editar</button>` 
                : '';

            li.innerHTML = `
                <div class="gasto-info">
                    <span class="gasto-concepto">${concepto}</span>
                    ${saldoRestanteHTML}
                </div>
                <span class="gasto-monto">${monto.toFixed(2)} €</span>
                <div class="gasto-acciones">
                    ${editarBtnHTML}
                    <button type="button" class="btn-pagado ${estaPagado ? 'pagado' : ''}" 
                            onclick="toggleGastoPagado('${concepto}')">
                        ${estaPagado ? '✓ Pagado' : 'Pendiente'}
                    </button>
                </div>
            `;
            listaGastos.appendChild(li);

            // Calcular totales mostrados en la UI del mes
            totalGastosFijosMes += monto;
            if (estaPagado) {
                gastosPagadosMes += monto;
            } else {
                gastosPendientesMes += monto;
            }
        }
    }

    // Actualizar los elementos de resumen en la UI
    document.getElementById('totalGastosFijosMes').textContent = `${totalGastosFijosMes.toFixed(2)} €`;
    gastosPagadosElement.textContent = `${gastosPagadosMes.toFixed(2)} €`;
    gastosPendientesElement.textContent = `${gastosPendientesMes.toFixed(2)} €`;
    
    // Guardar el estado de pago del mes
    localStorage.setItem('gastosEstado', JSON.stringify(gastosEstado));
    
    // Actualizar el balance después de actualizar los gastos
    actualizarBalance();
}

// Función para editar el saldo restante de una cuota a crédito
function editarSaldoCredito(concepto) {
    const saldoActual = creditoSaldosRestantes[concepto];
    if (saldoActual === undefined) return; // No es una cuota a crédito

    const nuevoSaldoStr = prompt(`Editar saldo restante para ${concepto}:`, saldoActual.toFixed(2));

    if (nuevoSaldoStr !== null) { // Si el usuario no cancela
        const nuevoSaldo = parseFloat(nuevoSaldoStr);

        if (!isNaN(nuevoSaldo) && nuevoSaldo >= 0) {
            creditoSaldosRestantes[concepto] = nuevoSaldo;
            localStorage.setItem('creditoSaldosRestantes', JSON.stringify(creditoSaldosRestantes));
            
            // Si el nuevo saldo es 0, limpiar el estado de pago en todos los meses
            if (nuevoSaldo === 0) {
                 for (const claveMes in gastosEstado) {
                     if (gastosEstado[claveMes][concepto] !== undefined) {
                         delete gastosEstado[claveMes][concepto];
                     }
                 }
                 localStorage.setItem('gastosEstado', JSON.stringify(gastosEstado));
            }

            mostrarGastosFijos(); // Volver a mostrar la lista (ocultará si el saldo es 0)
            actualizarBalance(); // Actualizar el balance
        } else {
            alert('Por favor, introduce un número válido mayor o igual a cero.');
        }
    }
}

// Función para alternar el estado de pago de un gasto
function toggleGastoPagado(concepto) {
    const claveMes = obtenerClaveMes();
    const estabaPagado = gastosEstado[claveMes][concepto] || false;
    const esCuotaCredito = creditoSaldosRestantes[concepto] !== undefined;
    const montoMensual = gastosFijos[concepto];

    // Alternar el estado de pago para el mes SIEMPRE
    gastosEstado[claveMes][concepto] = !estabaPagado;

    // Si es una cuota a crédito...
    if (esCuotaCredito) {
        // ...y se está marcando como pagada (Pendiente -> Pagado) por primera vez en este mes
        // y el saldo restante global es mayor que 0, entonces descontar.
        if (!estabaPagado && gastosEstado[claveMes][concepto] && creditoSaldosRestantes[concepto] > 0) {
            creditoSaldosRestantes[concepto] -= montoMensual;
            
            // Asegurar que el saldo no sea negativo
            if (creditoSaldosRestantes[concepto] < 0) {
                creditoSaldosRestantes[concepto] = 0;
            }
            
            // Guardar el saldo restante actualizado
            localStorage.setItem('creditoSaldosRestantes', JSON.stringify(creditoSaldosRestantes));

        // ...o si se está desmarcando (Pagado -> Pendiente) en este mes
        // entonces sumar de vuelta al saldo restante global.
        } else if (estabaPagado && !gastosEstado[claveMes][concepto]) {
             creditoSaldosRestantes[concepto] += montoMensual;
             // Guardar el saldo restante actualizado
            localStorage.setItem('creditoSaldosRestantes', JSON.stringify(creditoSaldosRestantes));
        }
    }
    
    // Volver a mostrar gastos y actualizar balance
    mostrarGastosFijos();
}

// Función para mostrar los ingresos
function mostrarIngresos() {
    listaIngresos.innerHTML = '';
    let totalIngresos = 0;

    ingresos.forEach((ingreso, index) => {
        const li = document.createElement('li');
        li.className = 'ingreso-item';
        const fecha = new Date(ingreso.fecha).toLocaleDateString('es-ES');
        
        li.innerHTML = `
            <div class="ingreso-info">
                <span class="ingreso-concepto">${ingreso.concepto}</span>
                <span class="ingreso-fecha">${fecha}</span>
                <span>${ingreso.monto.toFixed(2)} €</span>
            </div>
            <div class="ingreso-acciones">
                <button class="btn-editar" onclick="editarIngreso(${index})">Editar</button>
                <button class="btn-eliminar" onclick="eliminarIngreso(${index})">Eliminar</button>
            </div>
        `;
        listaIngresos.appendChild(li);
        totalIngresos += ingreso.monto;
    });

    totalIngresosElement.textContent = `${totalIngresos.toFixed(2)} €`;
}

// Función para actualizar el balance
function actualizarBalance() {
    const totalIngresos = ingresos.reduce((sum, ingreso) => sum + ingreso.monto, 0);
    // calcularGastosPagados() ya usa el estado de pago del mes y los saldos restantes
    const totalGastosPagadosMes = calcularGastosPagados(); 
    const totalGastosExtras = gastosExtras.reduce((sum, gasto) => sum + gasto.monto, 0);
    
    // El balance general usa solo los gastos pagados del mes y los extras
    const balance = totalIngresos - totalGastosPagadosMes - totalGastosExtras;

    // Actualizar totales mostrados en el Dashboard
    totalIngresosElement.textContent = `${totalIngresos.toFixed(2)} €`;
    // El total de gastos en el dashboard debe ser la suma de gastos fijos pagados del mes y gastos extras
    totalGastosElement.textContent = `${(totalGastosPagadosMes + totalGastosExtras).toFixed(2)} €`; 
    balanceFinalElement.textContent = `${balance.toFixed(2)} €`;

    // Actualizar colores según el balance
    balanceFinalElement.style.color = balance >= 0 ? '#48bb78' : '#e53e3e';
    const balanceSection = document.querySelector('.balance-section');
    if (balance < 0) {
        balanceSection.classList.add('balance-negativo');
    } else {
        balanceSection.classList.remove('balance-negativo');
    }

    // Actualizar el gráfico
    inicializarGraficoBalance();
}

// Función para inicializar el gráfico de balance
function inicializarGraficoBalance() {
    const ctx = document.getElementById('graficoBalance').getContext('2d');
    
    // Destruir el gráfico existente si hay uno
    if (graficoBalance) {
        graficoBalance.destroy();
    }

    // Obtener datos para el gráfico
    const datos = obtenerDatosBalance();

    graficoBalance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datos.labels,
            datasets: [{
                label: 'Balance',
                data: datos.balances,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Balance: ${context.raw.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Función para obtener los datos del balance
function obtenerDatosBalance() {
    const meses = [];
    const balances = [];
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth();
    const añoActual = fechaActual.getFullYear();

    // Obtener todos los meses únicos de los ingresos y gastos
    const mesesUnicos = new Set();

    // Agregar meses de los ingresos
    ingresos.forEach(ingreso => {
        const fecha = new Date(ingreso.fecha);
        mesesUnicos.add(`${fecha.getFullYear()}-${fecha.getMonth() + 1}`);
    });

    // Agregar meses de los gastos
    Object.keys(gastosEstado).forEach(claveMes => {
        mesesUnicos.add(claveMes);
    });

    // Convertir a array y ordenar cronológicamente
    const mesesOrdenados = Array.from(mesesUnicos).sort();

    // Calcular el balance para cada mes
    mesesOrdenados.forEach(claveMes => {
        const [año, mes] = claveMes.split('-').map(Number);
        const fecha = new Date(año, mes - 1, 1);
        const nombreMes = fecha.toLocaleString('es-ES', { month: 'short', year: 'numeric' });
        
        // calcularBalanceMensual debe considerar solo los gastos fijos con saldo restante > 0 para ese mes
        const balance = calcularBalanceMensual(mes, año);
        
        // Solo agregar meses que tengan datos (balance diferente de 0)
        if (balance !== 0) {
            meses.push(nombreMes);
            balances.push(balance);
        }
    });

    // Si no hay datos, mostrar el mes actual con balance 0
    if (meses.length === 0) {
        const fecha = new Date();
        meses.push(fecha.toLocaleString('es-ES', { month: 'short', year: 'numeric' }));
        balances.push(0);
    }

    return {
        labels: meses,
        balances: balances
    };
}

// Función para calcular el balance de un mes específico
function calcularBalanceMensual(mes, año) {
    // Filtrar ingresos del mes
    const ingresosMes = ingresos.filter(ingreso => {
        const fechaIngreso = new Date(ingreso.fecha);
        return fechaIngreso.getMonth() + 1 === mes && fechaIngreso.getFullYear() === año;
    });

    // Calcular total de ingresos del mes
    const totalIngresos = ingresosMes.reduce((sum, ingreso) => sum + ingreso.monto, 0);

    // Calcular total de gastos pagados del mes seleccionado
    const claveMes = `${año}-${mes}`;
    let totalGastosPagadosMes = 0;

    if (gastosEstado[claveMes]) {
        for (const [concepto, estaPagado] of Object.entries(gastosEstado[claveMes])) {
             // Solo sumar si el gasto fijo fue marcado como pagado en ESTE mes y todavía tiene saldo restante o no es un crédito
            if (estaPagado && (creditoSaldosRestantes[concepto] === undefined || creditoSaldosRestantes[concepto] > 0)) {
                totalGastosPagadosMes += gastosFijos[concepto];
            }
        }
    }

     // Sumar gastos extras del mes
     const gastosExtrasMes = gastosExtras.filter(gasto => {
        const fechaGasto = new Date(gasto.fecha);
        return fechaGasto.getMonth() + 1 === mes && fechaGasto.getFullYear() === año;
    });
    const totalGastosExtrasMes = gastosExtrasMes.reduce((sum, gasto) => sum + gasto.monto, 0);

    // El balance mensual es ingresos - gastos fijos pagados en el mes - gastos extras del mes
    return totalIngresos - totalGastosPagadosMes - totalGastosExtrasMes;
}

// Función para agregar un nuevo ingreso
function agregarIngreso(e) {
    e.preventDefault();

    const concepto = conceptoIngreso.value.trim();
    const monto = parseFloat(montoIngreso.value);
    const fecha = fechaIngreso.value;

    if (!concepto || monto <= 0 || !fecha) {
        alert('Por favor, complete todos los campos correctamente');
        return;
    }

    ingresos.push({ concepto, monto, fecha });
    localStorage.setItem('ingresos', JSON.stringify(ingresos));

    mostrarIngresos();
    actualizarBalance();

    // Limpiar el formulario
    ingresoForm.reset();
}

// Función para editar un ingreso
function editarIngreso(index) {
    const ingreso = ingresos[index];
    const nuevoConcepto = prompt('Nuevo concepto:', ingreso.concepto);
    const nuevoMonto = prompt('Nuevo monto:', ingreso.monto);
    const nuevaFecha = prompt('Nueva fecha (YYYY-MM-DD):', ingreso.fecha);

    if (nuevoConcepto && nuevoMonto && nuevaFecha) {
        ingresos[index] = {
            concepto: nuevoConcepto,
            monto: parseFloat(nuevoMonto),
            fecha: nuevaFecha
        };
        localStorage.setItem('ingresos', JSON.stringify(ingresos));
        mostrarIngresos();
        actualizarBalance();
    }
}

// Función para eliminar un ingreso
function eliminarIngreso(index) {
    if (confirm('¿Está seguro de que desea eliminar este ingreso?')) {
        ingresos.splice(index, 1);
        localStorage.setItem('ingresos', JSON.stringify(ingresos));
        mostrarIngresos();
        actualizarBalance();
    }
}

// Event Listeners
ingresoForm.addEventListener('submit', agregarIngreso);

// Función para inicializar la funcionalidad de gastos extras
function inicializarGastosExtras() {
    // Cargar gastos extras del localStorage
    const gastosExtrasGuardados = localStorage.getItem('gastosExtras');
    if (gastosExtrasGuardados) {
        gastosExtras = JSON.parse(gastosExtrasGuardados);
    }

    // Event listeners
    nuevoGastoExtraBtn.addEventListener('click', () => {
        gastoExtraModal.classList.add('active');
    });

    document.querySelectorAll('.btn-cerrar').forEach(btn => {
        btn.addEventListener('click', () => {
            gastoExtraModal.classList.remove('active');
        });
    });

    gastoExtraForm.addEventListener('submit', agregarGastoExtra);

    // Mostrar gastos extras existentes
    mostrarGastosExtras();
}

// Función para agregar un nuevo gasto extra
function agregarGastoExtra(e) {
    e.preventDefault();

    const concepto = document.getElementById('conceptoGastoExtra').value.trim();
    const monto = parseFloat(document.getElementById('montoGastoExtra').value);
    const fecha = document.getElementById('fechaGastoExtra').value;
    const categoria = document.getElementById('categoriaGastoExtra').value;

    if (!concepto || monto <= 0 || !fecha) {
        alert('Por favor, complete todos los campos correctamente');
        return;
    }

    const nuevoGasto = {
        id: Date.now().toString(),
        concepto,
        monto,
        fecha,
        categoria
    };

    gastosExtras.push(nuevoGasto);
    localStorage.setItem('gastosExtras', JSON.stringify(gastosExtras));

    mostrarGastosExtras();
    actualizarBalance();
    gastoExtraForm.reset();
    gastoExtraModal.classList.remove('active');
}

// Función para mostrar los gastos extras
function mostrarGastosExtras() {
    listaGastosExtras.innerHTML = '';
    
    // Ordenar gastos por fecha (más recientes primero)
    const gastosOrdenados = [...gastosExtras].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    gastosOrdenados.forEach(gasto => {
        const li = document.createElement('li');
        li.className = 'gasto-extra-item';
        const fecha = new Date(gasto.fecha).toLocaleDateString('es-ES');
        
        li.innerHTML = `
            <div class="gasto-extra-info">
                <span class="gasto-extra-concepto">${gasto.concepto}</span>
                <div class="gasto-extra-detalles">
                    <span>${fecha}</span>
                    <span class="gasto-extra-categoria ${gasto.categoria}">${gasto.categoria}</span>
                </div>
            </div>
            <span class="gasto-extra-monto">${gasto.monto.toFixed(2)} €</span>
            <div class="gasto-extra-acciones">
                <button class="btn-editar" onclick="editarGastoExtra('${gasto.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-eliminar" onclick="eliminarGastoExtra('${gasto.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        listaGastosExtras.appendChild(li);
    });
}

// Función para editar un gasto extra
function editarGastoExtra(id) {
    const gasto = gastosExtras.find(g => g.id === id);
    if (!gasto) return;

    const nuevoConcepto = prompt('Nuevo concepto:', gasto.concepto);
    const nuevoMonto = prompt('Nuevo monto:', gasto.monto);
    const nuevaFecha = prompt('Nueva fecha (YYYY-MM-DD):', gasto.fecha);
    const nuevaCategoria = prompt('Nueva categoría (compras/ocio/transporte/salud/otros):', gasto.categoria);

    if (nuevoConcepto && nuevoMonto && nuevaFecha && nuevaCategoria) {
        gasto.concepto = nuevoConcepto;
        gasto.monto = parseFloat(nuevoMonto);
        gasto.fecha = nuevaFecha;
        gasto.categoria = nuevaCategoria;

        localStorage.setItem('gastosExtras', JSON.stringify(gastosExtras));
        mostrarGastosExtras();
        actualizarBalance();
    }
}

// Función para eliminar un gasto extra
function eliminarGastoExtra(id) {
    if (confirm('¿Está seguro de que desea eliminar este gasto?')) {
        gastosExtras = gastosExtras.filter(g => g.id !== id);
        localStorage.setItem('gastosExtras', JSON.stringify(gastosExtras));
        mostrarGastosExtras();
        actualizarBalance();
    }
}

// Función para inicializar el acordeón de historial de ingresos
function inicializarAcordeonIngresos() {
    const toggleBtn = document.getElementById('toggleHistorialIngresos');
    const contenido = document.getElementById('historialIngresos');

    toggleBtn.addEventListener('click', () => {
        toggleBtn.classList.toggle('active');
        contenido.classList.toggle('active');
    });
}

// Función para exportar todos los datos de la aplicación
function exportarDatos() {
    const datos = {
        ingresos,
        gastosExtras,
        gastosEstado,
        creditoSaldosRestantes,
        objetivosAhorro: ObjetivoAhorro.cargarTodos(),
        version: '1.0' // Para futuras actualizaciones del formato
    };

    const datosStr = JSON.stringify(datos, null, 2);
    const blob = new Blob([datosStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Crear un enlace temporal para la descarga
    const a = document.createElement('a');
    const fecha = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `finanzapp_backup_${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Limpiar
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Función para importar datos
function importarDatos(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const datos = JSON.parse(e.target.result);
            
            // Verificar versión (para futuras actualizaciones)
            if (!datos.version) {
                throw new Error('Formato de archivo no válido');
            }

            // Confirmar con el usuario antes de sobrescribir
            if (!confirm('¿Estás seguro de que deseas importar estos datos? Se sobrescribirán los datos actuales.')) {
                return;
            }

            // Importar datos
            if (datos.ingresos) ingresos = datos.ingresos;
            if (datos.gastosExtras) gastosExtras = datos.gastosExtras;
            if (datos.gastosEstado) gastosEstado = datos.gastosEstado;
            if (datos.creditoSaldosRestantes) creditoSaldosRestantes = datos.creditoSaldosRestantes;
            
            // Importar objetivos de ahorro
            if (datos.objetivosAhorro) {
                localStorage.setItem('objetivosAhorro', JSON.stringify(datos.objetivosAhorro));
            }

            // Guardar datos en localStorage
            localStorage.setItem('ingresos', JSON.stringify(ingresos));
            localStorage.setItem('gastosExtras', JSON.stringify(gastosExtras));
            localStorage.setItem('gastosEstado', JSON.stringify(gastosEstado));
            localStorage.setItem('creditoSaldosRestantes', JSON.stringify(creditoSaldosRestantes));

            // Actualizar la interfaz
            mostrarIngresos();
            mostrarGastosFijos();
            mostrarGastosExtras();
            cargarObjetivos();
            actualizarBalance();

            alert('Datos importados correctamente');
        } catch (error) {
            console.error('Error al importar datos:', error);
            alert('Error al importar los datos. El archivo podría estar corrupto o tener un formato incorrecto.');
        }
    };
    reader.readAsText(file);
    
    // Limpiar el input para permitir importar el mismo archivo de nuevo
    event.target.value = '';
}

// Función para inicializar los botones de importar/exportar
function inicializarImportExport() {
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const importFileInput = document.getElementById('importFileInput');

    exportDataBtn.addEventListener('click', exportarDatos);
    importDataBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importarDatos);
}

// Función para inicializar el chat
function inicializarChat() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    // Autoajustar altura del textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Manejar tecla Enter y Shift + Enter en el input
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevenir el salto de línea por defecto
            chatForm.dispatchEvent(new Event('submit')); // Disparar el evento submit del formulario
        }
        // Si es Shift + Enter, el comportamiento por defecto (salto de línea) es el deseado
    });

    // Manejar envío de mensajes
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mensaje = chatInput.value.trim();
        if (!mensaje) return;

        // Deshabilitar el input mientras se procesa
        chatInput.disabled = true;
        const btnEnviar = chatForm.querySelector('.btn-enviar');
        btnEnviar.disabled = true;

        // Añadir mensaje del usuario al chat
        añadirMensajeChat('user', mensaje);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        try {
            // Añadir mensaje de "escribiendo..."
            const typingMessage = añadirMensajeChat('assistant', 'Escribiendo...', true);
            
            // Obtener respuesta de la API
            const respuesta = await obtenerRespuestaGroq(mensaje);
            
            // Actualizar el mensaje de "escribiendo..." con la respuesta real
            actualizarMensajeChat(typingMessage, 'assistant', respuesta);
        } catch (error) {
            console.error('Error al obtener respuesta:', error);
            añadirMensajeChat('system', 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta de nuevo más tarde.');
        } finally {
            // Rehabilitar el input
            chatInput.disabled = false;
            btnEnviar.disabled = false;
            chatInput.focus();
        }
    });
}

// Función para añadir un mensaje al chat
function añadirMensajeChat(tipo, contenido, esTemporal = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${tipo}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (typeof contenido === 'string') {
        contentDiv.innerHTML = contenido;
    } else {
        contentDiv.appendChild(contenido);
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll al último mensaje
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Guardar en el historial si no es temporal
    if (!esTemporal) {
        chatHistory.push({ role: tipo, content: contenido });
    }
    
    return messageDiv;
}

// Función para actualizar un mensaje temporal
function actualizarMensajeChat(messageDiv, tipo, contenido) {
    const contentDiv = messageDiv.querySelector('.message-content');
    // Reemplazar saltos de línea con etiquetas de párrafo para formato
    const contenidoFormateado = contenido.split('\n').map(parrafo => `<p>${parrafo}</p>`).join('');
    contentDiv.innerHTML = contenidoFormateado;
    
    // Actualizar el historial
    const index = chatHistory.findIndex(msg => msg.role === 'assistant' && msg.content === 'Escribiendo...');
    if (index !== -1) {
        chatHistory[index] = { role: tipo, content: contenido };
    }
}

// Función para obtener respuesta del modelo de Groq
async function obtenerRespuestaGroq(mensaje) {
    if (!GROQ_API_KEY) {
        throw new Error('API key de Groq no configurada');
    }

    const prompt = `Actúa como un asesor financiero personal experto. \n
    Proporciona consejos financieros prácticos y personalizados. \n
    Considera los siguientes aspectos en tus respuestas:\n
    - Sé claro y conciso\n
    - Proporciona ejemplos prácticos\n
    - Enfócate en la educación financiera\n
    - Considera el contexto español/europeo\n
    - Mantén un tono profesional pero accesible\n
    - No proporciones consejos de inversión específicos\n
    - Prioriza la seguridad financiera y el ahorro responsable\n
    \n
    Responde siempre en español.`;

    // Groq también usa el formato de mensajes de OpenAI
    const messages = [
        { role: 'system', content: prompt },
        ...chatHistory,
        { role: 'user', content: mensaje }
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { // Endpoint de Groq
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}` // Autenticación con la API key de Groq
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192', // Puedes cambiar el modelo si Groq ofrece otros, llama3 es común
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
             const errorData = await response.json();
             console.error('Error details:', errorData);
             throw new Error(`Error en la respuesta de la API: ${response.statusText}`);
         }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error en la llamada a la API de Groq:', error);
        throw error;
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', inicializarApp); 