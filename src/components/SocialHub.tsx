import { useState, useEffect, useRef } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '../store/useAuthStore';
import { PinInput } from './PinInput';
import { hashPin } from '../utils/pinSecurity';
import { AvatarBadge } from './AvatarBadge';
import { avatarOptions } from './avatarCatalog';
import { processAvatarFile } from '../utils/avatarUpload';

interface SocialHubProps {
    onBack: () => void;
}

type SocialTab = 'profile' | 'friends' | 'discovery';

export const SocialHub = ({ onBack }: SocialHubProps) => {
    const {
        players,
        friendRequests,
        subscribeToFriendRequests,
        sendFriendRequest,
        respondToFriendRequest,
        updateVisibility,
        updateNickname,
        updatePlayer,
        removeFriend
    } = useUserStore();
    const currentUserId = useAuthStore(state => state.currentUserId);
    const currentUser = players.find(p => p.id === currentUserId);

    const [activeTab, setActiveTab] = useState<SocialTab>('profile');
    const [editingNickname, setEditingNickname] = useState(false);
    const [tempNickname, setTempNickname] = useState(currentUser?.nickname || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [showPinChange, setShowPinChange] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [pinError, setPinError] = useState('');
    const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (currentUserId) {
            const unsubscribe = subscribeToFriendRequests(currentUserId);
            return () => unsubscribe();
        }
    }, [currentUserId, subscribeToFriendRequests]);

    if (!currentUser) return <div className="p-8 text-center text-white/20 uppercase font-black tracking-widest">No hay sesión activa</div>;

    const handleUpdateNickname = async () => {
        await updateNickname(currentUser.id, tempNickname);
        setEditingNickname(false);
    };

    const handleUpdatePin = async () => {
        if (newPin.length !== 4) return;
        try {
            await updatePlayer(currentUser.id, { pinHash: await hashPin(newPin) });
            setShowPinChange(false);
            setNewPin('');
            setPinError('');
        } catch {
            setPinError('Error al cambiar PIN');
        }
    };

    const handleAvatarChange = (avatar: string) => {
        updatePlayer(currentUser.id, { avatar });
    };

    const handleAvatarUpload = async (file?: File | null) => {
        if (!file) return;
        try {
            const avatarDataUrl = await processAvatarFile(file);
            await updatePlayer(currentUser.id, { avatar: avatarDataUrl });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudo subir el avatar.';
            alert(message);
        }
    };

    const friendsList = players.filter(p => (currentUser?.friends || []).includes(p.id));

    // Discovery: Public players who are not friends AND don't have a pending request
    const discoveryResults = players.filter(p =>
        p.id !== currentUserId &&
        p.visibility === 'PUBLIC' &&
        !(currentUser?.friends || []).includes(p.id) &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 10);

    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=256x256&chl=trucapp:addfriend:${currentUserId}`;

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-[0.3em] bg-white/5 py-2 px-4 rounded-full active:scale-95 transition-all">
                    ← VOLVER
                </button>
                <div className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-[var(--color-accent)]/20">
                    Social
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/5">
                {(['profile', 'friends', 'discovery'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-xl' : 'text-white/40'}`}
                    >
                        {tab === 'profile' ? 'Perfiles' : tab === 'friends' ? 'Amigos' : 'Descubrir'}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar pr-1">
                {activeTab === 'profile' && (
                    <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Profile Card */}
                        <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-8 border border-[var(--color-border)] shadow-2xl relative overflow-hidden">
                            <div className="flex flex-col items-center">
                                <AvatarBadge avatar={currentUser.avatar} name={currentUser.nickname || currentUser.name} size={96} className="mb-4 border-4 border-white/5" />

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
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">{currentUser.name} • Mi Perfil</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-8">
                                <button
                                    onClick={() => updateVisibility(currentUser.id, currentUser.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}
                                    className={`flex flex-col items-center p-4 bg-white/5 rounded-3xl border border-white/5 group active:scale-95 transition-all`}
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

                        {/* Avatar Picker */}
                        <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-6 border border-[var(--color-border)]">
                            <h3 className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em] mb-4 ml-2">Elegí tu Avatar</h3>
                            <div className="mb-4 flex justify-center">
                                <input
                                    ref={avatarFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        void handleAvatarUpload(e.target.files?.[0] ?? null);
                                        e.currentTarget.value = '';
                                    }}
                                />
                                <button
                                    onClick={() => avatarFileInputRef.current?.click()}
                                    className="px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/15 bg-white/5 text-white/70"
                                >
                                    Subir foto
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                {avatarOptions.map((a) => (
                                    <button
                                        key={a.id}
                                        onClick={() => handleAvatarChange(a.id)}
                                        className={`min-h-14 flex items-center justify-center bg-white/5 rounded-2xl border transition-all ${currentUser.avatar === a.id ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-white/5'}`}
                                        title={a.label}
                                    >
                                        <AvatarBadge avatar={a.id} name={a.label} size={42} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* PIN Management */}
                        <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-6 border border-[var(--color-border)]">
                            {!showPinChange ? (
                                <button
                                    onClick={() => setShowPinChange(true)}
                                    className="w-full flex items-center justify-between p-2"
                                >
                                    <div className="flex flex-col items-start">
                                        <h3 className="text-[10px] font-black uppercase text-white/40 tracking-[0.1em]">Seguridad</h3>
                                        <span className="text-xs font-bold text-white uppercase">Cambiar mi PIN</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20">→</div>
                                </button>
                            ) : (
                                <div className="flex flex-col items-center py-4 animate-in fade-in duration-300">
                                    <h3 className="text-[10px] font-black uppercase text-white/40 tracking-[0.1em] mb-6">Nuevo PIN de 4 dígitos</h3>
                                    <PinInput
                                        value={newPin}
                                        onChange={setNewPin}
                                        onComplete={handleUpdatePin}
                                        autoFocus
                                    />
                                    {pinError && <p className="text-[8px] font-bold text-red-500 uppercase mt-4">{pinError}</p>}
                                    <button onClick={() => { setShowPinChange(false); setNewPin(''); }} className="mt-8 text-[8px] font-black text-white/20 uppercase tracking-widest px-4 py-2 hover:text-white/40 transition-colors">
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* QR Section */}
                        <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-8 border border-[var(--color-border)] flex flex-col items-center mb-8">
                            <h3 className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em] mb-6">Pasaporte Truquero</h3>
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
                                {showScanner ? "Cerrar Escáner" : "Escanear Pasaporte"}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'friends' && (
                    <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Pending Requests */}
                        {friendRequests.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <h4 className="text-[8px] font-black text-[var(--color-accent)] uppercase tracking-widest ml-4">Solicitudes Pendientes</h4>
                                {friendRequests.map(req => {
                                    const sender = players.find(p => p.id === req.fromUserId);
                                    return (
                                        <div key={req.id} className="bg-[var(--color-accent)]/10 p-5 rounded-[2rem] border border-[var(--color-accent)]/20 flex justify-between items-center animate-pulse">
                                            <div className="flex items-center gap-4">
                                                <AvatarBadge avatar={sender?.avatar} name={sender?.nickname || sender?.name} size={40} />
                                                <div className="flex flex-col">
                                                    <span className="font-black uppercase text-sm tracking-tight text-white">{sender?.nickname || sender?.name}</span>
                                                    <span className="text-[8px] font-black text-[var(--color-accent)] uppercase tracking-widest">Quiere ser tu amigo</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => respondToFriendRequest(req.id, 'accepted')}
                                                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-black active:scale-90 transition-all text-sm"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={() => respondToFriendRequest(req.id, 'rejected')}
                                                    className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center font-black active:scale-90 transition-all text-sm"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Friends List */}
                        <div className="flex flex-col gap-3 pb-12">
                            <h4 className="text-[8px] font-black text-white/10 uppercase tracking-widest ml-4">Tu Crew ({friendsList.length})</h4>
                            {friendsList.length === 0 ? (
                                <div className="text-center p-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                                    <span className="text-3xl grayscale opacity-20 block mb-4">🤝</span>
                                    <p className="italic text-white/10 text-[10px] font-black uppercase tracking-widest">Tu lista está vacía</p>
                                </div>
                            ) : (
                                friendsList.map(p => (
                                    <div key={p.id} className="bg-[var(--color-surface)] p-5 rounded-[2rem] border border-[var(--color-border)] flex justify-between items-center group shadow-lg">
                                        <div className="flex items-center gap-4">
                                            <AvatarBadge avatar={p.avatar} name={p.nickname || p.name} size={48} />
                                            <div className="flex flex-col">
                                                <span className="font-black uppercase text-sm tracking-tight">{p.nickname || p.name}</span>
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Socio Activo</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFriend(currentUser.id, p.id)}
                                            className="text-[10px] font-black text-[var(--color-ellos)] uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity p-2"
                                        >
                                            Chau
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'discovery' && (
                    <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="BUSCAR JUGADORES..."
                                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] px-6 py-5 text-white font-black uppercase text-xs outline-none focus:border-[var(--color-accent)] transition-all shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <h4 className="text-[8px] font-black text-white/10 uppercase tracking-widest ml-4">
                                {searchQuery ? 'Resultados de Búsqueda' : 'Recomendados'}
                            </h4>
                            {discoveryResults.length === 0 ? (
                                <p className="text-center p-12 italic text-white/10 text-[10px] font-black uppercase tracking-widest">No se encontraron jugadores</p>
                            ) : (
                                discoveryResults.map(p => (
                                    <div key={p.id} className="bg-[var(--color-surface)] p-5 rounded-[2rem] border border-[var(--color-border)] flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <AvatarBadge avatar={p.avatar} name={p.nickname || p.name} size={40} />
                                            <div className="flex flex-col">
                                                <span className="font-black uppercase text-sm">{p.nickname || p.name}</span>
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{p.name}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => sendFriendRequest(currentUser.id, p.id)}
                                            className="bg-[var(--color-accent)] text-white w-10 h-10 rounded-full flex items-center justify-center font-black active:scale-90 transition-all shadow-lg shadow-[var(--color-accent)]/20"
                                        >
                                            +
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
