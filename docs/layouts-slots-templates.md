# Layouts, Slots, and Templates

dompile provides a powerful templating system that combines traditional layouts with modern template and slot syntax. This document covers all aspects of the template system.

## Overview

The template system supports three main concepts:

- **Layouts**: Base templates that wrap content
- **Slots**: Placeholders for content insertion
- **Templates**: Modern component-based templating

## Layout System

### Basic Layout Usage

Layouts provide a base structure for your pages using variable substitution.

**Layout file: `src/.layouts/default.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
  <meta name="description" content="{{ description }}">
</head>
<body>
  <header>
    <h1>{{ site_name }}</h1>
  </header>
  <main>
    {{ content }}
  </main>
  <footer>
    <p>&copy; {{ year }} {{ site_name }}</p>
  </footer>
</body>
</html>
```

**Markdown file with layout: `src/about.md`**
```markdown
---
title: "About Us"
description: "Learn more about our company"
layout: default
site_name: "My Company"
year: 2024
---

# About Us

This content will replace {{ content }} in the layout.
```

### Layout Directory Structure

```
src/
├── .layouts/
│   ├── default.html      # Base layout
│   ├── blog.html         # Blog-specific layout
│   ├── landing.html      # Landing page layout
│   └── admin/
│       └── dashboard.html # Admin section layout
```

### Layout Selection

Layouts are selected in order of precedence:

1. **Data attribute**: `<div data-layout="layouts/custom.html">` or on html/body elements
2. **Frontmatter**: `layout: custom` (for markdown files)
3. **Default layout**: `.layouts/default.html`
4. **Basic HTML structure**: Auto-generated if no layout found

```html
<!-- Page with data-layout attribute -->
<div data-layout="blog.html">
  <h1>My Blog Post</h1>
</div>
```

```markdown
---
layout: blog              # Uses .layouts/blog.html
---
# My Blog Post
```

### Variable Substitution

Variables are replaced using `{{ variable }}` syntax:

**Available variables:**
- **Frontmatter**: Any YAML frontmatter data
- **Built-in**: `title`, `content`, `excerpt`, `tableOfContents`
- **Global**: Variables passed to build process

**Example with multiple variables:**
```html
<!-- layout.html -->
<article>
  <header>
    <h1>{{ title }}</h1>
    <p class="meta">
      Published on {{ date }} by {{ author }}
      <span class="reading-time">{{ reading_time }} min read</span>
    </p>
  </header>
  <div class="content">
    {{ content }}
  </div>
  <footer>
    <div class="tags">
      {{#each tags}}
      <span class="tag">{{ . }}</span>
      {{/each}}
    </div>
  </footer>
</article>
```

## Modern Template System

### Template Elements

Use `<template>` elements for modern component-based templating:

**Page using template: `src/index.html`**
```html
<div data-layout="layouts/default.html">
  <template data-slot="title">Welcome to My Site</template>
  <template data-slot="meta">
    <meta name="keywords" content="static site, generator">
  </template>
  
  <h1>Homepage Content</h1>
  <p>This content goes in the default slot.</p>
</div>
```

**Layout with slots: `src/layouts/default.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title><slot name="title">Default Title</slot></title>
  <slot name="meta"></slot>
</head>
<body>
  <main>
    <slot></slot> <!-- Default slot for main content -->
  </main>
</body>
</html>
```

### Data-Layout Attribute Syntax

Use the `data-layout` attribute to specify layouts and fill slots:

**Page with data-layout:**
```html
<div data-layout="layouts/blog.html">
  <template data-slot="sidebar">
    <h3>Recent Posts</h3>
    <ul>
      <li><a href="/post1">First Post</a></li>
      <li><a href="/post2">Second Post</a></li>
    </ul>
  </template>
  <template data-slot="meta">
    <meta name="author" content="John Doe">
  </template>
  
  <!-- Content outside templates goes to default slot -->
  <h1>My Blog Post</h1>
  <p>This is the main content that goes in the default slot.</p>
</div>
```

**Alternative placement on html/body elements:**
```html
<html data-layout="layouts/blog.html">
  <template data-slot="title">My Page Title</template>
  <!-- Page content -->
</html>

<!-- OR -->

<body data-layout="layouts/blog.html">
  <template data-slot="header">Custom Header</template>
  <!-- Page content -->
</body>
```

### Path Resolution for Layouts

Layout paths are resolved in this order:

1. **Absolute from source**: `data-layout="/layouts/custom.html"` → `src/layouts/custom.html`
2. **Relative to .layouts**: `data-layout="blog.html"` → `src/.layouts/blog.html`
3. **Custom directory**: `data-layout="templates/blog.html"` → `src/templates/blog.html`

