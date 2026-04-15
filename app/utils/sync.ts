import {
  ChatSession,
  useAccessStore,
  useAppConfig,
  useChatStore,
} from "../store";
import { useMaskStore } from "../store/mask";
import { usePromptStore } from "../store/prompt";
import { StoreKey } from "../constant";
import { merge } from "./merge";

type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];
type NonFunctionFields<T> = Pick<T, NonFunctionKeys<T>>;

export function getNonFunctionFileds<T extends object>(obj: T) {
  const ret: any = {};

  Object.entries(obj).map(([k, v]) => {
    if (typeof v !== "function") {
      ret[k] = v;
    }
  });

  return ret as NonFunctionFields<T>;
}

export type GetStoreState<T> = T extends { getState: () => infer U }
  ? NonFunctionFields<U>
  : never;

const LocalStateSetters = {
  [StoreKey.Chat]: useChatStore.setState,
  [StoreKey.Access]: useAccessStore.setState,
  [StoreKey.Config]: useAppConfig.setState,
  [StoreKey.Mask]: useMaskStore.setState,
  [StoreKey.Prompt]: usePromptStore.setState,
} as const;

const LocalStateGetters = {
  [StoreKey.Chat]: () => getNonFunctionFileds(useChatStore.getState()),
  [StoreKey.Access]: () => getNonFunctionFileds(useAccessStore.getState()),
  [StoreKey.Config]: () => getNonFunctionFileds(useAppConfig.getState()),
  [StoreKey.Mask]: () => getNonFunctionFileds(useMaskStore.getState()),
  [StoreKey.Prompt]: () => getNonFunctionFileds(usePromptStore.getState()),
} as const;

export type AppState = {
  [k in keyof typeof LocalStateGetters]: ReturnType<
    (typeof LocalStateGetters)[k]
  >;
};

type Merger<T extends keyof AppState, U = AppState[T]> = (
  localState: U,
  remoteState: U,
) => U;

type StateMerger = {
  [K in keyof AppState]: Merger<K>;
};

// we merge remote state to local state
const MergeStates: StateMerger = {
  [StoreKey.Chat]: (localState, remoteState) => {
    // merge deleted markers
    const allDeletedSessionIds = new Set([
      ...(localState.deletedSessionIds || []),
      ...(remoteState.deletedSessionIds || []),
    ]);
    const allDeletedFolderIds = new Set([
      ...(localState.deletedFolderIds || []),
      ...(remoteState.deletedFolderIds || []),
    ]);

    localState.deletedSessionIds = Array.from(allDeletedSessionIds);
    localState.deletedFolderIds = Array.from(allDeletedFolderIds);

    // merge folders first
    if (remoteState.folders && remoteState.folders.length > 0) {
      const localFolderIds = new Set(
        (localState.folders || []).map((f) => f.id),
      );
      remoteState.folders.forEach((remoteFolder) => {
        // Skip if this folder was deleted anywhere
        if (allDeletedFolderIds.has(remoteFolder.id)) return;

        if (!localFolderIds.has(remoteFolder.id)) {
          localState.folders = localState.folders || [];
          localState.folders.push(remoteFolder);
        } else {
          // Update the folder name/pin if remote is newer
          const localFolder = localState.folders.find(
            (f) => f.id === remoteFolder.id,
          );
          if (localFolder && remoteFolder.createdAt > localFolder.createdAt) {
            localFolder.name = remoteFolder.name;
            localFolder.pinned = remoteFolder.pinned;
          }
        }
      });
    }

    // cleanup local folders that might have been deleted remotely
    localState.folders = (localState.folders || []).filter(
      (f) => !allDeletedFolderIds.has(f.id),
    );

    // merge sessions
    const localSessions: Record<string, ChatSession> = {};
    localState.sessions.forEach((s) => (localSessions[s.id] = s));

    remoteState.sessions.forEach((remoteSession) => {
      // skip empty chats or deleted chats
      if (remoteSession.messages.length === 0) return;
      if (allDeletedSessionIds.has(remoteSession.id)) return;

      const localSession = localSessions[remoteSession.id];
      if (!localSession) {
        // if remote session is new, just merge it
        localState.sessions.push(remoteSession);
      } else {
        // if both have the same session id, merge the messages
        const localMessageIds = new Set(localSession.messages.map((v) => v.id));
        remoteSession.messages.forEach((m) => {
          if (!localMessageIds.has(m.id)) {
            localSession.messages.push(m);
          }
        });

        // sort local messages with date field in asc order
        localSession.messages.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        // sync folderId from whichever is newer
        if (remoteSession.lastUpdate > localSession.lastUpdate) {
          localSession.folderId = remoteSession.folderId;
        }
      }
    });

    // cleanup local sessions that might have been deleted remotely
    localState.sessions = localState.sessions.filter(
      (s) => !allDeletedSessionIds.has(s.id),
    );

    // sort local sessions with date field in desc order
    localState.sessions.sort(
      (a, b) =>
        new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime(),
    );

    return localState;
  },
  [StoreKey.Prompt]: (localState, remoteState) => {
    localState.prompts = {
      ...remoteState.prompts,
      ...localState.prompts,
    };
    return localState;
  },
  [StoreKey.Mask]: (localState, remoteState) => {
    localState.masks = {
      ...remoteState.masks,
      ...localState.masks,
    };
    return localState;
  },
  [StoreKey.Config]: mergeWithUpdate<AppState[StoreKey.Config]>,
  [StoreKey.Access]: mergeWithUpdate<AppState[StoreKey.Access]>,
};

export function getLocalAppState() {
  const appState = Object.fromEntries(
    Object.entries(LocalStateGetters).map(([key, getter]) => {
      return [key, getter()];
    }),
  ) as AppState;

  return appState;
}

export function setLocalAppState(appState: AppState) {
  Object.entries(LocalStateSetters).forEach(([key, setter]) => {
    (setter as any)(appState[key as keyof AppState]);
  });
}

export function mergeAppState(localState: AppState, remoteState: AppState) {
  Object.keys(localState).forEach(<T extends keyof AppState>(k: string) => {
    const key = k as T;
    const localStoreState = localState[key];
    const remoteStoreState = remoteState[key];
    MergeStates[key](localStoreState, remoteStoreState);
  });

  return localState;
}

/**
 * Merge state with `lastUpdateTime`, older state will be override
 */
export function mergeWithUpdate<
  T extends { lastUpdateTime?: number; announcementVersion?: string },
>(localState: T, remoteState: T) {
  const localUpdateTime = localState.lastUpdateTime ?? 0;
  const remoteUpdateTime = remoteState.lastUpdateTime ?? 0;

  // Preserve the higher announcementVersion to avoid re-showing popups
  const localVer = localState.announcementVersion || "";
  const remoteVer = remoteState.announcementVersion || "";
  const finalVer = localVer > remoteVer ? localVer : remoteVer;

  if (localUpdateTime < remoteUpdateTime) {
    merge(remoteState, localState);
    if (finalVer) remoteState.announcementVersion = finalVer;
    return { ...remoteState };
  } else {
    merge(localState, remoteState);
    if (finalVer) localState.announcementVersion = finalVer;
    return { ...localState };
  }
}
