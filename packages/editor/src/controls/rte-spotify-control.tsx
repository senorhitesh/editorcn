"use client";

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, useEditorState } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";

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
    spotify: {
      setSpotifyEmbed: (src: string) => ReturnType;
    };
  }
}

const getSpotifyId = (url: string) => {
  const clean = url.trim();
  const patterns = [
    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/album\/([a-zA-Z0-9]+)/,
    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/artist\/([a-zA-Z0-9]+)/,
    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/episode\/([a-zA-Z0-9]+)/,
    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/show\/([a-zA-Z0-9]+)/,
    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/audiobook\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

const getSpotifyEmbedUrl = (url: string) => {
  try {
    const input = new URL(url.trim());

    if (
      !["open.spotify.com", "www.open.spotify.com"].includes(input.hostname)
    ) {
      return null;
    }
    const match = input.pathname.match(
      /^\/(track|album|playlist|episode|show|audiobook)\/([^/]+)(?:\/([^/]+))?\/?$/
    );

    if (!match) {
      return null;
    }

    return {
      songId: match[2],
      type: match[1],
    };
  } catch {
    return null;
  }
};

const getSpotifyDefaultHeight = (type?: string) => {
  if (type === "track" || type === "episode") {
    return 152;
  }
  return 352;
};

export const SpotifyNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes } = props;
  const rawSrc = node.attrs.src || "";

  const spotifyId = getSpotifyId(rawSrc);
  const spotify = getSpotifyEmbedUrl(rawSrc);

  const type = spotify?.type;
  const songId = spotify?.songId;
  const targetHeight = getSpotifyDefaultHeight(type);

  useEffect(() => {
    if (
      node.attrs.height === 280 ||
      (!node.attrs.height && targetHeight !== 152)
    ) {
      updateAttributes({ height: targetHeight });
    }
  }, [node.attrs.height, targetHeight, updateAttributes]);

  if (!spotify || !spotifyId) {
    return null;
  }

  const embedUrl = new URL(`https://open.spotify.com/embed/${type}/${songId}`);

  return (
    <ResizableNodeView
      disableVerticalResize={true}
      lockAspect={false}
      maxWidth={800}
      minWidth={280}
      onSrcChange={(newSrc) => {
        const newSpotify = getSpotifyEmbedUrl(newSrc);
        const newHeight = getSpotifyDefaultHeight(newSpotify?.type);
        updateAttributes({ height: newHeight, src: newSrc });
      }}
      {...props}
    >
      <iframe
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        data-testid="embed-spotify"
        loading="lazy"
        src={embedUrl.toString()}
        style={{
          border: 0,
          borderRadius: 12,
          height: "100%",
          maxWidth: "100%",
          width: "100%",
        }}
        title="Spotify Embed"
      />
    </ResizableNodeView>
  );
};

export const SpotifyEmbed = Node.create({
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
        default: 152,
        parseHTML: (el: HTMLElement) =>
          el.dataset.height ? Number(el.dataset.height) : 152,
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
      setSpotifyEmbed:
        (src: string) =>
        ({ commands }) => {
          const spotify = getSpotifyEmbedUrl(src);
          const height = getSpotifyDefaultHeight(spotify?.type);
          return commands.insertContent({
            attrs: { height, src },
            type: "spotify",
          });
        },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(SpotifyNodeView);
  },
  atom: true,
  draggable: true,
  group: "block",
  name: "spotify",
  parseHTML() {
    return [{ tag: 'div[data-type="spotify"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-align": HTMLAttributes["data-align"],
        "data-src": HTMLAttributes["data-src"],
        "data-type": "spotify",
      },
      [
        "iframe",
        {
          allowfullscreen: "true",
          class: "rte-embed-iframe",
          src: HTMLAttributes["data-src"],
        },
      ],
    ];
  },
});

export const SpotifyEmbedControl = ({ className }: { className?: string }) => {
  const { editor } = useRichTextEditorContext();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const { active } = useEditorState({
    editor: editor ?? null,
    selector: (ctx) => ({
      active:
        ctx.editor && !ctx.editor.isDestroyed
          ? ctx.editor.isActive("spotify")
          : false,
    }),
  }) ?? { active: false };

  const handleInsert = useCallback(() => {
    if (url && editor) {
      editor.chain().focus().setSpotifyEmbed(url).run();
      setUrl("");
    }
  }, [url, editor]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <RichTextEditorControl
            active={active}
            aria-label="Embed Spotify Song"
            className={className}
            title="Embed Spotify Song"
          >
            <svg
              className="rte-editor-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </RichTextEditorControl>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Embed Spotify Song</DialogTitle>
          <DialogDescription>Paste a Spotify song URL.</DialogDescription>
        </DialogHeader>
        <Input
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url) {
              handleInsert();
              setOpen(false);
            }
          }}
          placeholder="https://open.spotify.com/track?Oxs..."
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
