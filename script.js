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

    // Inicializar selector de años
    inicializarSelectorAños();

    // Cargar datos del localStorage
    const ingresosGuardados = localStorage.getItem('ingresos');
    if (ingresosGuardados) {
        ingresos = JSON.parse(ingresosGuardados);
    }

    const gastosEstadoGuardado = localStorage.getItem('gastosEstado');
    if (gastosEstadoGuardado) {
        gastosEstado = JSON.parse(gastosEstadoGuardado);
    }

    const creditoSaldosGuardados = localStorage.getItem('creditoSaldosRestantes');
    if (creditoSaldosGuardados) {
        creditoSaldosRestantes = JSON.parse(creditoSaldosGuardados);
    } else {
        // Si no hay saldos guardados, inicializar con los saldos iniciales
        creditoSaldosRestantes = { ...saldosInicialesCredito };
    }

    // Inicializar componentes
    inicializarGastosExtras(); // Carga gastos extras del localStorage
    inicializarAcordeonIngresos();
    inicializarImportExport();
    inicializarChat();
    inicializarObjetivosAhorro();
    inicializarCalendario();

    // Mostrar datos iniciales
    mostrarGastosFijos();
    mostrarIngresos();
    cargarObjetivos();

    // Actualizar el balance después de cargar todos los datos
    actualizarBalance();
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

// Función para calcular la sumatoria de los saldos restantes de crédito
function calcularTotalSaldosCredito() {
    let total = 0;
    for (const saldo in creditoSaldosRestantes) {
        total += creditoSaldosRestantes[saldo];
    }
    return total;
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
    document.getElementById('totalSaldosCreditoRestantes').textContent = `${calcularTotalSaldosCredito().toFixed(2)} €`;
    
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

    // Verificar si los elementos del formulario existen
    const conceptoInput = document.getElementById('conceptoIngreso');
    const montoInput = document.getElementById('montoIngreso');
    const fechaInput = document.getElementById('fechaIngreso');

    if (!conceptoInput || !montoInput || !fechaInput) {
        console.log('Elementos del formulario de ingresos no encontrados. Es posible que no estés en la sección de ingresos.');
        return;
    }

    const concepto = conceptoInput.value.trim();
    const monto = parseFloat(montoInput.value);
    const fecha = fechaInput.value;

    if (!concepto || monto <= 0 || !fecha) {
        alert('Por favor, complete todos los campos correctamente');
        return;
    }

    ingresos.push({ concepto, monto, fecha });
    localStorage.setItem('ingresos', JSON.stringify(ingresos));

    mostrarIngresos();
    actualizarBalance();

    // Limpiar el formulario
    e.target.reset();
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

    const nuevoGastoExtraBtn = document.getElementById('nuevoGastoExtraBtn');
    const gastoExtraModal = document.getElementById('gastoExtraModal');
    const gastoExtraForm = document.getElementById('gastoExtraForm');

    if (!nuevoGastoExtraBtn || !gastoExtraModal || !gastoExtraForm) {
        console.log('Elementos de gastos extras no encontrados.');
        return;
    }

    // Remover event listeners anteriores
    nuevoGastoExtraBtn.removeEventListener('click', () => gastoExtraModal.classList.add('active'));
    gastoExtraForm.removeEventListener('submit', agregarGastoExtra);

    // Añadir nuevos event listeners
    nuevoGastoExtraBtn.addEventListener('click', () => {
        // Establecer la fecha actual como valor por defecto
        const fechaInput = document.getElementById('fechaGastoExtra');
        if (fechaInput) {
            const today = new Date().toISOString().split('T')[0];
            fechaInput.value = today;
        }
        gastoExtraModal.classList.add('active');
    });

    gastoExtraForm.addEventListener('submit', agregarGastoExtra);

    // Event listeners para cerrar el modal
    document.querySelectorAll('.btn-cerrar').forEach(btn => {
        btn.addEventListener('click', () => {
            gastoExtraModal.classList.remove('active');
            gastoExtraForm.reset();
        });
    });

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === gastoExtraModal) {
            gastoExtraModal.classList.remove('active');
            gastoExtraForm.reset();
        }
    });

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

    // Verificar si los elementos existen antes de continuar
    if (!toggleBtn || !contenido) {
        console.log('Elementos del acordeón de ingresos no encontrados. Es posible que no estés en la sección de ingresos.');
        return;
    }

    console.log("Inicializando acordeón de ingresos. Botón:", toggleBtn, "Contenido:", contenido);

    toggleBtn.addEventListener('click', () => {
        console.log("Botón de historial de ingresos clickeado.");
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
        calendarioLaboralData,
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

            // Importar datos del calendario laboral
            if (datos.calendarioLaboralData) {
                 calendarioLaboralData = datos.calendarioLaboralData;
            }

            // Guardar datos en localStorage
            localStorage.setItem('ingresos', JSON.stringify(ingresos));
            localStorage.setItem('gastosExtras', JSON.stringify(gastosExtras));
            localStorage.setItem('gastosEstado', JSON.stringify(gastosEstado));
            localStorage.setItem('creditoSaldosRestantes', JSON.stringify(creditoSaldosRestantes));
            localStorage.setItem('calendarioLaboralData', JSON.stringify(calendarioLaboralData));

            // Actualizar la interfaz
            mostrarGastosFijos();
            mostrarIngresos();
            mostrarGastosExtras();
            cargarObjetivos();
            mostrarAcciones();
            inicializarGraficoBalance();
            renderCalendar();

            // Actualizar el balance después de importar los datos
            actualizarBalance();

            alert('Datos importados correctamente');
        } catch (error) {
            console.error('Error al importar datos:', error);
            alert('Error al importar los datos. Verifica que el archivo sea válido.');
        }
    };
    reader.readAsText(file);
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

