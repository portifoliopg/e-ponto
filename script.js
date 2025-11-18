// --- VARIÁVEIS DE ESTADO E CONSTANTES ---

const screenWrapper = document.getElementById('screenWrapper');
const navLinks = document.querySelectorAll('.nav-list a');
const nextActionStatus = document.getElementById('next-action-status');
const chronometerArea = document.getElementById('chronometer-area');
const chronometerElement = document.getElementById('chronometer');

const numScreens = 3; 
const swipeThreshold = 50; 
const transitionDuration = '0.3s';
const STORAGE_KEY_REGISTROS = 'eponto_registros';
const STORAGE_KEY_CONFIG = 'eponto_config';
const STORAGE_KEY_CHRONO = 'eponto_chrono_start';
const TOLERANCE_MINUTES = 5; // Tolerância de registro automático (Entrada/Saída)

const PONTO_STATES = ['ENTRADA', 'IDA (PAUSA)', 'VINDA (PAUSA)', 'SAÍDA'];

let currentScreenIndex = 0;
let startX = 0;
let isSwiping = false;
let registros = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTROS) || '[]');
let config = {};
let chronoInterval = null;
let autoRegisterInterval = null;


// --- FUNÇÕES AUXILIARES DE TEMPO E NAVEGAÇÃO ---

/**
 * Converte minutos para milissegundos.
 */
function minutesToMs(minutes) {
    return minutes * 60 * 1000;
}

/**
 * Formata um tempo em milissegundos para HH:MM:SS.
 */
function formatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Atualiza o relógio em tempo real.
 */
function updateClock() {
    const timeElement = document.getElementById('current-time');
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    timeElement.textContent = timeString;
}

/**
 * Mantenha a tela na posição correta.
 */
function moveScreen(x, smooth) {
    screenWrapper.style.transition = smooth ? `transform ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)` : 'none';
    screenWrapper.style.transform = `translateX(${x}%)`;
}

/**
 * Altera a tela ativa, atualiza navegação e carrega dados se necessário.
 */
function changeScreen(newIndex) {
    if (newIndex < 0 || newIndex >= numScreens || newIndex === currentScreenIndex) return;

    currentScreenIndex = newIndex;
    const newX = -newIndex * 100;
    moveScreen(newX, true); 

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (parseInt(link.dataset.index) === newIndex) {
            link.classList.add('active');
        }
    });
    
    if (newIndex === 1) { 
        loadRegistros('today');
    }
    if (newIndex === 2) { 
        loadConfig();
    }
}

// --- LÓGICA DE SWIPE (ROBUSTO) ---

function handleTouchStart(event) {
    startX = event.touches[0].clientX;
    isSwiping = true;
}

function handleTouchEnd(event) {
    if (!isSwiping) return;
    isSwiping = false;

    const finalX = event.changedTouches[0].clientX;
    const deltaX = finalX - startX; 

    let newIndex = currentScreenIndex;

    // Swipe Right
    if (deltaX > swipeThreshold && currentScreenIndex > 0) {
        newIndex = currentScreenIndex - 1;
    }
    // Swipe Left
    else if (deltaX < -swipeThreshold && currentScreenIndex < numScreens - 1) {
        newIndex = currentScreenIndex + 1;
    }
    
    if (newIndex !== currentScreenIndex) {
         changeScreen(newIndex);
    } else {
         moveScreen(-currentScreenIndex * 100, true);
    }
}

// Adiciona listeners
screenWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
screenWrapper.addEventListener('touchend', handleTouchEnd, { passive: true });


// --- LÓGICA DE CONFIGURAÇÕES ---

function saveConfig(event) {
    event.preventDefault();
    
    config = {
        entrada: document.getElementById('config-entrada').value,
        ida: document.getElementById('config-ida').value,
        vinda: document.getElementById('config-vinda').value,
        saida: document.getElementById('config-saida').value
    };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    
    const configMessage = document.getElementById('config-message');
    configMessage.textContent = 'Configurações salvas com sucesso!';
    
    // Reinicia o monitoramento de registro automático
    startAutoRegisterMonitor();

    setTimeout(() => {
        configMessage.textContent = '';
    }, 3000);
}

function loadConfig() {
    const savedConfig = JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || '{}');
    config = {
        entrada: savedConfig.entrada || '08:00',
        ida: savedConfig.ida || '12:00',
        vinda: savedConfig.vinda || '13:00',
        saida: savedConfig.saida || '17:00'
    };
    
    document.getElementById('config-entrada').value = config.entrada;
    document.getElementById('config-ida').value = config.ida;
    document.getElementById('config-vinda').value = config.vinda;
    document.getElementById('config-saida').value = config.saida;
}

// --- LÓGICA DO PONTO (4 ESTADOS) ---

/**
 * Determina o próximo status de ponto e atualiza a UI.
 */
