// Referências DOM
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

// Referência Firestore
const studyCollection = db.collection('planosEstudos');

let studyData = [];

// Carregar dados do Firestore
function carregarEstudos() {
  studyCollection.get().then(snapshot => {
    studyData = [];
    snapshot.forEach(doc => {
      studyData.push({ id: doc.id, ...doc.data() });
    });
    renderTable();
  }).catch(error => {
    alert("Erro ao carregar dados do Firebase: " + error.message);
  });
}

// Adicionar estudo no Firestore
function adicionarEstudoFirebase(entry) {
  return studyCollection.add(entry);
}

// Atualizar status concluído no Firestore
function atualizarConclusaoFirebase(id, completed) {
  return studyCollection.doc(id).update({ completed });
}

// Evento botão adicionar tarefa
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

    // limpar campos
    dateInput.value = '';
    dayInput.value = '';
    subjectInput.value = '';
    timeInput.value = '';
  } catch (error) {
    alert('Erro ao salvar no banco: ' + error.message);
  }
});

// Renderizar tabela com filtros
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

// Alternar conclusão tarefa
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

// Atualizar gráfico progresso
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
        y: { beginAtZero: true, max: 100 }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// Botão mostrar/ocultar gráfico
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

// Formatar data para dd/mm/yyyy
function formatDateToBR(dateStr) {
  if (!dateStr) return "";
  // Se já no formato dd/mm/yyyy
  if (dateStr.includes('/')) {
    return dateStr;
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Importar CSV
window.importarCSV = () => {
  const fileInput = document.getElementById('xlsxFile');
  const file = fileInput.files[0];

  if (!file) {
    alert("Selecione um arquivo CSV!");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    const lines = text.split(/\r\n|\n/);

    let adicionados = 0;

    // Pula a primeira linha se for cabeçalho (verifica se tem "date" no início)
    let startIndex = 0;
    if (lines[0].toLowerCase().startsWith('date')) startIndex = 1;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // pula linha vazia

      const cols = line.split(',');

      if (cols.length < 4) continue;

      let [date, day, subject, time] = cols;

      date = date.trim();
      day = day.trim();
      subject = subject.trim();
      time = time.trim();

      // Formatando data
      const formattedDate = formatDateToBR(date);

      if (formattedDate && day && subject && time) {
        try {
          await adicionarEstudoFirebase({
            date: formattedDate,
            day,
            subject,
            time,
            completed: false
          });
          adicionados++;
        } catch (error) {
          console.error("Erro ao salvar no Firebase:", error);
        }
      }
    }

    alert(`Importação concluída! ${adicionados} tarefas adicionadas.`);
    carregarEstudos();
  };

  reader.readAsText(file);
};

// Adiciona eventos de filtro
[filterDate, filterDay, filterSubject].forEach(filter => {
  filter.addEventListener('change', renderTable);
});

// Expor toggleCompletion globalmente para o checkbox funcionar
window.toggleCompletion = toggleCompletion;

// Carrega estudos ao iniciar
carregarEstudos();