// Funciones para el Calendario Laboral
let calendarioLaboralData = JSON.parse(localStorage.getItem('calendarioLaboralData')) || {};

const calendarDaysGrid = document.querySelector('.calendar-days-grid');
const currentMonthYearHeader = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const workScheduleInput = document.getElementById('workSchedule');
const workFunctionTextarea = document.getElementById('workFunction');
const saveDailyEarningBtn = document.getElementById('saveDailyEarningBtn');
const dailyEarningsActionsDiv = document.querySelector('.daily-earnings-actions');
const editDailyEarningBtn = document.getElementById('editDailyEarningBtn');
const deleteDailyEarningBtn = document.getElementById('deleteDailyEarningBtn');
const dailyEarningInput = document.getElementById('dailyEarning'); // Nuevo: obtener el input de ganancia

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

// Debugging: Log initial calendar data
console.log('Calendario Laboral: Datos iniciales cargados de localStorage', calendarioLaboralData);

function renderCalendar() {
    calendarDaysGrid.innerHTML = ''; // Limpiar días anteriores
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Días de la semana
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const calendarWeekdaysDiv = document.querySelector('.calendar-weekdays');
    calendarWeekdaysDiv.innerHTML = '';
    weekdays.forEach(day => {
        const weekdayElement = document.createElement('div');
        weekdayElement.textContent = day;
        calendarWeekdaysDiv.appendChild(weekdayElement);
    });

    // Rellenar días vacíos al principio del mes
    const firstDayOfWeek = firstDayOfMonth.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('calendar-day', 'other-month');
        calendarDaysGrid.appendChild(emptyDay);
    }

    // Renderizar días del mes
    for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'current-month');
        dayElement.textContent = i; // Mostrar solo el número del día inicialmente
        dayElement.dataset.date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`; // YYYY-MM-DD

        const dateKey = dayElement.dataset.date;

        // Marcar días con registros existentes y mostrar la ganancia
        if (calendarioLaboralData[dateKey]) {
            dayElement.classList.add('has-earning');
            // Crear un elemento para mostrar la ganancia dentro de la celda del día
            const earningSpan = document.createElement('span');
            earningSpan.classList.add('daily-earning-display'); // Clase para estilos específicos
            earningSpan.textContent = `${calendarioLaboralData[dateKey].ganancia.toFixed(2)}€`; // Mostrar la ganancia guardada
            
            // Limpiar el textContent original (el número del día) y añadir la ganancia
            dayElement.innerHTML = '';
            const dayNumberSpan = document.createElement('span');
            dayNumberSpan.textContent = i;
            dayElement.appendChild(dayNumberSpan);
            dayElement.appendChild(earningSpan);
        }

        // Manejar clic en el día
        dayElement.addEventListener('click', handleDayClick);

        calendarDaysGrid.appendChild(dayElement);
    }

    // *** Debugging: Verificar si los listeners se añadieron ***
    const daysWithListeners = calendarDaysGrid.querySelectorAll('.calendar-day');
    console.log(`Calendar rendered for ${currentYear}-${currentMonth + 1}. Found ${daysWithListeners.length} calendar-day elements.`);
    if (daysWithListeners.length > 0) {
        // Nota: _getEventListeners es una función interna de Chrome DevTools. No funcionará en producción.
        // Usaremos una forma alternativa de verificar si el listener está presente, aunque no sea tan directa.
        // Una forma simple es hacer clic programáticamente en un elemento y ver si el handler se ejecuta.
        // Sin embargo, para no interferir, simplemente registraremos la presencia de los elementos.
        console.log('Calendar day elements created and event listeners should be attached.');
        // Podrías añadir aquí: console.log(daysWithListeners[firstDayOfWeek]); para inspeccionar el elemento
    }
    // *****************************************************

    // Actualizar encabezado del calendario
    currentMonthYearHeader.textContent = `${lastDayOfMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;

    // Limpiar inputs al cambiar de mes/año
    clearDailyInputs();
}

