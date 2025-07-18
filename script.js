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
  }).catch(error => {
    alert("Erro ao carregar dados do Firebase: " + error.message);
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
  const time = timeInput.value;

  if (!date || !day || !subject || !time) {
    alert("Preencha todos os campos.");
    return;
  }

  const entry = { date, day, subject, time, completed: false };

  try {
    const docRef = await adicionarEstudoFirebase(entry);
    studyData.push({ id: docRef.id, ...entry });
    renderTable();

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
    progressChart.style.display = 'block';
    toggleChartBtn.innerHTML = 'Ocultar';
  } else {
    progressChart.style.display = 'none';
    toggleChartBtn.innerHTML = 'Exibir';
  }
});

// Função para importar Excel e salvar corretamente no Firestore
window.importarXLSX = async () => {
  const fileInput = document.getElementById("excelInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Selecione um arquivo .xlsx!");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    for (let i = 1; i < rows.length; i++) {
      const [data, dia, materia, horario] = rows[i];

      if (data && dia && materia && horario) {
        try {
          await adicionarEstudoFirebase({
            date: data,
            day: dia,
            subject: materia,
            time: horario,
            completed: false
          });
        } catch (error) {
          console.error("Erro ao salvar no Firebase:", error);
        }
      }
    }

    alert("Importação concluída com sucesso!");
    carregarEstudos();
  };

  reader.readAsArrayBuffer(file);
};

