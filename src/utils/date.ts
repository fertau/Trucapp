const pad2 = (n: number): string => n.toString().padStart(2, '0');

export const formatDateInputLocal = (timestamp: number): string => {
    const d = new Date(timestamp);
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${yyyy}-${mm}-${dd}`;
};

export const parseDateInputLocal = (value: string): number | null => {
    const raw = value.trim();
    if (!raw) return null;

    let y = 0;
    let m = 0;
    let d = 0;

    if (raw.includes('-')) {
        const [yy, mm, dd] = raw.split('-').map(Number);
        y = yy;
        m = mm;
        d = dd;
    } else if (raw.includes('/')) {
        const [dd, mm, yy] = raw.split('/').map(Number);
        d = dd;
        m = mm;
        y = yy < 100 ? 2000 + yy : yy;
    }

    if (!y || !m || !d) return null;

    // Noon local time avoids date drift around timezone/DST edges.
    const ts = new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
    return Number.isNaN(ts) ? null : ts;
};

export const formatDateDisplay = (timestamp: number): string => {
    const d = new Date(timestamp);
    const yy = String(d.getFullYear()).slice(-2);
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${dd}/${mm}/${yy}`;
};

export const formatDateTimeDisplay = (timestamp: number): string => {
    const d = new Date(timestamp);
    const hh = pad2(d.getHours());
    const min = pad2(d.getMinutes());
    return `${formatDateDisplay(timestamp)} ${hh}:${min}`;
};
