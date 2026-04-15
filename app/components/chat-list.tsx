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

/** Collapsible project/folder section in the sidebar, Claude-style */
function ProjectSection(props: {
  folder: { id: string; name: string; pinned?: boolean };
  sessions: ChatSession[];
  selectedIndex: number;
  allSessions: ChatSession[];
  folderIndex: number;
  onSelectSession: (originalIndex: number) => void;
  onDeleteSession: (originalIndex: number) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(props.folder.name);
  const [showActions, setShowActions] = useState(false);
  const navigate = useNavigate();
  const { pathname: currentPath } = useLocation();

  return (
    <Droppable droppableId={`folder-${props.folder.id}`}>
      {(provided, snapshot) => {
        // Auto-expand when dragging over
        if (snapshot.isDraggingOver && collapsed) {
          setCollapsed(false);
        }

        return (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={clsx(
              styles["project-section"],
              styles["project-droppable"],
              {
                [styles["project-droppable-active"]]: snapshot.isDraggingOver,
              },
            )}
          >
            {/* Header row */}
            <div
              className={styles["project-header"]}
              onMouseEnter={() => setShowActions(true)}
              onMouseLeave={() => setShowActions(false)}
            >
              <button
                className={styles["project-collapse-btn"]}
                onClick={() => setCollapsed((v) => !v)}
                title={collapsed ? "Expand" : "Collapse"}
              >
                <span
                  className={clsx(styles["project-chevron"], {
                    [styles["project-chevron-collapsed"]]: collapsed,
                  })}
                >
                  ▾
                </span>
              </button>

              {editing ? (
                <input
                  className={styles["project-name-input"]}
                  value={editName}
                  autoFocus
                  onChange={(e) => setEditName(e.currentTarget.value)}
                  onBlur={() => {
                    if (editName.trim())
                      props.onRename(props.folder.id, editName);
                    setEditing(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (editName.trim())
                        props.onRename(props.folder.id, editName);
                      setEditing(false);
                    }
                    if (e.key === "Escape") setEditing(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={styles["project-name"]}
                  onDoubleClick={() => {
                    setEditName(props.folder.name);
                    setEditing(true);
                  }}
                >
                  {props.folder.pinned ? "📌 " : ""}
                  {props.folder.name}
                </span>
              )}

              <span className={styles["project-count"]}>
                {props.sessions.length}
              </span>

              {showActions && !editing && (
                <div className={styles["project-actions"]}>
                  <button
                    className={styles["project-action-btn"]}
                    title={props.folder.pinned ? "Unpin" : "Pin"}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onTogglePin(props.folder.id);
                    }}
                  >
                    {props.folder.pinned ? "📌" : "☆"}
                  </button>
                  <button
                    className={styles["project-action-btn"]}
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditName(props.folder.name);
                      setEditing(true);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className={clsx(
                      styles["project-action-btn"],
                      styles["project-action-delete"],
                    )}
                    title="Delete folder"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (
                        await showConfirm(
                          "Delete this project? Chats will be kept.",
                        )
                      )
                        props.onDelete(props.folder.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Chat items inside folder */}
            {!collapsed && (
              <div className={styles["project-chat-list"]}>
                {props.sessions.length === 0 && !snapshot.isDraggingOver && (
                  <div className={styles["project-empty"]}>No chats yet</div>
                )}
                {props.sessions.map((item, i) => {
                  const originalIndex = props.allSessions.findIndex(
                    (s) => s.id === item.id,
                  );
                  const isSelected =
                    originalIndex === props.selectedIndex &&
                    (currentPath === Path.Chat || currentPath === Path.Home);
                  return (
                    <Draggable key={item.id} draggableId={item.id} index={i}>
                      {(provided) => (
                        <div
                          className={clsx(styles["project-chat-item"], {
                            [styles["project-chat-item-selected"]]: isSelected,
                          })}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => {
                            navigate(Path.Chat);
                            props.onSelectSession(originalIndex);
                          }}
                          title={item.topic}
                        >
                          <span className={styles["project-chat-title"]}>
                            {item.topic}
                          </span>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
              </div>
            )}
          </div>
        );
      }}
    </Droppable>
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

  const sortedFolders = useMemo(
    () =>
      folders.slice().sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned)),
    [folders],
  );

  // Sessions not in any folder
  const ungroupedSessions = useMemo(
    () => sessions.filter((s) => !s.folderId),
    [sessions],
  );

  // Sessions per folder
  const sessionsByFolder = useMemo(() => {
    const map: Record<string, ChatSession[]> = {};
    sessions.forEach((s) => {
      if (s.folderId) {
        if (!map[s.folderId]) map[s.folderId] = [];
        map[s.folderId].push(s);
      }
    });
    return map;
  }, [sessions]);

  const onDragEnd: OnDragEndResponder = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const sourceDroppable = source.droppableId;
    const destDroppable = destination.droppableId;

    if (
      sourceDroppable === destDroppable &&
      source.index === destination.index
    ) {
      return;
    }

    const sessionId = draggableId;
    const fromMasterIndex = sessions.findIndex((s) => s.id === sessionId);

    // 1. Update folder assignment if moving between different droppables
    if (sourceDroppable !== destDroppable) {
      if (destDroppable.startsWith("folder-")) {
        const folderId = destDroppable.replace("folder-", "");
        assignSessionFolder(sessionId, folderId);
      } else if (destDroppable === "chat-list") {
        assignSessionFolder(sessionId, undefined);
      }
    }

    // 2. Handle Reordering
    // Get target list (either ungrouped or a folder's sessions)
    let targetList: ChatSession[] = [];
    if (destDroppable === "chat-list") {
      targetList = ungroupedSessions;
    } else if (destDroppable.startsWith("folder-")) {
      const folderId = destDroppable.replace("folder-", "");
      targetList = sessionsByFolder[folderId] ?? [];
    }

    // Find master index of destination
    const targetItem = targetList[destination.index];
    let toMasterIndex = -1;
    if (targetItem) {
      toMasterIndex = sessions.findIndex((s) => s.id === targetItem.id);
    } else {
      // dropped at end of list
      toMasterIndex = sessions.length - 1;
    }

    if (fromMasterIndex !== -1 && toMasterIndex !== -1) {
      moveSession(fromMasterIndex, toMasterIndex);
    }
  };

  if (props.narrow) {
    // Narrow sidebar: just show all chats as icons
    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="chat-list">
          {(provided) => (
            <div
              className={styles["chat-list"]}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {sessions.map((item: ChatSession, i: number) => (
                <ChatItem
                  title={item.topic}
                  time={new Date(item.lastUpdate).toLocaleString()}
                  count={item.messages.length}
                  key={item.id}
                  id={item.id}
                  index={i}
                  selected={i === selectedIndex}
                  onClick={() => {
                    navigate(Path.Chat);
                    selectSession(i);
                  }}
                  onDelete={async () => {
                    if (await showConfirm(Locale.Home.DeleteChat)) {
                      chatStore.deleteSession(i);
                    }
                  }}
                  onMoveFolder={(folderId) =>
                    assignSessionFolder(item.id, folderId)
                  }
                  folderId={item.folderId}
                  folders={folders}
                  narrow={true}
                  mask={item.mask}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={styles["sidebar-projects-container"]}>
        {/* Projects section header */}
        {sortedFolders.length > 0 && (
          <div className={styles["sidebar-section-label"]}>Projects</div>
        )}

        {/* Render each folder as a project section */}
        {sortedFolders.map((folder, idx) => (
          <ProjectSection
            key={folder.id}
            folder={folder}
            sessions={sessionsByFolder[folder.id] ?? []}
            allSessions={sessions}
            selectedIndex={selectedIndex}
            folderIndex={idx}
            onSelectSession={(i) => selectSession(i)}
            onDeleteSession={(i) => chatStore.deleteSession(i)}
            onRename={(id, name) => renameFolder(id, name)}
            onDelete={(id) => deleteFolder(id)}
            onTogglePin={(id) => togglePinFolder(id)}
          />
        ))}

        {/* New project button */}
        <button
          className={styles["new-project-btn"]}
          onClick={async () => {
            const name = await showPrompt("Project name", "", 2);
            if (name.trim()) createFolder(name);
          }}
        >
          <span className={styles["new-project-icon"]}>＋</span> New project
        </button>

        {/* Ungrouped chats */}
        {ungroupedSessions.length > 0 && (
          <div
            className={styles["sidebar-section-label"]}
            style={{ marginTop: 20 }}
          >
            Chats
          </div>
        )}

        <Droppable droppableId="chat-list">
          {(provided) => (
            <div
              className={styles["chat-list"]}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {ungroupedSessions.map((item: ChatSession, i: number) => {
                const originalIndex = sessions.findIndex(
                  (s) => s.id === item.id,
                );
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
                        !isMobileScreen ||
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
                    narrow={false}
                    mask={item.mask}
                  />
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}
