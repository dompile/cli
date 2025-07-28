# Include System Documentation

dompile supports two include systems: **Apache SSI-style comments** (recommended) and **DOM mode elements** (for advanced use cases). This document covers both syntaxes and when to use each.

## Include Syntax Types

### Comment-Based Includes (Recommended)

**Primary include syntax** using Apache SSI comments. This is the recommended approach for most users as it's compatible with web server SSI implementations.

```html
<!--#include virtual="/path/from/source/root.html" -->
<!--#include file="relative/path/from/current/file.html" -->
```

#### Virtual Includes

Virtual includes use paths relative to the **source root directory**:

```html
<!-- In any file, this resolves to src/.components/header.html -->
<!--#include virtual="/.components/header.html" -->

<!-- Nested directory structure -->
<!--#include virtual="/.layouts/blog/sidebar.html" -->

<!-- Cross-directory includes -->
<!--#include virtual="/shared/navigation.html" -->
```

**Path Resolution:**
- Always starts from source root (`src/` by default)
- Leading `/` is optional but recommended for clarity
- Case-sensitive on most systems

#### File Includes

File includes use paths relative to the **current file's directory**:

```html
<!-- From src/pages/about.html, includes src/pages/sidebar.html -->
<!--#include file="sidebar.html" -->

<!-- From src/blog/post.html, includes src/.components/header.html -->
<!--#include file="../.components/header.html" -->

<!-- Deeply nested relative path -->
<!--#include file="../../shared/footer.html" -->
```

**Path Resolution:**
- Relative to the directory containing the current file
- Use `../` to navigate up directories
- Use `./` for current directory (optional)

### Element-Based Includes (DOM Mode Only)

**Secondary syntax** using HTML elements. Only available when using DOM mode processing with `data-layout` attributes.

```html
<!-- Basic include element - only works in DOM mode pages with data-layout -->
<include src="/.components/header.html"></include>

<!-- With data attributes for token replacement -->
<include src="/.components/card.html" 
         data-title="My Card"
         data-content="Card description"></include>

<!-- Self-closing -->
<include src="/.components/footer.html" />
```

**When to use DOM mode includes:**
- Pages with `data-layout` attributes (DOM mode processing)
- When you need token replacement with `data-*` attributes
- For component-style includes with parameters

**Limitations:**
- Only supported in DOM mode (pages using `data-layout`)
- Token replacement limited to `data-token` attributes in components
- Not compatible with traditional Apache SSI implementations

## Usage Recommendations

### Use SSI Comments When:
- Building traditional static sites
- Need Apache web server compatibility  
- Working with markdown files
- Want simple, universal include syntax

### Use DOM Elements When:
- Using DOM mode with layouts and slots
- Need component parameterization
- Building component-based architectures
- Want modern HTML element syntax

## Include Features

### Recursive Processing

Includes can contain other includes, allowing complex composition:

**File: `src/.components/page-layout.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <!--#include virtual="/.components/head-meta.html" -->
</head>
<body>
  <!--#include virtual="/.components/header.html" -->
  <main>
    <!-- Content will be inserted here -->
  </main>
  <!--#include virtual="/.components/footer.html" -->
</body>
</html>
```

**File: `src/.components/header.html`**
```html
<header>
  <!--#include virtual="/.components/navigation.html" -->
  <!--#include virtual="/.components/user-menu.html" -->
</header>
```

### Circular Dependency Detection

dompile automatically detects and prevents infinite include loops:

```html
<!-- This will cause a circular dependency error -->
<!-- file-a.html -->
<!--#include file="file-b.html" -->

<!-- file-b.html -->
<!--#include file="file-a.html" -->
```

**Error message:**
```
Error: Circular dependency detected
Include chain: file-a.html → file-b.html → file-a.html
```

### Depth Limiting

Includes are limited to 10 levels deep to prevent runaway recursion:

```html
<!-- This will work (within limit) -->
<!--#include virtual="/level1.html" --> <!-- level1.html includes level2.html, etc. -->

<!-- Beyond 10 levels triggers depth limit error -->
```

## Security Features

### Path Traversal Prevention

dompile prevents includes from accessing files outside the source directory:

```html
<!-- These will be blocked for security -->
<!--#include file="../../../etc/passwd" -->
<!--#include virtual="/../../../../sensitive-file.txt" -->
```

**Error message:**
```
Security Error: Include path outside source directory
Attempted path: /etc/passwd
Allowed directories: src/
```

### File Type Restrictions

Only certain file types can be included:

**Allowed extensions:**
- `.html`, `.htm` - HTML content
- `.md`, `.markdown` - Markdown content (processed)
- `.txt` - Plain text content
- `.svg` - SVG images (as HTML)

**Blocked extensions:**
- `.js`, `.php`, `.asp` - Executable scripts
- `.json`, `.xml` - Data files (use virtual includes for processed versions)

## Directory Structure Best Practices

### Recommended Organization

