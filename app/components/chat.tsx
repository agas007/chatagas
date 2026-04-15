import { useDebouncedCallback } from "use-debounce";
import React, {
  Fragment,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import BrainIcon from "../icons/brain.svg";
import RenameIcon from "../icons/rename.svg";
import ReplyIcon from "../icons/chat.svg";
import EditIcon from "../icons/rename.svg";
import ExportIcon from "../icons/share.svg";
import ReturnIcon from "../icons/return.svg";
import CopyIcon from "../icons/copy.svg";
import SpeakIcon from "../icons/speak.svg";
import SpeakStopIcon from "../icons/speak-stop.svg";
import LoadingIcon from "../icons/three-dots.svg";
import LoadingButtonIcon from "../icons/loading.svg";
import PromptIcon from "../icons/prompt.svg";
import MaskIcon from "../icons/mask.svg";
import ResetIcon from "../icons/reload.svg";
import ReloadIcon from "../icons/reload.svg";
import BreakIcon from "../icons/break.svg";
import SettingsIcon from "../icons/chat-settings.svg";
import DeleteIcon from "../icons/clear.svg";
import PinIcon from "../icons/pin.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CloseIcon from "../icons/close.svg";
import CancelIcon from "../icons/cancel.svg";
import ImageIcon from "../icons/image.svg";
import MenuIcon from "../icons/menu.svg";

import LightIcon from "../icons/light.svg";
import DarkIcon from "../icons/dark.svg";
import AddIcon from "../icons/add.svg";
import AutoIcon from "../icons/auto.svg";
import BottomIcon from "../icons/bottom.svg";
import StopIcon from "../icons/pause.svg";
import SizeIcon from "../icons/size.svg";
import QualityIcon from "../icons/hd.svg";
import StyleIcon from "../icons/palette.svg";
import PluginIcon from "../icons/plugin.svg";
import ShortcutkeyIcon from "../icons/shortcutkey.svg";
import McpToolIcon from "../icons/tool.svg";
import HeadphoneIcon from "../icons/headphone.svg";
import BookIcon from "../icons/prompt.svg";
import {
  BOT_HELLO,
  ChatMessage,
  createMessage,
  DEFAULT_TOPIC,
  ModelType,
  SubmitKey,
  Theme,
  useAccessStore,
  useAppConfig,
  useChatStore,
  usePluginStore,
} from "../store";

import {
  autoGrowTextArea,
  copyToClipboard,
  getMessageImages,
  getMessageTextContent,
  isDalle3,
  isVisionModel,
  safeLocalStorage,
  getModelSizes,
  supportsCustomSize,
  useMobileScreen,
  selectOrCopy,
  showPlugins,
} from "../utils";

import { uploadImage as uploadImageRemote } from "@/app/utils/chat";

import dynamic from "next/dynamic";

import { ChatControllerPool } from "../client/controller";
import { DalleQuality, DalleStyle, ModelSize } from "../typing";
import { Prompt, usePromptStore } from "../store/prompt";
import Locale from "../locales";

import { IconButton } from "./button";
import * as XLSX from "xlsx";
import Draggable from "react-draggable";

import styles from "./chat.module.scss";

import {
  List,
  ListItem,
  Modal,
  Selector,
  showConfirm,
  showPrompt,
  showToast,
} from "./ui-lib";
import { useNavigate } from "react-router-dom";
import {
  CHAT_PAGE_SIZE,
  DEFAULT_TTS_ENGINE,
  ModelProvider,
  Path,
  REQUEST_TIMEOUT_MS,
  ServiceProvider,
  UNFINISHED_INPUT,
} from "../constant";
import { Avatar } from "./emoji";
import { ContextPrompts, MaskAvatar, MaskConfig } from "./mask";
import { useMaskStore } from "../store/mask";
import { ChatCommandPrefix, useChatCommand, useCommand } from "../command";
import { prettyObject } from "../utils/format";
import { ExportMessageModal } from "./exporter";
import { getClientConfig } from "../config/client";
import { useAllModels } from "../utils/hooks";
import { ClientApi, MultimodalContent } from "../client/api";
import { createTTSPlayer } from "../utils/audio";
import { MsEdgeTTS, OUTPUT_FORMAT } from "../utils/ms_edge_tts";

import { isEmpty } from "lodash-es";
import { getModelProvider } from "../utils/model";
import clsx from "clsx";
import { getAvailableClientsCount, isMcpEnabled } from "../mcp/actions";
import { useSession } from "next-auth/react";
import {
  AGENT_SYSTEM_PROMPT,
  AGENT_MAX_STEPS,
  executeTool,
  parseToolCall,
  stripToolCalls,
} from "../utils/agent";

const localStorage = safeLocalStorage();

const ttsPlayer = createTTSPlayer();

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

const MCPAction = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState<number>(0);
  const [mcpEnabled, setMcpEnabled] = useState(false);

  useEffect(() => {
    const checkMcpStatus = async () => {
      const enabled = await isMcpEnabled();
      setMcpEnabled(enabled);
      if (enabled) {
        const count = await getAvailableClientsCount();
        setCount(count);
      }
    };
    checkMcpStatus();
  }, []);

  if (!mcpEnabled) return null;

  return (
    <ChatAction
      onClick={() => navigate(Path.McpMarket)}
      text={`MCP${count ? ` (${count})` : ""}`}
      icon={<McpToolIcon />}
    />
  );
};

export function SessionConfigModel(props: { onClose: () => void }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const maskStore = useMaskStore();
  const navigate = useNavigate();

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Context.Edit}
        onClose={() => props.onClose()}
        actions={[
          <IconButton
            key="reset"
            icon={<ResetIcon />}
            bordered
            text={Locale.Chat.Config.Reset}
            onClick={async () => {
              if (await showConfirm(Locale.Memory.ResetConfirm)) {
                chatStore.updateTargetSession(
                  session,
                  (session) => (session.memoryPrompt = ""),
                );
              }
            }}
          />,
          <IconButton
            key="copy"
            icon={<CopyIcon />}
            bordered
            text={Locale.Chat.Config.SaveAs}
            onClick={() => {
              navigate(Path.Masks);
              setTimeout(() => {
                maskStore.create(session.mask);
              }, 500);
            }}
          />,
        ]}
      >
        <MaskConfig
          mask={session.mask}
          updateMask={(updater) => {
            const mask = { ...session.mask };
            updater(mask);
            chatStore.updateTargetSession(
              session,
              (session) => (session.mask = mask),
            );
          }}
          shouldSyncFromGlobal
          extraListItems={
            session.mask.modelConfig.sendMemory ? (
              <ListItem
                className="copyable"
                title={`${Locale.Memory.Title} (${session.lastSummarizeIndex} of ${session.messages.length})`}
                subTitle={session.memoryPrompt || Locale.Memory.EmptyContent}
              ></ListItem>
            ) : (
              <></>
            )
          }
        ></MaskConfig>
      </Modal>
    </div>
  );
}

function PromptToast(props: {
  showToast?: boolean;
  showModal?: boolean;
  setShowModal: (_: boolean) => void;
}) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const context = session.mask.context;

  return (
    <div className={styles["prompt-toast"]} key="prompt-toast">
      {props.showToast && context.length > 0 && (
        <div
          className={clsx(styles["prompt-toast-inner"], "clickable")}
          role="button"
          onClick={() => props.setShowModal(true)}
        >
          <BrainIcon />
          <span className={styles["prompt-toast-content"]}>
            {Locale.Context.Toast(context.length)}
          </span>
        </div>
      )}
      {props.showModal && (
        <SessionConfigModel onClose={() => props.setShowModal(false)} />
      )}
    </div>
  );
}

function useSubmitHandler() {
  const config = useAppConfig();
  const submitKey = config.submitKey;
  const isComposing = useRef(false);

  useEffect(() => {
    const onCompositionStart = () => {
      isComposing.current = true;
    };
    const onCompositionEnd = () => {
      isComposing.current = false;
    };

    window.addEventListener("compositionstart", onCompositionStart);
    window.addEventListener("compositionend", onCompositionEnd);

    return () => {
      window.removeEventListener("compositionstart", onCompositionStart);
      window.removeEventListener("compositionend", onCompositionEnd);
    };
  }, []);

  const shouldSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Fix Chinese input method "Enter" on Safari
    if (e.keyCode == 229) return false;
    if (e.key !== "Enter") return false;
    if (e.key === "Enter" && (e.nativeEvent.isComposing || isComposing.current))
      return false;
    return (
      (config.submitKey === SubmitKey.AltEnter && e.altKey) ||
      (config.submitKey === SubmitKey.CtrlEnter && e.ctrlKey) ||
      (config.submitKey === SubmitKey.ShiftEnter && e.shiftKey) ||
      (config.submitKey === SubmitKey.MetaEnter && e.metaKey) ||
      (config.submitKey === SubmitKey.Enter &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.metaKey)
    );
  };

  return {
    submitKey,
    shouldSubmit,
  };
}

export type RenderPrompt = Pick<Prompt, "title" | "content">;

