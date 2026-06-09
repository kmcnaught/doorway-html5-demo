/** PhonicsKeyboard — on-screen phonics keyboard for First Words, First Sounds, First Blends.
 *
 * Renders a keyboard with a digraph row above standard QWERTY rows into a container element.
 * Manages row/key scan highlights for switch scanning.
 *
 * Constructor options:
 *   includeQu    {boolean} — include the 'qu' digraph key between 'ee' and 'th'
 *                            false for First Words; true for First Sounds and First Blends
 *   scanOoEe     {boolean} — include 'oo' and 'ee' in individual key-level scan
 *                            In the original Flash, oo/ee were commented out of nextLetter
 *                            (First Sounds / First Blends bug). Default: true (fix the bug).
 *                            Set false to replicate Flash behaviour exactly.
 *   onKey        {function(char)} — called with the character string when a key is pressed
 *                                   digraph keys pass their full string, e.g. "oo", "ch", "qu"
 *   onBackspace  {function()}     — called when the backspace key is pressed
 *
 * Public API:
 *   render()                 — build DOM into containerEl (call once after construction)
 *   setRowHighlight(row)     — highlight a full keyboard row (0-based, see ROW constants)
 *   clearRowHighlight()      — clear all row-level highlights
 *   setKeyHighlight(keyName) — highlight a single key by name
 *   clearKeyHighlight()      — clear single-key highlight
 *   getRowScannables()       — returns array of Scannable-compatible objects for SwitchScanner
 *                              Each element represents one keyboard row; its children are the
 *                              individually scannable keys in that row.
 *
 * Row index constants (exported on the class):
 *   PhonicsKeyboard.ROW_CONTROL (0) — this row is NOT managed by the component;
 *                                     it is the activity's control row (mouth + mark buttons).
 *                                     Included so the scan row numbering aligns with Flash source.
 *   PhonicsKeyboard.ROW_DIGRAPH  (1)
 *   PhonicsKeyboard.ROW_TOP      (2)
 *   PhonicsKeyboard.ROW_HOME     (3)
 *   PhonicsKeyboard.ROW_BOTTOM   (4)
 */

export class PhonicsKeyboard
{
  /**
   * @param {HTMLElement} containerEl — element to render the keyboard into
   * @param {object}      opts
   * @param {boolean}     opts.includeQu   — include 'qu' key (default false)
   * @param {boolean}     opts.scanOoEe    — include oo/ee in key-level scan (default true)
   * @param {function}    opts.onKey       — callback(char) when a key is pressed
   * @param {function}    opts.onBackspace — callback() when backspace pressed
   */
  constructor(containerEl, opts)
  {
    if (!containerEl) { throw new Error("PhonicsKeyboard: containerEl is required"); }
    this._container   = containerEl;
    this._includeQu   = opts && opts.includeQu   !== undefined ? !!opts.includeQu   : false;
    this._scanOoEe    = opts && opts.scanOoEe    !== undefined ? !!opts.scanOoEe    : true;
    this._onKey       = opts && typeof opts.onKey === "function"       ? opts.onKey       : function() {};
    this._onBackspace = opts && typeof opts.onBackspace === "function" ? opts.onBackspace : function() {};

    /** @type {Object.<string, HTMLElement>} map of key name → button element */
    this._keyElements = {};
    /** @type {HTMLElement[]} one wrapper div per rendered row (indices 1–4) */
    this._rowElements = [];
    /** @type {string|null} name of currently highlighted row */
    this._highlightedRow = null;
    /** @type {string|null} name of currently highlighted key */
    this._highlightedKey = null;
  }

  // ─── Layout definitions ────────────────────────────────────────────────────

  /** Digraph row keys in display order (before optional 'qu' insertion).
   *  'qu' is inserted between 'ee' and 'th' when includeQu is true.
   */
  _digraphKeys()
  {
    var keys = ["oo", "ee", "ch"];
    if (this._includeQu) { keys.push("qu"); }
    keys.push("th", "sh", "backspace");
    return keys;
  }