function handleDayClick() {
    console.log('Día clickeado:', this.dataset.date); // Debugging: Día clickeado
    // Remover selección anterior
    if (selectedDate) {
        const prevSelectedDay = document.querySelector(`.calendar-day[data-date="${selectedDate}"]`);
        if (prevSelectedDay) {
            prevSelectedDay.classList.remove('selected');
        }
    }

    // Seleccionar día actual
    selectedDate = this.dataset.date;
    this.classList.add('selected');
    console.log('handleDayClick: selectedDate actualizada a', selectedDate); // Debugging

    // Cargar datos si existen para este día
    loadDailyEarningData(selectedDate);
}

function loadDailyEarningData(date) {
    console.log('loadDailyEarningData: Intentando cargar datos para', date); // Debugging
    const data = calendarioLaboralData[date];
    console.log('loadDailyEarningData: Datos encontrados para', date, ':', data); // Debugging
    if (data) {
        workScheduleInput.value = data.horario;
        workFunctionTextarea.value = data.funcion;
        dailyEarningInput.value = data.ganancia; // Cargar la ganancia guardada
        console.log('loadDailyEarningData: Inputs rellenados', { horario: data.horario, funcion: data.funcion, ganancia: data.ganancia }); // Debugging
        
        // Mostrar botones de editar/eliminar y ocultar guardar
        saveDailyEarningBtn.style.display = 'none';
        dailyEarningsActionsDiv.style.display = 'flex'; // Usar flex para alinear botones

    } else {
        workScheduleInput.value = ''; // Asegurarse de que los inputs estén vacíos si no hay datos
        workFunctionTextarea.value = '';
        dailyEarningInput.value = ''; // Limpiar el input de ganancia
        console.log('loadDailyEarningData: No hay datos para', date, '. Inputs vacíos.'); // Debugging

        // Ocultar botones de editar/eliminar y mostrar guardar
        saveDailyEarningBtn.style.display = 'block'; // O flex, dependiendo de tu layout
        dailyEarningsActionsDiv.style.display = 'none';
    }
}

function clearDailyInputs() {
    console.log('clearDailyInputs: Limpiando inputs y selección.'); // Debugging
    workScheduleInput.value = '';
    workFunctionTextarea.value = '';
    dailyEarningInput.value = ''; // Limpiar el input de ganancia
    selectedDate = null;
    // Remover selección del día en el calendario
    document.querySelectorAll('.calendar-day').forEach(day => day.classList.remove('selected'));

    // Ocultar botones de editar/eliminar y mostrar guardar al limpiar
    saveDailyEarningBtn.style.display = 'block'; // O flex
    dailyEarningsActionsDiv.style.display = 'none';
}