export function PromptHints(props: {
  prompts: RenderPrompt[];
  onPromptSelect: (prompt: RenderPrompt) => void;
}) {
  const noPrompts = props.prompts.length === 0;
  const [selectIndex, setSelectIndex] = useState(0);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectIndex(0);
  }, [props.prompts.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (noPrompts || e.metaKey || e.altKey || e.ctrlKey) {
        return;
      }
      // arrow up / down to select prompt
      const changeIndex = (delta: number) => {
        e.stopPropagation();
        e.preventDefault();
        const nextIndex = Math.max(
          0,
          Math.min(props.prompts.length - 1, selectIndex + delta),
        );
        setSelectIndex(nextIndex);
        selectedRef.current?.scrollIntoView({
          block: "center",
        });
      };

      if (e.key === "ArrowUp") {
        changeIndex(1);
      } else if (e.key === "ArrowDown") {
        changeIndex(-1);
      } else if (e.key === "Enter") {
        const selectedPrompt = props.prompts.at(selectIndex);
        if (selectedPrompt) {
          props.onPromptSelect(selectedPrompt);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.prompts.length, selectIndex]);

  if (noPrompts) return null;
  return (
    <div className={styles["prompt-hints"]}>
      {props.prompts.map((prompt, i) => (
        <div
          ref={i === selectIndex ? selectedRef : null}
          className={clsx(styles["prompt-hint"], {
            [styles["prompt-hint-selected"]]: i === selectIndex,
          })}
          key={prompt.title + i.toString()}
          onClick={() => props.onPromptSelect(prompt)}
          onMouseEnter={() => setSelectIndex(i)}
        >
          <div className={styles["hint-title"]}>{prompt.title}</div>
          <div className={styles["hint-content"]}>{prompt.content}</div>
        </div>
      ))}
    </div>
  );
}

function ClearContextDivider() {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();

  return (
    <div
      className={styles["clear-context"]}
      onClick={() =>
        chatStore.updateTargetSession(
          session,
          (session) => (session.clearContextIndex = undefined),
        )
      }
    >
      <div className={styles["clear-context-tips"]}>{Locale.Context.Clear}</div>
      <div className={styles["clear-context-revert-btn"]}>
        {Locale.Context.Revert}
      </div>
    </div>
  );
}

export function ChatAction(props: {
  text: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState({
    full: 16,
    icon: 16,
  });

  function updateWidth() {
    if (!iconRef.current || !textRef.current) return;
    const getWidth = (dom: HTMLDivElement) => dom.getBoundingClientRect().width;
    const textWidth = getWidth(textRef.current);
    const iconWidth = getWidth(iconRef.current);
    setWidth({
      full: textWidth + iconWidth,
      icon: iconWidth,
    });
  }

  return (
    <div
      className={clsx(styles["chat-input-action"], "clickable")}
      onClick={() => {
        props.onClick();
        setTimeout(updateWidth, 1);
      }}
      onMouseEnter={updateWidth}
      onTouchStart={updateWidth}
      style={
        {
          "--icon-width": `${width.icon}px`,
          "--full-width": `${width.full}px`,
        } as React.CSSProperties
      }
    >
      <div ref={iconRef} className={styles["icon"]}>
        {props.icon}
      </div>
      <div className={styles["text"]} ref={textRef}>
        {props.text}
      </div>
    </div>
  );
}

function useScrollToBottom(
  scrollRef: RefObject<HTMLDivElement>,
  detach: boolean = false,
  messages: ChatMessage[],
) {
  // for auto-scroll
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollDomToBottom = useCallback(() => {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        setAutoScroll(true);
        dom.scrollTo(0, dom.scrollHeight);
      });
    }
  }, [scrollRef]);

  // auto scroll
  useEffect(() => {
    if (autoScroll && !detach) {
      scrollDomToBottom();
    }
  });

  // auto scroll when messages length changes
  const lastMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > lastMessagesLength.current && !detach) {
      scrollDomToBottom();
    }
    lastMessagesLength.current = messages.length;
  }, [messages.length, detach, scrollDomToBottom]);

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
  };
}

