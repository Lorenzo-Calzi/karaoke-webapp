import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { showError, showSuccess } from "../../lib/toast";
import CustomModal from "../../components/CustomModal/CustomModal";
import { ReactSortable } from "react-sortablejs";
import "./karaokeList.scss";

type KaraokeEntry = {
    id: string;
    title: string;
    singer_name: string;
    added_at: string;
    sung: boolean;
    order_position?: number;
};

// Componente per ogni elemento della lista
function KaraokeItem({
    entry,
    editingId,
    editTitle,
    editSinger,
    onEdit,
    onSaveEdit,
    onCancelEdit,
    onToggleSung,
    onDelete,
    onEditChange
}: {
    entry: KaraokeEntry;
    editingId: string | null;
    editTitle: string;
    editSinger: string;
    onEdit: (entry: KaraokeEntry) => void;
    onSaveEdit: (id: string) => void;
    onCancelEdit: () => void;
    onToggleSung: (id: string, currentValue: boolean) => void;
    onDelete: (id: string) => void;
    onEditChange: (field: string, value: string) => void;
}) {
    return (
        <div className={`karaoke_item ${entry.sung ? "sung" : ""}`} data-id={entry.id}>
            {editingId === entry.id ? (
                <div className="edit_form">
                    <input
                        value={editTitle}
                        placeholder="Titolo*"
                        onChange={e => onEditChange("title", e.target.value)}
                    />
                    <input
                        value={editSinger}
                        placeholder="Chi deve cantarla*"
                        onChange={e => onEditChange("singer", e.target.value)}
                    />
                    <div className="buttons">
                        <button
                            onClick={() => onSaveEdit(entry.id)}
                            className="option"
                            style={{ backgroundColor: "rgba(85, 255, 0, 0.4)" }}
                        >
                            <i className="fa-solid fa-check"></i>
                        </button>
                        <button
                            onClick={onCancelEdit}
                            className="option"
                            style={{ backgroundColor: "rgba(255, 0, 0, 0.4)" }}
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="content">
                        <div className="song">
                            <p className="paragraph">{entry.title}</p>
                        </div>
                        <div className="user">
                            <p className="paragraph">{entry.singer_name}</p>
                        </div>

                        <div className="buttons">
                            <button
                                onClick={() => onToggleSung(entry.id, entry.sung)}
                                className="option"
                                style={{
                                    backgroundColor: "rgba(249, 249, 249, 0.4)"
                                }}
                            >
                                <i
                                    className={`${
                                        entry.sung ? "fa-solid" : "fa-regular"
                                    } fa-square-check`}
                                    style={{
                                        color: entry.sung ? "#7CFC00" : "white",
                                        fontSize: "18px"
                                    }}
                                />
                            </button>
                            <button
                                onClick={() => onEdit(entry)}
                                className="option"
                                style={{ background: "rgba(0, 123, 255, 0.4)" }}
                            >
                                <i className="fa-solid fa-pencil"></i>
                            </button>
                            <button
                                onClick={() => onDelete(entry.id)}
                                className="option"
                                style={{ backgroundColor: "rgba(255, 0, 0, 0.4)" }}
                            >
                                <i className="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>

                    {/* Drag handle - ottimizzato per mobile */}
                    <div className="drag-handle sortable-handle">
                        <i className="fa-solid fa-grip-vertical"></i>
                    </div>
                </>
            )}
        </div>
    );
}

