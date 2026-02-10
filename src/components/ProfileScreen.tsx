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

    if (!currentUser) {
        return (
            <div className="full-screen flex items-center justify-center p-8" style={{ backgroundColor: 'var(--color-bg)' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
                        No hay sesión activa
                    </p>
                    <button
                        onClick={onBack}
                        style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.05)', padding: '12px 24px', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
                    >
                        ← Volver
                    </button>
                </div>
            </div>
        );
    }

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
        } catch (_e) {
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

    const handleClearAllData = async () => {
        if (confirm('¿Estás seguro? Esto eliminará TODOS los usuarios y partidos. Esta acción no se puede deshacer.')) {
            const { clearAllUsers } = useUserStore.getState();
            const { clearAllMatches } = useHistoryStore.getState();
            await clearAllUsers();
            await clearAllMatches();
            logout();
            onBack();
        }
    };

    const avatars = ['⚽', '🃏', '🍺', '🍖', '🏆', '🧉', '🦁', '🦉', '🦊', '🐻'];

    // Using inline styles to guarantee visibility (Tailwind was not generating arbitrary value classes)
    const s = {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',
        white: '#ffffff',
        whiteFaint: 'rgba(255,255,255,0.2)',
        whiteMuted: 'rgba(255,255,255,0.4)',
        whiteSoft: 'rgba(255,255,255,0.6)',
        whiteBg: 'rgba(255,255,255,0.05)',
        whiteBgHover: 'rgba(255,255,255,0.1)',
        green: 'var(--color-nosotros)',
        gold: 'var(--color-ellos)',
        red: '#ff453a',
        redBg: 'rgba(255,69,58,0.1)',
        redBorder: 'rgba(255,69,58,0.2)',
    };

    const cardStyle: React.CSSProperties = {
        backgroundColor: s.surface,
        borderRadius: '2.5rem',
        padding: '24px',
        border: `1px solid ${s.border}`,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '10px',
        fontWeight: 900,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3em',
        color: s.whiteMuted,
        marginBottom: '16px',
    };

    const btnStyle: React.CSSProperties = {
        border: 'none',
        cursor: 'pointer',
        fontWeight: 900,
        textTransform: 'uppercase' as const,
        transition: 'all 0.2s',
    };

    return (
        <div className="full-screen" style={{ backgroundColor: s.bg, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <button
                    onClick={onBack}
                    style={{ ...btnStyle, color: s.whiteSoft, fontSize: '10px', letterSpacing: '0.3em', background: s.whiteBg, padding: '8px 16px', borderRadius: '9999px' }}
                >
                    ← VOLVER
                </button>
                <div style={{ background: 'rgba(74,222,128,0.1)', color: s.accent, padding: '4px 12px', borderRadius: '9999px', fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', border: '1px solid rgba(74,222,128,0.2)' }}>
                    Mi Perfil
                </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '48px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Profile Card */}
                    <div style={{ ...cardStyle, padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                                width: '96px', height: '96px', borderRadius: '50%',
                                background: `linear-gradient(135deg, ${s.accent}, #1d4ed8)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '36px', fontWeight: 900, color: s.white,
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                marginBottom: '16px', border: '4px solid rgba(255,255,255,0.05)'
                            }}>
                                {currentUser.avatar || currentUser.name[0].toUpperCase()}
                            </div>

                            {editingNickname ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <input
                                        type="text"
                                        style={{
                                            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px', padding: '8px 16px', textAlign: 'center',
                                            fontWeight: 900, textTransform: 'uppercase', fontSize: '20px', color: s.white,
                                            outline: 'none', width: '100%'
                                        }}
                                        value={tempNickname}
                                        onChange={(e) => setTempNickname(e.target.value)}
                                        autoFocus
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={handleUpdateNickname} style={{ ...btnStyle, fontSize: '10px', background: s.accent, color: s.white, padding: '6px 16px', borderRadius: '9999px' }}>Guardar</button>
                                        <button onClick={() => setEditingNickname(false)} style={{ ...btnStyle, fontSize: '10px', background: s.whiteBgHover, color: s.whiteMuted, padding: '6px 16px', borderRadius: '9999px' }}>Cancelar</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => { setTempNickname(currentUser.nickname || ''); setEditingNickname(true); }}>
                                    <h2 style={{ fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em', color: s.white, margin: 0 }}>
                                        {currentUser.nickname || currentUser.name}
                                    </h2>
                                    <span style={{ fontSize: '10px', fontWeight: 900, color: s.whiteFaint, textTransform: 'uppercase', letterSpacing: '0.3em', marginTop: '4px' }}>
                                        {currentUser.name} • Toca para editar
                                    </span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '32px' }}>
                            <button
                                onClick={() => updateVisibility(currentUser.id, currentUser.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}
                                style={{ ...btnStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', background: s.whiteBg, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <span style={{ fontSize: '8px', color: s.whiteFaint, letterSpacing: '0.1em', marginBottom: '4px' }}>VISIBILIDAD</span>
                                <span style={{ fontSize: '10px', color: currentUser.visibility === 'PUBLIC' ? s.green : s.gold }}>
                                    {currentUser.visibility}
                                </span>
                            </button>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', background: s.whiteBg, borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '8px', fontWeight: 900, color: s.whiteFaint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>AMIGOS</span>
                                <span style={{ fontSize: '20px', fontWeight: 900, color: s.white }}>{currentUser.friends?.length || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Avatar Selection */}
                    <div style={cardStyle}>
                        <h3 style={labelStyle}>Seleccionar Avatar</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                            {avatars.map(av => (
                                <button
                                    key={av}
                                    onClick={() => handleAvatarChange(av)}
                                    style={{
                                        ...btnStyle,
                                        aspectRatio: '1', borderRadius: '1rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '24px',
                                        background: currentUser.avatar === av ? 'rgba(74,222,128,0.2)' : s.whiteBg,
                                        border: currentUser.avatar === av ? '2px solid var(--color-accent)' : '2px solid rgba(255,255,255,0.05)',
                                        transform: currentUser.avatar === av ? 'scale(1.1)' : 'scale(1)',
                                    }}
                                >
                                    {av}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PIN Change */}
                    <div style={cardStyle}>
                        <h3 style={labelStyle}>Cambiar PIN</h3>
                        {!showPinChange ? (
                            <button
                                onClick={() => setShowPinChange(true)}
                                style={{ ...btnStyle, width: '100%', background: s.whiteBg, border: `1px solid ${s.whiteBgHover}`, padding: '16px', borderRadius: '1rem', color: s.whiteSoft, fontSize: '14px', letterSpacing: '0.15em' }}
                            >
                                Modificar PIN
                            </button>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <PinInput value={newPin} onChange={setNewPin} onComplete={handleUpdatePin} autoFocus />
                                {pinError && <p style={{ color: s.red, fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>{pinError}</p>}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={handleUpdatePin} disabled={newPin.length !== 4} style={{ ...btnStyle, flex: 1, background: s.accent, color: s.white, padding: '12px', borderRadius: '12px', opacity: newPin.length !== 4 ? 0.5 : 1 }}>Guardar</button>
                                    <button onClick={() => { setShowPinChange(false); setNewPin(''); setPinError(''); }} style={{ ...btnStyle, flex: 1, background: s.whiteBgHover, color: s.whiteMuted, padding: '12px', borderRadius: '12px' }}>Cancelar</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Danger Zone */}
                    <div style={{ ...cardStyle, background: s.redBg, border: `1px solid ${s.redBorder}` }}>
                        <h3 style={{ ...labelStyle, color: 'rgba(255,69,58,0.6)' }}>Zona de Peligro</h3>
                        <button
                            onClick={handleClearAllData}
                            style={{ ...btnStyle, width: '100%', background: s.redBg, border: `1px solid rgba(255,69,58,0.3)`, color: s.red, padding: '16px', borderRadius: '1rem', fontSize: '14px', letterSpacing: '0.15em' }}
                        >
                            🗑️ Borrar Todos los Datos
                        </button>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        style={{ ...btnStyle, background: s.redBg, border: `1px solid ${s.redBorder}`, color: s.red, padding: '16px', borderRadius: '1rem', fontSize: '14px', letterSpacing: '0.15em' }}
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
};
