# Known Issues

- The workflow and/or logic for applying default templates is incorrect.
  - Default layout is not applied to partial html pages without specifying data-layout attribute
  - Default layout is not applied to markdown files, likely due to wrapping the markdown content in default html before processing layout logic.