export default function KaraokeList() {
    const [title, setTitle] = useState("");
    const [singerName, setSingerName] = useState("");
    const [errors, setErrors] = useState<{ title?: string; singer?: string }>({});
    const [karaokeList, setKaraokeList] = useState<KaraokeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSung, setShowSung] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editSinger, setEditSinger] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [songToDelete, setSongToDelete] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const fetchList = async () => {
        const { data, error } = await supabase
            .from("karaoke_list")
            .select("*")
            .order("order_position", { ascending: true, nullsFirst: false })
            .order("added_at", { ascending: true });

        if (error) {
            showError("Errore nel caricamento: " + error.message);
        } else {
            setKaraokeList(data || []);
        }
    };

    const addSong = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: { title?: string; singer?: string } = {};
        if (!title.trim()) newErrors.title = "Inserisci un titolo";
        if (!singerName.trim()) newErrors.singer = "Inserisci chi deve cantarla";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setLoading(true);

        const maxPosition = Math.max(...karaokeList.map(item => item.order_position || 0), 0);

        const { error } = await supabase.from("karaoke_list").insert([
            {
                title: title.trim(),
                singer_name: singerName.trim(),
                sung: false,
                order_position: maxPosition + 1
            }
        ]);

        if (error) {
            showError("Errore inserimento: " + error.message);
        } else {
            showSuccess("Canzone aggiunta!");
            setTitle("");
            setSingerName("");
            fetchList();
        }
        setLoading(false);
    };

    const saveEdit = async (id: string) => {
        const { error } = await supabase
            .from("karaoke_list")
            .update({
                title: editTitle,
                singer_name: editSinger
            })
            .eq("id", id);

        if (error) {
            showError("Errore aggiornamento: " + error.message);
        } else {
            showSuccess("Canzone aggiornata");
            setEditingId(null);
            fetchList();
        }
    };

    const handleDeleteConfirmed = async () => {
        if (!songToDelete) return;

        const { error } = await supabase.from("karaoke_list").delete().eq("id", songToDelete);

        if (error) {
            showError("Errore eliminazione: " + error.message);
        } else {
            showSuccess("Canzone eliminata");
            fetchList();
        }

        setShowDeleteModal(false);
        setSongToDelete(null);
    };

    const toggleSung = async (id: string, currentValue: boolean) => {
        const { error } = await supabase
            .from("karaoke_list")
            .update({ sung: !currentValue })
            .eq("id", id);

        if (error) {
            showError("Errore aggiornamento: " + error.message);
        } else {
            showSuccess(!currentValue ? "Segnata come cantata" : "Segnata come NON cantata");
            fetchList();
        }
    };

    // Gestione del riordinamento con SortableJS
    const handleSortEnd = async (newList: KaraokeEntry[]) => {
        // Controlla se l'ordine è effettivamente cambiato
        const oldOrder = filteredList.map(item => item.id);
        const newOrder = newList.map(item => item.id);

        if (JSON.stringify(oldOrder) === JSON.stringify(newOrder)) {
            return; // Nessun cambiamento, esci
        }

        // Crea una nuova lista con le posizioni aggiornate
        const updatedKaraokeList = karaokeList.map(item => {
            const newIndex = newOrder.indexOf(item.id);
            if (newIndex !== -1) {
                // Questo elemento è nella lista filtrata, aggiorna la sua posizione
                return { ...item, order_position: newIndex + 1 };
            }
            // Elemento non nella lista filtrata, mantieni posizione originale
            return item;
        });

        // Aggiorna immediatamente lo stato
        setKaraokeList(updatedKaraokeList);

        // Salva nel database in background
        try {
            const updates = newList.map((item, index) =>
                supabase
                    .from("karaoke_list")
                    .update({ order_position: index + 1 })
                    .eq("id", item.id)
            );

            await Promise.all(updates);
            showSuccess("Ordine aggiornato!");
        } catch (error) {
            console.error("Errore aggiornamento:", error);
            showError("Errore nell'aggiornamento dell'ordine");
            // Ricarica la lista in caso di errore
            fetchList();
        }
    };

    const handleEdit = (entry: KaraokeEntry) => {
        setEditingId(entry.id);
        setEditTitle(entry.title);
        setEditSinger(entry.singer_name);
    };

    const handleEditChange = (field: string, value: string) => {
        switch (field) {
            case "title":
                setEditTitle(value);
                break;
            case "singer":
                setEditSinger(value);
                break;
        }
    };

    const confirmDeleteSong = (id: string) => {
        setSongToDelete(id);
        setShowDeleteModal(true);
    };

    useEffect(() => {
        fetchList(); // iniziale

        const interval = setInterval(() => {
            // Non aggiornare se si sta trascinando o modificando
            if (!isDragging && editingId === null) {
                fetchList();
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [isDragging, editingId]);

    const filteredList = karaokeList.filter(entry => showSung || !entry.sung);

    return (
        <div className="karaokeList container">
            <CustomModal
                show={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSongToDelete(null);
                }}
                title="Conferma eliminazione"
                description="Sei sicuro di voler eliminare questa canzone dalla lista?"
                onPrimaryAction={handleDeleteConfirmed}
                showSecondaryButton={true}
                timer={false}
            />

            <h2 className="title">Lista Karaoke TEST</h2>

            <form onSubmit={addSong} className="karaoke_form">
                <div className="form_group">
                    <input
                        name="title"
                        autoComplete="off"
                        type="text"
                        placeholder="Titolo*"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className={errors.title ? "input_error" : ""}
                    />
                    {errors.title && <p className="error_message">{errors.title}</p>}
                </div>
                <div className="form_group">
                    <input
                        name="singer"
                        autoComplete="off"
                        type="text"
                        placeholder="Chi deve cantarla*"
                        value={singerName}
                        onChange={e => setSingerName(e.target.value)}
                        className={errors.singer ? "input_error" : ""}
                    />
                    {errors.singer && <p className="error_message">{errors.singer}</p>}
                </div>
                <button type="submit" disabled={loading}>
                    <p className="paragraph" style={{ fontWeight: 900 }}>
                        {loading ? "Aggiungendo..." : "Aggiungi"}
                    </p>
                </button>
            </form>

            {karaokeList.some(song => song.sung) && (
                <label className="already_sung_label">
                    <input
                        type="checkbox"
                        checked={showSung}
                        onChange={() => setShowSung(prev => !prev)}
                    />
                    <p className="paragraph">
                        {showSung
                            ? "Nascondi le canzoni già cantate"
                            : "Mostra anche le canzoni già cantate"}
                    </p>
                </label>
            )}

            <div className="karaoke_entries">
                <ReactSortable
                    list={karaokeList}
                    setList={newList => {
                        setKaraokeList(newList);
                        handleSortEnd(newList);
                    }}
                    handle=".sortable-handle"
                    animation={150}
                    delay={50}
                    ghostClass="sortable-ghost"
                    chosenClass="sortable-chosen"
                    dragClass="sortable-drag"
                    disabled={editingId !== null || isDragging}
                    touchStartThreshold={10}
                    forceFallback={true}
                    onStart={() => setIsDragging(true)}
                    onEnd={() => {
                        setTimeout(() => setIsDragging(false), 100);
                    }}
                    tag="div"
                    className="sortable-container"
                >
                    {karaokeList
                        .filter(entry => showSung || !entry.sung)
                        .map(entry => (
                            <KaraokeItem
                                key={entry.id}
                                entry={entry}
                                editingId={editingId}
                                editTitle={editTitle}
                                editSinger={editSinger}
                                onEdit={handleEdit}
                                onSaveEdit={saveEdit}
                                onCancelEdit={() => setEditingId(null)}
                                onToggleSung={toggleSung}
                                onDelete={confirmDeleteSong}
                                onEditChange={handleEditChange}
                            />
                        ))}
                </ReactSortable>
            </div>
        </div>
    );
}
