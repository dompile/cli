# Template Elements in Markdown

This document explains how to use template elements within markdown files to fill layout slots with rendered HTML content.

## Overview

dompile allows you to mix template syntax directly within markdown content, enabling powerful composition patterns where markdown content can be structured into different layout slots.

## Basic Layout Slot Filling

### Markdown File (`posts/blog-post.md`)

```markdown
---
title: "My Blog Post"
date: "2024-01-15"
---

# My Blog Post

This post shows how to use template elements in markdown.

<template extends="layouts/blog.html">
  <template data-slot="sidebar">
    ## Related Posts
    - [First Post](/posts/first.html)
    - [Second Post](/posts/second.html)
  </template>
  <template data-slot="meta">
    Published on {{ date }} by the author.
  </template>
</template>

## Main Content

This content will go into the default content slot of the layout.

The markdown is processed first, then template slots are filled.
```

### Layout File (`layouts/blog.html`)

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
</head>
<body>
  <article>
    <header>
      <h1>{{ title }}</h1>
      <div class="meta">
        <slot name="meta">Default meta info</slot>
      </div>
    </header>
    <main>
      <slot>{{ content }}</slot>
    </main>
    <aside>
      <slot name="sidebar">Default sidebar</slot>
    </aside>
  </article>
</body>
</html>
```

## Processed Output

The final rendered HTML will be:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Blog Post</title>
</head>
<body>
  <article>
    <header>
      <h1>My Blog Post</h1>
      <div class="meta">
        Published on 2024-01-15 by the author.
      </div>
    </header>
    <main>
      <h1>My Blog Post</h1>
      <p>This post shows how to use template elements in markdown.</p>
      <h2>Main Content</h2>
      <p>This content will go into the default content slot of the layout.</p>
      <p>The markdown is processed first, then template slots are filled.</p>
    </main>
    <aside>
      <h2>Related Posts</h2>
      <ul>
        <li><a href="/posts/first.html">First Post</a></li>
        <li><a href="/posts/second.html">Second Post</a></li>
      </ul>
    </aside>
  </article>
</body>
</html>
```

## Advanced Patterns

### Mixing Includes and Template Slots

```markdown
---
title: "Advanced Example"
layout: advanced
---

# Advanced Template Usage

<template extends="layouts/advanced.html">
  <template data-slot="navigation">
    <!--#include virtual="/.components/nav.html" -->
  </template>
  <template data-slot="hero">
    ## Welcome to {{ title }}
    <!--#include file="../components/hero-banner.html" -->
  </template>
</template>

Main content here will be processed as markdown and placed in the default slot.
```

### Conditional Slots

```markdown
---
title: "Product Page"
has_sidebar: true
product_id: "widget-123"
---

# {{ title }}

<template extends="layouts/product.html">
  <template data-slot="breadcrumbs">
    [Home](/) > [Products](/products) > {{ title }}
  </template>
  
  {{#if has_sidebar}}
  <template data-slot="sidebar">
    ## Related Products
    <!--#include virtual="/api/related/{{ product_id }}.html" -->
  </template>
  {{/if}}
</template>

Product description and details go here.
```

## Processing Order

1. **Frontmatter Parsing**: YAML frontmatter is extracted
2. **Include Processing**: `<!--#include -->` directives are processed
3. **Markdown Rendering**: Markdown content is converted to HTML
4. **Template Processing**: Template extends and slots are processed
5. **Variable Substitution**: `{{ variable }}` placeholders are replaced
6. **Layout Application**: Content is inserted into the layout

## Best Practices

1. **Keep It Simple**: Don't over-nest template elements
2. **Semantic Slots**: Use descriptive slot names (`sidebar`, `meta`, `navigation`)
3. **Fallback Content**: Always provide fallback content in layout slots
4. **Test Rendering**: Verify that markdown and templating work together correctly
5. **Performance**: Template processing adds overhead, use judiciously

## Limitations

- Template elements within markdown are processed after markdown rendering
- Complex nesting may lead to unexpected results
- Variable scope is limited to frontmatter and global configuration
- Not all template engines features are supported (dompile uses simple string replacement)

## See Also

- [Layout System Documentation](layouts-slots-templates.md)
- [Include System Documentation](include-syntax.md)