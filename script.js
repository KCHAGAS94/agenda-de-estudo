// Inicialização Firebase (deve estar no seu HTML, antes deste script)
// const firebaseConfig = { ... };
// firebase.initializeApp(firebaseConfig);
// const db = firebase.firestore();

const tableBody = document.getElementById('studyTableBody');
const dateInput = document.getElementById('date');
const dayInput = document.getElementById('day');
const subjectInput = document.getElementById('subject');
const timeInput = document.getElementById('time');
const filterDate = document.getElementById('filterDate');
const filterDay = document.getElementById('filterDay');
const filterSubject = document.getElementById('filterSubject');
const progressChartCanvas = document.getElementById('progressChart');
const addTaskBtn = document.getElementById('addTaskBtn');

const subjectList = document.getElementById('subjectList');
const timeList = document.getElementById('timeList');

// Referência à coleção Firestore
const studyCollection = db.collection('planosEstudos');

let studyData = [];

// Função para carregar os estudos do Firestore
function carregarEstudos() {
  studyCollection.get().then(snapshot => {
    studyData = [];
    snapshot.forEach(doc => {
      studyData.push({ id: doc.id, ...doc.data() });
    });
    renderTable();
    atualizarSugestoes();
  }).catch(error => {
    alert("Erro ao carregar dados do Firebase: " + error.message);
  });
}

// Atualiza as sugestões para os inputs subject e time
function atualizarSugestoes() {
  // Extrai valores únicos e não vazios
  const subjects = [...new Set(studyData.map(e => e.subject.trim()).filter(s => s))];
  const times = [...new Set(studyData.map(e => e.time.trim()).filter(t => t))];

  // Limpa os datalists
  subjectList.innerHTML = '';
  timeList.innerHTML = '';

  // Preenche o datalist de matéria
  subjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject;
    subjectList.appendChild(option);
  });

  // Preenche o datalist de horário
  times.forEach(time => {
    const option = document.createElement('option');
    option.value = time;
    timeList.appendChild(option);
  });
}

// Função para adicionar estudo no Firestore
function adicionarEstudoFirebase(entry) {
  return studyCollection.add(entry);
}

// Função para atualizar o campo 'completed' no Firestore
function atualizarConclusaoFirebase(id, completed) {
  return studyCollection.doc(id).update({ completed });
}

// Evento do botão para adicionar tarefa (salva no Firestore)
addTaskBtn.addEventListener('click', async function () {
  const date = formatDateToBR(dateInput.value);
  const day = dayInput.value;
  const subject = subjectInput.value.trim();
  const time = timeInput.value.trim();

  if (!date || !day || !subject || !time) {
    alert("Preencha todos os campos.");
    return;
  }

  const entry = { date, day, subject, time, completed: false };

  try {
    const docRef = await adicionarEstudoFirebase(entry);
    studyData.push({ id: docRef.id, ...entry });
    renderTable();

    atualizarSugestoes();

    // Limpar campos
    dateInput.value = '';
    dayInput.value = '';
    subjectInput.value = '';
    timeInput.value = '';
  } catch (error) {
    alert('Erro ao salvar no banco: ' + error.message);
  }
});

// Renderiza a tabela com os dados filtrados
function renderTable() {
  tableBody.innerHTML = '';

  const filteredData = studyData.filter(entry => {
    return (
      (!filterDate.value || entry.date === formatDateToBR(filterDate.value)) &&
      (!filterDay.value || entry.day === filterDay.value) &&
      (!filterSubject.value || entry.subject.toLowerCase().includes(filterSubject.value.toLowerCase()))
    );
  });

  filteredData.forEach((entry, index) => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.day}</td>
      <td>${entry.subject}</td>
      <td>${entry.time}</td>
      <td><input type="checkbox" ${entry.completed ? 'checked' : ''} onchange="toggleCompletion(${index})"></td>
    `;

    tableBody.appendChild(row);
  });

  updateChart();
}

// Alterna o status de conclusão e atualiza no Firestore
function toggleCompletion(index) {
  const item = studyData[index];
  const newStatus = !item.completed;
  atualizarConclusaoFirebase(item.id, newStatus)
    .then(() => {
      studyData[index].completed = newStatus;
      renderTable();
    })
    .catch(err => alert('Erro ao atualizar: ' + err.message));
}

// Atualiza o gráfico de progresso
function updateChart() {
  const subjectProgress = {};

  studyData.forEach(entry => {
    if (!subjectProgress[entry.subject]) {
      subjectProgress[entry.subject] = { total: 0, completed: 0 };
    }
    subjectProgress[entry.subject].total++;
    if (entry.completed) subjectProgress[entry.subject].completed++;
  });

  const labels = Object.keys(subjectProgress);
  const data = labels.map(subject => {
    const { total, completed } = subjectProgress[subject];
    return Math.round((completed / total) * 100);
  });

  if (window.myChart) {
    window.myChart.destroy();
  }

  window.myChart = new Chart(progressChartCanvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Progresso (%)',
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

const toggleChartBtn = document.getElementById('toggleChartBtn');
const progressChart = document.getElementById('progressChart');

toggleChartBtn.addEventListener('click', () => {
  if (progressChart.style.display === 'none' || progressChart.style.display === '') {
    // Mostrar gráfico
    progressChart.style.display = 'block';
    toggleChartBtn.innerHTML = 'Ocultar';  // Botão com símbolo para ocultar
  } else {
    // Ocultar gráfico
    progressChart.style.display = 'none';
    toggleChartBtn.innerHTML = 'Exibir';  // Botão com símbolo para mostrar
  }
});

// Formata data para dd/mm/aaaa (sem usar new Date para evitar problema de fuso)
function formatDateToBR(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split('-'); // yyyy-mm-dd
  if (parts.length !== 3) return "";
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  return `${day}/${month}/${year}`;
}

// Atualização automática dos filtros
[filterDate, filterDay, filterSubject].forEach(filter => {
  filter.addEventListener('change', renderTable);
});

// Torna toggleCompletion acessível globalmente para onchange inline no checkbox
window.toggleCompletion = toggleCompletion;

// Carrega os estudos ao iniciar
carregarEstudos();