## Slot System

### Named Slots

Define specific content areas with named slots:

**Layout with multiple slots:**
```html
<!DOCTYPE html>
<html>
<head>
  <slot name="head">
    <!-- Default head content -->
    <meta charset="UTF-8">
  </slot>
</head>
<body>
  <header>
    <slot name="header">
      <h1>Default Header</h1>
    </slot>
  </header>
  <aside>
    <slot name="sidebar">
      <p>Default sidebar content</p>
    </slot>
  </aside>
  <main>
    <slot name="content">
      <slot></slot> <!-- Fallback to default slot -->
    </slot>
  </main>
  <footer>
    <slot name="footer">
      <p>&copy; 2024 My Site</p>
    </slot>
  </footer>
</body>
</html>
```

**Page filling named slots:**
```html
<div data-layout="layouts/complex.html">
  <template data-slot="head">
    <title>Custom Page Title</title>
    <link rel="stylesheet" href="/custom.css">
  </template>
  
  <template data-slot="header">
    <h1>Custom Header</h1>
    <nav>...</nav>
  </template>
  
  <template data-slot="sidebar">
    <h3>Page Navigation</h3>
    <ul>...</ul>
  </template>
  
  <template data-slot="footer">
    <p>Custom footer for this page</p>
  </template>
  
  <!-- Default slot content -->
  <h2>Main Content</h2>
  <p>This goes in the default slot.</p>
</div>
```

### Default Slot

The unnamed slot receives content not in named templates:

```html
<!-- Layout -->
<main>
  <slot></slot> <!-- Receives default content -->
</main>

<!-- Page -->
<div data-layout="layout.html">
  <template data-slot="title">Page Title</template>
  
  <!-- This content goes to the default slot -->
  <h1>Main Heading</h1>
  <p>Main content here.</p>
</div>
```

### Slot Fallbacks

Provide fallback content for empty slots:

```html
<!-- Layout with fallbacks -->
<header>
  <slot name="header">
    <!-- Fallback content if no header slot provided -->
    <h1>Default Site Title</h1>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </slot>
</header>

<aside>
  <slot name="sidebar">
    <!-- Default sidebar -->
    <h3>Quick Links</h3>
    <ul>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </slot>
</aside>
```

## Advanced Template Patterns

### Nested Template Inheritance

Create layout hierarchies with multiple levels:

**Base layout: `layouts/base.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <slot name="head"></slot>
</head>
<body>
  <slot name="body"></slot>
</body>
</html>
```

**Content layout: `layouts/content.html`**
```html
<template extends="base.html">
  <template data-slot="head">
    <title><slot name="title"></slot></title>
    <slot name="meta"></slot>
  </template>
  
  <template data-slot="body">
    <header>
      <slot name="header"></slot>
    </header>
    <main>
      <slot name="content"></slot>
    </main>
    <footer>
      <slot name="footer"></slot>
    </footer>
  </template>
</template>
```

**Page using nested inheritance:**
```html
<template extends="layouts/content.html">
  <template data-slot="title">My Page</template>
  <template data-slot="header">
    <h1>Page Header</h1>
  </template>
  <template data-slot="content">
    <p>Page content here</p>
  </template>
</template>
```

### Component-Based Architecture

Build reusable components with slots:

**Card component: `components/card.html`**
```html
<div class="card">
  <header class="card-header">
    <slot name="header">Default Header</slot>
  </header>
  <div class="card-body">
    <slot></slot>
  </div>
  <footer class="card-footer">
    <slot name="footer"></slot>
  </footer>
</div>
```

**Using card component:**
```html
<!--#include virtual="/components/card.html" -->
<template data-slot="header">
  <h3>Product Card</h3>
</template>
<template data-slot="footer">
  <button>Buy Now</button>
</template>

<!-- Default slot content -->
<p>Product description goes here.</p>
<p class="price">$99.99</p>
```

### Conditional Slots

Show slots based on conditions:

```html
<!-- Layout with conditional slots -->
<article>
  <header>
    <h1><slot name="title"></slot></h1>
    {{#if author}}
    <p class="author">
      By <slot name="author">{{ author }}</slot>
    </p>
    {{/if}}
  </header>
  
  <div class="content">
    <slot></slot>
  </div>
  
  {{#if tags}}
  <footer class="tags">
    <slot name="tags">
      {{#each tags}}
      <span class="tag">{{ . }}</span>
      {{/each}}
    </slot>
  </footer>
  {{/if}}
</article>
```

## Integration with Includes

### Slots with Includes

Combine slot system with includes:

```html
<!-- Layout using includes -->
<template>
  <!--#include virtual="/.components/head.html" -->
  <body>
    <!--#include virtual="/.components/header.html" -->
    <main>
      <slot></slot>
    </main>
    <!--#include virtual="/.components/footer.html" -->
  </body>
</template>

<!-- Include with slots -->
<!-- components/header.html -->
<header>
  <h1><slot name="site-title">My Site</slot></h1>
  <nav>
    <slot name="navigation">
      <!--#include virtual="/.components/nav.html" -->
    </slot>
  </nav>
</header>
```

### Dynamic Includes in Slots

Use includes within slot content:

```html
<div data-layout="layouts/default.html">
  <template data-slot="sidebar">
    <!--#include virtual="/.components/recent-posts.html" -->
    <!--#include virtual="/.components/categories.html" -->
  </template>
  
  <template data-slot="footer">
    <!--#include virtual="/.components/social-links.html" -->
    <!--#include virtual="/.components/newsletter.html" -->
  </template>
  
  <h1>Main Content</h1>
</div>
```

## Markdown Integration

### Templates in Markdown

Use template syntax within markdown files:

```markdown
---
title: "Blog Post"
layout: blog
---

# {{ title }}

<template extends="layouts/blog.html">
  <template data-slot="sidebar">
    ## Related Posts
    - [Post 1](/post1)
    - [Post 2](/post2)
  </template>
  
  <template data-slot="meta">
    Published on {{ date }}
  </template>
</template>

This markdown content will be processed and placed in the default slot.
```

### Layout Selection in Markdown

Specify layouts in frontmatter:

```markdown
---
layout: custom-layout    # Uses .layouts/custom-layout.html
template: blog-post      # Alternative field name
---

Content here uses the specified layout.
```

## Performance and Best Practices

### Template Performance

- **Keep templates focused**: Single responsibility
- **Minimize nesting**: Avoid deep template inheritance
- **Cache-friendly**: Templates are processed once per build
- **Slot efficiency**: Named slots are faster than complex selectors

### Best Practices

1. **Consistent naming**: Use descriptive slot names
2. **Fallback content**: Always provide meaningful defaults
3. **Documentation**: Comment complex template logic
4. **Testing**: Verify template rendering with different content

### Common Patterns

**Blog layout:**
```html
<!DOCTYPE html>
<html>
<head>
  <title><slot name="title">{{ title }}</slot> - Blog</title>
  <slot name="meta"></slot>
</head>
<body>
  <article>
    <header>
      <h1>{{ title }}</h1>
      <slot name="post-meta">
        <p>{{ date }} by {{ author }}</p>
      </slot>
    </header>
    <div class="content">
      <slot></slot>
    </div>
    <slot name="comments"></slot>
  </article>
</body>
</html>
```

**Landing page layout:**
```html
<!DOCTYPE html>
<html>
<head>
  <slot name="head"></slot>
</head>
<body class="landing">
  <slot name="hero"></slot>
  <slot name="features"></slot>
  <slot name="testimonials"></slot>
  <slot name="cta"></slot>
  <slot name="footer"></slot>
</body>
</html>
```

## Troubleshooting

### Common Issues

**Slot not rendering:**
- Check slot name spelling matches exactly
- Verify template syntax is correct
- Ensure layout file exists and is accessible

**Layout not applied:**
- Confirm layout file exists in `.layouts/` directory
- Check frontmatter layout name matches filename
- Verify layout has proper slot placeholders

**Template inheritance not working:**
- Check extends path is correct
- Ensure parent template exists
- Verify slot names match between parent and child

### Debug Tips

```bash
# Enable debug mode for template processing
DEBUG=1 dompile build

# Check specific file processing
dompile build --source src --output debug-dist
```

## Migration from Other Systems

### From Liquid Templates

```liquid
<!-- Liquid -->
{% layout "base" %}
{% block title %}Page Title{% endblock %}
{% block content %}Content here{% endblock %}

<!-- dompile -->
<template extends="layouts/base.html">
  <template data-slot="title">Page Title</template>
  <template data-slot="content">Content here</template>
</template>
```

### From Handlebars

```handlebars
<!-- Handlebars -->
{{> header title="Page Title"}}
<main>{{{content}}}</main>
{{> footer}}

<!-- dompile -->
<!--#include virtual="/.components/header.html" -->
<main>
  <slot></slot>
</main>
<!--#include virtual="/.components/footer.html" -->
```

## See Also

- [Include System Documentation](include-syntax.md)
- [Template Elements in Markdown](template-elements-in-markdown.md)
- [Getting Started Guide](getting-started.md)