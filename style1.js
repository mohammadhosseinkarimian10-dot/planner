let tasks = JSON.parse(localStorage.getItem('planner_tasks')) || [];
let logs = JSON.parse(localStorage.getItem('planner_logs')) || [];

let timerInterval = null;
let timerSeconds = 0;
let chartInstance = null;

// Modal Selectors
const itemModal = document.getElementById('item-modal');
const timerModal = document.getElementById('timer-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const openTimerBtn = document.getElementById('open-timer-btn');
const closeModalBtn = document.getElementById('close-modal');
const closeTimerBtn = document.getElementById('close-timer');

// Event Listeners
openModalBtn.onclick = () => itemModal.style.display = 'flex';
openTimerBtn.onclick = () => timerModal.style.display = 'flex';
closeModalBtn.onclick = () => itemModal.style.display = 'none';
closeTimerBtn.onclick = () => timerModal.style.display = 'none';

window.onclick = (e) => {
    if (e.target === itemModal) itemModal.style.display = 'none';
    if (e.target === timerModal) timerModal.style.display = 'none';
};

// Form Submit
document.getElementById('planner-form').onsubmit = function(e) {
    e.preventDefault();
    const title = document.getElementById('form-title').value;
    const type = document.getElementById('form-type').value;
    const duration = parseInt(document.getElementById('form-duration').value) || 0;
    const desc = document.getElementById('form-desc').value;

    const newTask = { id: Date.now(), title, type, desc, date: new Date().toISOString() };
    tasks.push(newTask);

    if (duration > 0) {
        logs.push({
            id: Date.now(),
            subject: title,
            minutes: duration,
            date: new Date().toISOString(),
            desc: desc
        });
    }

    saveAndRender();
    itemModal.style.display = 'none';
    this.reset();
};

// Timer Logic
const display = document.getElementById('timer-display');
const startBtn = document.getElementById('start-timer');
const pauseBtn = document.getElementById('pause-timer');
const stopBtn = document.getElementById('stop-timer');

startBtn.onclick = () => {
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    timerInterval = setInterval(() => {
        timerSeconds++;
        const hrs = String(Math.floor(timerSeconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0');
        const secs = String(timerSeconds % 60).padStart(2, '0');
        display.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);
};

pauseBtn.onclick = () => {
    clearInterval(timerInterval);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
};

stopBtn.onclick = () => {
    clearInterval(timerInterval);
    const subject = document.getElementById('timer-subject').value || 'عمومی';
    const mins = Math.round(timerSeconds / 60);

    if (mins > 0) {
        logs.push({
            id: Date.now(),
            subject: subject,
            minutes: mins,
            date: new Date().toISOString(),
            desc: 'ثبت شده توسط تایمر زنده'
        });
    }

    // Reset Timer
    timerSeconds = 0;
    display.textContent = '00:00:00';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    timerModal.style.display = 'none';
    saveAndRender();
};

// Delete Functions
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveAndRender();
}

function deleteLog(id) {
    logs = logs.filter(l => l.id !== id);
    saveAndRender();
}

// Storage & Render
function saveAndRender() {
    localStorage.setItem('planner_tasks', JSON.stringify(tasks));
    localStorage.setItem('planner_logs', JSON.stringify(logs));
    renderTasks();
    renderLogs();
    renderStats();
}

function renderTasks() {
    ['daily', 'short', 'medium', 'long'].forEach(type => {
        const listEl = document.getElementById(`list-${type}`);
        listEl.innerHTML = '';
        tasks.filter(t => t.type === type).forEach(t => {
            listEl.innerHTML += `
                <div class="task-item">
                    <button class="delete-btn" onclick="deleteTask(${t.id})">🗑️</button>
                    <strong>${t.title}</strong>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">${t.desc || ''}</p>
                </div>
            `;
        });
    });
}

function renderLogs() {
    const container = document.getElementById('logs-container');
    container.innerHTML = '';
    logs.slice().reverse().forEach(log => {
        const d = new Date(log.date).toLocaleDateString('fa-IR');
        container.innerHTML += `
            <div class="log-item">
                <button class="delete-btn" onclick="deleteLog(${log.id})">🗑️</button>
                <strong>${log.subject}</strong>: ${log.minutes} دقیقه
                <span style="font-size: 0.8rem; color: var(--text-muted); float: left;">${d}</span>
                <p style="font-size: 0.85rem;">${log.desc || ''}</p>
            </div>
        `;
    });
}

function renderStats() {
    const now = new Date();
    let todayMins = 0, weekMins = 0, monthMins = 0, totalMins = 0;
    const subjectMap = {};

    logs.forEach(log => {
        const logDate = new Date(log.date);
        const diffDays = (now - logDate) / (1000 * 60 * 60 * 24);

        totalMins += log.minutes;
        if (diffDays < 1 && logDate.getDate() === now.getDate()) todayMins += log.minutes;
        if (diffDays <= 7) weekMins += log.minutes;
        if (diffDays <= 30) monthMins += log.minutes;

        subjectMap[log.subject] = (subjectMap[log.subject] || 0) + log.minutes;
    });

    document.getElementById('stat-today').textContent = `${(todayMins / 60).toFixed(1)} ساعت`;
    document.getElementById('stat-week').textContent = `${(weekMins / 60).toFixed(1)} ساعت`;
    document.getElementById('stat-month').textContent = `${(monthMins / 60).toFixed(1)} ساعت`;
    document.getElementById('stat-total').textContent = `${(totalMins / 60).toFixed(1)} ساعت`;

    // Chart Render
    const ctx = document.getElementById('subjectChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(subjectMap),
            datasets: [{
                data: Object.values(subjectMap),
                backgroundColor: ['#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#f8fafc' } },
                title: { display: true, text: 'تفکیک کل زمان بر اساس موضوع (دقیقه)', color: '#f8fafc' }
            }
        }
    });
}

// Initial Load
saveAndRender();