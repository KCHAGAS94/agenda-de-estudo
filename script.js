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
const noteContainer = document.getElementById("noteContainer");
const noteTextarea = document.getElementById("noteText");
const backButton = document.getElementById("backButton");
const mainContainer = document.getElementById("mainContainer");

const studyCollection = db.collection('planosEstudos');

let studyData = [];
let editingId = null;
let currentNoteTaskId = null;

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

function atualizarSugestoes() {
  const subjects = [...new Set(studyData.map(e => e.subject.trim()).filter(s => s))];
  const times = [...new Set(studyData.map(e => e.time.trim()).filter(t => t))];

  subjectList.innerHTML = '';
  timeList.innerHTML = '';

  subjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject;
    subjectList.appendChild(option);
  });

  times.forEach(time => {
    const option = document.createElement('option');
    option.value = time;
    timeList.appendChild(option);
  });
}

function adicionarEstudoFirebase(entry) {
  return studyCollection.add(entry);
}

function atualizarEstudoFirebase(id, entry) {
  return studyCollection.doc(id).update(entry);
}

function atualizarConclusaoFirebase(id, completed) {
  return studyCollection.doc(id).update({ completed });
}

addTaskBtn.addEventListener('click', async function () {
  const date = formatDateToBR(dateInput.value);
  const day = dayInput.value;
  const subject = subjectInput.value.trim();
  const time = timeInput.value.trim();

  if (!date || !day || !subject || !time) {
    alert("Preencha todos os campos.");
    return;
  }

  const entry = { date, day, subject, time, completed: false, anotacoes: "" };

  try {
    if (editingId) {
      await atualizarEstudoFirebase(editingId, entry);
      const index = studyData.findIndex(item => item.id === editingId);
      if (index > -1) {
        studyData[index] = { id: editingId, ...entry, completed: studyData[index].completed };
      }
      editingId = null;
      addTaskBtn.textContent = 'Adicionar Tarefa';
    } else {
      const docRef = await adicionarEstudoFirebase(entry);
      studyData.push({ id: docRef.id, ...entry });
    }

    renderTable();
    atualizarSugestoes();
    dateInput.value = '';
    dayInput.value = '';
    subjectInput.value = '';
    timeInput.value = '';

  } catch (error) {
    alert('Erro ao salvar no banco: ' + error.message);
  }
});

function convertDateBRtoISO(dateBR) {
  const [day, month, year] = dateBR.split('/');
  return `${year}-${month}-${day}`;
}

function extractStartTime(timeStr) {
  if (!timeStr) return "00:00";
  return timeStr.split('-')[0].trim();
}

function compareEntries(a, b) {
  const dateA = convertDateBRtoISO(a.date);
  const dateB = convertDateBRtoISO(b.date);

  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;

  const timeA = extractStartTime(a.time);
  const timeB = extractStartTime(b.time);

  if (timeA < timeB) return -1;
  if (timeA > timeB) return 1;

  return 0;
}

function renderTable() {
  tableBody.innerHTML = '';

  const filteredData = studyData.filter(entry => {
    return (
      (!filterDate.value || entry.date === formatDateToBR(filterDate.value)) &&
      (!filterDay.value || entry.day === filterDay.value) &&
      (!filterSubject.value || entry.subject.toLowerCase().includes(filterSubject.value.toLowerCase()))
    );
  });

  filteredData.sort(compareEntries);

  filteredData.forEach(entry => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>
      <button class="delete-icon" onclick="confirmarExclusao('${entry.id}')">🗑️</button>
        ${entry.date}
      </td>
      <td>${entry.day}</td>
      <td>${entry.subject}</td>
      <td>${entry.time}</td>
      <td><input type="checkbox" ${entry.completed ? 'checked' : ''} onchange="toggleCompletion('${entry.id}', this.checked)"></td>
      <td>
        <button onclick="editarTarefa('${entry.id}')">Alterar</button>
        <button onclick="abrirAnotacao('${entry.id}')">Anotações</button>
      </td>

    `;

    tableBody.appendChild(row);
  });

  updateChart();
}

function confirmarExclusao(id) {
  const modal = document.createElement('div');
  modal.id = 'deleteModal';
  modal.innerHTML = `
    <div class="modal-content">
      <p>Tem certeza que deseja excluir esta tarefa?</p>
      <button onclick="excluirTarefa('${id}')">Sim</button>
      <button onclick="fecharModal()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function excluirTarefa(id) {
  studyCollection.doc(id).delete().then(() => {
    studyData = studyData.filter(entry => entry.id !== id);
    fecharModal();
    renderTable();
  }).catch(error => {
    alert("Erro ao excluir: " + error.message);
  });
}

function fecharModal() {
  const modal = document.getElementById('deleteModal');
  if (modal) modal.remove();
}


function toggleCompletion(id, completed) {
  atualizarConclusaoFirebase(id, completed)
    .then(() => {
      const index = studyData.findIndex(item => item.id === id);
      if (index > -1) {
        studyData[index].completed = completed;
      }
      renderTable();
    })
    .catch(err => alert('Erro ao atualizar: ' + err.message));
}

function editarTarefa(id) {
  const tarefa = studyData.find(item => item.id === id);
  if (!tarefa) return;

  const partes = tarefa.date.split('/');
  const dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;

  dateInput.value = dataFormatada;
  dayInput.value = tarefa.day;
  subjectInput.value = tarefa.subject;
  timeInput.value = tarefa.time;

  editingId = id;
  addTaskBtn.textContent = 'Salvar Alteração';
}

function abrirAnotacao(id) {
  currentNoteTaskId = id;
  const tarefa = studyData.find(t => t.id === id);
  if (!tarefa) return;

  noteTextarea.value = tarefa.anotacoes || "";
  mainContainer.style.display = "none";
  noteContainer.style.display = "block";
}

backButton.addEventListener("click", async () => {
  if (currentNoteTaskId) {
    const anotacoes = noteTextarea.value;
    await atualizarEstudoFirebase(currentNoteTaskId, { anotacoes });
    const index = studyData.findIndex(t => t.id === currentNoteTaskId);
    if (index > -1) studyData[index].anotacoes = anotacoes;
  }
  noteContainer.style.display = "none";
  mainContainer.style.display = "block";
  currentNoteTaskId = null;
  renderTable();
});

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

  if (window.myChart) window.myChart.destroy();

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
    progressChart.style.display = 'block';
    toggleChartBtn.innerHTML = 'Ocultar';
  } else {
    progressChart.style.display = 'none';
    toggleChartBtn.innerHTML = 'Exibir';
  }
});

function formatDateToBR(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length !== 3) return "";
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  return `${day}/${month}/${year}`;
}

[filterDate, filterDay, filterSubject].forEach(filter => {
  filter.addEventListener('change', renderTable);
});

window.toggleCompletion = toggleCompletion;
window.editarTarefa = editarTarefa;
window.abrirAnotacao = abrirAnotacao;

carregarEstudos();