function getNextPontoStatus() {
    const lastState = registros.length > 0 ? registros[registros.length - 1].tipo : null;
    let nextIndex;

    if (lastState === 'SAÍDA' || registros.length === 0) {
        nextIndex = 0; // ENTRADA
    } else {
        const lastIndex = PONTO_STATES.indexOf(lastState);
        nextIndex = (lastIndex + 1) % PONTO_STATES.length;
    }
    
    let cssClass = '';
    if (nextIndex === 0) cssClass = 'status-entrada';
    if (nextIndex === 1 || nextIndex === 2) cssClass = 'status-pausa';
    if (nextIndex === 3) cssClass = 'status-saida';

    return { action: PONTO_STATES[nextIndex], index: nextIndex, cssClass: cssClass };
}

/**
 * Atualiza o display do status na tela Ponto.
 */
function updatePontoStatusDisplay() {
    const status = getNextPontoStatus();
    nextActionStatus.textContent = status.action;
    nextActionStatus.className = 'status-message'; 
    nextActionStatus.classList.add(status.cssClass);
}

/**
 * Realiza o registro do ponto.
 * @param {string} type Tipo de ponto (manualmente batido, ou 'AUTOMÁTICO').
 */
function performPontoRegistration(type = 'MANUAL') {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    
    const nextStatus = getNextPontoStatus();

    const novoRegistro = {
        id: Date.now(),
        data: dateStr,
        hora: timeStr,
        tipo: nextStatus.action,
        registro_tipo: type // MANUAL ou AUTOMÁTICO
    };

    registros.push(novoRegistro);
    localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(registros));
    
    // Feedback visual
    const lastPunchElement = document.getElementById('last-punch');
    const messageArea = document.getElementById('message-area');
    
    const msgType = type === 'AUTOMÁTICO' ? ' (Automático)' : '';
    messageArea.textContent = `✔️ ${novoRegistro.tipo} registrado${msgType} às ${novoRegistro.hora}!`;
    messageArea.classList.add('text-green-600');
    lastPunchElement.textContent = `${novoRegistro.tipo} (${type}) em ${novoRegistro.data} às ${novoRegistro.hora}`;

    // Atualiza o display para a próxima ação e reinicia o cronômetro
    updatePontoStatusDisplay();
    startChronometer(nextStatus.action);

    setTimeout(() => {
        messageArea.textContent = '';
        messageArea.classList.remove('text-green-600');
    }, 5000);
}

/**
 * Função pública chamada pelo botão.
 */
function registrarPonto() {
    performPontoRegistration('MANUAL');
}

// --- CRONÔMETRO DE JORNADA ---

/**
 * Inicia ou reseta o cronômetro.
 * @param {string} lastAction A ação que acabou de ser registrada.
 */
function startChronometer(lastAction) {
    // 1. Lógica de Parar/Resetar
    if (lastAction === 'SAÍDA' || lastAction === 'IDA (PAUSA)') {
        clearInterval(chronoInterval);
        if (lastAction === 'SAÍDA') {
            localStorage.removeItem(STORAGE_KEY_CHRONO);
            chronometerArea.style.display = 'none';
        }
        return;
    }
    
    // 2. Lógica de Continuar (VINDA - Retorno da pausa)
    if (lastAction === 'VINDA (PAUSA)') {
         // Não faz nada com o startTime, apenas garante que o intervalo está rodando
         // A duração da pausa será descontada na função de cálculo total da jornada
    }

    // 3. Lógica de Iniciar (ENTRADA)
    if (lastAction === 'ENTRADA') {
        localStorage.setItem(STORAGE_KEY_CHRONO, Date.now());
    }

    // Se não estivermos em SAÍDA, mostra a área do cronômetro e inicia o intervalo.
    chronometerArea.style.display = 'block';

    if (chronoInterval) clearInterval(chronoInterval);
    
    // Atualiza a cada segundo
    chronoInterval = setInterval(updateChronometer, 1000);
}

/**
 * Atualiza o cronômetro na tela.
 */
function updateChronometer() {
    const startTime = localStorage.getItem(STORAGE_KEY_CHRONO);
    if (!startTime) return;

    const now = Date.now();
    const elapsedTime = now - startTime;
    
    // NOTE: A implementação completa descontaria o tempo de pausa (IDA -> VINDA)
    // Por simplicidade inicial, mostramos o tempo total decorrido desde a ENTRADA.
    
    chronometerElement.textContent = formatTime(elapsedTime);
}


// --- REGISTRO AUTOMÁTICO (ENTRADA/SAÍDA) ---

/**
 * Verifica se a hora atual está dentro da tolerância para registro automático.
 * @param {string} timeConfig Horário configurado ('HH:MM').
 * @param {string} state O estado do ponto ('ENTRADA' ou 'SAÍDA').
 */
