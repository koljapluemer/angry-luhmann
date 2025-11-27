You see here a template for an Obsidian plugin.

This plugin should help the user to implement a Luhmann-style zettelkasten.
Notably, it should implement several aids regarding the Luhmann zettel id paradigm.

For the first version:

- Read in the notes in the vault
- look for a property `zk-id` in frontmatter
    - this id has the format `int.int.int`, arbitrarily deep, e.g. "0", "2", "2.0.1.23.2" etc.
    - this id describes the non-malleable global position of the zettel in the zettelkasten
        - "2.0.1.23.2" means that this specific notes hangs under "2.0.1.23" and comes just after "2.0.1.23.1"
- this global relationship-tree should be rendered in a custom tab in the right sidebar
- it should use a simple text-based rendering style, similar to how a filetree may be rendered in a plaintext terminal
    - the `zk-id` should be used to map relationships, but the actual note's basename should be used for rendering
    - if notes cannot be placed (illegal position, duplicate id, ...) simply display a warning (Obsidian standard toast) and skip this note
    - example rendering

```
psychology
├psychoanalysis
|  ├Freud
|  ∟Jung
|     ∟Alchemy
sociology
biology
├animals
∟plants
travel
```

note the usage of specific unicode characters.
Remove boilerplate from the plugin that is not needed for this basic feature.