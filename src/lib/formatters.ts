export const formatCurrency = (amount: number, locale = 'es-AR', currency = 'ARS'): string => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
    }).format(amount);
};

export const formatDate = (
    date: string | Date,
    format: 'short' | 'long' | 'full' = 'short'
): string => {
    const d = typeof date === 'string' ? new Date(date) : date;

    const formats: Record<string, Intl.DateTimeFormatOptions> = {
        short: { day: '2-digit', month: '2-digit', year: 'numeric' },
        long: { day: '2-digit', month: 'long', year: 'numeric' },
        full: {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }
    };

    return d.toLocaleDateString('es-AR', formats[format]);
};

export const formatWeight = (weight: number): string => {
    return `${weight.toFixed(1)} kg`;
};

export const formatHeight = (height: number): string => {
    return `${height} cm`;
};

export const formatPercentage = (value: number, decimals = 0): string => {
    return `${value.toFixed(decimals)}%`;
};

export const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

export const calculateBMI = (weight: number, height: number): string => {
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
};

export const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};