function saveDailyEarningData() {
    console.log('saveDailyEarningData: Botón guardar clickeado.'); // Debugging
    if (!selectedDate) {
        alert('Por favor, selecciona un día en el calendario.');
        console.log('saveDailyEarningData: No hay día seleccionado.'); // Debugging
        return;
    }

    const horario = workScheduleInput.value.trim();
    const funcion = workFunctionTextarea.value.trim();
    const ganancia = parseFloat(dailyEarningInput.value); // Leer la ganancia del input

    console.log('saveDailyEarningData: Inputs values', { horario, funcion, ganancia }); // Debugging

    if (!horario || !funcion || isNaN(ganancia) || ganancia < 0) {
         alert('Por favor, completa el horario, la función realizada y introduce una ganancia válida.');
         console.log('saveDailyEarningData: Horario, función o ganancia inválidos.'); // Debugging
         return;
    }

    calendarioLaboralData[selectedDate] = {
        horario: horario,
        funcion: funcion,
        ganancia: ganancia
    };

    console.log('saveDailyEarningData: Datos a guardar', { date: selectedDate, data: calendarioLaboralData[selectedDate] }); // Debugging

    localStorage.setItem('calendarioLaboralData', JSON.stringify(calendarioLaboralData));
    console.log('saveDailyEarningData: Datos guardados en localStorage', JSON.parse(localStorage.getItem('calendarioLaboralData'))); // Debugging
    alert('Registro guardado con éxito.');

    // Actualizar la visualización del día en el calendario
    const selectedDayElement = document.querySelector(`.calendar-day[data-date="${selectedDate}"]`);
    if (selectedDayElement) {
        selectedDayElement.classList.add('has-earning');
        // Eliminar contenido anterior y añadir número del día y ganancia
        selectedDayElement.innerHTML = '';
        const dayNumberSpan = document.createElement('span');
        dayNumberSpan.textContent = new Date(selectedDate).getDate(); // Obtener solo el número del día
        selectedDayElement.appendChild(dayNumberSpan);

        const earningSpan = document.createElement('span');
        earningSpan.classList.add('daily-earning-display');
        earningSpan.textContent = `${ganancia.toFixed(2)}€`; // Mostrar la ganancia introducida
        selectedDayElement.appendChild(earningSpan);
         console.log('saveDailyEarningData: UI del día actualizada.'); // Debugging
    }

    // Limpiar inputs después de guardar
    clearDailyInputs();

    // Opcional: Recalcular balance general si es necesario (podría ser complejo con datos diarios)
    // actualizarBalance();
}

function inicializarCalendario() {
     // Asegurarse de que currentMonth y currentYear estén actualizados si se cambia de sección
     const today = new Date();
     currentMonth = today.getMonth();
     currentYear = today.getFullYear();

     renderCalendar();
}

// Event Listeners para navegación del calendario
prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
});

// Event Listener para el botón de guardar
saveDailyEarningBtn.addEventListener('click', saveDailyEarningData);

// Funciones para editar y eliminar registro diario
function editDailyEarning() {
    console.log('editDailyEarning: Botón editar clickeado para', selectedDate); // Debugging
    if (!selectedDate || !calendarioLaboralData[selectedDate]) {
        alert('No hay registro para editar.');
        console.log('editDailyEarning: No hay día seleccionado o datos para editar.'); // Debugging
        return;
    }

    const horario = workScheduleInput.value.trim();
    const funcion = workFunctionTextarea.value.trim();
    const ganancia = parseFloat(dailyEarningInput.value); // Leer la ganancia del input

    if (!horario || !funcion || isNaN(ganancia) || ganancia < 0) {
        alert('Por favor, completa el horario, la función realizada y introduce una ganancia válida.');
        console.log('editDailyEarning: Horario, función o ganancia inválidos al intentar editar.'); // Debugging
        return;
    }

    // Actualizar datos en el objeto
    calendarioLaboralData[selectedDate].horario = horario;
    calendarioLaboralData[selectedDate].funcion = funcion;
    calendarioLaboralData[selectedDate].ganancia = ganancia; // Actualizar la ganancia

    localStorage.setItem('calendarioLaboralData', JSON.stringify(calendarioLaboralData));
    console.log('editDailyEarning: Datos actualizados en localStorage', JSON.parse(localStorage.getItem('calendarioLaboralData'))); // Debugging
    alert('Registro actualizado con éxito.');

    // Actualizar la visualización del día en el calendario
    const selectedDayElement = document.querySelector(`.calendar-day[data-date="${selectedDate}"]`);
    if (selectedDayElement) {
        selectedDayElement.classList.add('has-earning');
        // Eliminar contenido anterior y añadir número del día y ganancia
        selectedDayElement.innerHTML = '';
        const dayNumberSpan = document.createElement('span');
        dayNumberSpan.textContent = new Date(selectedDate).getDate(); // Obtener solo el número del día
        selectedDayElement.appendChild(dayNumberSpan);

        const earningSpan = document.createElement('span');
        earningSpan.classList.add('daily-earning-display');
        earningSpan.textContent = `${ganancia.toFixed(2)}€`; // Mostrar la ganancia actualizada
        selectedDayElement.appendChild(earningSpan);
         console.log('editDailyEarning: UI del día actualizada.'); // Debugging
    }

    // No limpiar inputs después de editar, para permitir ediciones rápidas si es necesario
    // clearDailyInputs(); // Esto podría ser una opción dependiendo del UX deseado
}