function checkAndAutoRegister(timeConfig, state) {
    const now = new Date();
    const [hConfig, mConfig] = timeConfig.split(':').map(Number);
    
    // Cria um objeto Date para o horário configurado de hoje
    const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hConfig, mConfig, 0, 0);
    
    // Calcula a tolerância em milissegundos
    const toleranceMs = minutesToMs(TOLERANCE_MINUTES);
    
    const minTime = targetTime.getTime() - toleranceMs;
    const maxTime = targetTime.getTime() + toleranceMs;
    const nowTime = now.getTime();

    const currentStatus = getNextPontoStatus().action;

    // Condições para o Registro Automático:
    const isTargetState = (state === 'ENTRADA' && currentStatus === 'ENTRADA') || 
                          (state === 'SAÍDA' && currentStatus === 'SAÍDA');
                          
    const isWithinTolerance = nowTime >= minTime && nowTime <= maxTime;

    if (isTargetState && isWithinTolerance) {
        performPontoRegistration('AUTOMÁTICO');
        // Após o registro automático, podemos desativar temporariamente para evitar loops
        stopAutoRegisterMonitor(); 
        setTimeout(startAutoRegisterMonitor, minutesToMs(TOLERANCE_MINUTES * 2)); 
        return true;
    }
    return false;
}

/**
 * Monitora o relógio a cada minuto para o registro automático.
 */
function monitorAutoRegister() {
    if (checkAndAutoRegister(config.entrada, 'ENTRADA')) return;
    if (checkAndAutoRegister(config.saida, 'SAÍDA')) return;
}

function startAutoRegisterMonitor() {
    // Para qualquer monitoramento anterior
    if (autoRegisterInterval) clearInterval(autoRegisterInterval);

    // Monitora a cada 30 segundos (para pegar o minuto exato e o cronômetro)
    autoRegisterInterval = setInterval(monitorAutoRegister, 30000); 
    
    // Chama imediatamente ao iniciar
    monitorAutoRegister();
}

function stopAutoRegisterMonitor() {
    if (autoRegisterInterval) clearInterval(autoRegisterInterval);
    autoRegisterInterval = null;
}


// --- LÓGICA DE REGISTROS E FILTROS (Sem Alteração na Estrutura) ---

function loadRegistros(filter, clickedButton) {
    // ... (Lógica de loadRegistros do arquivo anterior, sem alterações) ...
    const listElement = document.getElementById('registro-list');
    listElement.innerHTML = '';
    let filteredRegistros = registros.slice().reverse(); 

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    if (filter !== 'all') {
        filteredRegistros = filteredRegistros.filter(registro => {
            // Conversão de data "DD/MM/AAAA" para objeto Date para comparação
            const parts = registro.data.split('/');
            const recordDate = new Date(parts[2], parts[1] - 1, parts[0]);
            recordDate.setHours(0, 0, 0, 0);

            if (filter === 'today') {
                return recordDate.getTime() === today.getTime();
            } else if (filter === 'week') {
                return recordDate >= weekStart;
            } else if (filter === 'month') {
                return recordDate >= monthStart;
            }
            return false;
        });
    }

    if (filteredRegistros.length === 0) {
        listElement.innerHTML = '<li class="text-gray-500 p-3">Nenhum registro encontrado para este período.</li>';
        return;
    }

    filteredRegistros.forEach(registro => {
        const li = document.createElement('li');
        li.classList.add('registro-list-item');

        let statusText;
        let statusColor;
        let regType = registro.registro_tipo === 'AUTOMÁTICO' ? ' (Auto)' : '';
        
        switch(registro.tipo) {
            case 'ENTRADA': statusText = 'Entrada'; statusColor = 'text-green-600'; break;
            case 'IDA (PAUSA)': statusText = 'Pausa (Ida)'; statusColor = 'text-yellow-600'; break;
            case 'VINDA (PAUSA)': statusText = 'Pausa (Vinda)'; statusColor = 'text-blue-600'; break;
            case 'SAÍDA': statusText = 'Saída'; statusColor = 'text-red-600'; break;
            default: statusText = 'Registro'; statusColor = 'text-gray-700';
        }

        li.innerHTML = `
            <span class="${statusColor} font-semibold">${statusText}${regType}</span>
            <span class="text-gray-500">${registro.data}</span>
            <span class="registro-time">${registro.hora}</span>
        `;
        listElement.appendChild(li);
    });

    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
    if (clickedButton) {
        clickedButton.classList.add('active');
    } else {
        document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
    }
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---

function initializeApp() {
    loadConfig(); // Carrega configurações iniciais
    
    // Inicia o monitoramento de tempo
    setInterval(updateClock, 1000);
    updateClock(); 

    // Carrega o último registro e o status inicial
    if (registros.length > 0) {
         const last = registros[registros.length - 1];
         document.getElementById('last-punch').textContent = `${last.tipo} (${last.registro_tipo || 'MANUAL'}) em ${last.data} às ${last.hora}`;
    }

    // Inicializa o status de ponto e a tela
    updatePontoStatusDisplay();
    changeScreen(0); 
    
    // Inicia o cronômetro (se houver um registro de ENTRADA)
    startChronometer(getNextPontoStatus().action === 'ENTRADA' ? 'SAÍDA' : 'ENTRADA'); // Inverte para forçar a checagem do último estado
    
    // Inicia o monitoramento de registro automático
    startAutoRegisterMonitor();
}

// Inicia o aplicativo ao carregar o DOM
document.addEventListener('DOMContentLoaded', initializeApp);