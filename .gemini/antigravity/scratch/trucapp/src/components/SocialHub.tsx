import { useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '../store/useAuthStore';

interface SocialHubProps {
    onBack: () => void;
}

export const SocialHub = ({ onBack }: SocialHubProps) => {
    const { players, addFriend, removeFriend, updateVisibility, updateNickname } = useUserStore();
    const currentUserId = useAuthStore(state => state.currentUserId);
    const currentUser = players.find(p => p.id === currentUserId);

    const [editingNickname, setEditingNickname] = useState(false);
    const [tempNickname, setTempNickname] = useState(currentUser?.nickname || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [showScanner, setShowScanner] = useState(false); // Simulated scanner for now

    if (!currentUser) return <div className="p-8 text-center text-white/20 uppercase font-black tracking-widest">No hay sesión activa</div>;

    const handleUpdateNickname = async () => {
        await updateNickname(currentUser.id, tempNickname);
        setEditingNickname(false);
    };

    const friends = players.filter(p => currentUser.friends.includes(p.id));

    // Discovery: Public players who are not friends
    const publicPlayers = players.filter(p =>
        p.id !== currentUserId &&
        p.visibility === 'PUBLIC' &&
        !currentUser.friends.includes(p.id) &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // QR Code using a public API (Google Charts) for simplicity
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=256x256&chl=trucapp:addfriend:${currentUserId}`;

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={onBack} className="text-[var(--color-text-muted)] font-black text-xs uppercase tracking-[0.3em] bg-white/5 py-2 px-4 rounded-full active:scale-95 transition-all">
                    ← VOLVER
                </button>
                <div className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-[var(--color-accent)]/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                    Social Hub
                </div>
            </div>

            {/* Profile Section */}
            <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-8 mb-8 border border-[var(--color-border)] shadow-2xl relative overflow-hidden">
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#1d4ed8] flex items-center justify-center text-4xl font-black text-white shadow-2xl mb-4 border-4 border-white/5">
                        {currentUser.name[0].toUpperCase()}
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
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">{currentUser.name} • Perfil</span>
                        </div>
                    )}

                    <div className="flex gap-4 mt-8 w-full">
                        <div className="flex-1 flex flex-col items-center p-4 bg-white/5 rounded-3xl border border-white/5">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Visibilidad</span>
                            <button
                                onClick={() => updateVisibility(currentUser.id, currentUser.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}
                                className={`text-[10px] font-black uppercase px-3 py-1 rounded-full transition-all ${currentUser.visibility === 'PUBLIC' ? 'bg-[var(--color-nosotros)]/20 text-[var(--color-nosotros)]' : 'bg-[var(--color-ellos)]/20 text-[var(--color-ellos)]'}`}
                            >
                                {currentUser.visibility}
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col items-center p-4 bg-white/5 rounded-3xl border border-white/5">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Amigos</span>
                            <span className="text-xl font-black text-white">{currentUser.friends.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Section */}
            <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-8 mb-8 border border-[var(--color-border)] flex flex-col items-center">
                <h3 className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em] mb-6">Tu Pasaporte Truquero</h3>
                <div className="p-3 bg-white rounded-3xl shadow-2xl mb-6">
                    <img src={qrUrl} alt="Your QR Code" className="w-48 h-48" />
                </div>
                <p className="text-center text-[10px] font-bold text-white/40 uppercase leading-relaxed max-w-[200px]">
                    Escaneá para agregar amigos y compartir estadísticas
                </p>

                <button
                    onClick={() => setShowScanner(!showScanner)}
                    className="mt-6 w-full bg-white text-black py-4 rounded-3xl font-black uppercase tracking-[0.2em] active:scale-95 transition-all text-xs"
                >
                    {showScanner ? "Cerrar Escáner" : "Escanear QR"}
                </button>

                {showScanner && (
                    <div className="mt-4 w-full aspect-square bg-black/40 rounded-3xl border border-dashed border-white/20 flex flex-col items-center justify-center p-8 text-center gap-4 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 border-t-2 border-l-2 border-[var(--color-accent)] self-start rounded-tl-xl opacity-50"></div>
                        <p className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-widest">Buscando Pasaporte...</p>
                        <div className="w-16 h-16 border-b-2 border-r-2 border-[var(--color-accent)] self-end rounded-br-xl opacity-50"></div>
                        <p className="text-[9px] text-white/20 font-medium italic mt-4">Simulando cámara para propósitos de desarrollo</p>
                    </div>
                )}
            </div>

            {/* Friends / Search Section */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4 pl-2">
                    <div className="h-[1px] flex-1 bg-white/5"></div>
                    <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Comunidad</h3>
                    <div className="h-[1px] flex-1 bg-white/5"></div>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="BUSCAR JUGADORES..."
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl px-6 py-4 text-white font-black uppercase text-xs outline-none focus:border-[var(--color-accent)] transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {searchQuery ? (
                    <div className="flex flex-col gap-3">
                        <h4 className="text-[8px] font-black text-white/10 uppercase tracking-widest ml-4">Resultados de Búsqueda</h4>
                        {publicPlayers.length === 0 ? (
                            <p className="text-center p-8 italic text-white/10 text-xs font-medium">No se encontraron jugadores públicos</p>
                        ) : (
                            publicPlayers.map(p => (
                                <div key={p.id} className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-border)] flex justify-between items-center group">
                                    <div className="flex flex-col">
                                        <span className="font-black uppercase text-sm">{p.nickname || p.name}</span>
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{p.name}</span>
                                    </div>
                                    <button
                                        onClick={() => currentUserId && addFriend(currentUserId, p.id)}
                                        className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] w-10 h-10 rounded-full flex items-center justify-center font-black active:scale-90 transition-all border border-[var(--color-accent)]/20 shadow-lg"
                                    >
                                        +
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 pb-12">
                        <h4 className="text-[8px] font-black text-white/10 uppercase tracking-widest ml-4">Tu Crew ({friends.length})</h4>
                        {friends.length === 0 ? (
                            <p className="text-center p-8 italic text-white/10 text-xs font-medium bg-white/5 rounded-3xl border border-dashed border-white/10">Tu lista de amigos está vacía</p>
                        ) : (
                            friends.map(p => (
                                <div key={p.id} className="bg-[var(--color-surface)] p-5 rounded-[1.5rem] border border-[var(--color-border)] flex justify-between items-center group shadow-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-sm font-black text-white/40">
                                            {p.name[0]}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black uppercase text-sm tracking-tight">{p.nickname || p.name}</span>
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Socio Activo</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => currentUserId && removeFriend(currentUserId, p.id)}
                                        className="text-[10px] font-black text-[var(--color-ellos)] uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
