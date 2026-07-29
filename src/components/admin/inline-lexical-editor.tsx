"use client";

import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import {
  Bold,
  Italic,
  Link2,
  Unlink,
} from "lucide-react";
import {
  COMMAND_PRIORITY_HIGH,
  FORMAT_TEXT_COMMAND,
  KEY_ENTER_COMMAND,
  type EditorState,
} from "lexical";
import { useEffect } from "react";

import {
  approvedSmartMedLexicalNodes,
} from "@/components/admin/lexical-content-nodes";
import {
  contentInlineToLexicalState,
  lexicalStateToContentInline,
} from "@/lib/admin/lexical-conversion";
import { normalizeContentHref } from "@/lib/content/schema";
import type { ContentInline } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type InlineLexicalEditorProps = {
  content: ContentInline[];
  disabled?: boolean;
  label: string;
  namespace: string;
  onChange: (content: ContentInline[]) => void;
  placeholder?: string;
};

function ToolbarButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-xl text-smart-ink/65 transition hover:bg-smart-teal/10 hover:text-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-smart-teal disabled:cursor-not-allowed disabled:opacity-35"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function InlineToolbar({ disabled }: { disabled: boolean }) {
  const [editor] = useLexicalComposerContext();

  function setLink() {
    const candidate = window.prompt(
      "Introdu un link intern (/cale) sau un URL extern HTTPS:",
    );

    if (candidate === null) {
      return;
    }

    const href = normalizeContentHref(candidate);

    if (!href) {
      window.alert("Linkul trebuie să fie intern sau să folosească HTTPS.");
      return;
    }

    editor.dispatchCommand(TOGGLE_LINK_COMMAND, href);
  }

  return (
    <div
      aria-label="Formatare text"
      className="flex flex-wrap gap-1 border-b border-smart-abyss/10 bg-smart-cream/70 p-2"
      role="toolbar"
    >
      <ToolbarButton
        disabled={disabled}
        label="Aldin"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <Bold aria-hidden="true" className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        label="Cursiv"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <Italic aria-hidden="true" className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        label="Adaugă sau modifică link"
        onClick={setLink}
      >
        <Link2 aria-hidden="true" className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        label="Elimină linkul"
        onClick={() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)}
      >
        <Unlink aria-hidden="true" className="size-4" />
      </ToolbarButton>
    </div>
  );
}

function SingleBlockPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        () => true,
        COMMAND_PRIORITY_HIGH,
      ),
    [editor],
  );

  return null;
}

function EditablePlugin({ disabled }: { disabled: boolean }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  return null;
}

export function InlineLexicalEditor({
  content,
  disabled = false,
  label,
  namespace,
  onChange,
  placeholder = "Scrie conținutul blocului…",
}: InlineLexicalEditorProps) {
  const initialConfig = {
    editable: !disabled,
    editorState: JSON.stringify(contentInlineToLexicalState(content)),
    namespace: `smartmed-inline-${namespace}`,
    nodes: approvedSmartMedLexicalNodes,
    onError(error: Error) {
      throw error;
    },
    theme: {
      link: "text-smart-teal underline decoration-smart-aqua/60 underline-offset-2",
      paragraph: "m-0 min-h-7",
      text: {
        bold: "font-bold",
        italic: "italic",
      },
    },
  };

  function handleChange(editorState: EditorState) {
    onChange(lexicalStateToContentInline(editorState.toJSON()));
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-smart-abyss/12 bg-white",
        disabled && "bg-smart-cream/60",
      )}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <InlineToolbar disabled={disabled} />
        <div className="relative">
          <RichTextPlugin
            ErrorBoundary={LexicalErrorBoundary}
            contentEditable={
              <ContentEditable
                aria-label={label}
                className="min-h-24 px-4 py-3 text-sm leading-7 outline-none"
              />
            }
            placeholder={
              <span className="pointer-events-none absolute left-4 top-3 text-sm leading-7 text-smart-ink/35">
                {placeholder}
              </span>
            }
          />
        </div>
        <HistoryPlugin />
        <LinkPlugin
          validateUrl={(url) => normalizeContentHref(url) !== null}
        />
        <OnChangePlugin
          ignoreSelectionChange
          onChange={handleChange}
        />
        <EditablePlugin disabled={disabled} />
        <SingleBlockPlugin />
      </LexicalComposer>
    </div>
  );
}