const tarefasFixas = [
  {
    date: "17/07/2025",
    day: "Quinta",
    subject: "Javascript",
    time: "19:00 - 20:00",
    completed: false
  },
  {
    date: "17/07/2025",
    day: "Quinta",
    subject: "TypeScript",
    time: "20:00 - 20:45",
    completed: false
  },
  {
    date: "17/07/2025",
    day: "Quinta",
    subject: "React",
    time: "20:45 - 21:15",
    completed: false
  },
  {
    date: "17/07/2025",
    day: "Quinta",
    subject: "Projeto",
    time: "21:15 - 21:45",
    completed: false
  },
  {
    date: "17/07/2025",
    day: "Quinta",
    subject: "Inglês",
    time: "21:45 - 22:15",
    completed: false
  },
  {
    date: "17/07/2025",
    day: "Quinta",
    subject: "Firebase",
    time: "22:15 - 22:30",
    completed: false
  },
  {
    date: "18/07/2025",
    day: "Sexta",
    subject: "Javascript",
    time: "19:00 - 20:00",
    completed: false
  },
  {
    date: "18/07/2025",
    day: "Sexta",
    subject: "TypeScript",
    time: "20:00 - 20:45",
    completed: false
  },
  {
    date: "18/07/2025",
    day: "Sexta",
    subject: "React",
    time: "20:45 - 21:15",
    completed: false
  },
  {
    date: "18/07/2025",
    day: "Sexta",
    subject: "Projeto",
    time: "21:15 - 21:45",
    completed: false
  },
  {
    date: "18/07/2025",
    day: "Sexta",
    subject: "Inglês",
    time: "21:45 - 22:15",
    completed: false
  },
  {
    date: "18/07/2025",
    day: "Sexta",
    subject: "Firebase",
    time: "22:15 - 22:30",
    completed: false
  },
  {
    date: "19/07/2025",
    day: "Sábado",
    subject: "Javascript",
    time: "09:00 - 09:20",
    completed: false
  },
  {
    date: "19/07/2025",
    day: "Sábado",
    subject: "TypeScript",
    time: "09:20 - 09:40",
    completed: false
  },
  {
    date: "19/07/2025",
    day: "Sábado",
    subject: "React",
    time: "09:40 - 10:00",
    completed: false
  },
  {
    date: "19/07/2025",
    day: "Sábado",
    subject: "Projeto",
    time: "10:00 - 10:30",
    completed: false
  },
  {
    date: "19/07/2025",
    day: "Sábado",
    subject: "Firebase",
    time: "10:30 - 10:45",
    completed: false
  },
  {
    date: "19/07/2025",
    day: "Sábado",
    subject: "Inglês",
    time: "10:45 - 11:00",
    completed: false
  },
  {
    date: "21/07/2025",
    day: "Segunda",
    subject: "Javascript",
    time: "19:00 - 20:00",
    completed: false
  },
  {
    date: "21/07/2025",
    day: "Segunda",
    subject: "TypeScript",
    time: "20:00 - 20:45",
    completed: false
  },
  {
    date: "21/07/2025",
    day: "Segunda",
    subject: "React",
    time: "20:45 - 21:15",
    completed: false
  },
  {
    date: "21/07/2025",
    day: "Segunda",
    subject: "Projeto",
    time: "21:15 - 21:45",
    completed: false
  },
  {
    date: "21/07/2025",
    day: "Segunda",
    subject: "Inglês",
    time: "21:45 - 22:15",
    completed: false
  },
  {
    date: "21/07/2025",
    day: "Segunda",
    subject: "Firebase",
    time: "22:15 - 22:30",
    completed: false
  },
  {
    date: "22/07/2025",
    day: "Terça",
    subject: "Javascript",
    time: "19:00 - 20:00",
    completed: false
  },
  {
    date: "22/07/2025",
    day: "Terça",
    subject: "TypeScript",
    time: "20:00 - 20:45",
    completed: false
  },
  {
    date: "22/07/2025",
    day: "Terça",
    subject: "React",
    time: "20:45 - 21:15",
    completed: false
  },
  {
    date: "22/07/2025",
    day: "Terça",
    subject: "Projeto",
    time: "21:15 - 21:45",
    completed: false
  },
  {
    date: "22/07/2025",
    day: "Terça",
    subject: "Inglês",
    time: "21:45 - 22:15",
    completed: false
  },
  {
    date: "22/07/2025",
    day: "Terça",
    subject: "Firebase",
    time: "22:15 - 22:30",
    completed: false
  },
  {
    date: "23/07/2025",
    day: "Quarta",
    subject: "Javascript",
    time: "19:00 - 20:00",
    completed: false
  },
  {
    date: "23/07/2025",
    day: "Quarta",
    subject: "TypeScript",
    time: "20:00 - 20:45",
    completed: false
  },
  {
    date: "23/07/2025",
    day: "Quarta",
    subject: "React",
    time: "20:45 - 21:15",
    completed: false
  },
  {
    date: "23/07/2025",
    day: "Quarta",
    subject: "Projeto",
    time: "21:15 - 21:45",
    completed: false
  },
  {
    date: "23/07/2025",
    day: "Quarta",
    subject: "Inglês",
    time: "21:45 - 22:15",
    completed: false
  },
  {
    date: "23/07/2025",
    day: "Quarta",
    subject: "Firebase",
    time: "22:15 - 22:30",
    completed: false
  },
  {
    date: "24/07/2025",
    day: "Quinta",
    subject: "Javascript",
    time: "19:00 - 20:00",
    completed: false
  },
  {
    date: "24/07/2025",
    day: "Quinta",
    subject: "TypeScript",
    time: "20:00 - 20:45",
    completed: false
  },
  {
    date: "24/07/2025",
    day: "Quinta",
    subject: "React",
    time: "20:45 - 21:15",
    completed: false
  },
  {
    date: "24/07/2025",
    day: "Quinta",
    subject: "Projeto",
    time: "21:15 - 21:45",
    completed: false
  },
  {
    date: "24/07/2025",
    day: "Quinta",
    subject: "Inglês",
    time: "21:45 - 22:15",
    completed: false
  },
  {
    date: "24/07/2025",
    day: "Quinta",
    subject: "Firebase",
    time: "22:15 - 22:30",
    completed: false
  },
 
];

async function importarTarefasFixas() {
  let adicionados = 0;

  for (let i = 0; i < tarefas.length; i++) {
    const tarefa = tarefas[i];

    try {
      // await db.collection("estudos").add(tarefa);
      await studyCollection.add(tarefa);
      adicionados++;
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
    }
  }

  alert(`${adicionados} tarefas importadas com sucesso!`);
 
}


// Formata data para dd/mm/aaaa
function formatDateToBR(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return "";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Atualização automática dos filtros
[filterDate, filterDay, filterSubject].forEach(filter => {
  filter.addEventListener('change', renderTable);
});

// Torna toggleCompletion acessível globalmente
window.toggleCompletion = toggleCompletion;

// Carrega os estudos ao iniciar
carregarEstudos();
