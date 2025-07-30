# 🧱 DOMpile-Compatible Static Site Generator: Final Design

---

## 🧠 Guiding Principles

| Goal                               | Description                                               |
| ---------------------------------- | --------------------------------------------------------- |
| **HTML-centric**                   | No templating language, just HTML                         |
| **Single custom element**          | Only `<include />` is introduced                          |
| **No wrappers or special roots**   | Pages and components are just HTML                        |
| **Minimal configuration**          | Layouts are inferred by convention                        |
| **Scoped assets**                  | Styles/scripts stay inside components                     |
| **Pure build-time transformation** | No runtime JavaScript or dynamic templating               |
| **Learn-by-reading-HTML**          | Authoring experience matches mental model of HTML and web |

---

## 🧩 Components

### ✅ Definition Rules

* **One component per file**
* **No `<template>` or wrapper required**
* File content is injected **as-is**
* Components can contain their own `<style>` and `<script>`

### 🔹 `components/alert.html`

```html
<style>
  .alert { color: red; padding: 1rem; border: 1px solid red; }
</style>

<div class="alert">
</div>

<script>
  console.log("Alert component loaded");
</script>
```

### 🔹 Page usage

```html
<include src="/components/alert.html"
         data-title="Warning"
         data-message="This is a DOMpile component." />
```

---

## 🏗 Layouts

### ✅ Layout Behavior

* Layouts are raw HTML files, no `<template>` tag required
* Layout content includes **`<slot>`** elements to define replaceable content regions
* `<slot>`s with `name="..."` are filled with matching `<template data-slot="...">`
* `<slot>`s without names receive the **default page content**
* Layout files can contain `<style>` or `<script>` as needed

### 🔹 `layouts/default.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <title><slot name="title">Untitled</slot></title>
    <link rel="stylesheet" href="/styles/site.css">
  </head>
  <body>
    <header>
      <slot name="header"><h1>Default Header</h1></slot>
    </header>
    <main>
      <slot></slot> <!-- unnamed slot receives default content -->
    </main>
    <footer>
      <slot name="footer">© 2025</slot>
    </footer>
  </body>
</html>
```

---

## 📄 Pages

### ✅ Rules for Pages

* Any `.html` file is a valid page
* **No wrapper tags** required (e.g., no `<page>` or `<template>`)
* The **root element** (e.g. `<html>`, `<body>`, `<div>`) may have `data-layout`
* If not present:

  * Use `default.html` from the layouts directory
* Use `<template data-slot="name">` for named slots
* All **non-template root-level content** is injected into the unnamed layout slot

### 🔹 `pages/index.html`

```html
<body data-layout="/layouts/blog.html">
  <template data-slot="title">Welcome</template>
  <template data-slot="header"><h1>My Blog</h1></template>

  <h2>Hello!</h2>
  <p>This is a blog post rendered with the DOMpile layout engine.</p>

  <include src="/components/alert.html"
           data-title="Note"
           data-message="This site uses 100% declarative HTML." />
</body>
```

---

## 🧠 Content Injection Rules

| Part                             | Behavior                                                    |
| -------------------------------- | ----------------------------------------------------------- |
| `<template data-slot="x">`       | Injects into `<slot name="x">` in layout                    |
| Page root content (non-template) | Injects into unnamed `<slot>`                               |
| `<include />`                    | Injects content of referenced file at position              |

---

## 🔄 Build-Time Processing Flow

1. **Read all pages**
2. **Detect root element**

   * If `data-layout`, load that layout
   * If none, load `/layouts/default.html`
3. **Parse layout HTML**
4. **Inject named slots**

   * Match `<template data-slot="X">` → `<slot name="X">`
5. **Inject default slot**

   * All page root content outside of templates → into `<slot></slot>`
6. **Process all `<include />` tags**

   * Load referenced component file
   * Inline `<style>` tags into `<head>` (deduplicated)
   * Append `<script>` tags to end of body (deduplicated)
7. **Emit HTML to `dist/` or output dir**

---

## ✅ Output Example

Given `pages/index.html` + `layouts/blog.html` + `components/alert.html`, output:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Welcome</title>
    <link rel="stylesheet" href="/styles/site.css">
    <style>
      .alert { color: red; padding: 1rem; border: 1px solid red; }
    </style>
  </head>
  <body>
    <header>
      <h1>My Blog</h1>
    </header>
    <main>
      <h2>Hello!</h2>
      <p>This is a blog post rendered with the DOMpile layout engine.</p>
      <div class="alert">
        <strong>Note</strong>
        <p>This site uses 100% declarative HTML.</p>
      </div>
    </main>
    <footer>© 2025</footer>
    <script>
      console.log("Alert component loaded");
    </script>
  </body>
</html>
```

---

## 📦 Project Structure

```txt
.
├── pages/
│   ├── index.html
│   └── about.html
├── components/
│   └── alert.html
├── layouts/
│   ├── default.html
│   └── blog.html
├── styles/
│   └── site.css
└── dist/
    └── index.html
```

---

## 🧰 Future CLI (Optional)

```bash
# Build all pages from /pages using layouts and components
dompile build --input ./pages --output ./dist --layouts ./layouts --components ./components

# Watch for changes
dompile watch
```

---

## ✅ Key Takeaways

| Requirement                                  | ✅ Satisfied |
| -------------------------------------------- | ----------- |
| Only one custom element (`<include />`)      | ✅           |
| No need for template wrappers                | ✅           |
| Root elements inject into unnamed slot       | ✅           |
| Named slots via `<template data-slot="...">` | ✅           |
| Inline styles/scripts inside components      | ✅           |
| Default layout fallback                      | ✅           |
| Self-closing `<include />` works like SSI    | ✅           |
| Pure HTML authoring model                    | ✅           |

