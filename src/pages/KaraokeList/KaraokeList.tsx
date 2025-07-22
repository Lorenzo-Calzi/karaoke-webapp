import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { showError, showSuccess } from "../../lib/toast";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./karaokeList.scss";

type KaraokeEntry = {
    id: string;
    title: string;
    artist: string;
    singer_name: string;
    added_at: string;
    sung: boolean;
    order_position?: number; // Nuovo campo per l'ordinamento
};

// Componente sortable per ogni elemento
function SortableKaraokeItem({
    entry,
    editingId,
    editTitle,
    editArtist,
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
    editArtist: string;
    editSinger: string;
    onEdit: (entry: KaraokeEntry) => void;
    onSaveEdit: (id: string) => void;
    onCancelEdit: () => void;
    onToggleSung: (id: string, currentValue: boolean) => void;
    onDelete: (id: string) => void;
    onEditChange: (field: string, value: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: entry.id
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className={`karaoke_item ${entry.sung ? "sung" : ""}`}>
            {editingId === entry.id ? (
                <div className="edit_form">
                    <input
                        value={editTitle}
                        placeholder="Titolo*"
                        onChange={e => onEditChange("title", e.target.value)}
                    />
                    <input
                        value={editArtist}
                        placeholder="Cantante"
                        onChange={e => onEditChange("artist", e.target.value)}
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
                            {/* <i className="fa-solid fa-microphone-lines"></i> */}
                            <p className="paragraph">
                                {entry.title} {entry.artist && `(${entry.artist})`}
                            </p>
                        </div>
                        <div className="user">
                            {/* <i className="fa-regular fa-circle-user"></i> */}
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

                    <div className="drag-handle" {...attributes} {...listeners}>
                        <i className="fa-solid fa-grip-vertical"></i>
                    </div>
                </>
            )}
        </div>
    );
}

export default function KaraokeList() {
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [singerName, setSingerName] = useState("");
    const [karaokeList, setKaraokeList] = useState<KaraokeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSung, setShowSung] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editArtist, setEditArtist] = useState("");
    const [editSinger, setEditSinger] = useState("");

    // Configurazione sensori per drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    );

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

        if (!title || !singerName) {
            showError("Inserisci almeno titolo e persona che deve cantarla");
            return;
        }

        setLoading(true);

        // Trova la posizione più alta attuale
        const maxPosition = Math.max(...karaokeList.map(item => item.order_position || 0), 0);

        const { error } = await supabase.from("karaoke_list").insert([
            {
                title,
                artist,
                singer_name: singerName,
                sung: false,
                order_position: maxPosition + 1
            }
        ]);

        if (error) {
            showError("Errore inserimento: " + error.message);
        } else {
            showSuccess("Canzone aggiunta!");
            setTitle("");
            setArtist("");
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
                artist: editArtist,
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

    const deleteSong = async (id: string) => {
        const confirm = window.confirm("Sei sicuro di voler eliminare questa canzone?");
        if (!confirm) return;

        const { error } = await supabase.from("karaoke_list").delete().eq("id", id);

        if (error) {
            showError("Errore eliminazione: " + error.message);
        } else {
            showSuccess("Canzone eliminata");
            fetchList();
        }
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

    // Gestione del drag end
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        if (active.id !== over.id) {
            const filteredList = karaokeList.filter(entry => showSung || !entry.sung);
            const oldIndex = filteredList.findIndex(item => item.id === active.id);
            const newIndex = filteredList.findIndex(item => item.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(filteredList, oldIndex, newIndex);

                // Aggiorna lo stato locale immediatamente per UX fluida
                const newKaraokeList = [...karaokeList];
                const movedItem = newKaraokeList.find(item => item.id === active.id);
                if (movedItem) {
                    // Rimuovi l'elemento dalla posizione originale
                    const originalIndex = newKaraokeList.findIndex(item => item.id === active.id);
                    newKaraokeList.splice(originalIndex, 1);

                    // Trova dove inserirlo nella lista completa
                    const targetItem = newKaraokeList.find(item => item.id === over.id);
                    const targetIndex = targetItem
                        ? newKaraokeList.findIndex(item => item.id === over.id)
                        : newKaraokeList.length;

                    newKaraokeList.splice(
                        newIndex > oldIndex ? targetIndex + 1 : targetIndex,
                        0,
                        movedItem
                    );
                }

                setKaraokeList(newKaraokeList);

                // Aggiorna le posizioni nel database
                try {
                    const updates = newOrder.map((item, index) => ({
                        id: item.id,
                        order_position: index + 1
                    }));

                    for (const update of updates) {
                        await supabase
                            .from("karaoke_list")
                            .update({ order_position: update.order_position })
                            .eq("id", update.id);
                    }

                    showSuccess("Ordine aggiornato!");
                } catch (error) {
                    showError("Errore nell'aggiornamento dell'ordine");
                    // Ricarica la lista in caso di errore
                    fetchList();
                }
            }
        }
    };

    const handleEdit = (entry: KaraokeEntry) => {
        setEditingId(entry.id);
        setEditTitle(entry.title);
        setEditArtist(entry.artist);
        setEditSinger(entry.singer_name);
    };

    const handleEditChange = (field: string, value: string) => {
        switch (field) {
            case "title":
                setEditTitle(value);
                break;
            case "artist":
                setEditArtist(value);
                break;
            case "singer":
                setEditSinger(value);
                break;
        }
    };

    useEffect(() => {
        fetchList();
    }, []);

    const filteredList = karaokeList.filter(entry => showSung || !entry.sung);

    return (
        <div className="karaokeList container">
            <h2 className="title">Lista Karaoke</h2>

            <form onSubmit={addSong} className="karaoke_form">
                <input
                    name="title"
                    autoComplete="off"
                    type="text"
                    placeholder="Titolo*"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                />
                <input
                    name="artist"
                    autoComplete="off"
                    type="text"
                    placeholder="Cantante"
                    value={artist}
                    onChange={e => setArtist(e.target.value)}
                />
                <input
                    name="singer"
                    autoComplete="off"
                    type="text"
                    placeholder="Chi deve cantarla*"
                    value={singerName}
                    onChange={e => setSingerName(e.target.value)}
                    required
                />
                <button type="submit" disabled={loading}>
                    <p className="paragraph" style={{ fontWeight: 900 }}>
                        {loading ? "Aggiungendo..." : "Aggiungi"}
                    </p>
                </button>
            </form>

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

            <div className="karaoke_entries">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={filteredList.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {filteredList.map(entry => (
                            <SortableKaraokeItem
                                key={entry.id}
                                entry={entry}
                                editingId={editingId}
                                editTitle={editTitle}
                                editArtist={editArtist}
                                editSinger={editSinger}
                                onEdit={handleEdit}
                                onSaveEdit={saveEdit}
                                onCancelEdit={() => setEditingId(null)}
                                onToggleSung={toggleSung}
                                onDelete={deleteSong}
                                onEditChange={handleEditChange}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}
