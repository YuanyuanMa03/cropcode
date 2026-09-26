import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon, UpdateIcon } from "@radix-ui/react-icons";
import type { PreviewState } from "./fixtures";

export function IconButton({
  label,
  children,
  onClick,
  active = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      className="icon-button"
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content">
          <div className="section-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="关闭对话框">
              <Cross2Icon />
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function StateView({ state, onReset }: { state: Exclude<PreviewState, "ready">; onReset: () => void }) {
  const content = {
    loading: ["正在读取工作区", "载入状态演示，你可以随时返回正常场景。", "结束载入演示"],
    empty: ["这里还没有内容", "选择一个项目，或从一项具体的研究任务开始。", "打开演示项目"],
    error: ["本地服务连接已断开", "连接错误演示。输入草稿保留，可以重试连接。", "重试连接"],
  }[state];
  return (
    <div className="state-view" role="status">
      <span className="state-symbol">
        {state === "loading" ? <UpdateIcon className="spin" /> : state === "error" ? "!" : "—"}
      </span>
      <h2>{content[0]}</h2>
      <p>{content[1]}</p>
      <button className="primary" onClick={onReset}>
        {content[2]}
      </button>
    </div>
  );
}
