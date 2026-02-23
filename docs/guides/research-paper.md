# Writing Research Papers

Manuscript Markdown lets you write and revise papers in plain text while collaborating with colleagues who expect to use Word to comment on or suggest edits — and keep your work tracked in a Git repository.

## Document Structure

You can optionally include a YAML frontmatter block at the top of your document to set metadata:

```markdown
---
title: My Research Paper
csl: apa
---

# Abstract

...

# Introduction

...
```

### Metadata Fields

- `title`: The title of your paper.
- `csl`: The citation style to use (e.g., `apa`, `ieee`, `nature`). You can use any style from the [CSL repository](https://github.com/citation-style-language/styles).
- Text style customization: see [Configuration](../configuration.md) for options like fonts and spacing.

## Citations and Bibliography

Citations use standard [BibTeX](https://www.bibtex.org/) format, so you don't need to use Zotero at all. If you do use Zotero, the converter translates between BibTeX and Zotero field codes when importing and exporting Word documents.

### Inserting Citations

You can insert citations using the standard Pandoc syntax:

- `[@smith2020]` -> (Smith, 2020)
- `[@smith2020; @jones2021]` -> (Smith, 2020; Jones, 2021)
- `[-@smith2020]` -> (2020)

When you export to Word, these are converted to active Zotero citations.

### Managing the Bibliography

When you import a Word document that contains a bibliography, the converter automatically creates a companion `.bib` file alongside your `.md` file. If you prefer to manage your bibliography separately, specify the path in your frontmatter:

```markdown
---
bibliography: /path/to/my/references.bib
---
```

## Equations

You can write LaTeX equations directly in your markdown:

- Inline: `$E = mc^2$`
- Display:
  ```latex
  $$
  \int_{0}^{\infty} x^2 dx
  $$
  ```

These are converted to native Word equations upon export.

## Collaboration

You can track changes using Git (commit history shows what changed between drafts) or using **CriticMarkup** annotations in the document itself — or both.

- Add: `{++added text++}`
- Delete: `{--deleted text--}`
- Substitute: `{~~old text~>new text~~}`
- Comment: `{>>comment<<}`

See the [CriticMarkup Guide](../criticmarkup.md) for more details.

## AI-Assisted Editing

Because your manuscript lives in plain text, AI coding assistants — such as [Claude Code](https://claude.ai/code), [Codex](https://openai.com/codex), [GitHub Copilot](https://github.com/features/copilot), or similar tools — can read everything in your repository: the manuscript text, the `.bib` file, and the full revision history in git. This gives them the kind of context that is not possible when working in Word.

One example is agonizing over a word or phrase: you can select the text and ask the AI to suggest alternatives, think through connotations, or explain why a particular choice may or may not be working.

Another is writing feedback on a colleague's paper. You might add comments in Word as you read, then export to Markdown and ask the AI to adjust the tone — for instance, to make sure critical points come across as constructive rather than harsh.

You can also use a voice dictation tool — such as [Handy](https://github.com/cjpais/Handy), which does local transcription using Whisper and Parakeet — to think out loud while editing, and feed this into language models. Talking through a passage can help you work out what you want to say.
