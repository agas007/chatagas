import DeleteIcon from "../icons/delete.svg";

import styles from "./home.module.scss";
import {
  DragDropContext,
  Droppable,
  Draggable,
  OnDragEndResponder,
} from "@hello-pangea/dnd";

import { useChatStore, ChatSession } from "../store";

import Locale from "../locales";
import { useLocation, useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { MaskAvatar } from "./mask";
import { Mask } from "../store/mask";
import { useRef, useEffect, useMemo, useState } from "react";
import { showConfirm, showPrompt } from "./ui-lib";
import { useMobileScreen } from "../utils";
import clsx from "clsx";

export function ChatItem(props: {
  onClick?: () => void;
  onDelete?: () => void;
  title: string;
  count: number;
  time: string;
  selected: boolean;
  id: string;
  index: number;
  narrow?: boolean;
  mask: Mask;
  folderId?: string;
  folders: { id: string; name: string }[];
  onMoveFolder?: (folderId?: string) => void;
}) {
  const draggableRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (props.selected && draggableRef.current) {
      draggableRef.current?.scrollIntoView({
        block: "center",
      });
    }
  }, [props.selected]);

  const { pathname: currentPath } = useLocation();
  return (
    <Draggable draggableId={`${props.id}`} index={props.index}>
      {(provided) => (
        <div
          className={clsx(styles["chat-item"], {
            [styles["chat-item-selected"]]:
              props.selected &&
              (currentPath === Path.Chat || currentPath === Path.Home),
          })}
          onClick={props.onClick}
          ref={(ele) => {
            draggableRef.current = ele;
            provided.innerRef(ele);
          }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          title={`${props.title}\n${Locale.ChatItem.ChatItemCount(
            props.count,
          )}`}
        >
          {props.narrow ? (
            <div className={styles["chat-item-narrow"]}>
              <div className={clsx(styles["chat-item-avatar"], "no-dark")}>
                <MaskAvatar
                  avatar={props.mask.avatar}
                  model={props.mask.modelConfig.model}
                />
              </div>
              <div className={styles["chat-item-narrow-count"]}>
                {props.count}
              </div>
            </div>
          ) : (
            <>
              <div className={styles["chat-item-title"]}>{props.title}</div>
              <div className={styles["chat-item-info"]}>
                <div className={styles["chat-item-count"]}>
                  {Locale.ChatItem.ChatItemCount(props.count)}
                </div>
                <div className={styles["chat-item-date"]}>{props.time}</div>
              </div>
              {!props.narrow && (
                <div className={styles["chat-item-folder-row"]}>
                  <span className={styles["chat-item-folder-label"]}>
                    Folder
                  </span>
                  <select
                    className={styles["chat-item-folder-select"]}
                    value={props.folderId ?? ""}
                    onChange={(e) =>
                      props.onMoveFolder?.(e.currentTarget.value || undefined)
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <option value="">Unsorted</option>
                    {props.folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div
            className={styles["chat-item-delete"]}
            onClickCapture={(e) => {
              props.onDelete?.();
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <DeleteIcon />
          </div>
        </div>
      )}
    </Draggable>
  );
}

export function ChatList(props: { narrow?: boolean }) {
  const sessions = useChatStore((state) => state.sessions);
  const folders = useChatStore((state) => state.folders);
  const activeFolderId = useChatStore((state) => state.activeFolderId);
  const selectedIndex = useChatStore((state) => state.currentSessionIndex);
  const selectSession = useChatStore((state) => state.selectSession);
  const moveSession = useChatStore((state) => state.moveSession);
  const setActiveFolder = useChatStore((state) => state.setActiveFolder);
  const createFolder = useChatStore((state) => state.createFolder);
  const deleteFolder = useChatStore((state) => state.deleteFolder);
  const renameFolder = useChatStore((state) => state.renameFolder);
  const reorderFolder = useChatStore((state) => state.reorderFolder);
  const togglePinFolder = useChatStore((state) => state.togglePinFolder);
  const assignSessionFolder = useChatStore(
    (state) => state.assignSessionFolder,
  );
  const chatStore = useChatStore();
  const navigate = useNavigate();
  const isMobileScreen = useMobileScreen();
  const [collapsedFolders, setCollapsedFolders] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const visibleSessions =
    activeFolderId === "all"
      ? sessions
      : sessions.filter((item) => item.folderId === activeFolderId);
  const sortedFolders = useMemo(
    () =>
      folders.slice().sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned)),
    [folders],
  );
  const pinnedFolders = sortedFolders.filter((f) => !!f.pinned);
  const normalFolders = sortedFolders.filter((f) => !f.pinned);
  const folderCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((s) => {
      const key = s.folderId ?? "unsorted";
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [sessions]);

  const reorderWithinGroup = (
    group: typeof sortedFolders,
    sourceIndex: number,
    destinationIndex: number,
  ) => {
    const sourceFolder = group[sourceIndex];
    const targetFolder = group[destinationIndex];
    if (!sourceFolder || !targetFolder) return;
    reorderFolder(sourceFolder.id, targetFolder.id);
  };

  const onDragEnd: OnDragEndResponder = (result) => {
    const { destination, source } = result;
    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (source.droppableId === "pinned-folder-list") {
      if (destination.droppableId !== "pinned-folder-list") return;
      reorderWithinGroup(pinnedFolders, source.index, destination.index);
      return;
    }

    if (source.droppableId === "normal-folder-list") {
      if (destination.droppableId !== "normal-folder-list") return;
      reorderWithinGroup(normalFolders, source.index, destination.index);
      return;
    }

    if (destination.droppableId.startsWith("folder-drop-")) {
      const sourceSession = visibleSessions[source.index];
      if (!sourceSession) return;
      const folderId = destination.droppableId.replace("folder-drop-", "");
      assignSessionFolder(
        sourceSession.id,
        folderId === "unsorted" ? undefined : folderId,
      );
      return;
    }

    const sourceSession = visibleSessions[source.index];
    const destinationSession = visibleSessions[destination.index];
    if (!sourceSession || !destinationSession) return;

    const from = sessions.findIndex((s) => s.id === sourceSession.id);
    const to = sessions.findIndex((s) => s.id === destinationSession.id);
    if (from < 0 || to < 0) return;
    moveSession(from, to);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {!props.narrow && (
        <div className={styles["chat-folder-toolbar"]}>
          <select
            className={styles["chat-folder-filter"]}
            value={activeFolderId}
            onChange={(e) => setActiveFolder(e.currentTarget.value)}
          >
            <option value="all">All Chats</option>
            {sortedFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.pinned ? "📌 " : ""}
                {folder.name}
              </option>
            ))}
          </select>
          <button
            className={styles["chat-folder-button"]}
            onClick={async (e) => {
              e.stopPropagation();
              const name = await showPrompt("Create folder", "", 2);
              if (name.trim()) createFolder(name);
            }}
          >
            + Folder
          </button>
          {activeFolderId !== "all" && (
            <button
              className={styles["chat-folder-button"]}
              onClick={async (e) => {
                e.stopPropagation();
                if (
                  await showConfirm("Delete this folder? Chats will be kept.")
                ) {
                  deleteFolder(activeFolderId);
                }
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
      {!props.narrow && sortedFolders.length > 0 && (
        <div className={styles["chat-folder-list"]}>
          <button
            className={styles["chat-folder-toggle"]}
            onClick={() => setCollapsedFolders((v) => !v)}
          >
            {collapsedFolders ? "Expand Folders" : "Collapse Folders"}
          </button>
          {!collapsedFolders && (
            <>
              <Droppable droppableId="folder-drop-unsorted">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={styles["chat-folder-drop"]}
                  >
                    Drop chat here: Unsorted ({folderCountMap.unsorted ?? 0})
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <Droppable droppableId="pinned-folder-list">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {pinnedFolders.map((folder, idx) => (
                      <Draggable
                        key={folder.id}
                        draggableId={`folder-${folder.id}`}
                        index={idx}
                      >
                        {(dragProvided) => (
                          <div
                            className={styles["chat-folder-item"]}
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                          >
                            <div className={styles["chat-folder-head"]}>
                              <button
                                className={styles["chat-folder-drag"]}
                                {...dragProvided.dragHandleProps}
                              >
                                ::
                              </button>
                              {editingFolderId === folder.id ? (
                                <input
                                  className={styles["chat-folder-input"]}
                                  value={editingFolderName}
                                  onChange={(e) =>
                                    setEditingFolderName(e.currentTarget.value)
                                  }
                                  onBlur={() => {
                                    if (editingFolderName.trim()) {
                                      renameFolder(
                                        folder.id,
                                        editingFolderName,
                                      );
                                    }
                                    setEditingFolderId(null);
                                    setEditingFolderName("");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      if (editingFolderName.trim()) {
                                        renameFolder(
                                          folder.id,
                                          editingFolderName,
                                        );
                                      }
                                      setEditingFolderId(null);
                                      setEditingFolderName("");
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  className={styles["chat-folder-name"]}
                                  onDoubleClick={() => {
                                    setEditingFolderId(folder.id);
                                    setEditingFolderName(folder.name);
                                  }}
                                  onClick={() => setActiveFolder(folder.id)}
                                >
                                  📌 {folder.name}
                                </button>
                              )}
                              <span className={styles["chat-folder-badge"]}>
                                {folderCountMap[folder.id] ?? 0}
                              </span>
                            </div>
                            <div className={styles["chat-folder-actions"]}>
                              <button
                                className={styles["chat-folder-action-button"]}
                                onClick={() => togglePinFolder(folder.id)}
                              >
                                Unpin
                              </button>
                              <button
                                className={styles["chat-folder-action-button"]}
                                onClick={async () => {
                                  if (
                                    await showConfirm(
                                      "Delete this folder? Chats will be kept.",
                                    )
                                  ) {
                                    deleteFolder(folder.id);
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                            <Droppable droppableId={`folder-drop-${folder.id}`}>
                              {(providedDrop) => (
                                <div
                                  ref={providedDrop.innerRef}
                                  {...providedDrop.droppableProps}
                                  className={styles["chat-folder-drop"]}
                                >
                                  Drop chat here
                                  {providedDrop.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <Droppable droppableId="normal-folder-list">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {normalFolders.map((folder, idx) => (
                      <Draggable
                        key={folder.id}
                        draggableId={`folder-${folder.id}`}
                        index={idx}
                      >
                        {(dragProvided) => (
                          <div
                            className={styles["chat-folder-item"]}
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                          >
                            <div className={styles["chat-folder-head"]}>
                              <button
                                className={styles["chat-folder-drag"]}
                                {...dragProvided.dragHandleProps}
                              >
                                ::
                              </button>
                              {editingFolderId === folder.id ? (
                                <input
                                  className={styles["chat-folder-input"]}
                                  value={editingFolderName}
                                  onChange={(e) =>
                                    setEditingFolderName(e.currentTarget.value)
                                  }
                                  onBlur={() => {
                                    if (editingFolderName.trim()) {
                                      renameFolder(
                                        folder.id,
                                        editingFolderName,
                                      );
                                    }
                                    setEditingFolderId(null);
                                    setEditingFolderName("");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      if (editingFolderName.trim()) {
                                        renameFolder(
                                          folder.id,
                                          editingFolderName,
                                        );
                                      }
                                      setEditingFolderId(null);
                                      setEditingFolderName("");
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  className={styles["chat-folder-name"]}
                                  onDoubleClick={() => {
                                    setEditingFolderId(folder.id);
                                    setEditingFolderName(folder.name);
                                  }}
                                  onClick={() => setActiveFolder(folder.id)}
                                >
                                  {folder.name}
                                </button>
                              )}
                              <span className={styles["chat-folder-badge"]}>
                                {folderCountMap[folder.id] ?? 0}
                              </span>
                            </div>
                            <div className={styles["chat-folder-actions"]}>
                              <button
                                className={styles["chat-folder-action-button"]}
                                onClick={() => togglePinFolder(folder.id)}
                              >
                                Pin
                              </button>
                              <button
                                className={styles["chat-folder-action-button"]}
                                onClick={async () => {
                                  if (
                                    await showConfirm(
                                      "Delete this folder? Chats will be kept.",
                                    )
                                  ) {
                                    deleteFolder(folder.id);
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                            <Droppable droppableId={`folder-drop-${folder.id}`}>
                              {(providedDrop) => (
                                <div
                                  ref={providedDrop.innerRef}
                                  {...providedDrop.droppableProps}
                                  className={styles["chat-folder-drop"]}
                                >
                                  Drop chat here
                                  {providedDrop.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </>
          )}
        </div>
      )}
      <Droppable droppableId="chat-list">
        {(provided) => (
          <div
            className={styles["chat-list"]}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {visibleSessions.map((item: ChatSession, i: number) => {
              const originalIndex = sessions.findIndex((s) => s.id === item.id);
              return (
                <ChatItem
                  title={item.topic}
                  time={new Date(item.lastUpdate).toLocaleString()}
                  count={item.messages.length}
                  key={item.id}
                  id={item.id}
                  index={i}
                  selected={originalIndex === selectedIndex}
                  onClick={() => {
                    navigate(Path.Chat);
                    selectSession(originalIndex);
                  }}
                  onDelete={async () => {
                    if (
                      (!props.narrow && !isMobileScreen) ||
                      (await showConfirm(Locale.Home.DeleteChat))
                    ) {
                      chatStore.deleteSession(originalIndex);
                    }
                  }}
                  onMoveFolder={(folderId) =>
                    assignSessionFolder(item.id, folderId)
                  }
                  folderId={item.folderId}
                  folders={folders}
                  narrow={props.narrow}
                  mask={item.mask}
                />
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
