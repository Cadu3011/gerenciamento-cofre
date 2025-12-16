"use client";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
interface Props {
  tableIds: string[];
  fileName: string;
  filial: string;
  data?: string;
  dif: string;
}

export default function ButtonExcel({
  tableIds,
  fileName = "relatorio",
  filial,
  data,
  dif,
}: Props) {
  async function exportToExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Relatório Cartões");
    const headerRow1 = sheet.getRow(1);
    headerRow1.getCell(1).value = `Filial: ${filial}`;
    headerRow1.getCell(1).font = {
      bold: true,
      size: 14,
      color: { argb: "FFFFFF" },
    };
    headerRow1.getCell(1).alignment = { horizontal: "left" };
    headerRow1.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0000FF" },
      };
    });
    headerRow1.commit();
    sheet.mergeCells(1, 1, 1, 10);
    // Linha 2 — Data
    const headerRow2 = sheet.getRow(2);
    headerRow2.getCell(1).value = `Data: ${data}`;
    headerRow2.getCell(1).font = {
      bold: true,
      size: 12,
      color: { argb: "FFFFFF" },
    };
    headerRow2.getCell(1).alignment = { horizontal: "left" };
    headerRow2.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0000FF" },
      };
    });

    headerRow2.commit();
    sheet.mergeCells(2, 1, 2, 10);

    const headerRow3 = sheet.getRow(3);
    headerRow3.getCell(1).value = `Diferença: ${dif}`;
    headerRow3.getCell(1).font = {
      bold: true,
      size: 14,
      color: { argb: "FFFFFF" },
    };
    headerRow3.getCell(1).alignment = { horizontal: "left" };
    headerRow3.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0000FF" },
      };
    });
    headerRow3.commit();
    sheet.mergeCells(3, 1, 3, 10);
    // Começamos a imprimir as tabelas a partir da linha 4
    let currentExcelRow = 4;
    let startColumn = 1; // coluna inicial de cada tabela

    for (const tableId of tableIds) {
      const table = document.getElementById(tableId) as HTMLTableElement;

      if (!table) {
        console.warn(`Tabela ${tableId} não encontrada`);
        continue;
      }

      const rows = Array.from(table.querySelectorAll("tr"));

      rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll("th, td"));

        // Calcula corretamente a row no Excel
        let excelRow = sheet.getRow(rowIndex + currentExcelRow);

        cells.forEach((cell, colIndex) => {
          const excelCell = excelRow.getCell(startColumn + colIndex);
          excelCell.value = cell.textContent;

          // Bordas
          excelCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          const classList = cell.classList;

          // Estilos Tailwind convertidos para Excel ---------------------

          if (classList.contains("bg-red-600")) {
            excelCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDC2626" },
            };
            excelCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
          }

          if (classList.contains("bg-yellow-400")) {
            excelCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFACC15" },
            };
            excelCell.font = { color: { argb: "FF000000" }, bold: true };
          }

          if (classList.contains("bg-blue-800")) {
            excelCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF1E3A8A" },
            };
            excelCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
            excelCell.alignment = { horizontal: "center" };
          }

          excelCell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        });

        excelRow.commit();
      });
      // 🔥 Depois de terminar essa tabela, pula algumas colunas
      startColumn += 5; // espaço entre as tabelas
    }
    const obs = sheet.getCell("K5");
    obs.value = `Observação`;
    obs.font = {
      bold: true,
      size: 12,
    };
    obs.alignment = { horizontal: "left" };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${fileName}.xlsx`);
  }

  return (
    <button
      onClick={exportToExcel}
      className="bg-green-600 px-4 py-2 rounded text-white"
    >
      Exportar Excel
    </button>
  );
}
