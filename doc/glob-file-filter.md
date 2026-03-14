# Glob Pattern File Filter

A two-mode file filtering system using glob patterns. Supports both an **exclude** (blacklist) mode and an **include** (whitelist) mode. Built on the [`minimatch`](https://github.com/isaacs/minimatch) library.

---

## Dependency

```
npm install minimatch
```

Version used: `minimatch@10.1.1`. The API used (`minimatch()` function and `Minimatch` class) is stable across v9+.

---

## Concepts

### Two modes

| Mode        | Empty patterns | Pattern matches file | Pattern does not match |
|-------------|---------------|----------------------|------------------------|
| **Exclude** | include all   | exclude file         | include file           |
| **Include** | include none  | include file         | exclude file           |

The mode is a single boolean (`useIncludeMode`). In exclude mode (`false`) the logic is inverted: a file passes the filter only if it matches *no* pattern.

### Pattern format

Patterns are stored as a single multi-line string — one glob pattern per line, blank lines ignored, leading/trailing whitespace trimmed. This maps naturally to a `<textarea>` in a settings UI.

Standard minimatch glob syntax:

| Pattern       | Meaning                                              |
|---------------|------------------------------------------------------|
| `Templates/**`| All files inside `Templates/` at any depth          |
| `Daily/*`     | All files directly inside `Daily/` (not recursive)  |
| `**draft*.md` | Any `.md` file with "draft" anywhere in its name    |
| `Projects/**` | All files inside `Projects/` recursively            |
| `*.md`        | All `.md` files in the root only                    |

---

## Implementation

### 1. Simple one-shot filter (no caching)

Use this when you check files infrequently or have few files.

```typescript
import { minimatch } from "minimatch";

/**
 * Returns true if the file at `filePath` should be processed.
 *
 * @param filePath       - Relative path of the file, e.g. "Folder/note.md"
 * @param patterns       - Newline-separated glob patterns
 * @param useIncludeMode - true = whitelist, false = blacklist
 */
export function shouldIncludeFile(
    filePath: string,
    patterns: string,
    useIncludeMode: boolean
): boolean {
    // No patterns: include all in exclude mode, none in include mode
    if (!patterns.trim()) {
        return !useIncludeMode;
    }

    const patternList = patterns
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    if (patternList.length === 0) {
        return !useIncludeMode;
    }

    const matchesAnyPattern = patternList.some((pattern) =>
        minimatch(filePath, pattern)
    );

    // Include mode: include if matches any pattern
    // Exclude mode: include if matches NO pattern
    return useIncludeMode ? matchesAnyPattern : !matchesAnyPattern;
}
```

**Usage:**

```typescript
shouldIncludeFile("Templates/daily.md", "Templates/**", false); // false — excluded
shouldIncludeFile("Notes/idea.md",      "Templates/**", false); // true  — not excluded
shouldIncludeFile("Notes/idea.md",      "Notes/**",     true);  // true  — whitelisted
shouldIncludeFile("Templates/x.md",     "Notes/**",     true);  // false — not whitelisted
```

---

### 2. High-performance version with compiled patterns

Use this when you're processing many files, or when the same patterns are applied repeatedly (e.g. on every file-system event). Pre-compiling patterns with the `Minimatch` class avoids re-parsing the glob on every file check.

```typescript
import { Minimatch } from "minimatch";

export class FileFilter {
    private compiledPatterns: Minimatch[] = [];
    private patternsString = "";
    private useIncludeMode = false;

    /**
     * Update patterns and mode. Only recompiles when something changed.
     */
    setPatterns(patterns: string, useIncludeMode: boolean): void {
        if (
            patterns === this.patternsString &&
            useIncludeMode === this.useIncludeMode
        ) {
            return; // nothing changed
        }

        this.patternsString = patterns;
        this.useIncludeMode = useIncludeMode;
        this.compile();
    }

    /**
     * Returns true if the file at `filePath` should be processed.
     */
    shouldInclude(filePath: string): boolean {
        if (this.compiledPatterns.length === 0) {
            return !this.useIncludeMode;
        }

        const matchesAnyPattern = this.compiledPatterns.some((p) =>
            p.match(filePath)
        );

        return this.useIncludeMode ? matchesAnyPattern : !matchesAnyPattern;
    }

    private compile(): void {
        this.compiledPatterns = [];

        const patternList = this.patternsString
            .split("\n")
            .map((p) => p.trim())
            .filter((p) => p.length > 0);

        for (const pattern of patternList) {
            try {
                this.compiledPatterns.push(new Minimatch(pattern));
            } catch {
                // Skip invalid patterns silently
            }
        }
    }
}
```

**Usage:**

```typescript
const filter = new FileFilter();
filter.setPatterns("Templates/**\nDaily/*", false); // exclude mode

filter.shouldInclude("Templates/note.md"); // false
filter.shouldInclude("Notes/idea.md");     // true

// Update patterns — recompile happens automatically
filter.setPatterns("Notes/**", true); // switch to include mode
filter.shouldInclude("Notes/idea.md");     // true
filter.shouldInclude("Templates/note.md"); // false
```

---

### 3. Convenience: exclude-only helper

If you only need blacklisting and want a simpler API:

```typescript
import { minimatch } from "minimatch";

/**
 * Returns true if the file matches any exclusion pattern.
 */
export function isFileExcluded(filePath: string, excludePatterns: string): boolean {
    if (!excludePatterns.trim()) {
        return false;
    }

    const patterns = excludePatterns
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    return patterns.some((pattern) => minimatch(filePath, pattern));
}
```

---

## Settings UI (example)

The patterns and mode are user-configurable. A minimal settings model:

```typescript
interface FilterSettings {
    /** Newline-separated glob patterns */
    filterPatterns: string;
    /** true = include (whitelist), false = exclude (blacklist) */
    useIncludeMode: boolean;
}

const DEFAULT_SETTINGS: FilterSettings = {
    filterPatterns: "",
    useIncludeMode: false, // exclude mode is the intuitive default
};
```

Render as a `<textarea>` for the patterns and a toggle/checkbox for the mode. Display mode-aware help text:

- **Exclude mode:** "Patterns for files to ignore. Example: `Templates/**`, `Daily/*`"
- **Include mode:** "Only files matching these patterns will be processed. Example: `Projects/**`"

When settings change, call `filter.setPatterns(newPatterns, newMode)`. If you maintain a cache of processed files, trigger a full rebuild at this point.

---

## Behavior edge cases

| Scenario                                      | Exclude mode | Include mode |
|-----------------------------------------------|-------------|-------------|
| Empty patterns string                         | include all | include none |
| Patterns string with only whitespace/newlines | include all | include none |
| Pattern that is invalid glob syntax           | silently skipped (compile-time try/catch) | same |
| File path with leading slash                  | depends on minimatch — keep paths relative | same |

**Important:** Always use relative file paths (e.g. `"Folder/note.md"`, not `"/abs/path/note.md"`). minimatch matches against the literal string — a leading `/` will break `**` patterns.

---

## Integration checklist

- [ ] Install `minimatch`
- [ ] Decide: one-shot function or compiled `FileFilter` class (use class if checking >~100 files or on every FS event)
- [ ] Store `filterPatterns: string` and `useIncludeMode: boolean` in settings
- [ ] On settings change: call `filter.setPatterns()`, then rebuild any dependent data structures
- [ ] On each file event: call `filter.shouldInclude(file.path)` before processing
- [ ] Use relative paths throughout
