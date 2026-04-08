/**
 * EditorToolbar — formatting toolbar for the LeafletEditor.
 *
 * Renders buttons for all supported inline marks, block types, and media
 * insertions. Designed to be sticky at the top of the editor container.
 */

"use client";

import React, { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { ImageUploadResult } from "../types/index.js";

// Import extension types so their Commands<ReturnType> module augmentations
// are merged into @tiptap/core's ChainedCommands type. These are type-only
// imports — they produce no runtime output.
import type {} from "@tiptap/extension-bold";
import type {} from "@tiptap/extension-italic";
import type {} from "@tiptap/extension-underline";
import type {} from "@tiptap/extension-strike";
import type {} from "@tiptap/extension-code";
import type {} from "@tiptap/extension-heading";
import type {} from "@tiptap/extension-bullet-list";
import type {} from "@tiptap/extension-blockquote";
import type {} from "@tiptap/extension-code-block";
import type {} from "@tiptap/extension-horizontal-rule";
import type {} from "@tiptap/extension-image";
import type {} from "@tiptap/extension-link";
import type {} from "@tiptap/extension-youtube";

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  Quote,
  Code2,
  Minus,
  Link,
  Image,
  Video,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
  disabled,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "leaflet-toolbar-btn",
        isActive ? "leaflet-toolbar-btn--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="leaflet-toolbar-divider" aria-hidden="true" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export interface EditorToolbarProps {
  editor: Editor | null;
  /**
   * Called when the user selects an image to upload.
   * Should upload the file and return the CID and a temporary display URL.
   */
  onImageUpload: (file: File) => Promise<ImageUploadResult>;
  /** Whether an upload is in progress (controlled externally). */
  isUploading?: boolean;
  /** Enable image insertion controls in the toolbar. Defaults to true. */
  enableImageUpload?: boolean;
}

export function EditorToolbar({
  editor,
  onImageUpload,
  isUploading: isExternalUploading,
  enableImageUpload = true,
}: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isToolbarUploading, setIsToolbarUploading] = useState(false);
  const isUploading = isToolbarUploading || (isExternalUploading ?? false);

  if (!editor) return null;

  // Shorthand — editor.chain().focus() with extension commands fully typed
  // because the `import type {} from "@tiptap/extension-*"` imports above
  // activate each extension's Commands<ReturnType> module augmentation.
  const chain = () => editor.chain().focus();

  // ── Link ────────────────────────────────────────────────────────────────
  const handleLinkClick = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previousUrl ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    chain().extendMarkRange("link").setLink({ href: url }).run();
  };

  // ── YouTube ─────────────────────────────────────────────────────────────
  const handleYoutubeClick = () => {
    const url = window.prompt("Enter YouTube URL");
    if (!url) return;
    chain().setYoutubeVideo({ src: url }).run();
  };

  // ── Image file picker ────────────────────────────────────────────────────
  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so the same file can be re-selected
    setUploadError(null);
    setIsToolbarUploading(true);
    try {
      const { url, cid } = await onImageUpload(file);
      // setImage only accepts the base attrs declared by the Image extension.
      // The `cid` custom attr is injected via updateAttributes immediately after.
      chain().setImage({ src: url, alt: "" }).updateAttributes("image", { cid }).run();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Image upload failed";
      setUploadError(message);
      console.error("[LeafletEditor] Image upload failed", err);
    } finally {
      setIsToolbarUploading(false);
    }
  };

  const spinnerSvg = (
    <svg
      className="leaflet-spinner"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="leaflet-toolbar">
      {/* ── Inline marks ─────────────────────────────────────────────── */}
      <ToolbarButton
        onClick={() => chain().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => chain().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => chain().toggleMark("underline").run()}
        isActive={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <Underline size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => chain().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => chain().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="Inline Code"
      >
        <Code size={15} />
      </ToolbarButton>

      <Divider />

      {/* ── Headings ─────────────────────────────────────────────────── */}
      <ToolbarButton
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={15} />
      </ToolbarButton>

      <Divider />

      {/* ── Block types ───────────────────────────────────────────────── */}
      <ToolbarButton
        onClick={() => chain().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => chain().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => chain().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Code Block"
      >
        <Code2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => chain().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus size={15} />
      </ToolbarButton>

      <Divider />

      {/* ── Media & links ─────────────────────────────────────────────── */}
      <ToolbarButton
        onClick={handleLinkClick}
        isActive={editor.isActive("link")}
        title="Link"
      >
        <Link size={15} />
      </ToolbarButton>
      {enableImageUpload && (
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image"
          disabled={isUploading}
        >
          {isUploading ? spinnerSvg : <Image size={15} />}
        </ToolbarButton>
      )}
      <ToolbarButton onClick={handleYoutubeClick} title="Embed YouTube Video">
        <Video size={15} />
      </ToolbarButton>

      {/* Hidden file input */}
      {enableImageUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="leaflet-hidden"
          onChange={handleImageFileChange}
        />
      )}

      {/* Status / error banners */}
      {enableImageUpload && isUploading && (
        <div className="leaflet-toolbar-status leaflet-toolbar-status--uploading">
          {spinnerSvg}
          Uploading image…
        </div>
      )}
      {uploadError && (
        <div className="leaflet-toolbar-status leaflet-toolbar-status--error">
          {uploadError}
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="leaflet-toolbar-status__dismiss"
          >
            dismiss
          </button>
        </div>
      )}
    </div>
  );
}
