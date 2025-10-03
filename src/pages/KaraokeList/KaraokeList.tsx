import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { showError, showSuccess } from "../../lib/toast";
import CustomModal from "../../components/CustomModal/CustomModal";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
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
    index,
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
    index: number;
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
        <Draggable draggableId={entry.id} index={index}>
            {(provided, snapshot) => (
                <div
                    className={`karaoke_item ${entry.sung ? "sung" : ""} ${
                        snapshot.isDragging ? "dragging" : ""
                    }`}
                    data-id={entry.id}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                >
                    {editingId === entry.id ? (
                        <div className="edit_form">
                            <input
                                value={editTitle}
                                placeholder="Titolo*"
                                onChange={e => onEditChange("title", e.target.value)}
                                autoFocus
                                onFocus={e => e.currentTarget.select()}
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

                            <div
                                className="drag-handle sortable-handle"
                                {...provided.dragHandleProps}
                            >
                                <i className="fa-solid fa-grip-vertical"></i>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Draggable>
    );
}

export default function KaraokeList() {
    const [title, setTitle] = useState("");
    const [singerName, setSingerName] = useState("");
    const titleRef = useRef<HTMLInputElement>(null);
    const singerRef = useRef<HTMLInputElement>(null);
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
    const [isSavingOrder, setIsSavingOrder] = useState(false);

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

            // 🔁 Focus automatico sul primo campo non valido
            if (newErrors.title) {
                titleRef.current?.focus();
            } else if (newErrors.singer) {
                singerRef.current?.focus();
            }

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
            // 👇 Dopo l'invio, rimetti il focus sul primo input
            // 🔽 Chiudi la tastiera
            titleRef.current?.blur();
            singerRef.current?.blur();
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

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        setIsSavingOrder(true);

        // split current state
        const visible = karaokeList.filter(e => showSung || !e.sung);
        const hidden = karaokeList.filter(e => !(showSung || !e.sung));

        // reorder only the visible slice
        const [moved] = visible.splice(result.source.index, 1);
        visible.splice(result.destination.index, 0, moved);

        // stitch back and reindex globally
        const combined = [...visible, ...hidden];
        const reordered = combined.map((item, idx) => ({ ...item, order_position: idx + 1 }));
        setKaraokeList(reordered); // optimistic

        // persist only the rows whose position changed
        const changed = reordered.filter(item => {
            const prev = karaokeList.find(k => k.id === item.id);
            return prev && prev.order_position !== item.order_position;
        });

        if (changed.length) {
            await Promise.all(
                changed.map(item =>
                    supabase
                        .from("karaoke_list")
                        .update({ order_position: item.order_position })
                        .eq("id", item.id)
                )
            );
        }

        showSuccess("Ordine aggiornato!");
        setIsSavingOrder(false);
        setTimeout(fetchList, 400); // small delay to avoid racing with DB propagation
    };

    const confirmDeleteSong = (id: string) => {
        setSongToDelete(id);
        setShowDeleteModal(true);
    };

    useEffect(() => {
        fetchList();
        const interval = setInterval(() => {
            if (!isDragging && !isSavingOrder && editingId === null) {
                fetchList();
            }
        }, 5000); // 🔁 polling più lento per ridurre interferenze
        return () => clearInterval(interval);
    }, [isDragging, isSavingOrder, editingId]);

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

            <h2 className="title">Lista Karaoke</h2>

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
                        ref={titleRef}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                singerRef.current?.focus();
                            }
                        }}
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
                        ref={singerRef}
                    />
                    {errors.singer && <p className="error_message">{errors.singer}</p>}
                </div>
                <button type="submit" disabled={loading}>
                    <p className="paragraph" style={{ fontWeight: 600 }}>
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
                <DragDropContext
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={result => {
                        setIsDragging(false);
                        handleDragEnd(result);
                    }}
                >
                    <Droppable droppableId="karaoke-list">
                        {provided => (
                            <div
                                className="karaoke_entries"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {karaokeList
                                    .filter(entry => showSung || !entry.sung)
                                    .map((entry, index) => (
                                        <KaraokeItem
                                            key={entry.id}
                                            entry={entry}
                                            index={index}
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
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
        </div>
    );
}
