"use client";

import { Fragment } from "react";

const TOKEN_RE = /(#[\p{L}\p{N}_-]+|@[A-Za-z0-9_.-]{2,40})/gu;

export function RichText({ text, onToken }: { text: string; onToken?: (token: string) => void }) {
  const parts = text.split(TOKEN_RE);
  return (
    <>
      {parts.map((part, index) => {
        const isToken = /^(#|@)/.test(part) && part.length > 1;
        if (!isToken) return <Fragment key={`${index}-${part}`}>{part}</Fragment>;
        if (!onToken) return <span className="inlineToken" key={`${index}-${part}`}>{part}</span>;
        return (
          <button
            type="button"
            className="inlineToken inlineTokenButton"
            key={`${index}-${part}`}
            onClick={(event) => {
              event.stopPropagation();
              onToken(part);
            }}
          >
            {part}
          </button>
        );
      })}
    </>
  );
}
