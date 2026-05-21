import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "a",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "s",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
];

const allowedAttributes: Record<string, string[]> = {
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  "*": ["class"],
};

const allowedSchemes = ["http", "https", "mailto", "tel"];

export function sanitizeRichHtml(rawHtml: string): string {
  return sanitizeHtml(rawHtml, {
    allowedTags,
    allowedAttributes,
    allowedSchemes,
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        const target = attribs.target;
        if (target && target.toLowerCase() === "_blank") {
          return {
            tagName,
            attribs: {
              ...attribs,
              rel: attribs.rel ?? "noopener noreferrer",
            },
          };
        }
        return { tagName, attribs };
      },
    },
  });
}