function deleteDailyEarning() {
     console.log('deleteDailyEarning: Botón eliminar clickeado para', selectedDate); // Debugging
    if (!selectedDate || !calendarioLaboralData[selectedDate]) {
        alert('No hay registro para eliminar.');
        console.log('deleteDailyEarning: No hay día seleccionado o datos para eliminar.'); // Debugging
        return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
        // Eliminar datos del objeto
        delete calendarioLaboralData[selectedDate];

        localStorage.setItem('calendarioLaboralData', JSON.stringify(calendarioLaboralData));
         console.log('deleteDailyEarning: Datos eliminados de localStorage', JSON.parse(localStorage.getItem('calendarioLaboralData'))); // Debugging
        alert('Registro eliminado con éxito.');

        // Actualizar la visualización del calendario (re-renderizar para quitar la marca de ganancia)
        renderCalendar();

        // Limpiar inputs y selección después de eliminar
        clearDailyInputs();
    }
}

// Event Listeners para botones de editar y eliminar
editDailyEarningBtn.addEventListener('click', editDailyEarning);
deleteDailyEarningBtn.addEventListener('click', deleteDailyEarning);

// Modificar la inicialización del formulario de ingresos
function inicializarFormularioIngresos() {
    const form = document.getElementById('ingresoForm');
    if (!form) {
        console.log('Formulario de ingresos no encontrado. Es posible que no estés en la sección de ingresos.');
        return;
    }

    // Remover event listener anterior si existe
    form.removeEventListener('submit', agregarIngreso);
    
    // Añadir nuevo event listener
    form.addEventListener('submit', agregarIngreso);

    // Establecer la fecha actual como valor por defecto
    const fechaInput = document.getElementById('fechaIngreso');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
    }
}

// Event Listeners para la navegación del Sidebar
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        const sectionId = this.getAttribute('data-section');
        mostrarSeccion(sectionId);
    });
});

function mostrarSeccion(sectionId) {
    // Oculta todas las secciones de contenido
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remueve la clase 'active' de todos los items del sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Muestra la sección de contenido correspondiente y activa el item del sidebar
    const targetSection = document.getElementById(sectionId);
    const targetNavItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);

    if (targetSection && targetNavItem) {
        targetSection.classList.add('active');
        targetNavItem.classList.add('active');

        // Lógica específica para inicializar secciones
        if (sectionId === 'dashboard') {
            inicializarGraficoBalance();
            actualizarBalance();
        } else if (sectionId === 'transacciones') {
            inicializarFormularioIngresos();
            mostrarIngresos();
            inicializarAcordeonIngresos(); // Inicializar acordeón aquí
        } else if (sectionId === 'gastos') {
            inicializarGastosExtras();
            inicializarSelectorAños();
            const mesGuardado = localStorage.getItem('mesActual');
            const añoGuardado = localStorage.getItem('añoActual');
            if (mesGuardado && añoGuardado) {
                document.getElementById('mesActual').value = mesGuardado;
                document.getElementById('añoActual').value = añoGuardado;
            } else {
                const fechaActual = new Date();
                document.getElementById('mesActual').value = fechaActual.getMonth() + 1;
                document.getElementById('añoActual').value = fechaActual.getFullYear();
            }
            mostrarGastosFijos();
        } else if (sectionId === 'evolucion') {
            cargarObjetivos();
        } else if (sectionId === 'asesoria') {
             inicializarChat();
        } else if (sectionId === 'calendario-laboral') {
             inicializarCalendario();
        } else if (sectionId === 'chat') {
             inicializarChat();
        }
    } else {
        console.error(`Error: No se encontró la sección o el elemento de navegación para el ID: ${sectionId}`);
        // Opcional: Redirigir a una sección por defecto o mostrar un mensaje al usuario
        mostrarSeccion('dashboard'); // Ejemplo: redirigir al dashboard
    }
}

// Función para manejar el menú móvil
function inicializarMenuMovil() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            // Cambiar el icono del botón
            const icon = mobileMenuBtn.querySelector('i');
            if (sidebar.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Cerrar el menú al hacer clic en un elemento de navegación
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 430) {
                    sidebar.classList.remove('active');
                    const icon = mobileMenuBtn.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });

        // Cerrar el menú al hacer clic fuera de él
        document.addEventListener('click', (event) => {
            if (window.innerWidth <= 430 && 
                !sidebar.contains(event.target) && 
                !mobileMenuBtn.contains(event.target) && 
                sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}

// Inicializar todas las funcionalidades
document.addEventListener('DOMContentLoaded', () => {
    inicializarNavegacion();
    inicializarMenuMovil();
    inicializarApp();
}); 
