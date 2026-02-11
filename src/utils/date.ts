const pad2 = (n: number): string => n.toString().padStart(2, '0');

export const formatDateInputLocal = (timestamp: number): string => {
    const d = new Date(timestamp);
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${yyyy}-${mm}-${dd}`;
};

export const parseDateInputLocal = (value: string): number | null => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;

    // Noon local time avoids date drift around timezone/DST edges.
    const ts = new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
    return Number.isNaN(ts) ? null : ts;
};