```
src/
├── .components/           # Reusable includes
│   ├── header.html
│   ├── footer.html
│   ├── navigation.html
│   └── forms/
│       ├── contact.html
│       └── newsletter.html
├── .layouts/              # Page layouts
│   ├── default.html
│   ├── blog.html
│   └── landing.html
├── pages/                 # Main content
│   ├── about.html
│   └── contact.html
└── index.html
```

### Component Naming Conventions

- **Prefix with purpose**: `nav-`, `form-`, `card-`
- **Use kebab-case**: `user-profile.html`, `blog-sidebar.html`
- **Descriptive names**: `primary-navigation.html` vs `nav.html`
- **Organize by feature**: Group related components in subdirectories

## Advanced Patterns

### Conditional Includes

Include files conditionally based on frontmatter or context:

```html
<!-- In markdown with frontmatter -->
---
has_sidebar: true
layout_type: "blog"
---

# Page Content

{{#if has_sidebar}}
<!--#include virtual="/.components/sidebar.html" -->
{{/if}}

{{#if layout_type === "blog"}}
<!--#include virtual="/.components/blog-navigation.html" -->
{{/if}}
```

### Dynamic Include Paths

Use variables in include paths (requires variable substitution):

```html
<!-- With frontmatter variable -->
---
component_theme: "dark"
---

<!--#include virtual="/.components/header-{{ component_theme }}.html" -->
```

### Include with Parameters

Pass data to includes using HTML attributes:

```html
<!-- Future feature - parameter passing -->
<include src="/.components/card.html" 
         title="My Card" 
         content="Card description">
</include>
```

## Performance Considerations

### Build Performance

- **Include depth**: Deeper nesting increases build time
- **File size**: Large includes slow down processing
- **Dependency chains**: Complex dependency trees take longer to resolve

### Optimization Tips

1. **Keep includes focused**: Single responsibility per include
2. **Minimize nesting**: Flatten complex include hierarchies
3. **Use virtual paths**: More efficient than relative file paths
4. **Cache includes**: dompile automatically caches parsed includes

## Error Handling

### Common Errors

**Include file not found:**
```
Include file not found: header.html
  in: src/index.html:5
Suggestions:
  • Create the include file: src/.components/header.html
  • Check the include path and spelling
  • Use virtual path: <!--#include virtual="/.components/header.html" -->
```

**Circular dependency:**
```
Circular dependency detected in includes
Include chain: page.html → layout.html → page.html
  in: src/page.html:3
Suggestions:
  • Remove the circular reference
  • Restructure your include hierarchy
  • Use layout system instead of mutual includes
```

**Path traversal blocked:**
```
Security: Include path outside source directory
Path: ../../config.html
  in: src/page.html:7
Suggestions:
  • Use paths within the source directory
  • Move the include file to src/ or subdirectory
  • Use virtual paths starting from source root
```

### Debug Mode

Enable detailed include processing information:

```bash
DEBUG=1 dompile build
```

Shows:
- Include resolution steps
- File path calculations
- Dependency chain building
- Performance timing

## Integration with Other Features

### Markdown Processing

Includes work within markdown files:

```markdown
# My Blog Post

This is markdown content.

<!--#include virtual="/.components/code-example.html" -->

More markdown content here.
```

### Template System

Includes integrate with template slots:

```html
<!-- layout.html -->
<template>
  <!--#include virtual="/.components/header.html" -->
  <slot name="content"></slot>
  <!--#include virtual="/.components/footer.html" -->
</template>
```

### Asset Processing

Include files can reference assets that get tracked:

```html
<!-- header.html -->
<header>
  <img src="/images/logo.png" alt="Logo">
  <link rel="stylesheet" href="/css/header.css">
</header>
```

## Migration Guide

### From Other SSG Systems

**From Jekyll includes:**
```liquid
<!-- Jekyll -->
{% include header.html %}
<!-- dompile -->
<!--#include virtual="/.components/header.html" -->
```

**From Hugo partials:**
```go
<!-- Hugo -->
{{ partial "header.html" . }}
<!-- dompile -->
<!--#include virtual="/.components/header.html" -->
```

**From 11ty includes:**
```liquid
<!-- 11ty -->
{% include "header.njk" %}
<!-- dompile -->
<!--#include virtual="/.components/header.html" -->
```

### Legacy Apache SSI

dompile is compatible with most Apache SSI include directives:

```apache
<!-- Apache SSI (supported) -->
<!--#include virtual="/includes/header.shtml" -->
<!--#include file="footer.shtml" -->

<!-- Apache SSI (not supported) -->
<!--#exec cmd="date" -->
<!--#echo var="LAST_MODIFIED" -->
```

## See Also

- [Layout System Documentation](layouts-slots-templates.md)
- [Template Elements in Markdown](template-elements-in-markdown.md)
- [Token Replacement Documentation](token-replacement.md)
- [Getting Started Guide](getting-started.md)