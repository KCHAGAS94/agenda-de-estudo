const materias = {
      "Javascript": { nivel: 4, cor: "#FF6384" },
      "TypeScript": { nivel: 3, cor: "#36A2EB" },
      "React": { nivel: 2, cor: "#FFCE56" },
      "Firebase": { nivel: 1, cor: "#4BC0C0" },
      "Inglês": { nivel: 1, cor: "#9966FF" },
      "Projeto": { nivel: 2, cor: "#FF9F40" },
    };

    const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

    const horarios = {
      "Segunda": ["19:00 - 22:30"],
      "Terça": ["19:00 - 22:30"],
      "Quarta": ["19:00 - 22:30"],
      "Quinta": ["19:00 - 22:30"],
      "Sexta": ["19:00 - 21:00"],
      "Sábado": ["09:00 - 11:00"]
    };

    const ordem = ["Javascript", "TypeScript", "React", "Projeto", "Firebase", "Inglês"];
    const nivelToTempo = { 4: 90, 3: 75, 2: 60, 1: 30 };

    const tableBody = document.getElementById("table-body");
    const progresso = {};
    ordem.forEach(m => progresso[m] = 0);

    const start = new Date("2025-07-15");
    const end = new Date("2025-08-27");

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const diaSemana = diasSemana[d.getDay()];
      if (!horarios[diaSemana]) continue;

      ordem.forEach(materia => {
        const tempo = nivelToTempo[materias[materia].nivel];
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${d.toLocaleDateString()}</td>
          <td>${diaSemana}</td>
          <td>${materia}</td>
          <td>${horarios[diaSemana][0]}</td>
          <td><input type="checkbox" onchange="atualizarGrafico('${materia}', this.checked)"></td>
        `;
        tableBody.appendChild(row);
      });
    }

    const ctx = document.getElementById('progressChart').getContext('2d');
    const chartData = {
      labels: ordem,
      datasets: [{
        label: 'Progresso (%)',
        data: ordem.map(m => 0),
        backgroundColor: ordem.map(m => materias[m].cor)
      }]
    };

    const progressChart = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        scales: {
          y: {
            max: 100,
            beginAtZero: true,
            title: { display: true, text: 'Porcentagem Concluída' }
          }
        },
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Gráfico de Progresso por Matéria' }
        }
      }
    });

    function atualizarGrafico(materia, checked) {
      if (checked) progresso[materia] += 1;
      else progresso[materia] -= 1;
      const totalDias = document.querySelectorAll(`input[type='checkbox']`).length / ordem.length;
      chartData.datasets[0].data = ordem.map(m => Math.min(100, Math.round((progresso[m] / totalDias) * 100)));
      progressChart.update();
    }