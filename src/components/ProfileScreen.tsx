import { useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '../store/useAuthStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { PinInput } from './PinInput';

interface ProfileScreenProps {
    onBack: () => void;
}

export const ProfileScreen = ({ onBack }: ProfileScreenProps) => {
    const { players, updateVisibility, updateNickname, updatePlayer } = useUserStore();
    const { currentUserId, logout } = useAuthStore();
    const currentUser = players.find(p => p.id === currentUserId);

    const [editingNickname, setEditingNickname] = useState(false);
    const [tempNickname, setTempNickname] = useState(currentUser?.nickname || '');
    const [showPinChange, setShowPinChange] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [pinError, setPinError] = useState('');

    if (!currentUser) return <div className="p-8 text-center text-white/20 uppercase font-black tracking-widest">No hay sesión activa</div>;

    const handleUpdateNickname = async () => {
        await updateNickname(currentUser.id, tempNickname);
        setEditingNickname(false);
    };

    const handleUpdatePin = async () => {
        if (newPin.length !== 4) return;
        try {
            await updatePlayer(currentUser.id, { pinHash: `hash_${newPin}` });
            setShowPinChange(false);
            setNewPin('');
            setPinError('');
        } catch (e) {
            setPinError('Error al cambiar PIN');
        }
    };

    const handleAvatarChange = (avatar: string) => {
        updatePlayer(currentUser.id, { avatar });
    };

    const handleLogout = () => {
        logout();
        onBack();
    };

    const avatars = ['⚽', '🃏', '🍺', '🍖', '🏆', '🧉', '🦁', '🦉', '🦊', '🐻'];

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-[0.3em] bg-white/5 py-2 px-4 rounded-full active:scale-95 transition-all">
                    ← VOLVER
                </button>
                <div className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-[var(--color-accent)]/20">
                    Mi Perfil
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar pr-1">
                <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Profile Card */}
                    <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-8 border border-[var(--color-border)] shadow-2xl relative overflow-hidden">
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#1d4ed8] flex items-center justify-center text-4xl font-black text-white shadow-2xl mb-4 border-4 border-white/5">
                                {currentUser.avatar || currentUser.name[0].toUpperCase()}
                            </div>

                            {editingNickname ? (
                                <div className="flex flex-col items-center gap-2 w-full">
                                    <input
                                        type="text"
                                        className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-center font-black uppercase text-xl text-white outline-none focus:border-[var(--color-accent)] w-full"
                                        value={tempNickname}
                                        onChange={(e) => setTempNickname(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleUpdateNickname} className="text-[10px] font-black uppercase bg-[var(--color-accent)] text-white px-4 py-1.5 rounded-full">Guardar</button>
                                        <button onClick={() => setEditingNickname(false)} className="text-[10px] font-black uppercase bg-white/10 text-white/40 px-4 py-1.5 rounded-full">Cancelar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center" onClick={() => { setTempNickname(currentUser.nickname || ''); setEditingNickname(true); }}>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">{currentUser.nickname || currentUser.name}</h2>
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">{currentUser.name} • Toca para editar</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button
                                onClick={() => updateVisibility(currentUser.id, currentUser.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}
                                className="flex flex-col items-center p-4 bg-white/5 rounded-3xl border border-white/5 group active:scale-95 transition-all"
                            >
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 group-hover:text-white/40">Visibilidad</span>
                                <span className={`text-[10px] font-black uppercase ${currentUser.visibility === 'PUBLIC' ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-ellos)]'}`}>
                                    {currentUser.visibility}
                                </span>
                            </button>
                            <div className="flex flex-col items-center p-4 bg-white/5 rounded-3xl border border-white/5">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Amigos</span>
                                <span className="text-xl font-black text-white">{currentUser.friends?.length || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Avatar Selection */}
                    <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-6 border border-[var(--color-border)]">
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Seleccionar Avatar</h3>
                        <div className="grid grid-cols-5 gap-3">
                            {avatars.map(av => (
                                <button
                                    key={av}
                                    onClick={() => handleAvatarChange(av)}
                                    className={`aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all border-2 ${currentUser.avatar === av ? 'bg-[var(--color-accent)]/20 border-[var(--color-accent)] scale-110' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    {av}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PIN Change */}
                    <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-6 border border-[var(--color-border)]">
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Cambiar PIN</h3>
                        {!showPinChange ? (
                            <button
                                onClick={() => setShowPinChange(true)}
                                className="w-full bg-white/5 border border-white/10 py-4 rounded-2xl text-white/60 font-black text-sm uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                            >
                                Modificar PIN
                            </button>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <PinInput
                                    value={newPin}
                                    onChange={setNewPin}
                                    onComplete={handleUpdatePin}
                                    autoFocus
                                />
                                {pinError && <p className="text-red-500 text-xs font-bold text-center">{pinError}</p>}
                                <div className="flex gap-2">
                                    <button onClick={handleUpdatePin} disabled={newPin.length !== 4} className="flex-1 bg-[var(--color-accent)] text-white font-black py-3 rounded-xl disabled:opacity-50">Guardar</button>
                                    <button onClick={() => { setShowPinChange(false); setNewPin(''); setPinError(''); }} className="flex-1 bg-white/10 text-white/40 font-black py-3 rounded-xl">Cancelar</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-500/5 rounded-[2.5rem] p-6 border border-red-500/20">
                        <h3 className="text-[10px] font-black text-red-400/60 uppercase tracking-[0.3em] mb-4">Zona de Peligro</h3>
                        <button
                            onClick={async () => {
                                if (confirm('¿Estás seguro? Esto eliminará TODOS los usuarios y partidos. Esta acción no se puede deshacer.')) {
                                    const { clearAllUsers } = useUserStore.getState();
                                    const { clearAllMatches } = useHistoryStore.getState();
                                    await clearAllUsers();
                                    await clearAllMatches();
                                    logout();
                                    onBack();
                                }
                            }}
                            className="w-full bg-red-500/10 border border-red-500/30 text-red-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-500/20 active:scale-95 transition-all"
                        >
                            🗑️ Borrar Todos los Datos
                        </button>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="bg-red-500/10 border border-red-500/20 text-red-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-500/20 active:scale-95 transition-all"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
};
