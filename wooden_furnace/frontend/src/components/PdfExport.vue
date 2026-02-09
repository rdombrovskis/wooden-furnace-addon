<template>
  <button
    @click="generatePDF"
    class="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
    :disabled="loading"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <span v-if="!loading">Get PDF</span>
    <span v-else>Generating...</span>
  </button>
  <div style="position:absolute;left:-9999px;top:-9999px;"><canvas id="myChart"></canvas></div>
  <div id="dpi"></div>
</template>

<style>
#dpi {
    height: 1in;
    left: -100%;
    position: absolute;
    top: -100%;
    width: 1in;
}
</style>

<script setup>
import { ref, defineProps, toRaw  } from 'vue';
import { jsPDF } from 'jspdf';
import { Chart } from 'chart.js';
import autoTable from 'jspdf-autotable'

import '../utils/fonts/Roboto-Regular-normal.js';

const props = defineProps(['chartRef', 'sessionData', 'partName', 'partOem']);
const loading = ref(false);

const generatePDF = async () => {
  const chart = props.chartRef?.chart
  if (!chart) {
    alert('Chart data not available for PDF export');
    return;
  }

  loading.value = true;

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 20;

    pdf.setFont("Roboto-Regular");

    pdf.setFontSize(18);
    pdf.text(`Session Report #${props.sessionData.id}`, margin, yPos);
    yPos += 10;

    pdf.setFontSize(14);
    pdf.setTextColor(50);
    pdf.text(`Part: ${props.partName || '—'}`, margin, yPos);
    yPos += 8;
    pdf.text(`OEM: ${props.partOem || '—'}`, margin, yPos);
    yPos += 8;
    pdf.text(`Batch: ${props.sessionData.batch || '—'}`, margin, yPos);
    yPos += 10;
    pdf.setFontSize(12);
    pdf.text(`Created: ${new Date(props.sessionData.createdAt).toLocaleString()}`, margin, yPos);
    yPos += 7;
    pdf.text(`Start: ${new Date(props.sessionData.startTime).toLocaleString()}`, margin, yPos);
    yPos += 7;
    pdf.text(`End: ${new Date(props.sessionData.endTime).toLocaleString()}`, margin, yPos);
    yPos += 10;

    pdf.setFontSize(12);
    pdf.setTextColor(100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - margin);

    const targetDpi = 300;
    const deviceDpi = document.getElementById('dpi').offsetHeight;
    const dpifactor = targetDpi / deviceDpi;

    const aspectRation = 16 / 9;
    const pixPerMM = (deviceDpi / 25.4);
    const chartWidthMM = pageWidth - margin;
    const chartHeightMM = chartWidthMM / aspectRation;

    const EXPORT_WIDTH = chartWidthMM * pixPerMM;
    const EXPORT_HEIGHT = chartHeightMM * pixPerMM;

    const exportCanvas = document.getElementById('myChart');
    const ctx = exportCanvas.getContext('2d');
    exportCanvas.width = EXPORT_WIDTH;
    exportCanvas.height = EXPORT_HEIGHT;    

    const rawData = JSON.parse(JSON.stringify(toRaw(chart.data)));
    const rawOptions = JSON.parse(JSON.stringify(toRaw(chart.options)));
    rawOptions.devicePixelRatio = dpifactor;

    const plugin = {
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
            const {ctx} = chart;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
    };

     const exportChart = new Chart(ctx, {
        type: 'line',
        data: rawData,
        options: rawOptions,
        plugins: [plugin]
      });

    await new Promise(r => requestAnimationFrame(r));

    pdf.addImage(
      exportCanvas, 'Canvas',
      margin / 2, yPos,
      chartWidthMM, chartHeightMM,
      undefined, 'FAST'
    );

    exportChart.destroy();

    yPos += chartHeightMM + 10;

    pdf.setFontSize(14);
    pdf.setTextColor(50);
    pdf.text('Temperature profile', margin, yPos);
    yPos += 10;

    const tables = document.querySelectorAll('table');

    tables.forEach((table) => {
      const headers = [];
      const rows = [];

      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (headerRow) {
        const row = [];
        headerRow.querySelectorAll('th').forEach(cell => { row.push(cell.textContent.trim()); });
        headers.push(row);
      } else 
        return;

      const dataRows = table.querySelectorAll('tbody tr');
      dataRows.forEach(tr => {
        const row = [];
        tr.querySelectorAll('td').forEach(td => { row.push(td.textContent.trim()); });
        rows.push(row);
      })

      if (rows.length) {
        autoTable(pdf, {
          head: headers,
          body: rows,
          startY: yPos,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 10,
            cellPadding: 2,
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          }
        });

        yPos = pdf.lastAutoTable.finalY + 10
      }
    });

    pdf.save(`report_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('PDF error:', err);
    alert('PDF generation failed');
  } finally {
    loading.value = false;
  }
}

</script>