  /** Keys scannable at individual-key level within the digraph row.
   *  When scanOoEe is false, oo and ee are excluded (replicates Flash bug).
   *  When includeQu is true, 'qu' is the first individual-scan key.
   */
  _digraphScanKeys()
  {
    var keys = [];
    if (this._scanOoEe) { keys.push("oo", "ee"); }
    if (this._includeQu) { keys.push("qu"); }
    keys.push("ch", "th", "sh", "backspace");
    return keys;
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  /**
   * Build the keyboard DOM into the container element.
   * Call once after constructing the component.
   */
  render()
  {
    this._container.innerHTML = "";
    this._keyElements = {};
    this._rowElements = [];

    var rows = [
      { index: PhonicsKeyboard.ROW_DIGRAPH, keys: this._digraphKeys(), label: "Digraph keys" },
      { index: PhonicsKeyboard.ROW_TOP,     keys: ["q","w","e","r","t","y","u","i","o","p"], label: "Top row" },
      { index: PhonicsKeyboard.ROW_HOME,    keys: ["a","s","d","f","g","h","j","k","l"],     label: "Home row" },
      { index: PhonicsKeyboard.ROW_BOTTOM,  keys: ["z","x","c","v","b","n","m"],             label: "Bottom row" }
    ];

    var self = this;

    rows.forEach(function(rowDef) {
      var rowEl = document.createElement("div");
      rowEl.className = "pk-row";
      rowEl.setAttribute("aria-label", rowDef.label);
      rowEl.dataset.pkRow = String(rowDef.index);

      rowDef.keys.forEach(function(key) {
        var btn = self._createKeyButton(key);
        rowEl.appendChild(btn);
        self._keyElements[key] = btn;
      });

      self._container.appendChild(rowEl);
      self._rowElements[rowDef.index] = rowEl;
    });
  }

  /** Create a single key button element. */
  _createKeyButton(key)
  {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pk-key";
    btn.dataset.pkKey = key;

    if (key === "backspace") {
      btn.className += " pk-key-backspace";
      btn.setAttribute("aria-label", "Backspace");
      btn.textContent = "⌫"; /* ⌫ */
    } else {
      btn.textContent = key;
      btn.setAttribute("aria-label", key);
    }

    var self = this;
    btn.addEventListener("click", function() {
      if (key === "backspace") {
        self._onBackspace();
      } else {
        self._onKey(key);
      }
    });

    return btn;
  }

  // ─── Scan highlight control ─────────────────────────────────────────────────

  /** Highlight all keys in a keyboard row (row index 1–4).
   *  Clears any previous row highlight first.
   *  @param {number} rowIndex — use PhonicsKeyboard.ROW_* constants
   */
  setRowHighlight(rowIndex)
  {
    this.clearRowHighlight();
    var rowEl = this._rowElements[rowIndex];
    if (rowEl) {
      rowEl.classList.add("scan_highlight");
      this._highlightedRow = rowIndex;
    }
  }

  /** Remove the current row-level scan highlight. */
  clearRowHighlight()
  {
    if (this._highlightedRow !== null) {
      var rowEl = this._rowElements[this._highlightedRow];
      if (rowEl) { rowEl.classList.remove("scan_highlight"); }
      this._highlightedRow = null;
    }
  }

  /** Highlight a single key button by name.
   *  Clears any previous single-key highlight first.
   *  @param {string} keyName — e.g. "a", "ch", "backspace"
   */
  setKeyHighlight(keyName)
  {
    this.clearKeyHighlight();
    var btn = this._keyElements[keyName];
    if (btn) {
      btn.classList.add("scan_highlight");
      this._highlightedKey = keyName;
    }
  }

  /** Remove the current single-key scan highlight. */
  clearKeyHighlight()
  {
    if (this._highlightedKey !== null) {
      var btn = this._keyElements[this._highlightedKey];
      if (btn) { btn.classList.remove("scan_highlight"); }
      this._highlightedKey = null;
    }
  }

  /** Clear all highlights (both row-level and key-level). */
  clearAllHighlights()
  {
    this.clearRowHighlight();
    this.clearKeyHighlight();
  }

  // ─── Scannable tree construction ────────────────────────────────────────────

  /**
   * Build a Scannable tree for this keyboard and register it with a SwitchScanner.
   *
   * Returns an array of four row-level Scannable objects (one per keyboard row,
   * rows 1–4 in the Flash row-numbering scheme). Each row Scannable has child
   * Scannables for the individually scannable keys in that row.
   *
   * The caller is responsible for adding the returned row Scannables to its scanner,
   * typically alongside a control-row Scannable for the mouth/mark buttons:
   *
   *   var rows = this._phonicsKeyboard.buildScannables(Scannable);
   *   var controlRow = new Scannable(undefined, undefined);
   *   // add mouth and mark as children of controlRow ...
   *   this.scanner.addChild(controlRow);
   *   rows.forEach(r => this.scanner.addChild(r));
   *
   * @param {function} ScannableCtor — the Scannable constructor from switch-scanner.js
   * @returns {Scannable[]} array of 4 row-level Scannables (index 0 = digraph row, etc.)
   */
  buildScannables(ScannableCtor)
  {
    var self = this;

    var rowDefs = [
      {
        rowIndex:  PhonicsKeyboard.ROW_DIGRAPH,
        scanKeys:  self._digraphScanKeys()
      },
      {
        rowIndex:  PhonicsKeyboard.ROW_TOP,
        scanKeys:  ["q","w","e","r","t","y","u","i","o","p"]
      },
      {
        rowIndex:  PhonicsKeyboard.ROW_HOME,
        scanKeys:  ["a","s","d","f","g","h","j","k","l"]
      },
      {
        rowIndex:  PhonicsKeyboard.ROW_BOTTOM,
        scanKeys:  ["z","x","c","v","b","n","m"]
      }
    ];

    return rowDefs.map(function(rowDef) {
      var rowEl    = self._rowElements[rowDef.rowIndex];
      var rowGroup = new ScannableCtor(rowEl, undefined);

      rowDef.scanKeys.forEach(function(key) {
        var btn = self._keyElements[key];
        if (!btn) { return; }
        var keyCopy = key; /* capture */
        var action = (key === "backspace")
          ? function() { self._onBackspace(); }
          : function() { self._onKey(keyCopy); };
        var sc = new ScannableCtor(btn, action);
        rowGroup.addChild(sc);
      });

      return rowGroup;
    });
  }

  // ─── Key press visual feedback ──────────────────────────────────────────────

  /**
   * Briefly add a pressed CSS class to a key button for visual feedback.
   * @param {string} keyName
   */
  flashKey(keyName)
  {
    var btn = this._keyElements[keyName];
    if (!btn) { return; }
    btn.classList.add("pk-key-pressed");
    setTimeout(function() {
      btn.classList.remove("pk-key-pressed");
    }, 120);
  }
}

// ─── Row index constants ─────────────────────────────────────────────────────

/** Row 0: control row (mouth + mark) — not managed by this component. */
PhonicsKeyboard.ROW_CONTROL = 0;
/** Row 1: digraph row (oo, ee, ch, [qu,] th, sh, backspace). */
PhonicsKeyboard.ROW_DIGRAPH = 1;
/** Row 2: QWERTY top row (q w e r t y u i o p). */
PhonicsKeyboard.ROW_TOP     = 2;
/** Row 3: QWERTY home row (a s d f g h j k l). */
PhonicsKeyboard.ROW_HOME    = 3;
/** Row 4: QWERTY bottom row (z x c v b n m). */
PhonicsKeyboard.ROW_BOTTOM  = 4;