export function ChatActions(props: {
  uploadFile: () => void;
  attachImages: string[];
  setAttachImages: (images: string[]) => void;
  setUploading: (uploading: boolean) => void;
  showPromptModal: () => void;
  scrollToBottom: () => void;
  showPromptHints: () => void;
  hitBottom: boolean;
  uploading: boolean;
  setShowShortcutKeyModal: React.Dispatch<React.SetStateAction<boolean>>;
  setUserInput: (input: string) => void;
  setShowChatSidePanel: React.Dispatch<React.SetStateAction<boolean>>;
  showKnowledgeBase: boolean;
  setShowKnowledgeBase: (show: boolean) => void;
}) {
  const config = useAppConfig();
  const navigate = useNavigate();
  const chatStore = useChatStore();
  const pluginStore = usePluginStore();
  const session = chatStore.currentSession();

  // switch themes
  const theme = config.theme;

  function nextTheme() {
    const themes = [Theme.Auto, Theme.Light, Theme.Dark];
    const themeIndex = themes.indexOf(theme);
    const nextIndex = (themeIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    config.update((config) => (config.theme = nextTheme));
  }

  // stop all responses
  const couldStop = ChatControllerPool.hasPending();
  const stopAll = () => ChatControllerPool.stopAll();

  // switch model
  const currentModel = session.mask.modelConfig.model;
  const currentProviderName =
    session.mask.modelConfig?.providerName || ServiceProvider.OpenAI;
  const allModels = useAllModels();
  const models = useMemo(() => {
    const filteredModels = allModels.filter((m) => m.available);
    const defaultModel = filteredModels.find((m) => m.isDefault);

    if (defaultModel) {
      const arr = [
        defaultModel,
        ...filteredModels.filter((m) => m !== defaultModel),
      ];
      return arr;
    } else {
      return filteredModels;
    }
  }, [allModels]);
  const currentModelName = useMemo(() => {
    const model = models.find(
      (m) =>
        m.name == currentModel &&
        m?.provider?.providerName == currentProviderName,
    );
    return model?.displayName ?? "";
  }, [models, currentModel, currentProviderName]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showPluginSelector, setShowPluginSelector] = useState(false);
  const [showUploadImage, setShowUploadImage] = useState(false);

  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const modelSizes = getModelSizes(currentModel);
  const dalle3Qualitys: DalleQuality[] = ["standard", "hd"];
  const dalle3Styles: DalleStyle[] = ["vivid", "natural"];
  const currentSize =
    session.mask.modelConfig?.size ?? ("1024x1024" as ModelSize);
  const currentQuality = session.mask.modelConfig?.quality ?? "standard";
  const currentStyle = session.mask.modelConfig?.style ?? "vivid";

  const isMobileScreen = useMobileScreen();

  useEffect(() => {
    setShowUploadImage(true);
    if (!isVisionModel(currentModel)) {
      props.setAttachImages(
        props.attachImages.filter(
          (url: string) => !url.startsWith("data:image/"),
        ),
      );
    }

    // if current model is not available
    // switch to first available model
    const isUnavailableModel = !models.some((m) => m.name === currentModel);
    if (isUnavailableModel && models.length > 0) {
      // show next model to default model if exist
      let nextModel = models.find((model) => model.isDefault) || models[0];
      chatStore.updateTargetSession(session, (session) => {
        session.mask.modelConfig.model = nextModel.name;
        session.mask.modelConfig.providerName = nextModel?.provider
          ?.providerName as ServiceProvider;
      });
      showToast(
        nextModel?.provider?.providerName == "ByteDance"
          ? nextModel.displayName
          : nextModel.name,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModel, models, session]);

  return (
    <div className={styles["chat-input-actions"]}>
      <>
        {couldStop && (
          <ChatAction
            onClick={stopAll}
            text={Locale.Chat.InputActions.Stop}
            icon={<StopIcon />}
          />
        )}
        {!props.hitBottom && (
          <ChatAction
            onClick={props.scrollToBottom}
            text={Locale.Chat.InputActions.ToBottom}
            icon={<BottomIcon />}
          />
        )}
        {props.hitBottom && (
          <ChatAction
            onClick={props.showPromptModal}
            text={Locale.Chat.InputActions.Settings}
            icon={<SettingsIcon />}
          />
        )}

        {showUploadImage && (
          <ChatAction
            onClick={props.uploadFile}
            text={Locale.Chat.InputActions.UploadFile}
            icon={props.uploading ? <LoadingButtonIcon /> : <ImageIcon />}
          />
        )}
        <ChatAction
          onClick={nextTheme}
          text={Locale.Chat.InputActions.Theme[theme]}
          icon={
            <>
              {theme === Theme.Auto ? (
                <AutoIcon />
              ) : theme === Theme.Light ? (
                <LightIcon />
              ) : theme === Theme.Dark ? (
                <DarkIcon />
              ) : null}
            </>
          }
        />

        <ChatAction
          onClick={props.showPromptHints}
          text={Locale.Chat.InputActions.Prompt}
          icon={<PromptIcon />}
        />

        <ChatAction
          onClick={() => {
            navigate(Path.Masks);
          }}
          text={Locale.Chat.InputActions.Masks}
          icon={<MaskIcon />}
        />

        <ChatAction
          text={Locale.Chat.InputActions.Clear}
          icon={<BreakIcon />}
          onClick={() => {
            chatStore.updateTargetSession(session, (session) => {
              if (session.clearContextIndex === session.messages.length) {
                session.clearContextIndex = undefined;
              } else {
                session.clearContextIndex = session.messages.length;
                session.memoryPrompt = ""; // will clear memory
              }
            });
          }}
        />

        <ChatAction
          onClick={() => props.setShowKnowledgeBase(!props.showKnowledgeBase)}
          text={`Knowledge (${session.knowledge?.length || 0})`}
          icon={<BookIcon />}
        />

        {supportsCustomSize(currentModel) && (
          <ChatAction
            onClick={() => setShowSizeSelector(true)}
            text={currentSize}
            icon={<SizeIcon />}
          />
        )}

        {showSizeSelector && (
          <Selector
            defaultSelectedValue={currentSize}
            items={modelSizes.map((m) => ({
              title: m,
              value: m,
            }))}
            onClose={() => setShowSizeSelector(false)}
            onSelection={(s) => {
              if (s.length === 0) return;
              const size = s[0];
              chatStore.updateTargetSession(session, (session) => {
                session.mask.modelConfig.size = size;
              });
              showToast(size);
            }}
          />
        )}

        {isDalle3(currentModel) && (
          <ChatAction
            onClick={() => setShowQualitySelector(true)}
            text={currentQuality}
            icon={<QualityIcon />}
          />
        )}

        {showQualitySelector && (
          <Selector
            defaultSelectedValue={currentQuality}
            items={dalle3Qualitys.map((m) => ({
              title: m,
              value: m,
            }))}
            onClose={() => setShowQualitySelector(false)}
            onSelection={(q) => {
              if (q.length === 0) return;
              const quality = q[0];
              chatStore.updateTargetSession(session, (session) => {
                session.mask.modelConfig.quality = quality;
              });
              showToast(quality);
            }}
          />
        )}

        {isDalle3(currentModel) && (
          <ChatAction
            onClick={() => setShowStyleSelector(true)}
            text={currentStyle}
            icon={<StyleIcon />}
          />
        )}

        {showStyleSelector && (
          <Selector
            defaultSelectedValue={currentStyle}
            items={dalle3Styles.map((m) => ({
              title: m,
              value: m,
            }))}
            onClose={() => setShowStyleSelector(false)}
            onSelection={(s) => {
              if (s.length === 0) return;
              const style = s[0];
              chatStore.updateTargetSession(session, (session) => {
                session.mask.modelConfig.style = style;
              });
              showToast(style);
            }}
          />
        )}

        {showPlugins(currentProviderName, currentModel) && (
          <ChatAction
            onClick={() => {
              if (pluginStore.getAll().length == 0) {
                navigate(Path.Plugins);
              } else {
                setShowPluginSelector(true);
              }
            }}
            text={Locale.Plugin.Name}
            icon={<PluginIcon />}
          />
        )}
        {showPluginSelector && (
          <Selector
            multiple
            defaultSelectedValue={chatStore.currentSession().mask?.plugin}
            items={pluginStore.getAll().map((item) => ({
              title: `${item?.title}@${item?.version}`,
              value: item?.id,
            }))}
            onClose={() => setShowPluginSelector(false)}
            onSelection={(s) => {
              chatStore.updateTargetSession(session, (session) => {
                session.mask.plugin = s as string[];
              });
            }}
          />
        )}

        {!isMobileScreen && (
          <ChatAction
            onClick={() => props.setShowShortcutKeyModal(true)}
            text={Locale.Chat.ShortcutKey.Title}
            icon={<ShortcutkeyIcon />}
          />
        )}
        {!isMobileScreen && <MCPAction />}
      </>
      <div className={styles["chat-input-actions-end"]}>
        {config.realtimeConfig.enable && (
          <ChatAction
            onClick={() => props.setShowChatSidePanel(true)}
            text={"Realtime Chat"}
            icon={<HeadphoneIcon />}
          />
        )}
      </div>
    </div>
  );
}

export function EditMessageModal(props: { onClose: () => void }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const [messages, setMessages] = useState(session.messages.slice());

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Chat.EditMessage.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            text={Locale.UI.Cancel}
            icon={<CancelIcon />}
            key="cancel"
            onClick={() => {
              props.onClose();
            }}
          />,
          <IconButton
            type="primary"
            text={Locale.UI.Confirm}
            icon={<ConfirmIcon />}
            key="ok"
            onClick={() => {
              chatStore.updateTargetSession(
                session,
                (session) => (session.messages = messages),
              );
              props.onClose();
            }}
          />,
        ]}
      >
        <List>
          <ListItem
            title={Locale.Chat.EditMessage.Topic.Title}
            subTitle={Locale.Chat.EditMessage.Topic.SubTitle}
          >
            <input
              type="text"
              value={session.topic}
              onInput={(e) =>
                chatStore.updateTargetSession(
                  session,
                  (session) => (session.topic = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
        </List>
        <ContextPrompts
          context={messages}
          updateContext={(updater) => {
            const newMessages = messages.slice();
            updater(newMessages);
            setMessages(newMessages);
          }}
        />
      </Modal>
    </div>
  );
}

export function DeleteImageButton(props: { deleteImage: () => void }) {
  return (
    <div className={styles["delete-image"]} onClick={props.deleteImage}>
      <DeleteIcon />
    </div>
  );
}

export function ShortcutKeyModal(props: { onClose: () => void }) {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const shortcuts = [
    {
      title: Locale.Chat.ShortcutKey.newChat,
      keys: isMac ? ["⌘", "Shift", "O"] : ["Ctrl", "Shift", "O"],
    },
    { title: Locale.Chat.ShortcutKey.focusInput, keys: ["Shift", "Esc"] },
    {
      title: Locale.Chat.ShortcutKey.copyLastCode,
      keys: isMac ? ["⌘", "Shift", ";"] : ["Ctrl", "Shift", ";"],
    },
    {
      title: Locale.Chat.ShortcutKey.copyLastMessage,
      keys: isMac ? ["⌘", "Shift", "C"] : ["Ctrl", "Shift", "C"],
    },
    {
      title: Locale.Chat.ShortcutKey.showShortcutKey,
      keys: isMac ? ["⌘", "/"] : ["Ctrl", "/"],
    },
    {
      title: Locale.Chat.ShortcutKey.clearContext,
      keys: isMac
        ? ["⌘", "Shift", "backspace"]
        : ["Ctrl", "Shift", "backspace"],
    },
  ];
  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Chat.ShortcutKey.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            type="primary"
            text={Locale.UI.Confirm}
            icon={<ConfirmIcon />}
            key="ok"
            onClick={() => {
              props.onClose();
            }}
          />,
        ]}
      >
        <div className={styles["shortcut-key-container"]}>
          <div className={styles["shortcut-key-grid"]}>
            {shortcuts.map((shortcut, index) => (
              <div key={index} className={styles["shortcut-key-item"]}>
                <div className={styles["shortcut-key-title"]}>
                  {shortcut.title}
                </div>
                <div className={styles["shortcut-key-keys"]}>
                  {shortcut.keys.map((key, i) => (
                    <div key={i} className={styles["shortcut-key"]}>
                      <span>{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChatContent() {
  type RenderMessage = ChatMessage & { preview?: boolean };

  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const allModels = useAllModels();
  const models = useMemo(() => {
    const filteredModels = allModels.filter((m) => m.available);
    const defaultModel = filteredModels.find((m) => m.isDefault);

    if (defaultModel) {
      return [
        defaultModel,
        ...filteredModels.filter((m) => m !== defaultModel),
      ];
    } else {
      return filteredModels;
    }
  }, [allModels]);

  const config = useAppConfig();
  const fontSize = config.fontSize;
  const fontFamily = config.fontFamily;

  const [showExport, setShowExport] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const scrollRef = useRef<HTMLDivElement>(null!);
  const isScrolledToBottom = scrollRef?.current
    ? Math.abs(
        scrollRef.current.scrollHeight -
          (scrollRef.current.scrollTop + scrollRef.current.clientHeight),
      ) <= 1
    : false;
  const isAttachWithTop = useMemo(() => {
    const lastMessage = scrollRef.current?.lastElementChild as HTMLElement;
    // if scrolllRef is not ready or no message, return false
    if (!scrollRef?.current || !lastMessage) return false;
    const topDistance =
      lastMessage!.getBoundingClientRect().top -
      scrollRef.current.getBoundingClientRect().top;
    // leave some space for user question
    return topDistance < 100;
  }, []);

  const [selectionPosition, setSelectionPosition] = useState<{
    left: number;
    top: number;
    content: string;
  } | null>(null);

  const onSelectionChange = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0) {
        setSelectionPosition({
          left: rect.left + rect.width / 2,
          top: rect.top,
          content: selection.toString(),
        });
      }
    } else {
      setSelectionPosition(null);
    }
  };

  useEffect(() => {
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const isTyping = userInput !== "";

  // if user is typing, should auto scroll to bottom
  // if user is not typing, should auto scroll to bottom only if already at bottom
  const { setAutoScroll, scrollDomToBottom } = useScrollToBottom(
    scrollRef,
    (isScrolledToBottom || isAttachWithTop) && !isTyping,
    session.messages,
  );
  const [hitBottom, setHitBottom] = useState(true);
  const isMobileScreen = useMobileScreen();
  const { data: sessionData } = useSession();
  const userName = sessionData?.user?.email?.split("@")[0] || "Bro";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 20) return "Good evening";
    return "Good night";
  }, []);

  const showWelcome = session.messages.length === 0;
  const navigate = useNavigate();
  const [attachImages, setAttachImages] = useState<string[]>([]);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [uploading, setUploading] = useState(false);

  // prompt hints
  const promptStore = usePromptStore();
  const [promptHints, setPromptHints] = useState<RenderPrompt[]>([]);
  const onSearch = useDebouncedCallback(
    (text: string) => {
      const matchedPrompts = promptStore.search(text);
      setPromptHints(matchedPrompts);
    },
    100,
    { leading: true, trailing: true },
  );

  // auto grow input
  const [inputRows, setInputRows] = useState(2);
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = Math.min(
        20,
        Math.max(2 + Number(!isMobileScreen), rows),
      );
      setInputRows(inputRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    },
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(measure, [userInput]);

  // chat commands shortcuts
  const chatCommands = useChatCommand({
    new: () => chatStore.newSession(),
    newm: () => navigate(Path.NewChat),
    prev: () => chatStore.nextSession(-1),
    next: () => chatStore.nextSession(1),
    clear: () =>
      chatStore.updateTargetSession(
        session,
        (session) => (session.clearContextIndex = session.messages.length),
      ),
    fork: () => chatStore.forkSession(),
    del: () => chatStore.deleteSession(chatStore.currentSessionIndex),
  });

  // only search prompts when user input is short
  const SEARCH_TEXT_LIMIT = 30;
  const onInput = (text: string) => {
    setUserInput(text);
    const n = text.trim().length;

    // clear search results
    if (n === 0) {
      setPromptHints([]);
    } else if (text.match(ChatCommandPrefix)) {
      setPromptHints(chatCommands.search(text));
    } else if (!config.disablePromptHint && n < SEARCH_TEXT_LIMIT) {
      // check if need to trigger auto completion
      if (text.startsWith("/")) {
        let searchText = text.slice(1);
        onSearch(searchText);
      }
    }
  };

  const doSubmit = async (userInput: string) => {
    if (userInput.trim() === "" && isEmpty(attachImages)) return;
    const matchCommand = chatCommands.match(userInput);
    if (matchCommand.matched) {
      setUserInput("");
      setPromptHints([]);
      matchCommand.invoke();
      return;
    }

    if (agentMode) {
      // ── Agentic loop ──
      setIsLoading(true);
      setAgentSteps([]);
      setUserInput("");
      setAttachImages([]);

      // Save user message to session
      const userMsg = createMessage({ role: "user", content: userInput });
      chatStore.updateTargetSession(session, (s) => {
        s.messages = s.messages.concat([userMsg]);
      });

      const botMsg = createMessage({
        role: "assistant",
        content: "",
        streaming: true,
      });
      chatStore.updateTargetSession(session, (s) => {
        s.messages = s.messages.concat([botMsg]);
      });

      let conversationMsgs = buildAgentMessages(userInput);
      let fullResponse = "";
      let steps = 0;

      try {
        while (steps < AGENT_MAX_STEPS) {
          steps++;

          // Call LLM via fetch (reuse existing api)
          const api = await import("../client/api").then((m) =>
            m.getClientApi(session.mask.modelConfig.providerName as any),
          );

          const llmResponse = await new Promise<string>((resolve, reject) => {
            let acc = "";
            api.llm.chat({
              messages: conversationMsgs,
              config: {
                ...session.mask.modelConfig,
                stream: false,
              },
              onUpdate(msg) {
                acc = msg;
              },
              async onFinish(msg) {
                resolve(msg || acc);
              },
              onError(err) {
                reject(err);
              },
              onController() {},
              onBeforeTool() {},
              onAfterTool() {},
            });
          });

          const toolCall = parseToolCall(llmResponse);

          if (!toolCall) {
            // No more tool calls — final answer
            fullResponse = stripToolCalls(llmResponse);
            break;
          }

          // Execute tool
          const stepLabel = `🔧 ${toolCall.name}(${JSON.stringify(toolCall.args)})`;
          setAgentSteps((prev) => [...prev, stepLabel]);

          // Update streaming message to show thinking
          botMsg.content =
            fullResponse + `\n\n*Calling tool: ${toolCall.name}...*`;
          chatStore.updateTargetSession(session, (s) => {
            s.messages = s.messages.map((m) =>
              m.id === botMsg.id ? { ...botMsg } : m,
            );
          });

          const toolResult = await executeTool(
            toolCall.name,
            toolCall.args || {},
          );

          // Add assistant+tool messages to conversation
          conversationMsgs = [
            ...conversationMsgs,
            { role: "assistant" as const, content: llmResponse },
            {
              role: "user" as const,
              content: `<tool_result>\n${toolResult}\n</tool_result>`,
            },
          ];

          fullResponse = stripToolCalls(llmResponse) + "\n";
        }
      } catch (e: any) {
        fullResponse = `Agent error: ${e.message}`;
      }

      // Final message
      botMsg.content = fullResponse || "(No response)";
      botMsg.streaming = false;
      botMsg.date = new Date().toLocaleString();
      chatStore.updateTargetSession(session, (s) => {
        s.messages = s.messages.map((m) =>
          m.id === botMsg.id ? { ...botMsg } : m,
        );
        s.lastUpdate = Date.now();
      });
      setIsLoading(false);
      setAutoScroll(true);
      return;
    }

    // ── Normal (non-agent) submit ──
    setIsLoading(true);
    chatStore
      .onUserInput(userInput, attachImages)
      .then(() => setIsLoading(false));
    setAttachImages([]);
    chatStore.setLastInput(userInput);
    setUserInput("");
    setPromptHints([]);
    if (!isMobileScreen) inputRef.current?.focus();
    setAutoScroll(true);
  };

  const [showModelSelector, setShowModelSelector] = useState(false);

  // ── Memory / context depth slider ──
  const [showMemorySlider, setShowMemorySlider] = useState(false);
  const memoryCount = session.mask.modelConfig.historyMessageCount ?? 8;
  const setMemoryCount = (v: number) => {
    chatStore.updateTargetSession(session, (s) => {
      s.mask.modelConfig.historyMessageCount = v;
    });
  };

  // ── Agent mode ──
  const [agentMode, setAgentMode] = useState(false);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);

  // Build agent messages from session messages
  const buildAgentMessages = (userText: string) => {
    const history = session.messages.slice(-memoryCount * 2);
    const msgs: any[] = [
      { role: "system" as const, content: AGENT_SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string" ? m.content : getMessageTextContent(m),
      })),
      { role: "user" as const, content: userText },
    ];
    return msgs;
  };

  const onPromptSelect = (prompt: RenderPrompt) => {
    setTimeout(() => {
      setPromptHints([]);

      const matchedChatCommand = chatCommands.match(prompt.content);
      if (matchedChatCommand.matched) {
        // if user is selecting a chat command, just trigger it
        matchedChatCommand.invoke();
        setUserInput("");
      } else {
        // or fill the prompt
        setUserInput(prompt.content);
      }
      inputRef.current?.focus();
    }, 30);
  };

  // stop response
  const onUserStop = (messageId: string) => {
    ChatControllerPool.stop(session.id, messageId);
  };

  useEffect(() => {
    chatStore.updateTargetSession(session, (session) => {
      const stopTiming = Date.now() - REQUEST_TIMEOUT_MS;
      session.messages.forEach((m) => {
        // check if should stop all stale messages
        if (m.isError || new Date(m.date).getTime() < stopTiming) {
          if (m.streaming) {
            m.streaming = false;
          }

          if (m.content.length === 0) {
            m.isError = true;
            m.content = prettyObject({
              error: true,
              message: "empty response",
            });
          }
        }
      });

      // auto sync mask config from global config
      if (session.mask.syncGlobalConfig) {
        console.log("[Mask] syncing from global, name = ", session.mask.name);
        session.mask.modelConfig = { ...config.modelConfig };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // check if should send message
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // if ArrowUp and no userInput, fill with last input
    if (
      e.key === "ArrowUp" &&
      userInput.length <= 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey)
    ) {
      setUserInput(chatStore.lastInput ?? "");
      e.preventDefault();
      return;
    }
    if (shouldSubmit(e) && promptHints.length === 0) {
      doSubmit(userInput);
      e.preventDefault();
    }
  };
  const onRightClick = (e: any, message: ChatMessage) => {
    // copy to clipboard
    if (selectOrCopy(e.currentTarget, getMessageTextContent(message))) {
      if (userInput.length === 0) {
        setUserInput(getMessageTextContent(message));
      }

      e.preventDefault();
    }
  };

  const deleteMessage = (msgId?: string) => {
    chatStore.updateTargetSession(
      session,
      (session) =>
        (session.messages = session.messages.filter((m) => m.id !== msgId)),
    );
  };

  const onDelete = (msgId: string) => {
    deleteMessage(msgId);
  };

  const onResend = (message: ChatMessage) => {
    // when it is resending a message
    // 1. for a user's message, find the next bot response
    // 2. for a bot's message, find the last user's input
    // 3. delete original user input and bot's message
    // 4. resend the user's input

    const resendingIndex = session.messages.findIndex(
      (m) => m.id === message.id,
    );

    if (resendingIndex < 0 || resendingIndex >= session.messages.length) {
      console.error("[Chat] failed to find resending message", message);
      return;
    }

    let userMessage: ChatMessage | undefined;
    let botMessage: ChatMessage | undefined;

    if (message.role === "assistant") {
      // if it is resending a bot's message, find the user input for it
      botMessage = message;
      for (let i = resendingIndex; i >= 0; i -= 1) {
        if (session.messages[i].role === "user") {
          userMessage = session.messages[i];
          break;
        }
      }
    } else if (message.role === "user") {
      // if it is resending a user's input, find the bot's response
      userMessage = message;
      for (let i = resendingIndex; i < session.messages.length; i += 1) {
        if (session.messages[i].role === "assistant") {
          botMessage = session.messages[i];
          break;
        }
      }
    }

    if (userMessage === undefined) {
      console.error("[Chat] failed to resend", message);
      return;
    }

    // delete the original messages
    deleteMessage(userMessage.id);
    deleteMessage(botMessage?.id);

    // resend the message
    setIsLoading(true);
    const textContent = getMessageTextContent(userMessage);
    const images = getMessageImages(userMessage);
    chatStore.onUserInput(textContent, images).then(() => setIsLoading(false));
    inputRef.current?.focus();
  };

  const onPinMessage = (message: ChatMessage) => {
    chatStore.updateTargetSession(session, (session) =>
      session.mask.context.push(message),
    );

    showToast(Locale.Chat.Actions.PinToastContent, {
      text: Locale.Chat.Actions.PinToastAction,
      onClick: () => {
        setShowPromptModal(true);
      },
    });
  };
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<any>(null);

  const onRecord = () => {
    if (isRecording) {
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("Browser Anda tidak mendukung Speech Recognition.");
      return;
    }

    const startText = userInput;
    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      showToast(Locale.Chat.StartSpeak);
    };

    recognition.onresult = (event: any) => {
      let currentSessionTranscript = "";

      for (let i = 0; i < event.results.length; ++i) {
        currentSessionTranscript += event.results[i][0].transcript;
      }

      // Append new transcripts to original startText
      const newText = startText
        ? startText +
          (startText.endsWith(" ") ? "" : " ") +
          currentSessionTranscript
        : currentSessionTranscript;

      onInput(newText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error", event.error);
      setIsRecording(false);
      showToast("Error: " + event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recorderRef.current = recognition;
  };

  const accessStore = useAccessStore();
  const [speechStatus, setSpeechStatus] = useState(false);
  const [speechLoading, setSpeechLoading] = useState(false);

  async function openaiSpeech(text: string) {
    if (speechStatus) {
      ttsPlayer.stop();
      setSpeechStatus(false);
    } else {
      var api: ClientApi;
      api = new ClientApi(ModelProvider.GPT);
      const config = useAppConfig.getState();
      setSpeechLoading(true);
      ttsPlayer.init();
      let audioBuffer: ArrayBuffer;
      const { markdownToTxt } = require("markdown-to-txt");
      const textContent = markdownToTxt(text);
      if (config.ttsConfig.engine !== DEFAULT_TTS_ENGINE) {
        const edgeVoiceName = accessStore.edgeVoiceName();
        const tts = new MsEdgeTTS();
        await tts.setMetadata(
          edgeVoiceName,
          OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
        );
        audioBuffer = await tts.toArrayBuffer(textContent);
      } else {
        audioBuffer = await api.llm.speech({
          model: config.ttsConfig.model,
          input: textContent,
          voice: config.ttsConfig.voice,
          speed: config.ttsConfig.speed,
        });
      }
      setSpeechStatus(true);
      ttsPlayer
        .play(audioBuffer, () => {
          setSpeechStatus(false);
        })
        .catch((e) => {
          console.error("[OpenAI Speech]", e);
          showToast(prettyObject(e));
          setSpeechStatus(false);
        })
        .finally(() => setSpeechLoading(false));
    }
  }

  const context: RenderMessage[] = useMemo(() => {
    return session.mask.hideContext ? [] : session.mask.context.slice();
  }, [session.mask.context, session.mask.hideContext]);

  if (
    context.length === 0 &&
    session.messages.at(0)?.content !== BOT_HELLO.content
  ) {
    const copiedHello = Object.assign({}, BOT_HELLO);
    if (!accessStore.isAuthorized()) {
      copiedHello.content = Locale.Error.Unauthorized;
    }
    context.push(copiedHello);
  }

  // preview messages
  const renderMessages = useMemo(() => {
    return context
      .concat(session.messages as RenderMessage[])
      .concat(
        isLoading
          ? [
              {
                ...createMessage({
                  role: "assistant",
                  content: "……",
                }),
                preview: true,
              },
            ]
          : [],
      )
      .concat(
        userInput.length > 0 && config.sendPreviewBubble
          ? [
              {
                ...createMessage({
                  role: "user",
                  content: userInput,
                }),
                preview: true,
              },
            ]
          : [],
      );
  }, [
    config.sendPreviewBubble,
    context,
    isLoading,
    session.messages,
    userInput,
  ]);

  const [msgRenderIndex, _setMsgRenderIndex] = useState(
    Math.max(0, renderMessages.length - CHAT_PAGE_SIZE),
  );

  function setMsgRenderIndex(newIndex: number) {
    newIndex = Math.min(renderMessages.length - CHAT_PAGE_SIZE, newIndex);
    newIndex = Math.max(0, newIndex);
    _setMsgRenderIndex(newIndex);
  }

  const messages = useMemo(() => {
    const endRenderIndex = Math.min(
      msgRenderIndex + 3 * CHAT_PAGE_SIZE,
      renderMessages.length,
    );
    return renderMessages.slice(msgRenderIndex, endRenderIndex);
  }, [msgRenderIndex, renderMessages]);

  const onChatBodyScroll = (e: HTMLElement) => {
    const bottomHeight = e.scrollTop + e.clientHeight;
    const edgeThreshold = e.clientHeight;

    const isTouchTopEdge = e.scrollTop <= edgeThreshold;
    const isTouchBottomEdge = bottomHeight >= e.scrollHeight - edgeThreshold;
    const isHitBottom =
      bottomHeight >= e.scrollHeight - (isMobileScreen ? 4 : 10);

    const prevPageMsgIndex = msgRenderIndex - CHAT_PAGE_SIZE;
    const nextPageMsgIndex = msgRenderIndex + CHAT_PAGE_SIZE;

    if (isTouchTopEdge && !isTouchBottomEdge) {
      setMsgRenderIndex(prevPageMsgIndex);
    } else if (isTouchBottomEdge) {
      setMsgRenderIndex(nextPageMsgIndex);
    }

    setHitBottom(isHitBottom);
    setAutoScroll(isHitBottom);
  };

  function scrollToBottom() {
    setMsgRenderIndex(renderMessages.length - CHAT_PAGE_SIZE);
    scrollDomToBottom();
  }

  // clear context index = context length + index in messages
  const clearContextIndex =
    (session.clearContextIndex ?? -1) >= 0
      ? session.clearContextIndex! + context.length - msgRenderIndex
      : -1;

  const [showPromptModal, setShowPromptModal] = useState(false);

  const clientConfig = useMemo(() => getClientConfig(), []);

  const autoFocus = !isMobileScreen; // wont auto focus on mobile screen

  useCommand({
    fill: setUserInput,
    submit: (text) => {
      doSubmit(text);
    },
    code: (text) => {
      if (accessStore.disableFastLink) return;
      console.log("[Command] got code from url: ", text);
      showConfirm(Locale.URLCommand.Code + `code = ${text}`).then((res) => {
        if (res) {
          accessStore.update((access) => (access.accessCode = text));
        }
      });
    },
    settings: (text) => {
      if (accessStore.disableFastLink) return;

      try {
        const payload = JSON.parse(text) as {
          key?: string;
          url?: string;
        };

        console.log("[Command] got settings from url: ", payload);

        if (payload.key || payload.url) {
          showConfirm(
            Locale.URLCommand.Settings +
              `\n${JSON.stringify(payload, null, 4)}`,
          ).then((res) => {
            if (!res) return;
            if (payload.key) {
              accessStore.update(
                (access) => (access.openaiApiKey = payload.key!),
              );
            }
            if (payload.url) {
              accessStore.update((access) => (access.openaiUrl = payload.url!));
            }
            accessStore.update((access) => (access.useCustomConfig = true));
          });
        }
      } catch {
        console.error("[Command] failed to get settings from url: ", text);
      }
    },
  });

  // edit / insert message modal
  const [isEditingMessage, setIsEditingMessage] = useState(false);

  // remember unfinished input
  useEffect(() => {
    // try to load from local storage
    const key = UNFINISHED_INPUT(session.id);
    const mayBeUnfinishedInput = localStorage.getItem(key);
    if (mayBeUnfinishedInput && userInput.length === 0) {
      setUserInput(mayBeUnfinishedInput);
      localStorage.removeItem(key);
    }

    const dom = inputRef.current;
    return () => {
      localStorage.setItem(key, dom?.value ?? "");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const currentModel = chatStore.currentSession().mask.modelConfig.model;
      if (!isVisionModel(currentModel)) {
        return;
      }
      const items = (event.clipboardData || window.clipboardData).items;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const images: string[] = [];
            images.push(...attachImages);
            images.push(
              ...(await new Promise<string[]>((res, rej) => {
                setUploading(true);
                const imagesData: string[] = [];
                uploadImageRemote(file)
                  .then((dataUrl) => {
                    imagesData.push(dataUrl);
                    setUploading(false);
                    res(imagesData);
                  })
                  .catch((e) => {
                    setUploading(false);
                    rej(e);
                  });
              })),
            );
            const imagesLength = images.length;

            if (imagesLength > 3) {
              images.splice(3, imagesLength - 3);
            }
            setAttachImages(images);
          }
        }
      }
    },
    [attachImages, chatStore],
  );

  // Extract text from PDF
  async function extractPdfText(file: File): Promise<string> {
    const { extractPdfText: extract } = await import("../utils/pdf");
    return extract(file);
  }

  // Extract text from XLSX
  async function extractXlsxText(file: File): Promise<string> {
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        let csv = "";
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          csv += `--- Sheet: ${sheetName} ---\n`;
          csv += XLSX.utils.sheet_to_csv(sheet);
          csv += "\n\n";
        });
        resolve(csv);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async function uploadFile() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept =
      "image/png, image/jpeg, image/webp, image/heic, image/heif, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, video/mp4, video/quicktime, text/plain, text/markdown, .txt, .md";
    fileInput.multiple = true;
    fileInput.onchange = async (event: any) => {
      setUploading(true);
      const files = event.target.files;
      const newFiles: string[] = [...attachImages];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          const dataUrl = await uploadImageRemote(file);
          newFiles.push(dataUrl);
        } else if (file.type === "application/pdf") {
          const text = await extractPdfText(file);
          // For PDF, we add it as an attachment that will be converted back to text in the prompt
          // We'll store it as 'application:pdf:<filename>:<text_content>'
          newFiles.push(`application:pdf:${file.name}:${text}`);
        } else if (
          file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
          const text = await extractXlsxText(file);
          newFiles.push(`application:xlsx:${file.name}:${text}`);
        } else if (file.type.startsWith("video/")) {
          // Video support for Gemini etc
          const reader = new FileReader();
          const videoDataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newFiles.push(videoDataUrl);
        } else if (
          file.type.startsWith("text/") ||
          file.name.endsWith(".txt") ||
          file.name.endsWith(".md")
        ) {
          const text = await file.text();
          newFiles.push(`application:text:${file.name}:${text}`);
        }
      }
      setAttachImages(newFiles.slice(0, 5)); // Allow more than 3 now
      setUploading(false);
    };
    fileInput.click();
  }

  async function uploadToKnowledge() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept =
      "application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/plain, text/markdown";
    fileInput.multiple = true;
    fileInput.onchange = async (event: any) => {
      setUploading(true);
      const files = event.target.files;
      const newKnowledge: any[] = [...(session.knowledge || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let text = "";
        let type = file.type;
        if (file.type === "application/pdf") {
          text = await extractPdfText(file);
          type = "pdf";
        } else if (
          file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
          text = await extractXlsxText(file);
          type = "xlsx";
        } else if (file.type.startsWith("text/")) {
          text = await file.text();
          type = "text";
        }

        if (text) {
          newKnowledge.push({
            name: file.name,
            content: text,
            type: type,
          });
        }
      }

      chatStore.updateTargetSession(session, (session) => {
        session.knowledge = newKnowledge;
      });
      setUploading(false);
      setShowKnowledgeBase(true);
    };
    fileInput.click();
  }

  async function scrapeWebsite() {
    const url = window.prompt("Enter Website URL to scrape:");
    if (!url) return;

    try {
      setUploading(true);
      showToast("Scraping website: " + url);
      const res = await fetch(
        `/api/web-scraper?url=${encodeURIComponent(url)}`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch");
      }
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      chatStore.updateTargetSession(session, (session) => {
        const newKnowledge = [...(session.knowledge || [])];
        newKnowledge.push({
          name: data.title || url,
          content: data.content,
          type: "text",
        });
        session.knowledge = newKnowledge;
      });
      showToast("Website scraped inside Knowledge Base!");
    } catch (err: any) {
      showToast("Error scraping website: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function scrapeGithub() {
    const url = window.prompt(
      "Enter GitHub Repo URL (e.g., https://github.com/owner/repo):",
    );
    if (!url) return;

    try {
      setUploading(true);
      showToast("Fetching GitHub Repository: " + url);
      const res = await fetch(
        `/api/github-scraper?url=${encodeURIComponent(url)}`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch repository data");
      }
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      chatStore.updateTargetSession(session, (session) => {
        const newKnowledge = [...(session.knowledge || [])];
        newKnowledge.push({
          name: data.title || url,
          content: data.content,
          type: "text",
        });
        session.knowledge = newKnowledge;
      });
      showToast("Repository context added to Knowledge Base!");
    } catch (err: any) {
      showToast("Error fetching GitHub: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  // 快捷键 shortcut keys
  const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 打开新聊天 command + shift + o
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "o"
      ) {
        event.preventDefault();
        setTimeout(() => {
          chatStore.newSession();
          navigate(Path.Chat);
        }, 10);
      }
      // 聚焦聊天输入 shift + esc
      else if (event.shiftKey && event.key.toLowerCase() === "escape") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      // 复制最后一个代码块 command + shift + ;
      else if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.code === "Semicolon"
      ) {
        event.preventDefault();
        const copyCodeButton =
          document.querySelectorAll<HTMLElement>(".copy-code-button");
        if (copyCodeButton.length > 0) {
          copyCodeButton[copyCodeButton.length - 1].click();
        }
      }
      // 复制最后一个回复 command + shift + c
      else if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "c"
      ) {
        event.preventDefault();
        const lastNonUserMessage = messages
          .filter((message) => message.role !== "user")
          .pop();
        if (lastNonUserMessage) {
          const lastMessageContent = getMessageTextContent(lastNonUserMessage);
          copyToClipboard(lastMessageContent);
        }
      }
      // 展示快捷键 command + /
      else if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        setShowShortcutKeyModal(true);
      }
      // 清除上下文 command + shift + backspace
      else if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "backspace"
      ) {
        event.preventDefault();
        chatStore.updateTargetSession(session, (session) => {
          if (session.clearContextIndex === session.messages.length) {
            session.clearContextIndex = undefined;
          } else {
            session.clearContextIndex = session.messages.length;
            session.memoryPrompt = ""; // will clear memory
          }
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [messages, chatStore, navigate, session]);

  const [showChatSidePanel, setShowChatSidePanel] = useState(false);

  return (
    <>
      <div className={styles.chat} key={session.id}>
        {/* ── Model Tabs Bar ── */}
        <div className={styles["model-tabs-bar"]}>
          <div className={styles["model-tabs"]}>
            {/* Active model tab */}
            <div
              className={clsx(styles["model-tab"], styles["model-tab-active"])}
              onClick={() => setShowModelSelector(true)}
            >
              <span className={styles["model-tab-dot"]} />
              <span className={styles["model-tab-name"]}>
                {session.mask.modelConfig.model}
              </span>
              <span className={styles["model-tab-chevron"]}>⌄</span>
            </div>

            {/* Quick-add model button */}
            <div
              className={styles["model-tab-add"]}
              onClick={() => setShowModelSelector(true)}
              title="Switch or add model"
            >
              + Add Model
            </div>
          </div>

          {/* Agent mode badge */}
          {agentMode && (
            <div className={styles["agent-badge"]}>
              ⚡ Agent Mode
              {agentSteps.length > 0 && (
                <span className={styles["agent-steps"]}>
                  {agentSteps.length} steps
                </span>
              )}
            </div>
          )}
        </div>
        <div className="window-header" data-tauri-drag-region>
          <div className="window-actions">
            <div className={"window-action-button"}>
              <IconButton
                icon={isMobileScreen ? <ReturnIcon /> : <MenuIcon />}
                bordered
                title={
                  isMobileScreen
                    ? Locale.Chat.Actions.ChatList
                    : "Toggle Sidebar"
                }
                onClick={() => {
                  if (isMobileScreen) navigate(Path.Home);
                  else {
                    config.update(
                      (config) => (config.showSidebar = !config.showSidebar),
                    );
                  }
                }}
              />
            </div>
          </div>

          <div
            className={clsx("window-header-title", styles["chat-body-title"])}
          >
            <div
              className={clsx(
                "window-header-main-title",
                styles["chat-body-main-title"],
              )}
              onClickCapture={() => setIsEditingMessage(true)}
            >
              {!session.topic ? DEFAULT_TOPIC : session.topic}
            </div>
            <div className="window-header-sub-title">
              {Locale.Chat.SubTitle(session.messages.length)}
            </div>
          </div>

          {session.mask.plugin && session.mask.plugin.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "4px",
                marginTop: "4px",
                flexWrap: "wrap",
                justifyContent: isMobileScreen ? "center" : "flex-start",
              }}
            >
              {session.mask.plugin.map((pId) => (
                <div
                  key={pId}
                  style={{
                    fontSize: "10px",
                    background: "var(--primary)",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    opacity: 0.8,
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <PluginIcon
                    style={{ width: "10px", height: "10px", fill: "white" }}
                  />
                  {pId === "native-web-search" ? "Web Search" : pId}
                </div>
              ))}
            </div>
          )}

          <div className="window-actions">
            <div className="window-action-button">
              <IconButton
                icon={<ReloadIcon />}
                bordered
                title={Locale.Chat.Actions.RefreshTitle}
                onClick={() => {
                  showToast(Locale.Chat.Actions.RefreshToast);
                  chatStore.summarizeSession(true, session);
                }}
              />
            </div>
            {!isMobileScreen && (
              <div className="window-action-button">
                <IconButton
                  icon={<RenameIcon />}
                  bordered
                  title={Locale.Chat.EditMessage.Title}
                  ariaLabel={Locale.Chat.Actions.Edit}
                  onClick={() => setIsEditingMessage(true)}
                />
              </div>
            )}
            <div className="window-action-button">
              <IconButton
                icon={<ExportIcon />}
                bordered
                title={Locale.Chat.Actions.Export}
                onClick={() => {
                  setShowExport(true);
                }}
              />
            </div>
          </div>

          <PromptToast
            showToast={!hitBottom}
            showModal={showPromptModal}
            setShowModal={setShowPromptModal}
          />
        </div>
        <div className={styles["chat-main"]}>
          <div className={styles["chat-body-container"]}>
            <div
              className={styles["chat-body"]}
              ref={scrollRef}
              onScroll={(e) => onChatBodyScroll(e.currentTarget)}
              onMouseDown={() => inputRef.current?.blur()}
              onTouchStart={() => {
                inputRef.current?.blur();
                setAutoScroll(false);
              }}
              style={{
                justifyContent: showWelcome ? "center" : "flex-start",
              }}
            >
              {showWelcome ? (
                <div className={styles["welcome-container"]}>
                  <div className={styles["welcome-logo"]}>
                    <svg viewBox="0 0 24 24">
                      <path d="M12 1.5l1.35 4.15h4.35l-3.52 2.56 1.35 4.15L12 9.8l-3.53 2.56 1.35-4.15-3.52-2.56h4.35L12 1.5z" />
                      <path d="M12 22.5l-1.35-4.15h-4.35l3.52-2.56-1.35-4.15L12 14.2l3.53-2.56-1.35 4.15 3.52 2.56h-4.35L12 22.5z" />
                      <path d="M1.5 12l4.15-1.35v-4.35l2.56 3.52 4.15-1.35L9.8 12l2.56 3.53-4.15-1.35-2.56 3.52v-4.35L1.5 12z" />
                      <path d="M22.5 12l-4.15 1.35v4.35l-2.56-3.52-4.15 1.35L14.2 12l-2.56-3.53 4.15 1.35 2.56-3.52v4.35l4.15-12z" />
                    </svg>
                  </div>
                  <div className={styles["welcome-greeting"]}>
                    {greeting}, {userName}
                  </div>

                  <div className={styles["chat-welcome-input-wrapper"]}>
                    <div
                      className={clsx(styles["chat-input-panel-inner"], {
                        [styles["chat-input-panel-inner-attach"]]:
                          attachImages.length !== 0,
                      })}
                    >
                      <textarea
                        ref={inputRef}
                        className={styles["chat-input"]}
                        placeholder={Locale.Chat.Input(submitKey)}
                        onInput={(e) => onInput(e.currentTarget.value)}
                        value={userInput}
                        onKeyDown={(e) => onInputKeyDown(e)}
                        onFocus={scrollToBottom}
                        onClick={scrollToBottom}
                        rows={inputRows}
                        autoFocus={!isMobileScreen}
                        style={{
                          fontSize: config.fontSize,
                          fontFamily: config.fontFamily,
                        }}
                      />
                      <div
                        className={styles["model-pill"]}
                        onClick={() => setShowModelSelector(true)}
                      >
                        <span className={styles["model-pill-name"]}>
                          {session.mask.modelConfig.model}
                        </span>
                        <div className={styles["model-pill-icon"]}>
                          <svg viewBox="0 0 10 6" fill="none">
                            <path
                              d="M1 1L5 5L9 1"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                      <IconButton
                        icon={isRecording ? <LoadingIcon /> : <HeadphoneIcon />}
                        className={clsx(styles["chat-input-record"], {
                          [styles["recording"]]: isRecording,
                        })}
                        onClick={onRecord}
                      />
                    </div>

                    <div className={styles["welcome-suggestions"]}>
                      <div
                        className={styles["suggestion-button"]}
                        onClick={() => setUserInput("Help me write...")}
                      >
                        <span>✍️</span> Write
                      </div>
                      <div
                        className={styles["suggestion-button"]}
                        onClick={() => setUserInput("Help me learn...")}
                      >
                        <span>🎓</span> Learn
                      </div>
                      <div
                        className={styles["suggestion-button"]}
                        onClick={() => uploadFile()}
                      >
                        <span>📁</span> Upload
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                messages
                  // TODO
                  // .filter((m) => !m.isMcpResponse)
                  .map((message: RenderMessage, i) => {
                    const isUser = message.role === "user";
                    const isContext = i < context.length;
                    const showActions =
                      i > 0 &&
                      !(message.preview || message.content.length === 0) &&
                      !isContext;
                    const showTyping = message.preview || message.streaming;

                    const shouldShowClearContextDivider =
                      i === clearContextIndex - 1;

                    return (
                      <Fragment key={message.id}>
                        <div
                          className={
                            isUser
                              ? styles["chat-message-user"]
                              : styles["chat-message"]
                          }
                        >
                          <div className={styles["chat-message-container"]}>
                            <div className={styles["chat-message-header"]}>
                              <div className={styles["chat-message-avatar"]}>
                                <div className={styles["chat-message-edit"]}>
                                  <IconButton
                                    icon={<EditIcon />}
                                    ariaLabel={Locale.Chat.Actions.Edit}
                                    onClick={async () => {
                                      const newMessage = await showPrompt(
                                        Locale.Chat.Actions.Edit,
                                        getMessageTextContent(message),
                                        10,
                                      );
                                      let newContent:
                                        | string
                                        | MultimodalContent[] = newMessage;
                                      const images = getMessageImages(message);
                                      if (images.length > 0) {
                                        newContent = [
                                          { type: "text", text: newMessage },
                                        ];
                                        for (
                                          let i = 0;
                                          i < images.length;
                                          i++
                                        ) {
                                          newContent.push({
                                            type: "image_url",
                                            image_url: {
                                              url: images[i],
                                            },
                                          });
                                        }
                                      }
                                      chatStore.updateTargetSession(
                                        session,
                                        (session) => {
                                          const m = session.mask.context
                                            .concat(session.messages)
                                            .find((m) => m.id === message.id);
                                          if (m) {
                                            m.content = newContent;
                                          }
                                        },
                                      );
                                    }}
                                  ></IconButton>
                                </div>
                                {isUser ? (
                                  <Avatar avatar={config.avatar} />
                                ) : (
                                  <>
                                    {["system"].includes(message.role) ? (
                                      <Avatar avatar="2699-fe0f" />
                                    ) : (
                                      <MaskAvatar
                                        avatar={session.mask.avatar}
                                        model={
                                          message.model ||
                                          session.mask.modelConfig.model
                                        }
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                              {!isUser && (
                                <div className={styles["chat-model-name"]}>
                                  {message.model}
                                </div>
                              )}

                              {showActions && (
                                <div className={styles["chat-message-actions"]}>
                                  <div className={styles["chat-input-actions"]}>
                                    {message.streaming ? (
                                      <ChatAction
                                        text={Locale.Chat.Actions.Stop}
                                        icon={<StopIcon />}
                                        onClick={() =>
                                          onUserStop(message.id ?? i)
                                        }
                                      />
                                    ) : (
                                      <>
                                        <ChatAction
                                          text={Locale.Chat.Actions.Retry}
                                          icon={<ResetIcon />}
                                          onClick={() => onResend(message)}
                                        />

                                        <ChatAction
                                          text={Locale.Chat.Actions.Delete}
                                          icon={<DeleteIcon />}
                                          onClick={() =>
                                            onDelete(message.id ?? i)
                                          }
                                        />

                                        <ChatAction
                                          text={Locale.Chat.Actions.Pin}
                                          icon={<PinIcon />}
                                          onClick={() => onPinMessage(message)}
                                        />
                                        <ChatAction
                                          text={Locale.Chat.Actions.Copy}
                                          icon={<CopyIcon />}
                                          onClick={() =>
                                            copyToClipboard(
                                              getMessageTextContent(message),
                                            )
                                          }
                                        />
                                        <ChatAction
                                          text={"Reply"}
                                          icon={<ReplyIcon />}
                                          onClick={() => {
                                            let quote =
                                              getMessageTextContent(message);
                                            const selection = window
                                              .getSelection()
                                              ?.toString();
                                            if (
                                              selection &&
                                              quote.includes(selection)
                                            ) {
                                              quote = selection;
                                            }
                                            const quoteText = `> ${quote.split("\n").join("\n> ")}\n\n`;
                                            setUserInput((prev) =>
                                              prev
                                                ? prev + "\n\n" + quoteText
                                                : quoteText,
                                            );
                                            inputRef.current?.focus();
                                          }}
                                        />
                                        <ChatAction
                                          text={"Fork"}
                                          icon={<ReturnIcon />}
                                          onClick={() =>
                                            chatStore.forkSessionFrom(
                                              session,
                                              i,
                                            )
                                          }
                                        />
                                        {config.ttsConfig.enable && (
                                          <ChatAction
                                            text={
                                              speechStatus
                                                ? Locale.Chat.Actions.StopSpeech
                                                : Locale.Chat.Actions.Speech
                                            }
                                            icon={
                                              speechStatus ? (
                                                <SpeakStopIcon />
                                              ) : (
                                                <SpeakIcon />
                                              )
                                            }
                                            onClick={() =>
                                              openaiSpeech(
                                                getMessageTextContent(message),
                                              )
                                            }
                                          />
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {message?.tools?.length == 0 && showTyping && (
                              <div className={styles["chat-message-status"]}>
                                {Locale.Chat.Typing}
                              </div>
                            )}
                            {/*@ts-ignore*/}
                            {message?.tools?.length > 0 && (
                              <div className={styles["chat-message-tools"]}>
                                {message?.tools?.map((tool) => (
                                  <div
                                    key={tool.id}
                                    title={tool?.errorMsg}
                                    className={styles["chat-message-tool"]}
                                  >
                                    {tool.isError === false ? (
                                      <ConfirmIcon />
                                    ) : tool.isError === true ? (
                                      <CloseIcon />
                                    ) : (
                                      <LoadingButtonIcon />
                                    )}
                                    <span>{tool?.function?.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className={styles["chat-message-item"]}>
                              <Markdown
                                key={message.streaming ? "loading" : "done"}
                                content={getMessageTextContent(message)}
                                loading={
                                  (message.preview || message.streaming) &&
                                  message.content.length === 0 &&
                                  !isUser
                                }
                                //   onContextMenu={(e) => onRightClick(e, message)} // hard to use
                                onDoubleClickCapture={() => {
                                  if (!isMobileScreen) return;
                                  setUserInput(getMessageTextContent(message));
                                }}
                                fontSize={fontSize}
                                fontFamily={fontFamily}
                                parentRef={scrollRef}
                                defaultShow={i >= messages.length - 6}
                              />

                              {/* Render Images */}
                              {getMessageImages(message).length == 1 && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  className={styles["chat-message-item-image"]}
                                  src={getMessageImages(message)[0]}
                                  alt=""
                                />
                              )}
                              {getMessageImages(message).length > 1 && (
                                <div
                                  className={styles["chat-message-item-images"]}
                                  style={
                                    {
                                      "--image-count":
                                        getMessageImages(message).length,
                                    } as React.CSSProperties
                                  }
                                >
                                  {getMessageImages(message).map(
                                    (image, index) => {
                                      return (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                          className={
                                            styles[
                                              "chat-message-item-image-multi"
                                            ]
                                          }
                                          key={index}
                                          src={image}
                                          alt=""
                                        />
                                      );
                                    },
                                  )}
                                </div>
                              )}

                              {/* Render File Attachments (Card View) */}
                              {message.attachments &&
                                message.attachments.length > 0 && (
                                  <div
                                    className={
                                      styles["chat-message-attachments"]
                                    }
                                  >
                                    {message.attachments.map((url, index) => {
                                      if (url.startsWith("data:image/"))
                                        return null;

                                      const isPdf =
                                        url.startsWith("application:pdf:");
                                      const isXlsx =
                                        url.startsWith("application:xlsx:");
                                      const isText =
                                        url.startsWith("application:text:");
                                      const isVideo =
                                        url.startsWith("data:video/");

                                      if (
                                        !isPdf &&
                                        !isXlsx &&
                                        !isText &&
                                        !isVideo
                                      )
                                        return null;

                                      let fileName = "File";
                                      if (isPdf || isXlsx || isText) {
                                        fileName =
                                          url.split(":")[2] || "Unknown File";
                                      }

                                      return (
                                        <div
                                          key={index}
                                          className={
                                            styles["chat-message-attachment"]
                                          }
                                          title={fileName}
                                          onClick={() => {
                                            if (isPdf || isXlsx || isText) {
                                              const content = url
                                                .split(":")
                                                .slice(3)
                                                .join(":");
                                              if (content) {
                                                showToast(
                                                  "Konten file tersedia untuk AI.",
                                                );
                                              }
                                            }
                                          }}
                                        >
                                          <div
                                            className={
                                              styles["attachment-icon"]
                                            }
                                          >
                                            {isPdf
                                              ? "📄"
                                              : isXlsx
                                                ? "📊"
                                                : isVideo
                                                  ? "🎥"
                                                  : "📝"}
                                          </div>
                                          <div
                                            className={
                                              styles["attachment-name"]
                                            }
                                          >
                                            {fileName}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                            </div>
                            {message?.audio_url && (
                              <div className={styles["chat-message-audio"]}>
                                <audio src={message.audio_url} controls />
                              </div>
                            )}

                            <div className={styles["chat-message-action-date"]}>
                              {isContext
                                ? Locale.Chat.IsContext
                                : message.date.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {shouldShowClearContextDivider && (
                          <ClearContextDivider />
                        )}
                      </Fragment>
                    );
                  })
              )}
            </div>
            {!showWelcome && (
              <div className={styles["chat-input-panel"]}>
                <PromptHints
                  prompts={promptHints}
                  onPromptSelect={onPromptSelect}
                />

                <ChatActions
                  uploadFile={uploadFile}
                  attachImages={attachImages}
                  setAttachImages={setAttachImages}
                  setUploading={setUploading}
                  showPromptModal={() => setShowPromptModal(true)}
                  scrollToBottom={scrollToBottom}
                  hitBottom={hitBottom}
                  uploading={uploading}
                  showPromptHints={() => {
                    if (promptHints.length > 0) {
                      setPromptHints([]);
                      return;
                    }
                    inputRef.current?.focus();
                  }}
                  setShowShortcutKeyModal={setShowShortcutKeyModal}
                  setUserInput={setUserInput}
                  setShowChatSidePanel={setShowChatSidePanel}
                  showKnowledgeBase={showKnowledgeBase}
                  setShowKnowledgeBase={setShowKnowledgeBase}
                />

                {/* ── Memory slider + Agent toggle ── */}
                <div className={styles["chat-input-toolbar"]}>
                  {/* Memory pill */}
                  <div
                    className={styles["memory-pill"]}
                    onClick={() => setShowMemorySlider((v) => !v)}
                    title="Chat memory depth"
                  >
                    <span className={styles["memory-pill-icon"]}>🧠</span>
                    <span className={styles["memory-pill-label"]}>
                      {memoryCount}
                    </span>
                  </div>
                  {showMemorySlider && (
                    <div className={styles["memory-slider-popup"]}>
                      <div className={styles["memory-slider-label"]}>
                        Memory depth: <strong>{memoryCount}</strong> messages
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={32}
                        step={1}
                        value={memoryCount}
                        onChange={(e) => setMemoryCount(Number(e.target.value))}
                        className={styles["memory-slider-input"]}
                      />
                      <div className={styles["memory-slider-bounds"]}>
                        <span>1</span>
                        <span>32</span>
                      </div>
                    </div>
                  )}

                  {/* Agent toggle */}
                  <div
                    className={clsx(styles["agent-toggle"], {
                      [styles["agent-toggle-active"]]: agentMode,
                    })}
                    onClick={() => {
                      setAgentMode((v) => !v);
                      setAgentSteps([]);
                    }}
                    title={
                      agentMode
                        ? "Agent mode ON — click to disable"
                        : "Enable agentic AI (web search, tools, multi-step)"
                    }
                  >
                    ⚡
                    <span className={styles["agent-toggle-label"]}>
                      {agentMode ? "Agent ON" : "Agent"}
                    </span>
                  </div>
                </div>
                <div
                  className={clsx(styles["chat-input-panel-inner"], {
                    [styles["chat-input-panel-inner-attach"]]:
                      attachImages.length !== 0,
                  })}
                >
                  <textarea
                    ref={inputRef}
                    className={styles["chat-input"]}
                    placeholder={Locale.Chat.Input(submitKey)}
                    onInput={(e) => onInput(e.currentTarget.value)}
                    value={userInput}
                    onKeyDown={(e) => onInputKeyDown(e)}
                    onFocus={scrollToBottom}
                    onClick={scrollToBottom}
                    rows={inputRows}
                    autoFocus={!isMobileScreen}
                    style={{
                      fontSize: config.fontSize,
                      fontFamily: config.fontFamily,
                    }}
                  />
                  <div
                    className={styles["model-pill"]}
                    onClick={() => setShowModelSelector(true)}
                  >
                    <span className={styles["model-pill-name"]}>
                      {session.mask.modelConfig.model}
                    </span>
                    <div className={styles["model-pill-icon"]}>
                      <svg viewBox="0 0 10 6" fill="none">
                        <path
                          d="M1 1L5 5L9 1"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <IconButton
                    icon={isRecording ? <LoadingIcon /> : <HeadphoneIcon />}
                    className={clsx(styles["chat-input-record"], {
                      [styles["recording"]]: isRecording,
                    })}
                    onClick={onRecord}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModelSelector && (
        <Selector
          items={models.map((m) => ({
            title: m.displayName || m.name,
            subTitle: m.provider?.providerName,
            value: `${m.name}@${m.provider?.providerName}`,
          }))}
          onClose={() => setShowModelSelector(false)}
          onSelection={(selection) => {
            const val = selection[0];
            const [model, providerName] = getModelProvider(val);
            chatStore.updateTargetSession(session, (s) => {
              s.mask.modelConfig.model = model as ModelType;
              s.mask.modelConfig.providerName = providerName as ServiceProvider;
              (s.mask.modelConfig as any).parallelModels = [];
              s.mask.syncGlobalConfig = false;
              showToast(model);
            });
          }}
        />
      )}

      {showExport && (
        <ExportMessageModal onClose={() => setShowExport(false)} />
      )}

      {isEditingMessage && (
        <EditMessageModal
          onClose={() => {
            setIsEditingMessage(false);
          }}
        />
      )}

      {showKnowledgeBase && (
        <Draggable handle={`.${styles["knowledge-header"]}`}>
          <div className={styles["knowledge-panel"]}>
            <div className={styles["knowledge-header"]}>
              <div className={styles["knowledge-title"]}>
                Knowledge Base (RAG)
              </div>
              <div className={styles["knowledge-actions"]}>
                <IconButton
                  icon={<AddIcon />}
                  onClick={uploadToKnowledge}
                  title="Add File"
                />
                <IconButton
                  icon={<CloseIcon />}
                  onClick={() => setShowKnowledgeBase(false)}
                />
              </div>
            </div>
            <div className={styles["knowledge-body"]}>
              <div className={styles["knowledge-section-title"]}>
                Connect Integrations
              </div>
              <div className={styles["knowledge-integrations"]}>
                <div
                  className={styles["integration-button"]}
                  onClick={uploadToKnowledge}
                >
                  <div className={styles["integration-icon"]}>📁</div>
                  <div>Upload Files</div>
                </div>
                <div
                  className={styles["integration-button"]}
                  onClick={scrapeGithub}
                >
                  <div className={styles["integration-icon"]}>🐈</div>
                  <div>Github</div>
                </div>
              </div>
              <div className={styles["knowledge-section-title"]}>
                Indexed Knowledge
              </div>
              <div className={styles["knowledge-list"]}>
                {session.knowledge?.length === 0 ? (
                  <div className={styles["knowledge-empty"]}>No files yet</div>
                ) : (
                  session.knowledge?.map((item, index) => (
                    <div key={index} className={styles["knowledge-item"]}>
                      <div className={styles["knowledge-item-info"]}>
                        <div className={styles["knowledge-item-name"]}>
                          {item.name}
                        </div>
                        <div className={styles["knowledge-item-size"]}>
                          {(item.content.length / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <IconButton
                        icon={<DeleteIcon />}
                        onClick={() => {
                          chatStore.updateTargetSession(session, (session) => {
                            session.knowledge = session.knowledge?.filter(
                              (_, i) => i !== index,
                            );
                          });
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Draggable>
      )}

      {selectionPosition && (
        <div
          className={styles["selection-overlay"]}
          style={{
            left: selectionPosition.left,
            top: selectionPosition.top,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const quoteText = `> ${selectionPosition.content
              .split("\n")
              .join("\n> ")}\n\n`;
            setUserInput((prev) =>
              prev ? prev + "\n\n" + quoteText : quoteText,
            );
            inputRef.current?.focus();
            setSelectionPosition(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          <ReplyIcon />
          <span>Reply</span>
        </div>
      )}
    </>
  );
}

export function Chat() {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  return <ChatContent key={session.id}></ChatContent>;
}
