import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "a",
  "blockquote",
  "br",
  "button",
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
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "script",
  "section",
  "span",
  "strong",
  "style",
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
  img: ["src", "alt", "title", "width", "height", "loading", "style"],
  script: ["type"],
  style: ["type"],
  "*": ["class", "id", "style"],
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
    // Mặc định sanitize-html loại bỏ nội dung bên trong style/script.
    // Override để giữ lại — admin content tin tưởng được.
    nonTextTags: ["textarea", "option", "noscript"],
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
