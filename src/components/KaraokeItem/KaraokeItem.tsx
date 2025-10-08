import type { Ref } from "react";
import { Draggable } from "@hello-pangea/dnd";
import "./karaokeItem.scss";

type KaraokeEntry = {
    id: string;
    title: string;
    singer_name: string;
    added_at: string;
    sung: boolean;
    order_position?: number;
    track_id?: string | null;
};

type UiSong = { trackId: string; title: string; artist: string; cover: string };

type Props = {
    entry: KaraokeEntry;
    index: number;

    // stato edit globale
    editingId: string | null;
    editTitle: string;
    editSinger: string;

    // azioni
    onEdit: (entry: KaraokeEntry) => void;
    onSaveEdit: (id: string) => void;
    onCancelEdit: () => void;
    onToggleSung: (id: string, currentValue: boolean) => void;
    onDelete: (id: string) => void;
    onEditChange: (field: "title" | "singer", value: string) => void;

    // ricerca Spotify in EDIT (solo per la riga in editing)
    editTitleRef?: Ref<HTMLInputElement>;
    editSingerRef?: Ref<HTMLInputElement>;
    editShowResults?: boolean;
    editResults?: UiSong[];
    editSearching?: boolean;
    onPickEditResult?: (song: UiSong) => void;
};

export default function KaraokeItem({
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
    onEditChange,
    editTitleRef,
    editSingerRef,
    editShowResults,
    editResults,
    editSearching,
    onPickEditResult
}: Props) {
    const isEditing = editingId === entry.id;

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
                    {isEditing ? (
                        <div className="edit_form">
                            {/* Campo TITOLO con ricerca Spotify in EDIT */}
                            <div className="form_group" style={{ position: "relative" }}>
                                <input
                                    ref={editTitleRef}
                                    value={editTitle}
                                    placeholder="Titolo*"
                                    onChange={e => onEditChange("title", e.target.value)}
                                    autoFocus
                                    onFocus={e => e.currentTarget.select()}
                                />

                                {/* Menu risultati (solo per l'item in edit) */}
                                {editShowResults && (
                                    <div
                                        style={{
                                            background: "rgba(0,0,0,0.3)",
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            borderRadius: 5,
                                            marginTop: "0.75rem",
                                            maxHeight: 320,
                                            overflowY: "auto",
                                            padding: "0 0.7rem"
                                        }}
                                    >
                                        {editSearching && (
                                            <div style={{ padding: 12, fontSize: 14 }}>
                                                Cerco su Spotify…
                                            </div>
                                        )}
                                        {!editSearching &&
                                            (editResults ?? []).map(item => (
                                                <button
                                                    type="button"
                                                    key={item.trackId}
                                                    onClick={() =>
                                                        onPickEditResult && onPickEditResult(item)
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        margin: "0.7rem 0",
                                                        padding: 0,
                                                        display: "flex",
                                                        gap: 10,
                                                        alignItems: "center",
                                                        textAlign: "left",
                                                        background: "transparent",
                                                        color: "inherit",
                                                        border: "none",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    {item.cover && (
                                                        <img
                                                            src={item.cover}
                                                            alt=""
                                                            width={40}
                                                            height={40}
                                                            style={{
                                                                borderRadius: 4,
                                                                objectFit: "cover",
                                                                flex: "0 0 auto"
                                                            }}
                                                        />
                                                    )}
                                                    {/* Testi monoriga con ellissi */}
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            minWidth: 0
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                lineHeight: 1.2,
                                                                fontWeight: 600,
                                                                whiteSpace: "nowrap",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                maxWidth: "100%"
                                                            }}
                                                            title={item.title}
                                                        >
                                                            {item.title}
                                                        </span>
                                                        <span
                                                            style={{
                                                                opacity: 0.85,
                                                                fontSize: 13,
                                                                whiteSpace: "nowrap",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                maxWidth: "100%"
                                                            }}
                                                            title={item.artist}
                                                        >
                                                            {item.artist}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>

                            {/* Campo SINGER (manuale) */}
                            <input
                                ref={editSingerRef}
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
                                        style={{ backgroundColor: "rgba(249, 249, 249, 0.4)" }}
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

                            {/* maniglia drag */}
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
