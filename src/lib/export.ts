// import { Parser } from 'json2csv'; // REMOVED to fix build errors

export type ExportFormat = 'csv' | 'excel' | 'pdf';

interface ExportOptions<T> {
    filename: string;
    format: ExportFormat;
    data: T[];
    fields?: string[];
}

/**
 * Exportar datos a CSV (Implementation manual sin librerías externas)
 */
export function exportToCSV<T extends Record<string, unknown>>(data: T[], fields?: string[]): string {
    try {
        if (!data || data.length === 0) return '';

        // Determinar campos si no se proveen
        const headers = fields || Object.keys(data[0]);

        // Crear fila de encabezados
        const headerRow = headers.join(',');

        // Mapear datos a filas CSV
        const rows = data.map(row => {
            return headers.map(fieldName => {
                const value = row[fieldName] || '';
                // Manejar comillas y comas en el contenido
                const stringValue = String(value).replace(/"/g, '""');
                return `"${stringValue}"`;
            }).join(',');
        });

        // Unir todo con saltos de línea
        return [headerRow, ...rows].join('\n');
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        throw new Error('Error al exportar a CSV');
    }
}

/**
 * Exportar datos a Excel (CSV compatible)
 */
export function exportToExcel<T extends Record<string, unknown>>(data: T[], fields?: string[]): string {
    // Excel puede abrir archivos CSV con BOM UTF-8
    const csv = exportToCSV(data, fields);
    return '\uFEFF' + csv; // BOM para UTF-8
}

/**
 * Descargar archivo en el navegador
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

/**
 * Exportar datos según formato
 */
export async function exportData<T extends Record<string, unknown>>(options: ExportOptions<T>): Promise<void> {
    const { filename, format, data, fields } = options;

    switch (format) {
        case 'csv': {
            const csv = exportToCSV(data, fields);
            downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
            break;
        }

        case 'excel': {
            const excel = exportToExcel(data, fields);
            downloadFile(excel, `${filename}.csv`, 'text/csv;charset=utf-8;');
            break;
        }

        case 'pdf': {
            // Para PDF, usar una librería como jsPDF o llamar a un endpoint
            await exportToPDF(data, filename);
            break;
        }

        default:
            throw new Error(`Formato no soportado: ${format}`);
    }
}

/**
 * Exportar a PDF (requiere endpoint backend)
 */
async function exportToPDF<T>(data: T[], filename: string): Promise<void> {
    try {
        const response = await fetch('/api/admin/reports/export-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data, filename }),
        });

        if (!response.ok) {
            throw new Error('Error al generar PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        throw new Error('Error al exportar a PDF');
    }
}

/**
 * Helpers para reportes específicos
 */
export const reports = {
    /**
     * Exportar reporte de usuarios
     */
    users: async (users: Record<string, unknown>[], format: ExportFormat) => {
        const fields = [
            'full_name',
            'email',
            'role',
            'phone',
            'birth_date',
            'gender',
            'created_at'
        ];

        await exportData({
            filename: `usuarios_${new Date().toISOString().split('T')[0]}`,
            format,
            data: users,
            fields
        });
    },

    /**
     * Exportar reporte de pagos
     */
    payments: async (payments: Record<string, unknown>[], format: ExportFormat) => {
        const fields = [
            'user_name',
            'amount',
            'status',
            'payment_method',
            'transaction_id',
            'created_at',
            'approved_at'
        ];

        await exportData({
            filename: `pagos_${new Date().toISOString().split('T')[0]}`,
            format,
            data: payments,
            fields
        });
    },

    /**
     * Exportar reporte de accesos
     */
    accessLogs: async (logs: Record<string, unknown>[], format: ExportFormat) => {
        const fields = [
            'user_name',
            'action',
            'ip_address',
            'device',
            'timestamp',
            'status'
        ];

        await exportData({
            filename: `accesos_${new Date().toISOString().split('T')[0]}`,
            format,
            data: logs,
            fields
        });
    },

    /**
     * Exportar reporte de rutinas
     */
    routines: async (routines: Record<string, unknown>[], format: ExportFormat) => {
        const fields = [
            'student_name',
            'coach_name',
            'status',
            'difficulty_level',
            'duration_weeks',
            'created_at',
            'approved_at'
        ];

        await exportData({
            filename: `rutinas_${new Date().toISOString().split('T')[0]}`,
            format,
            data: routines,
            fields
        });
    }
};
