# Complete Templating Guide

This comprehensive guide covers all aspects of dompile's powerful templating system, including layouts, templates, slots, includes, and their advanced interactions.

## Table of Contents

1. [System Overview](#system-overview)
2. [Layout System](#layout-system)
3. [Template Inheritance](#template-inheritance)
4. [Slot System](#slot-system)
5. [Include System](#include-system)
6. [Advanced Patterns](#advanced-patterns)
7. [Data Attributes](#data-attributes)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## System Overview

dompile provides four main templating features that work together:

- **Layouts**: Traditional templates with variable substitution (`{{ variable }}`)
- **Templates**: Modern inheritance with `<template extends="...">`
- **Slots**: Content placeholders with `<slot>` elements
- **Includes**: SSI-style includes with `<!--#include virtual="..." -->`

These systems can be used independently or combined for powerful templating patterns.

## Layout System

### Basic Layout Usage

Layouts provide page structure with variable substitution using `{{ variable }}` syntax.

**Layout file: `src/.layouts/default.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{ title }} - {{ site_name }}</title>
  <meta name="description" content="{{ description }}">
  <slot name="head"></slot>
</head>
<body>
  <header>
    <h1>{{ site_name }}</h1>
    <nav>{{ navigation }}</nav>
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

**Page using layout: `src/about.html`**

```html
---
title: "About Us"
description: "Learn about our company"
layout: default
site_name: "My Company"
year: 2024
navigation: "<a href='/'>Home</a> <a href='/about'>About</a>"
---

<h2>About Our Company</h2>
<p>This content replaces {{ content }} in the layout.</p>
```

### Layout Directory Structure

```text
src/
├── .layouts/           # Primary layout directory
│   ├── default.html    # Default layout
│   ├── blog.html       # Blog layout
│   └── landing.html    # Landing page layout
├── layouts/            # Alternative layout directory
│   ├── admin.html      # Admin layout
│   └── docs.html       # Documentation layout
```

### Layout Selection Priority

1. **Frontmatter**: `layout: custom`
2. **Data attribute**: `<div data-layout="layouts/custom.html">`
3. **Default layout**: `.layouts/default.html`
4. **Auto-generated**: Basic HTML structure

## Template Inheritance

### Basic Template Extends

Use `<template extends="...">` for template inheritance:

**Base template: `src/layouts/base.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title><slot name="title">Default Title</slot></title>
  <slot name="head"></slot>
</head>
<body>
  <header>
    <slot name="header">
      <h1>Default Header</h1>
    </slot>
  </header>
  <main>
    <slot name="content"></slot>
  </main>
  <footer>
    <slot name="footer">
      <p>&copy; 2024 My Site</p>
    </slot>
  </footer>
</body>
</html>
```

**Page using template inheritance: `src/about.html`**

```html
<template extends="layouts/base.html">
  <template data-slot="title">About Us</template>
  <template data-slot="head">
    <meta name="description" content="About our company">
    <link rel="stylesheet" href="/about.css">
  </template>
  <template data-slot="header">
    <h1>About Our Company</h1>
    <nav>
      <a href="/">Home</a>
      <a href="/services">Services</a>
    </nav>
  </template>
  <template data-slot="footer">
    <p>Contact us: info@company.com</p>
  </template>
</template>

<!-- This content goes to the "content" slot -->
<h2>Our Story</h2>
<p>Founded in 2020, we've been serving customers...</p>
```

### Multi-Level Template Inheritance

Create complex inheritance hierarchies:

**Base template: `layouts/base.html`**

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

**Content template: `layouts/content.html`**

```html
<template extends="base.html">
  <template data-slot="head">
    <title><slot name="title"></slot></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <slot name="meta"></slot>
  </template>
  
  <template data-slot="body">
    <header>
      <slot name="header"></slot>
    </header>
    <main>
      <slot name="main"></slot>
    </main>
    <footer>
      <slot name="footer"></slot>
    </footer>
  </template>
</template>
```

**Article template: `layouts/article.html`**

```html
<template extends="content.html">
  <template data-slot="main">
    <article>
      <header>
        <h1><slot name="article-title"></slot></h1>
        <div class="meta">
          <slot name="article-meta"></slot>
        </div>
      </header>
      <div class="content">
        <slot name="article-content"></slot>
      </div>
    </article>
  </template>
</template>
```

**Final page: `src/blog/my-post.html`**

```html
<template extends="layouts/article.html">
  <template data-slot="title">My Blog Post - My Site</template>
  <template data-slot="meta">
    <meta name="description" content="An interesting blog post">
  </template>
  <template data-slot="header">
    <h1>My Blog</h1>
    <nav>...</nav>
  </template>
  <template data-slot="article-title">My Interesting Post</template>
  <template data-slot="article-meta">
    Published on March 15, 2024 by John Doe
  </template>
  <template data-slot="footer">
    <p>&copy; 2024 My Blog</p>
  </template>
</template>

<!-- This goes to article-content slot -->
<p>This is the main content of my blog post...</p>
```

### Template Path Resolution

Templates are resolved in this order:

1. **Absolute from source root**: `layouts/blog.html` → `src/layouts/blog.html`
2. **Layouts directory**: `blog.html` → `src/.layouts/blog.html`
3. **Alternative layouts**: `blog.html` → `src/layouts/blog.html`
4. **Relative to current file**: `../templates/base.html`

## Slot System

### Named Slots

Define specific content areas with `<slot name="...">`:

**Template with multiple named slots:**

```html
<!DOCTYPE html>
<html>
<head>
  <slot name="head">
    <meta charset="UTF-8">
    <title>Default Title</title>
  </slot>
</head>
<body>
  <header>
    <slot name="header">
      <h1>Default Header</h1>
    </slot>
  </header>
  
  <aside class="sidebar">
    <slot name="sidebar">
      <p>Default sidebar content</p>
    </slot>
  </aside>
  
  <main>
    <slot name="main">
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
    <script src="/analytics.js"></script>
  </template>
  
  <template data-slot="header">
    <h1>Custom Header</h1>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
  </template>
  
  <template data-slot="sidebar">
    <h3>Quick Navigation</h3>
    <ul>
      <li><a href="#section1">Section 1</a></li>
      <li><a href="#section2">Section 2</a></li>
    </ul>
  </template>
  
  <template data-slot="footer">
    <p>Custom footer for this page</p>
    <p>Last updated: March 2024</p>
  </template>
  
  <!-- Default slot content -->
  <h2 id="section1">Main Content</h2>
  <p>This content goes to the default slot or named "main" slot.</p>
  
  <h2 id="section2">Another Section</h2>
  <p>More content here.</p>
</div>
```

### Default Slot

The unnamed `<slot></slot>` receives content not in named templates:

**Layout with default slot:**

```html
<article>
  <header>
    <h1><slot name="title">Default Title</slot></h1>
    <div class="meta">
      <slot name="meta"></slot>
    </div>
  </header>
  <div class="content">
    <slot></slot> <!-- Default slot for main content -->
  </div>
</article>
```

**Page using default slot:**

```html
<div data-layout="layouts/article.html">
  <template data-slot="title">My Article</template>
  <template data-slot="meta">
    Published: March 15, 2024
  </template>
  
  <!-- This content goes to the default slot -->
  <p>This is the main article content.</p>
  <h3>Subsection</h3>
  <p>More content in the default slot.</p>
</div>
```

### Slot Default Content

Provide fallback content when slots are empty:

```html
<!-- Template with comprehensive defaults -->
<article class="blog-post">
  <header>
    <h1><slot name="title">Untitled Post</slot></h1>
    <div class="meta">
      <slot name="author">
        <span class="author">Anonymous</span>
      </slot>
      <slot name="date">
        <span class="date">{{ current_date }}</span>
      </slot>
      <slot name="tags">
        <span class="tags">Uncategorized</span>
      </slot>
    </div>
  </header>
  
  <div class="content">
    <slot name="excerpt">
      <p><em>No excerpt provided.</em></p>
    </slot>
    <slot></slot>
  </div>
  
  <footer>
    <slot name="social">
      <div class="social-share">
        <a href="#" class="share-twitter">Tweet</a>
        <a href="#" class="share-facebook">Share</a>
      </div>
    </slot>
  </footer>
</article>
```

## Include System

### Virtual Includes

Use `<!--#include virtual="..." -->` for includes from source root:

**Directory structure:**

```text
src/
├── .components/
│   ├── header.html
│   ├── navigation.html
│   └── footer.html
├── layouts/
│   └── base.html
└── pages/
    └── about.html
```

**Layout using virtual includes: `layouts/base.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title><slot name="title"></slot></title>
  <!--#include virtual="/.components/meta-tags.html" -->
</head>
<body>
  <!--#include virtual="/.components/header.html" -->
  
  <main>
    <slot></slot>
  </main>
  
  <!--#include virtual="/.components/footer.html" -->
</body>
</html>
```

**Header component: `.components/header.html`**

```html
<header class="site-header">
  <div class="container">
    <h1><slot name="site-title">My Website</slot></h1>
    <!--#include virtual="/.components/navigation.html" -->
  </div>
</header>
```

### File Includes

Use `<!--#include file="..." -->` for relative includes:

**Blog post using relative includes:**

```html
<!-- From src/blog/my-post.html -->
<article>
  <!--#include file="../.components/post-header.html" -->
  
  <div class="content">
    <p>Main blog content here...</p>
  </div>
  
  <!--#include file="./related-posts.html" -->
</article>
```

### Include Attributes

Includes support various attributes:

```html
<!-- Basic include -->
<!--#include virtual="/.components/sidebar.html" -->

<!-- Include with error handling -->
<!--#include virtual="/.components/optional.html" onerror="continue" -->

<!-- Include with custom processing -->
<!--#include virtual="/.components/dynamic.html" process="server" -->
```

## Advanced Patterns

### Components with Template Inheritance

Create reusable components that extend templates:

**Card component: `components/card.html`**

```html
<template extends="layouts/component-base.html">
  <template data-slot="component-styles">
    <style>
      .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; }
      .card-header { font-weight: bold; margin-bottom: 0.5rem; }
      .card-footer { margin-top: 1rem; font-size: 0.9em; color: #666; }
    </style>
  </template>
</template>

<div class="card">
  <div class="card-header">
    <slot name="header">Default Card Header</slot>
  </div>
  <div class="card-body">
    <slot></slot>
  </div>
  <div class="card-footer">
    <slot name="footer"></slot>
  </div>
</div>
```

**Using the card component:**

```html
<!--#include virtual="/components/card.html" -->
<template data-slot="header">
  <h3>Product Information</h3>
</template>
<template data-slot="footer">
  <button class="btn">Learn More</button>
</template>

<!-- Default slot content -->
<p>This product features cutting-edge technology...</p>
<ul>
  <li>Feature 1</li>
  <li>Feature 2</li>
</ul>
```

### Includes within Template Slots

Combine includes and slots for modular design:

**Layout with included components in slots:**

```html
<template extends="layouts/base.html">
  <template data-slot="sidebar">
    <!--#include virtual="/.components/recent-posts.html" -->
    <!--#include virtual="/.components/categories.html" -->
    <!--#include virtual="/.components/newsletter-signup.html" -->
  </template>
  
  <template data-slot="footer">
    <!--#include virtual="/.components/social-links.html" -->
    <!--#include virtual="/.components/copyright.html" -->
  </template>
</template>

<h1>Main Page Content</h1>
<p>This goes to the default content slot.</p>
```

### Recursive Includes with Templates

Handle complex nesting scenarios:

**Navigation component: `components/nav.html`**

```html
<template extends="layouts/component-base.html">
  <template data-slot="component-styles">
    <link rel="stylesheet" href="/nav.css">
  </template>
</template>

<nav class="main-nav">
  <ul>
    <slot name="nav-items">
      <!--#include virtual="/.components/default-nav-items.html" -->
    </slot>
  </ul>
  <div class="nav-extras">
    <slot name="nav-extras">
      <!--#include virtual="/.components/search-box.html" -->
    </slot>
  </div>
</nav>
```

**Page using recursive includes:**

```html
<!--#include virtual="/components/nav.html" -->
<template data-slot="nav-items">
  <li><a href="/">Home</a></li>
  <li><a href="/about">About</a></li>
  <li class="dropdown">
    <a href="/services">Services</a>
    <!--#include virtual="/.components/services-dropdown.html" -->
  </li>
</template>
<template data-slot="nav-extras">
  <!--#include virtual="/.components/user-menu.html" -->
</template>
```

### Conditional Slot Content

Use conditional logic within slots:

**Layout with conditional slots:**

```html
<article class="blog-post">
  <header>
    <h1><slot name="title"></slot></h1>
    <div class="meta">
      <slot name="author-info">
        {{#if author}}
        <span class="author">By {{ author }}</span>
        {{/if}}
        {{#if date}}
        <span class="date">{{ date }}</span>
        {{/if}}
      </slot>
    </div>
  </header>
  
  <div class="content">
    <slot name="excerpt">
      {{#if excerpt}}
      <div class="excerpt">{{ excerpt }}</div>
      {{/if}}
    </slot>
    <slot></slot>
  </div>
  
  <footer>
    <slot name="tags">
      {{#if tags}}
      <div class="tags">
        {{#each tags}}
        <span class="tag">{{ . }}</span>
        {{/each}}
      </div>
      {{/if}}
    </slot>
  </footer>
</article>
```

## Data Attributes

### Layout Selection

Use `data-layout` to specify layouts:

```html
<!-- Use specific layout -->
<div data-layout="layouts/blog.html">
  <h1>Blog Post</h1>
</div>

<!-- Use layout from .layouts directory -->
<div data-layout="article">
  <h1>Article Content</h1>
</div>

<!-- Nested path -->
<div data-layout="admin/dashboard.html">
  <h1>Admin Dashboard</h1>
</div>
```

### Slot Data Attributes

Use `data-slot` to specify slot targets:

```html
<template extends="layouts/base.html">
  <!-- Named slot with data-slot -->
  <template data-slot="head">
    <meta name="description" content="Page description">
  </template>
  
  <!-- Multiple slots with same name (combined) -->
  <template data-slot="scripts">
    <script src="/analytics.js"></script>
  </template>
  <template data-slot="scripts">
    <script src="/tracking.js"></script>
  </template>
</template>
```

### Custom Data Attributes

Add custom attributes for processing:

```html
<!-- Component with custom attributes -->
<div data-component="card" data-variant="highlighted" data-size="large">
  <template data-slot="title">Important Card</template>
  <p>Card content here.</p>
</div>

<!-- Layout with custom processing -->
<div data-layout="base.html" data-theme="dark" data-language="en">
  <h1>Themed Content</h1>
</div>
```

## Best Practices

### Template Organization

**Recommended directory structure:**

```text
src/
├── .layouts/              # Primary layouts
│   ├── base.html          # Base layout
│   ├── default.html       # Default content layout
│   └── minimal.html       # Minimal layout
├── layouts/               # Specialized layouts
│   ├── blog/
│   │   ├── post.html      # Blog post layout
│   │   └── archive.html   # Blog archive layout
│   └── docs/
│       ├── guide.html     # Documentation layout
│       └── api.html       # API reference layout
├── .components/           # Reusable components
│   ├── header.html
│   ├── footer.html
│   ├── navigation.html
│   └── forms/
│       ├── contact.html
│       └── newsletter.html
└── templates/             # Template partials
    ├── meta-tags.html
    ├── social-share.html
    └── analytics.html
```

### Naming Conventions

**Slot naming:**

```html
<!-- Use descriptive, hierarchical names -->
<slot name="page-title">       <!-- Not: title -->
<slot name="sidebar-content">  <!-- Not: sidebar -->
<slot name="meta-description"> <!-- Not: meta -->
<slot name="article-author">   <!-- Not: author -->
```

**Template file naming:**

```html
<!-- layouts/blog-post.html -->     <!-- Clear purpose -->
<!-- layouts/landing-page.html -->   <!-- Descriptive -->
<!-- components/user-card.html -->   <!-- Component type -->
<!-- templates/seo-meta.html -->     <!-- Template partial -->
```

### Performance Optimization

**Template efficiency:**

```html
<!-- Good: Focused, single-purpose template -->
<template extends="layouts/base.html">
  <template data-slot="head">
    <title>{{ title }}</title>
    <meta name="description" content="{{ description }}">
  </template>
</template>

<!-- Avoid: Deep nesting -->
<template extends="layouts/base.html">
  <template data-slot="body">
    <template extends="components/wrapper.html">
      <template data-slot="inner">
        <template extends="components/deep.html">
          <!-- Too deep! -->
        </template>
      </template>
    </template>
  </template>
</template>
```

**Include optimization:**

```html
<!-- Good: Combine related includes -->
<!--#include virtual="/.components/head-meta.html" -->

<!-- Avoid: Many tiny includes -->
<!--#include virtual="/.components/charset.html" -->
<!--#include virtual="/.components/viewport.html" -->
<!--#include virtual="/.components/title.html" -->
```

### Content Strategy

**Slot defaults:**

```html
<!-- Always provide meaningful defaults -->
<slot name="page-title">
  <title>{{ site_name }} - {{ default_tagline }}</title>
</slot>

<slot name="sidebar">
  <!--#include virtual="/.components/default-sidebar.html" -->
</slot>

<!-- Not: Empty slots -->
<slot name="sidebar"></slot>
```

**Template inheritance:**

```html
<!-- Good: Clear inheritance chain -->
base.html → content.html → article.html

<!-- Avoid: Unclear relationships -->
base.html → wrapper.html → container.html → content.html
```

## Troubleshooting

### Common Issues

**Slot not rendering:**

```html
<!-- Problem: Mismatched slot names -->
<slot name="page-title"></slot>
<template data-slot="title">My Title</template>  <!-- Won't match -->

<!-- Solution: Match exactly -->
<slot name="page-title"></slot>
<template data-slot="page-title">My Title</template>
```

**Template not found:**

```html
<!-- Problem: Incorrect path -->
<template extends="layout/base.html">  <!-- Missing 's' -->

<!-- Solution: Correct path -->
<template extends="layouts/base.html">
```

**Include not working:**

```html
<!-- Problem: Wrong include type -->
<!--#include file="/.components/header.html" -->  <!-- file vs virtual -->

<!-- Solution: Use virtual for absolute paths -->
<!--#include virtual="/.components/header.html" -->
```

**Layout not applied:**

```html
<!-- Problem: Layout file doesn't exist -->
<div data-layout="missing.html">

<!-- Solution: Verify file exists -->
<div data-layout="layouts/existing.html">
```

### Debug Techniques

**Enable debug mode:**

```bash
# Show template processing details
DEBUG=1 dompile build

# Debug specific file
dompile build --debug src/problematic-page.html
```

**Template verification:**

```html
<!-- Add debug markers -->
<template extends="layouts/base.html">
  <!-- DEBUG: Slot content starts -->
  <template data-slot="title">Debug Title</template>
  <!-- DEBUG: Slot content ends -->
</template>

<!-- DEBUG: Default content starts -->
<p>Default content here</p>
<!-- DEBUG: Default content ends -->
```

**Include testing:**

```html
<!-- Test includes individually -->
<!--#include virtual="/.components/test-header.html" -->

<!-- Verify paths -->
<!--#include virtual="/debug/path-test.html" -->
```

### Error Messages

**Template file not found:**

```text
Template file not found: layouts/missing.html
Suggestions:
• Create the template file: src/layouts/missing.html
• Check the extends path spelling
• Verify the layouts directory exists
```

**Circular dependency:**

```text
Circular template dependency detected:
base.html → content.html → base.html
```

**Slot mismatch:**

```text
Slot 'title' defined but no matching template found
Check data-slot attribute spelling
```

## Migration Guide

### From Other Systems

**From Jekyll/Liquid:**

```liquid
<!-- Jekyll -->
---
layout: post
title: "My Post"
---
{{ content }}

<!-- dompile -->
---
layout: blog-post
title: "My Post"
---
<h1>{{ title }}</h1>
<p>Content here replaces {{ content }} in layout.</p>
```

**From Hugo:**

```go
<!-- Hugo -->
{{ define "main" }}
<h1>{{ .Title }}</h1>
{{ .Content }}
{{ end }}

<!-- dompile -->
<template extends="layouts/base.html">
  <template data-slot="main">
    <h1>{{ title }}</h1>
    <p>Content goes here.</p>
  </template>
</template>
```

**From 11ty:**

```njk
<!-- 11ty -->
{% extends "base.njk" %}
{% block content %}
<h1>{{ title }}</h1>
{% endblock %}

<!-- dompile -->
<template extends="layouts/base.html">
  <template data-slot="content">
    <h1>{{ title }}</h1>
  </template>
</template>
```

## See Also

- [Getting Started Guide](getting-started.md)
- [Include Syntax Documentation](include-syntax.md)
- [Template Elements in Markdown](template-elements-in-markdown.md)
- [Token Replacement](token-replacement.md)
- [CLI Reference](cli-reference.md)
