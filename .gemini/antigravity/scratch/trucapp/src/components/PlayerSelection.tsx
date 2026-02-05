import { useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import type { Player } from '../types';

interface PlayerSelectionProps {
    onSelect: (players: Player[]) => void;
    requiredCount: number; // 2 or 4 or 6
}

export const PlayerSelection = ({ onSelect, requiredCount }: PlayerSelectionProps) => {
    const { players, addPlayer } = useUserStore();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [message, setMessage] = useState('');

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(p => p !== id));
        } else {
            if (selectedIds.length < requiredCount) {
                setSelectedIds(prev => [...prev, id]);
            }
        }
    };

    const handleCreate = async () => {
        if (!newPlayerName.trim()) return;
        // Use default PIN for quick creation during match setup
        // Users will set their real PIN when logging in via AccountSelector
        const player = await addPlayer(newPlayerName.trim(), '0000');
        setNewPlayerName('');
        toggleSelect(player.id);
        setMessage(`Usuario creado. PIN provisorio: 0000`);
        setTimeout(() => setMessage(''), 5000);
    };

    const isReady = selectedIds.length === requiredCount;

    return (
        <div className="flex flex-col h-full p-4 bg-[var(--color-bg)]">
            <h2 className="text-xl font-bold mb-4">Seleccionar Jugadores ({selectedIds.length}/{requiredCount})</h2>

            {/* New Player Input */}
            <div className="flex flex-col gap-2 mb-6">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Nuevo jugador..."
                        className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent)]"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <button
                        onClick={handleCreate}
                        disabled={!newPlayerName.trim()}
                        className="bg-[var(--color-accent)] text-white px-4 rounded font-bold disabled:opacity-50"
                    >
                        +
                    </button>
                </div>
                {message && <div className="text-[var(--color-accent)] text-xs font-bold bg-[var(--color-accent)]/10 p-2 rounded border border-[var(--color-accent)]/20 text-center animate-pulse">{message}</div>}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                {players.length === 0 && <p className="text-[var(--color-text-muted)] text-center mt-8">No hay jugadores guardados.</p>}

                {players.map(player => (
                    <div
                        key={player.id}
                        onClick={() => toggleSelect(player.id)}
                        className={`p-4 rounded border transition-all cursor-pointer flex justify-between items-center
                ${selectedIds.includes(player.id)
                                ? 'bg-[var(--color-surface-hover)] border-[var(--color-accent)]'
                                : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                            }
             `}
                    >
                        <span className="font-medium">{player.name}</span>
                        {selectedIds.includes(player.id) && <span className="text-[var(--color-accent)]">✓</span>}
                    </div>
                ))}
            </div>

            <button
                className="mt-4 w-full bg-[var(--color-accent)] text-white py-4 rounded font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isReady}
                onClick={() => {
                    const selectedPlayers = players.filter(p => selectedIds.includes(p.id));
                    onSelect(selectedPlayers);
                }}
            >
                Continuar
            </button>
        </div>
    );
};
