---
name: markdown-style
description: Create and edit Markdown files using consistent general-purpose Markdown style. Apply to Markdown writing and formatting tasks in this repository, including Zenn articles; preserve format-specific metadata and syntax.
---

# Markdown style

Use this style when creating or editing Markdown. Follow the user's explicit formatting requests and any requirements of the target Markdown format first. When editing an existing document, keep unrelated content and established conventions intact unless the user asks for a style cleanup.

* Use ATX headings (`#`, `##`, `###`) in a logical hierarchy. Add one space after the marker. Avoid skipping heading levels.
* Separate headings, paragraphs, lists, quotes, and fenced code blocks with blank lines. Remove trailing whitespace. Keep one newline at the end of the file.
* Use `*` for every unordered list marker, including nested lists. Indent nested items consistently. Use numbered lists only when sequence matters.
* When describing a folder structure, use an unordered list rather than an ASCII tree or a fenced diagram. Add `/` to the end of each directory name; leave file names without `/`. Nest entries to show containment. For example:

  ~~~markdown
  * project/
    * articles/
      * example.md
    * README.md
  ~~~

* Use `~~~` fences for every code block, with a language identifier when the language is known. Do not use backtick fences. Use inline code for commands, paths, filenames, and identifiers mentioned in prose.
* Use Mermaid diagrams for flows, branching, sequences, and other relationships that benefit from a diagram. Write them in `~~~mermaid` blocks; do not use ASCII-art flowcharts. Keep folder structures as `*` lists with `/` on directories, even when other diagrams use Mermaid.
* Use descriptive link text. Do not repeat a bare URL when a Markdown link communicates the destination clearly.
* Preserve valid front matter, directives, embeds, and other platform-specific syntax. For Zenn articles, keep the required front matter fields and the existing publication state unless asked to change them.
* Review the rendered structure or run an available local Markdown check when practical. Fix formatting issues introduced by the edit.
