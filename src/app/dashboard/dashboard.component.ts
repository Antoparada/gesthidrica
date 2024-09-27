import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { GoogleSheetsService } from '../services/google-sheets.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit {
  cards = [
    { id: 'lineChart1', title: 'Temperatura', visible: true },
    { id: 'lineChart2', title: 'Humedad Suelo', visible: true },
    { id: 'barChart1', title: 'Velocidad Viento', visible: true },
    { id: 'lineChart5', title: 'Bateria', visible: true },
    { id: 'lineChart7', title: 'Humedad aire', visible: true },
    { id: 'lineChart8', title: 'Precipitación', visible: true },
    { id: 'lineChart9', title: 'Caudalímetro', visible: true }
  ];

  charts: { [key: string]: Chart } = {};
  activeIndex: number | null = null;

  // Almacenamos todos los datos históricos para cada variable
  dataByVariable: { [key: string]: { value: number; fecha: string; hora: string; unit: string }[] } = {};

  constructor(private googleSheetsService: GoogleSheetsService) {
    Chart.register(...registerables);
  }

  ngAfterViewInit() {
    this.initializeCharts();
    this.loadGoogleSheetsData();
  }

  toggleAccordion(index: number) {
    this.activeIndex = this.activeIndex === index ? null : index;
  }

  initializeCharts() {
    this.cards.forEach(card => {
      if (card.visible) {
        switch (card.id) {
          case 'lineChart1': this.createLineChart1(); break;
          case 'lineChart2': this.createLineChart2(); break;
          case 'barChart1': this.createBarChart1(); break;
          case 'lineChart5': this.createLineChart5(); break;
          case 'lineChart7': this.createLineChart7(); break;
          case 'lineChart8': this.createLineChart8(); break;
          case 'lineChart9': this.createLineChart9(); break;
          default: console.warn(`Unknown chart ID: ${card.id}`);
        }
      }
    });
  }

  async loadGoogleSheetsData() {
    this.googleSheetsService.authStatus.subscribe(async (authenticated) => {
      if (authenticated) {
        const sheetId = '1f1j-yBgvjxgeeIb6cDCrd3ucaV1cejKjsKkzs_B99BM';

        // Cargar datos de la hoja 'Humedad'
        const humedadRange = 'Humedad!A:D';
        const humedadRecords = await this.googleSheetsService.getRecords(sheetId, humedadRange);

        // Cargar datos de la hoja 'Estacion'
        const estacionRange = 'Estacion!A:H';
        const estacionRecords = await this.googleSheetsService.getRecords(sheetId, estacionRange);

        // Cargar datos de la hoja 'Caudal'
        const caudalRange = 'Caudal!A:E';
        const caudalRecords = await this.googleSheetsService.getRecords(sheetId, caudalRange);

        if (humedadRecords.length > 0 && estacionRecords.length > 0 && caudalRecords.length > 0) {
          this.updateChartsWithGoogleSheetsData(humedadRecords, estacionRecords, caudalRecords);
        }
      } else {
        this.googleSheetsService.handleAuthClick();
      }
    });
  }

  // Funciones de ayuda para extraer fecha y hora del formato 'YYYY-MM-DD HH:MM'
  extractDate(dateTime: string): string {
    return dateTime.split(' ')[0];
  }

  extractTime(dateTime: string): string {
    return dateTime.split(' ')[1];
  }

  // Función para actualizar los gráficos con los datos obtenidos
  updateChartsWithGoogleSheetsData(humedadRecords: any[], estacionRecords: any[], caudalRecords: any[]) {
    const lastHumedadRecords = humedadRecords.slice(-30);
    const lastEstacionRecords = estacionRecords.slice(-30);
    const lastCaudalRecords = caudalRecords.slice(-30);


    const labelsHumedad = lastHumedadRecords.map(record => record[0] + " " + record[1]);
    const labelsEstacion = lastEstacionRecords.map(record => record[0] + " " + record[1]);
    const labelsCaudal = lastCaudalRecords.map(record => record[0] + " " + record[1]);


    const humedadData = lastHumedadRecords.map(record => parseFloat(record[2].replace(',', '.')));
    const voltageData = lastHumedadRecords.map(record => parseFloat(record[3].replace(',', '.')));

    const precipitationData = lastEstacionRecords.map(record => parseFloat(record[7].replace(',', '.')));

    const flowMeterData = lastCaudalRecords.map(record => parseFloat(record[2].replace(',', '.')));

    const temperatureData = lastEstacionRecords.map(record => parseFloat(record[2].replace(',', '.')));
    const humidityAirData = lastEstacionRecords.map(record => parseFloat(record[3].replace(',', '.')));
    const windSpeedData = lastEstacionRecords.map(record => parseFloat(record[5].replace(',', '.')));

    // Validación antes de almacenar los datos
    if (temperatureData && temperatureData.length) {
      this.storeVariableData('Temperatura', labelsEstacion, temperatureData, '°C');
    }
    if (humedadData && humedadData.length) {
      this.storeVariableData('Humedad Suelo', labelsHumedad, humedadData, '%');
    }
    if (windSpeedData && windSpeedData.length) {
      this.storeVariableData('Velocidad Viento', labelsEstacion, windSpeedData, 'Km/h');
    }
    if (humidityAirData && humidityAirData.length) {
      this.storeVariableData('Humedad aire', labelsEstacion, humidityAirData, '%');
    }
    if (voltageData && voltageData.length) {
      this.storeVariableData('Bateria', labelsHumedad, voltageData, 'V');
    }
    if (precipitationData && precipitationData.length) {
      this.storeVariableData('Precipitación', labelsEstacion, precipitationData, 'mm');
    }
    if (flowMeterData && flowMeterData.length) {
      this.storeVariableData('Caudalímetro', labelsCaudal, flowMeterData, 'L/min');
    }

    // Actualizar los gráficos con los datos
    this.updateChart(this.charts['lineChart1'], labelsEstacion, temperatureData, '°C');
    this.updateChart(this.charts['lineChart2'], labelsHumedad, humedadData, '%');
    this.updateChart(this.charts['barChart1'], labelsEstacion, windSpeedData, 'Km/h');
    this.updateChart(this.charts['lineChart7'], labelsEstacion, humidityAirData, '%');
    this.updateChart(this.charts['lineChart5'], labelsHumedad, voltageData, 'V');
    this.updateChart(this.charts['lineChart8'], labelsEstacion, precipitationData, 'mm');
    this.updateChart(this.charts['lineChart9'], labelsCaudal, flowMeterData, 'L/min');
  }

  // Función para almacenar datos históricos de cada variable con validación
  storeVariableData(label: string, labels: string[], data: number[], unit: string = '') {
    if (data && data.length) {
      this.dataByVariable[label] = labels.map((dateTime, index) => ({
        value: data[index],
        fecha: this.extractDate(dateTime),
        hora: this.extractTime(dateTime),
        unit: unit  // Asegura que la unidad esté presente
      }));
    } else {
      console.warn(`No hay datos para almacenar en la variable ${label}`);
    }
  }

  // Función para obtener el último valor de una variable
  getLastValue(title: string): { value: number; unit: string; fecha: string; hora: string } | null {
    const data = this.dataByVariable[title];
    return data && data.length ? data[data.length - 1] : null;
  }

  // Función para actualizar el gráfico con nuevos datos
  updateChart(chart: Chart | undefined, labels: string[], data: number[], label: string) {
    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].label = label;
      chart.update();
    } else {
      console.error('Chart is not defined or not initialized properly');
    }
  }

  // Funciones para crear los gráficos individuales
  createLineChart1() {
    const ctx = document.getElementById('lineChart1') as HTMLCanvasElement;
    if (ctx) {
      this.charts['lineChart1'] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Temperatura (°C)',
            data: [],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }
  }

  createLineChart2() {
    const ctx = document.getElementById('lineChart2') as HTMLCanvasElement;
    if (ctx) {
      this.charts['lineChart2'] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Humedad Suelo (%)',
            data: [],
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }
  }

  createBarChart1() {
    const ctx = document.getElementById('barChart1') as HTMLCanvasElement;
    if (ctx) {
      this.charts['barChart1'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Velocidad Viento (Km/h)',
            data: [],
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }
  }

  createLineChart5() {
    const ctx = document.getElementById('lineChart5') as HTMLCanvasElement;
    this.charts['lineChart5'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Bateria %',
          data: [],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  createLineChart7() {
    const ctx = document.getElementById('lineChart7') as HTMLCanvasElement;
    this.charts['lineChart7'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Humedad aire',
          data: [],
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  createLineChart8() {
    const ctx = document.getElementById('lineChart8') as HTMLCanvasElement;
    if (ctx) {
      this.charts['lineChart8'] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Precipitación (mm)',
            data: [],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }
  }

  createLineChart9() {
    const ctx = document.getElementById('lineChart9') as HTMLCanvasElement;
    if (ctx) {
      this.charts['lineChart9'] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Caudal (L/min)',
            data: [],
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }
  }



  // Función para obtener datos filtrados según el título de la tarjeta
  getFilteredData(title: string): { value: number; fecha: string; hora: string }[] {
    const data = this.dataByVariable[title] || [];
    // Retornar los últimos 10 registros
    return data.slice(-10);
  }
}
