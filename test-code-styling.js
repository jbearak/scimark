"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const frontmatter_1 = require("./frontmatter");
// Test the new code block styling fields
const testYaml = `---
title: Test Document
code-background-color: E8E8E8
code-font-color: 2E2E2E
code-block-inset: 16
---

# Test Document

Some content here.
`;
console.log('Testing code block styling frontmatter fields...');
const { metadata, body } = (0, frontmatter_1.parseFrontmatter)(testYaml);
console.log('Parsed metadata:', {
    title: metadata.title,
    codeBackgroundColor: metadata.codeBackgroundColor,
    codeFontColor: metadata.codeFontColor,
    codeBlockInset: metadata.codeBlockInset
});
const serialized = (0, frontmatter_1.serializeFrontmatter)(metadata);
console.log('Serialized frontmatter:');
console.log(serialized);
// Test aliases
const aliasYaml = `---
code-background: FF0000
code-color: 00FF00
---
`;
const { metadata: aliasMetadata } = (0, frontmatter_1.parseFrontmatter)(aliasYaml);
console.log('Alias test - parsed metadata:', {
    codeBackgroundColor: aliasMetadata.codeBackgroundColor,
    codeFontColor: aliasMetadata.codeFontColor
});
const aliasSerialized = (0, frontmatter_1.serializeFrontmatter)(aliasMetadata);
console.log('Alias test - serialized (should use canonical names):');
console.log(aliasSerialized);
// Test invalid values
const invalidYaml = `---
code-background-color: invalid
code-font-color: not-hex
code-block-inset: -5
---
`;
const { metadata: invalidMetadata } = (0, frontmatter_1.parseFrontmatter)(invalidYaml);
console.log('Invalid values test - should all be undefined:', {
    codeBackgroundColor: invalidMetadata.codeBackgroundColor,
    codeFontColor: invalidMetadata.codeFontColor,
    codeBlockInset: invalidMetadata.codeBlockInset
});
//# sourceMappingURL=test-code-styling.js.map