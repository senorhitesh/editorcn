"use client";

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, useEditorState } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useCallback, useState } from "react";

import { RichTextEditorControl } from "../controls/rte-control";
import { ResizableNodeView } from "../extensions/resizable-node-view";
import { useRichTextEditorContext } from "../rte-context";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    codesandbox: {
      setCodeSandboxEmbed: (src: string) => ReturnType;
      setCodeSandBoxEmbed: (src: string) => ReturnType;
    };
  }
}

const getCodeSandboxEmbedUrl = (url: string) => {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      return null;
    }

    if (/^[a-zA-Z0-9_-]{4,40}$/.test(cleanUrl)) {
      return {
        embedUrl: `https://codesandbox.io/embed/${cleanUrl}`,
        sandboxId: cleanUrl,
        watchUrl: `https://codesandbox.io/s/${cleanUrl}`,
      };
    }

    const input = new URL(
      cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")
        ? cleanUrl
        : `https://${cleanUrl}`
    );

    const allowedHosts = ["codesandbox.io", "www.codesandbox.io"];

    if (!allowedHosts.includes(input.hostname)) {
      return null;
    }

    const match = input.pathname.match(
      /^\/(?:s|embed|p\/(?:sandbox|devbox|live))\/([a-zA-Z0-9_-]+)\/?$/
    );

    if (!match) {
      return null;
    }

    const [, sandboxId] = match;
    const embedUrl = new URL(`https://codesandbox.io/embed/${sandboxId}`);

    for (const [key, value] of input.searchParams.entries()) {
      embedUrl.searchParams.set(key, value);
    }

    return {
      embedUrl: embedUrl.toString(),
      sandboxId,
      watchUrl: `https://codesandbox.io/s/${sandboxId}`,
    };
  } catch {
    return null;
  }
};

export const CodeSandboxNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes } = props;
  const rawSrc = node.attrs.src || "";

  const codesandbox = getCodeSandboxEmbedUrl(rawSrc);

  if (!codesandbox) {
    return null;
  }

  return (
    <ResizableNodeView
      aspectRatio={16 / 9}
      lockAspect={false}
      maxWidth={1200}
      minWidth={320}
      onSrcChange={(newSrc) => updateAttributes({ src: newSrc })}
      videoSrc={rawSrc}
      watchUrl={codesandbox.watchUrl}
      {...props}
    >
      <iframe
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
        allowFullScreen
        className="rte-embed-iframe"
        data-testid="embed-codesandbox"
        loading="lazy"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        src={codesandbox.embedUrl}
        style={{
          border: 0,
          height: "100%",
          maxWidth: "100%",
          width: "100%",
        }}
        title="CodeSandbox Embed"
      />
    </ResizableNodeView>
  );
};

export const CodeSandboxEmbed = Node.create({
  addAttributes() {
    return {
      align: {
        default: "center",
        parseHTML: (el: HTMLElement) => el.dataset.align || "center",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-align": attrs.align,
        }),
      },
      height: {
        default: 500,
        parseHTML: (el: HTMLElement) =>
          el.dataset.height ? Number(el.dataset.height) : 500,
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-height": attrs.height,
        }),
      },
      src: {
        default: null,
        parseHTML: (el: HTMLElement) => el.dataset.src,
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-src": attrs.src,
        }),
      },
      width: {
        default: 800,
        parseHTML: (el: HTMLElement) =>
          el.dataset.width ? Number(el.dataset.width) : 800,
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-width": attrs.width,
        }),
      },
    };
  },
  addCommands() {
    return {
      setCodeSandBoxEmbed:
        (src: string) =>
        ({ commands }) => {
          const sandbox = getCodeSandboxEmbedUrl(src);
          if (!sandbox) {
            return false;
          }
          return commands.insertContent({
            attrs: { src: sandbox.embedUrl },
            type: "codesandbox",
          });
        },
      setCodeSandboxEmbed:
        (src: string) =>
        ({ commands }) => {
          const sandbox = getCodeSandboxEmbedUrl(src);
          if (!sandbox) {
            return false;
          }
          return commands.insertContent({
            attrs: { src: sandbox.embedUrl },
            type: "codesandbox",
          });
        },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeSandboxNodeView);
  },
  atom: true,
  draggable: true,
  group: "block",
  name: "codesandbox",
  parseHTML() {
    return [{ tag: 'div[data-type="codesandbox"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-align": HTMLAttributes["data-align"],
        "data-src": HTMLAttributes["data-src"],
        "data-type": "codesandbox",
      },
      [
        "iframe",
        {
          allowfullscreen: "true",
          class: "rte-embed-iframe",
          loading: "lazy",
          src: HTMLAttributes["data-src"],
        },
      ],
    ];
  },
});

export const CodeSandBoxEmbed = CodeSandboxEmbed;

export const CodeSandboxEmbedControl = ({
  className,
}: {
  className?: string;
}) => {
  const { editor } = useRichTextEditorContext();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const { active } = useEditorState({
    editor: editor ?? null,
    selector: (ctx) => ({
      active:
        ctx.editor && !ctx.editor.isDestroyed
          ? ctx.editor.isActive("codesandbox")
          : false,
    }),
  }) ?? { active: false };

  const handleInsert = useCallback(() => {
    if (url && editor) {
      editor.chain().focus().setCodeSandboxEmbed(url).run();
      setUrl("");
      setOpen(false);
    }
  }, [url, editor]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <RichTextEditorControl
            active={active}
            aria-label="Embed CodeSandbox"
            className={className}
            title="Embed CodeSandbox"
          >
            <svg
              className="rte-editor-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0 24H24V0H0V2.45455H21.5455V21.5455H2.45455V0H0Z" />
            </svg>
          </RichTextEditorControl>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Embed CodeSandbox</DialogTitle>
          <DialogDescription>Paste a CodeSandbox URL or ID.</DialogDescription>
        </DialogHeader>
        <Input
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url) {
              handleInsert();
              setOpen(false);
            }
          }}
          placeholder="https://codesandbox.io/s/..."
          value={url}
        />
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <DialogClose
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            disabled={!url}
            onClick={handleInsert}
          >
            Insert
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CodeSandBoxEmbedControl = CodeSandboxEmbedControl;
